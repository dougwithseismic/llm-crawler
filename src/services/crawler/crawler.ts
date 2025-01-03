import { EventEmitter } from 'events';
import {
  PlaywrightCrawler,
  createPlaywrightRouter,
  type PlaywrightCrawlingContext,
  Sitemap,
} from 'crawlee';
import { chromium, type Page } from 'playwright';
import type {
  CrawlConfig,
  CrawlJob,
  CrawlProgress,
  CrawlResult,
  PageAnalysis,
  CrawlEvent,
  CrawlEventMap,
  ErrorSummary,
} from './types.improved';
import type {
  CrawlerPlugin,
  CrawlerServiceOptions,
  BasePluginMetric,
  BasePluginSummary,
} from './types/plugin';

export class CrawlerService extends EventEmitter {
  private jobs: Map<string, CrawlJob> = new Map();
  private crawlers: Map<string, PlaywrightCrawler> = new Map();
  private sitemapUrls: Map<string, string[]> = new Map();
  private robotsTxtCache: Map<string, string> = new Map();
  private plugins: Array<
    CrawlerPlugin<string, BasePluginMetric, BasePluginSummary>
  >;
  private debug: boolean;

  constructor(
    options: CrawlerServiceOptions<
      Array<CrawlerPlugin<string, BasePluginMetric, BasePluginSummary>>
    >,
  ) {
    super();
    this.plugins = options.plugins;
    this.debug = options.config?.debug ?? false;
    this.initializePlugins();
  }

  private async initializePlugins(): Promise<void> {
    for (const plugin of this.plugins) {
      try {
        await plugin.initialize();
      } catch (error) {
        console.error(`Failed to initialize plugin ${plugin.name}:`, error);
      }
    }
  }

  // Type-safe event emitter methods
  on<E extends keyof CrawlEventMap>(
    event: E,
    listener: (args: CrawlEventMap[E]) => void,
  ): this {
    return super.on(event, listener);
  }

  emit<E extends keyof CrawlEventMap>(
    event: E,
    args: CrawlEventMap[E],
  ): boolean {
    return super.emit(event, args);
  }

  private createEmptyResult = (
    job: CrawlJob,
    isError = false,
  ): CrawlResult => ({
    config: job.config,
    progress: job.progress,
    pages: [],
    errors: {
      totalErrors: isError ? 1 : 0,
      errorTypes: {},
      errorPages: [],
    },
    summary: {},
  });

  private async evaluatePageMetrics(
    page: Page,
    loadTime: number,
  ): Promise<PageAnalysis> {
    // Get base metrics
    const baseMetrics = await page.evaluate(() => ({
      url: window.location.href,
      status: 200,
      redirectChain: [],
      timing: {
        start: performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd,
        loaded: performance.timing.loadEventEnd,
      },
    }));

    // Get plugin metrics
    const pluginResults = await Promise.all(
      this.plugins.map(async (plugin) => {
        try {
          if (!plugin.enabled) return {};
          return await plugin.evaluate(page, loadTime);
        } catch (error) {
          console.error(`Plugin ${plugin.name} metrics failed:`, error);
          return {};
        }
      }),
    );

    // Merge plugin results with base metrics
    return {
      ...baseMetrics,
      ...Object.assign({}, ...pluginResults),
    };
  }

  private async summarizeResults(job: CrawlJob): Promise<void> {
    if (!job.result) return;

    // Get summaries from each plugin
    const pluginSummaries = await Promise.all(
      this.plugins.map(async (plugin) => {
        try {
          if (!plugin.enabled) return {};
          const pluginPages = job.result!.pages.map((page) => ({
            [plugin.name]: page[plugin.name],
          }));
          return await plugin.summarize(pluginPages);
        } catch (error) {
          console.error(`Plugin ${plugin.name} summary failed:`, error);
          return {};
        }
      }),
    );

    // Merge all plugin summaries
    job.result.summary = Object.assign({}, ...pluginSummaries);
  }

