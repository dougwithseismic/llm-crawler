import type { CrawlJob, WebhookEventType } from './types.improved';
import { CrawlerService } from './crawler';

export class QueueService {
  private queue: CrawlJob[] = [];
  private isProcessing = false;
  private crawler: CrawlerService;

  constructor(crawler: CrawlerService) {
    this.crawler = crawler;
    this.setupEventHandlers();
  }

  private shouldSendWebhook(
    job: CrawlJob,
    eventType: WebhookEventType,
  ): boolean {
    if (!job.config.webhook) return false;
    if (!job.config.webhook.on) return true; // Send all events if not specified
    return job.config.webhook.on.includes(eventType);
  }

  private setupEventHandlers() {
    this.crawler.on('jobStart', async ({ job }) => {
      await this.handleJobStart(job);
    });

    this.crawler.on('jobComplete', async ({ job }) => {
      await this.handleJobComplete(job);
    });

    this.crawler.on('jobError', async ({ job, error }) => {
      await this.handleJobError(job, error);
    });

    this.crawler.on('pageComplete', async ({ job, pageAnalysis }) => {
      await this.handlePageComplete(job, pageAnalysis);
    });
  }

  private async handleJobStart(job: CrawlJob) {
    if (this.shouldSendWebhook(job, 'started')) {
      await this.sendWebhook(
        job.config.webhook!.url,
        {
          status: 'started',
          jobId: job.id,
          timestamp: new Date().toISOString(),
          config: {
            url: job.config.url,
            maxDepth: job.config.maxDepth,
            maxPages: job.config.maxPages,
          },
        },
        job.config.webhook!.headers,
      );
    }
  }

  private async handleJobComplete(job: CrawlJob) {
    if (this.shouldSendWebhook(job, 'completed')) {
      await this.sendWebhook(
        job.config.webhook!.url,
        {
          status: 'completed',
          jobId: job.id,
          timestamp: new Date().toISOString(),
          result: job.result,
          summary: {
            duration: job.progress.endTime
              ? new Date(job.progress.endTime).getTime() -
                new Date(job.progress.startTime).getTime()
              : null,
            pagesAnalyzed: job.progress.pagesAnalyzed,
            uniqueUrls: job.progress.uniqueUrls,
            skippedUrls: job.progress.skippedUrls,
            failedUrls: job.progress.failedUrls,
          },
        },
        job.config.webhook!.headers,
        job.config.webhook!.retries,
      );
    }

    await this.processNextJob();
  }

  private async handleJobError(job: CrawlJob, error: Error) {
    if (this.shouldSendWebhook(job, 'failed')) {
      await this.sendWebhook(
        job.config.webhook!.url,
        {
          status: 'failed',
          jobId: job.id,
          timestamp: new Date().toISOString(),
          error: error.message,
          progress: {
            pagesAnalyzed: job.progress.pagesAnalyzed,
            uniqueUrls: job.progress.uniqueUrls,
            skippedUrls: job.progress.skippedUrls,
            failedUrls: job.progress.failedUrls,
          },
        },
        job.config.webhook!.headers,
        job.config.webhook!.retries,
      );
    }

    await this.processNextJob();
  }

  private async handlePageComplete(job: CrawlJob, pageAnalysis: any) {
    if (this.shouldSendWebhook(job, 'progress')) {
      await this.sendWebhook(
        job.config.webhook!.url,
        {
          status: 'progress',
          jobId: job.id,
          timestamp: new Date().toISOString(),
          currentPage: {
            url: pageAnalysis.url,
            title: pageAnalysis.content?.title,
            wordCount: pageAnalysis.content?.wordCount,
          },
          progress: {
            pagesAnalyzed: job.progress.pagesAnalyzed,
            uniqueUrls: job.progress.uniqueUrls,
            skippedUrls: job.progress.skippedUrls,
            failedUrls: job.progress.failedUrls,
            currentDepth: job.progress.currentDepth,
            elapsedTime:
              new Date().getTime() - new Date(job.progress.startTime).getTime(),
          },
        },
        job.config.webhook!.headers,
      );
    }
  }

  private async sendWebhook(
    url: string,
    payload: unknown,
    headers?: Record<string, string>,
    retries = 3,
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          return;
        }

        lastError = new Error(`Webhook failed with status ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // Wait before retrying (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }

    console.error('Failed to send webhook after retries:', lastError);
  }

  private async processNextJob() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    const nextJob = this.queue.shift();
    if (!nextJob) {
      this.isProcessing = false;
      return;
    }

    try {
      await this.crawler.startJob(nextJob.id);
    } catch (error) {
      console.error('Failed to process job:', error);
      // Continue with next job even if this one fails
      await this.processNextJob();
    }
  }

  async enqueue(job: CrawlJob): Promise<void> {
    this.queue.push(job);

    // Start processing in the background
    if (!this.isProcessing) {
      this.isProcessing = true;
      // Use setImmediate to process in the next event loop iteration
      setImmediate(() => this.processNextJob());
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getIsProcessing(): boolean {
    return this.isProcessing;
  }
}