  private handleRequest = async (
    context: PlaywrightCrawlingContext,
    job: CrawlJob,
  ): Promise<void> => {
    const { request, enqueueLinks, log, page } = context;

    try {
      // Check if we've reached maxPages limit
      if (
        job.config.maxPages !== undefined &&
        job.progress.pagesAnalyzed >= job.config.maxPages
      ) {
        // Teardown the crawler
        const crawler = this.crawlers.get(job.id);
        if (crawler) {
          await crawler.teardown();
          this.crawlers.delete(job.id);
        }

        // Only complete if not already completed
        if (job.progress.status !== 'completed') {
          // Complete the job if we've reached the limit
          job.progress.status = 'completed';
          job.progress.endTime = new Date();
          job.updatedAt = new Date();

          if (job.result) {
            job.result.progress = { ...job.progress };
            await this.summarizeResults(job);
          }

          this.emit('jobComplete', { jobId: job.id, job });
          this.jobs.set(job.id, job);
        }
        return;
      }

      this.emit('pageStart', { jobId: job.id, url: request.url, job });

      // Configure page
      if (job.config.headers) {
        await page.setExtraHTTPHeaders(job.config.headers);
      }

      if (job.config.userAgent && context.session) {
        const browserContext = await page.context();
        await browserContext.addInitScript(() => {
          Object.defineProperty(navigator, 'userAgent', {
            get: () => job.config.userAgent,
          });
        });
      }

      // Run beforeEach hooks
      for (const plugin of this.plugins) {
        try {
          if (!plugin.enabled) continue;
          if (plugin.beforeEach) {
            await plugin.beforeEach(page);
          }
        } catch (error) {
          console.error(`Plugin ${plugin.name} beforeEach failed:`, error);
        }
      }

      // Navigate and wait for network idle
      const startTime = Date.now();
      await page.goto(request.url, {
        timeout: job.config.timeout?.page || 30000,
        waitUntil: 'networkidle',
      });

      // @ts-ignore - WE MUST KEEP THIS HERE OR IT ALL FAILS. Thanks, esbuild.
      await page.evaluate(() => {
        (window as any).__name = (func: Function) => func;
      });

      // Run plugin evaluations
      const loadTime = Date.now() - startTime;
      const pageAnalysis = await this.evaluatePageMetrics(page, loadTime);

      // Run afterEach hooks
      for (const plugin of this.plugins) {
        try {
          if (!plugin.enabled) continue;
          if (plugin.afterEach) {
            await plugin.afterEach(page);
          }
        } catch (error) {
          console.error(`Plugin ${plugin.name} afterEach failed:`, error);
        }
      }

      // Initialize result if needed
      if (!job.result) {
        job.result = this.createEmptyResult(job);
      }

      // Update progress
      job.progress.pagesAnalyzed++;
      job.progress.currentUrl = request.url;
      if (job.config.maxDepth !== undefined) {
        job.progress.currentDepth = request.userData.depth || 0;
      }

      // Store results
      if (job.result) {
        job.progress.uniqueUrls =
          new Set(job.result.pages.map((p) => p.url)).size + 1;
        job.result.pages.push(pageAnalysis);

        // Update summaries
        await this.summarizeResults(job);

        this.emit('progress', {
          jobId: job.id,
          progress: job.progress,
          pageAnalysis,
          job,
        });
      }

      // Update job
      job.updatedAt = new Date();
      this.jobs.set(job.id, job);

      this.emit('pageComplete', {
        jobId: job.id,
        url: request.url,
        pageAnalysis,
        job,
      });

      // Only enqueue more links if we haven't reached maxPages and job isn't completed
      if (
        job.progress.status !== 'completed' &&
        (job.config.maxPages === undefined ||
          job.progress.pagesAnalyzed < job.config.maxPages)
      ) {
        // And if within depth limit
        if (
          job.config.maxDepth === undefined ||
          (request.userData.depth || 0) < job.config.maxDepth
        ) {
          // Apply URL filter if configured
          const urlFilter = job.config.urlFilter || (() => true);
          await enqueueLinks({
            userData: {
              depth: (request.userData.depth || 0) + 1,
            },
            transformRequestFunction: (req) => {
              const shouldCrawl = urlFilter(req.url);
              if (!shouldCrawl) {
                job.progress.skippedUrls++;
              }
              return shouldCrawl ? req : false;
            },
          });
        }
      }
    } catch (error) {
      log.error(`Failed to analyze ${request.url}: ${error}`);

      this.emit('pageError', {
        jobId: job.id,
        url: request.url,
        error: error instanceof Error ? error : new Error(String(error)),
        job,
      });

      // Update error tracking
      job.progress.failedUrls++;
      if (!job.result) {
        job.result = this.createEmptyResult(job, true);
      }

      // Update error summary
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorType =
        error instanceof Error ? error.constructor.name : 'UnknownError';

      job.result.errors.totalErrors++;
      job.result.errors.errorTypes[errorType] =
        (job.result.errors.errorTypes[errorType] || 0) + 1;
      job.result.errors.errorPages.push({
        url: request.url,
        error: errorMessage,
        timestamp: new Date(),
      });

      // Update the job
      job.updatedAt = new Date();
      this.jobs.set(job.id, job);
    }
  };

  private async parseRobotsTxt(url: string): Promise<string> {
    const cached = this.robotsTxtCache.get(url);
    if (cached) return cached;

    const robotsUrl = new URL('/robots.txt', url).toString();
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      await page.goto(robotsUrl);
      const content = await page.content();
      this.robotsTxtCache.set(url, content);
      return content;
    } finally {
      await browser.close();
    }
  }

  private async parseSitemap(url: string): Promise<string[]> {
    try {
      const { urls } = await Sitemap.load(url);
      return urls.map((u) => u.toString());
    } catch (error) {
      console.error(`Failed to parse sitemap at ${url}:`, error);
      return [];
    }
  }

  private getCrawlerForJob = (job: CrawlJob): PlaywrightCrawler => {
    const existingCrawler = this.crawlers.get(job.id);
    if (existingCrawler) return existingCrawler;

    const router = createPlaywrightRouter();
    router.addDefaultHandler((context: PlaywrightCrawlingContext) =>
      this.handleRequest(context, job),
    );

    const crawler = new PlaywrightCrawler({
      maxRequestsPerMinute: job.config.maxRequestsPerMinute || 60,
      maxConcurrency: job.config.maxConcurrency || 10,
      maxRequestRetries: job.maxRetries || 3,
      requestHandler: router,
      launchContext: {
        launcher: chromium,
        launchOptions: { headless: true },
      },
      browserPoolOptions: {
        useFingerprints: false,
        maxOpenPagesPerBrowser: 1,
      },
      navigationTimeoutSecs: job.config.timeout?.page
        ? job.config.timeout.page / 1000
        : 30,
      requestHandlerTimeoutSecs: job.config.timeout?.request
        ? job.config.timeout.request / 1000
        : 30,
      sessionPoolOptions: {
        maxPoolSize: 1,
      },
    });

    this.crawlers.set(job.id, crawler);
    return crawler;
  };

  async createJob(config: CrawlConfig): Promise<CrawlJob> {
    const id = crypto.randomUUID();
    const now = new Date();

    const job: CrawlJob = {
      id,
      config,
      progress: {
        pagesAnalyzed: 0,
        totalPages: 0,
        currentDepth: 0,
        uniqueUrls: 0,
        skippedUrls: 0,
        failedUrls: 0,
        startTime: now,
        status: 'queued',
      },
      priority: 0,
      retries: 0,
      maxRetries: 3,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(id, job);
    return job;
  }

  async startJob(id: string): Promise<CrawlJob> {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job ${id} not found`);

    // Reset any existing crawler
    const existingCrawler = this.crawlers.get(id);
    if (existingCrawler) {
      await existingCrawler.teardown();
      this.crawlers.delete(id);
    }

    job.result = this.createEmptyResult(job);
    job.progress = {
      ...job.progress,
      status: 'running',
      startTime: new Date(),
      pagesAnalyzed: 0,
      uniqueUrls: 0,
      skippedUrls: 0,
      failedUrls: 0,
    };
    job.updatedAt = new Date();

    this.emit('jobStart', { jobId: id, job });

    try {
      // Handle robots.txt and sitemap
      if (job.config.respectRobotsTxt) {
        await this.parseRobotsTxt(job.config.url);
      }

      if (job.config.sitemapUrl) {
        const urls = await this.parseSitemap(job.config.sitemapUrl);
        this.sitemapUrls.set(id, urls);
        job.progress.totalPages = urls.length;
      }

      // Run crawler
      const crawler = this.getCrawlerForJob(job);
      await crawler.run([job.config.url]);

      // Only complete if not already completed (in case maxPages was reached)
      if (job.progress.status !== 'completed') {
        // Update final progress
        job.progress = {
          ...job.progress,
          status: 'completed',
          endTime: new Date(),
          totalPages: job.result?.pages.length || 0,
        };
        job.updatedAt = new Date();

        if (job.result) {
          job.result.progress = { ...job.progress };
          await this.summarizeResults(job);
        }

        this.emit('jobComplete', { jobId: id, job });
      }

      // Clean up crawler
      this.crawlers.delete(id);
      this.jobs.set(id, job);
      return job;
    } catch (error) {
      job.progress = {
        ...job.progress,
        status: 'failed',
        endTime: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
      job.updatedAt = new Date();

      if (job.result) {
        job.result.progress = { ...job.progress };
      }

      this.emit('jobError', {
        jobId: id,
        error: error instanceof Error ? error : new Error(String(error)),
        job,
      });

      await this.failJob(
        id,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  async getJob(id: string): Promise<CrawlJob> {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job ${id} not found`);
    return job;
  }

  async getProgress(id: string): Promise<CrawlProgress> {
    const job = await this.getJob(id);
    return job.progress;
  }

  async updateProgress(
    id: string,
    progress: Partial<CrawlProgress>,
  ): Promise<CrawlProgress> {
    const job = await this.getJob(id);
    job.progress = { ...job.progress, ...progress };
    job.updatedAt = new Date();
    this.jobs.set(id, job);
    return job.progress;
  }

  async completeJob(id: string, result: CrawlResult): Promise<CrawlJob> {
    const job = await this.getJob(id);
    job.result = result;
    job.progress = {
      ...job.progress,
      status: 'completed',
      endTime: new Date(),
      totalPages: result.pages.length,
      pagesAnalyzed: result.pages.length,
      uniqueUrls: new Set(result.pages.map((p) => p.url)).size,
    };
    job.updatedAt = new Date();
    job.result.progress = { ...job.progress };
    await this.summarizeResults(job);
    this.jobs.set(id, job);
    return job;
  }

  async failJob(id: string, error: Error): Promise<CrawlJob> {
    const job = await this.getJob(id);
    job.progress = {
      ...job.progress,
      status: 'failed',
      endTime: new Date(),
      error: error.message,
    };
    job.updatedAt = new Date();

    if (job.result) {
      job.result.progress = { ...job.progress };
      job.result.errors.totalErrors++;
      job.result.errors.errorTypes[error.constructor.name] =
        (job.result.errors.errorTypes[error.constructor.name] || 0) + 1;
      job.result.errors.errorPages.push({
        url: job.progress.currentUrl || job.config.url,
        error: error.message,
        timestamp: new Date(),
      });
    }

    this.jobs.set(id, job);
    return job;
  }
}
