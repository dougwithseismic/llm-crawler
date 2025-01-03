import { EventEmitter } from 'events';
import type {
  PlaygroundJob,
  PlaygroundConfig,
  PlaygroundProgress,
  PlaygroundResult,
  PlaygroundPlugin,
  PlaygroundContext,
  PlaygroundEventMap,
  PlaygroundServiceOptions,
  PlaygroundStorage,
  WebhookConfig,
  WebhookEventType,
} from './types';

class MemoryStorage implements PlaygroundStorage {
  private storage = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    return this.storage.get(key) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

export class PlaygroundService extends EventEmitter {
  private jobs: Map<string, PlaygroundJob> = new Map();
  private plugins: Array<PlaygroundPlugin>;
  private debug: boolean;

  constructor(options: PlaygroundServiceOptions) {
    super();
    this.plugins = options.plugins;
    this.debug = options.config?.debug ?? false;
    this.initializePlugins();
    this.setupWebhookHandlers();
  }

  // Type-safe event emitter methods
  on<E extends keyof PlaygroundEventMap>(
    event: E,
    listener: (args: PlaygroundEventMap[E]) => void,
  ): this {
    return super.on(event, listener);
  }

  emit<E extends keyof PlaygroundEventMap>(
    event: E,
    args: PlaygroundEventMap[E],
  ): boolean {
    return super.emit(event, args);
  }

  private async initializePlugins(): Promise<void> {
    for (const plugin of this.plugins) {
      try {
        if (plugin.initialize) {
          await plugin.initialize();
        }
        // Initialize plugin storage if not provided
        if (!plugin.storage) {
          plugin.storage = new MemoryStorage();
        }
      } catch (error) {
        console.error(`Failed to initialize plugin ${plugin.name}:`, error);
      }
    }
  }

  private createEmptyResult = (job: PlaygroundJob): PlaygroundResult => ({
    config: job.config,
    progress: job.progress,
    metrics: [],
  });

  async createJob(config: PlaygroundConfig): Promise<PlaygroundJob> {
    const id = crypto.randomUUID();
    const now = new Date();

    const job: PlaygroundJob = {
      id,
      config,
      progress: {
        status: 'queued',
        startTime: now,
        completedPlugins: [],
      },
      priority: 0,
      retries: 0,
      maxRetries: config.retries ?? 3,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(id, job);

    // Start job immediately
    return this.startJob(id);
  }

  async startJob(id: string): Promise<PlaygroundJob> {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job ${id} not found`);

    job.result = this.createEmptyResult(job);
    job.progress = {
      ...job.progress,
      status: 'running',
      startTime: new Date(),
      completedPlugins: [],
    };
    job.updatedAt = new Date();

    this.emit('jobStart', { jobId: id, job });

    try {
      // Create context
      const context: PlaygroundContext = {
        jobId: id,
        input: job.config.input,
        startTime: new Date(),
        storage: new MemoryStorage(),
      };

      // Run enabled plugins in sequence
      for (const plugin of this.plugins) {
        if (!plugin.enabled) continue;
        if (job.config.plugins && !job.config.plugins.includes(plugin.name))
          continue;

        try {
          job.progress.currentPlugin = plugin.name;
          this.emit('pluginStart', { jobId: id, pluginName: plugin.name, job });

          // Run before hook
          if (plugin.before) {
            await plugin.before(context);
          }

          // Execute plugin
          const metrics = await plugin.execute(context);

          // Run after hook
          if (plugin.after) {
            await plugin.after(context);
          }

          // Store metrics
          if (job.result) {
            job.result.metrics.push({ [plugin.name]: metrics });
          }

          // Update progress
          job.progress.completedPlugins.push(plugin.name);
          this.emit('pluginComplete', {
            jobId: id,
            pluginName: plugin.name,
            metrics,
            job,
          });
        } catch (error) {
          this.emit('pluginError', {
            jobId: id,
            pluginName: plugin.name,
            error: error instanceof Error ? error : new Error(String(error)),
            job,
          });

          // Store error and continue with next plugin
          if (job.result) {
            job.result.error = {
              message: error instanceof Error ? error.message : String(error),
              plugin: plugin.name,
              timestamp: new Date(),
            };
          }
        }
      }

      // Summarize results
      if (job.result) {
        const summaries = await Promise.all(
          this.plugins
            .filter((p) => p.enabled && p.summarize)
            .map(async (plugin) => {
              try {
                const metrics = job
                  .result!.metrics.map((m) => m[plugin.name])
                  .filter(Boolean);
                if (plugin.summarize) {
                  return { [plugin.name]: await plugin.summarize(metrics) };
                }
              } catch (error) {
                console.error(`Plugin ${plugin.name} summary failed:`, error);
              }
              return {};
            }),
        );

        job.result.summary = Object.assign({}, ...summaries);
      }

      // Complete job
      job.progress = {
        ...job.progress,
        status: 'completed',
        endTime: new Date(),
        currentPlugin: undefined,
      };
      job.updatedAt = new Date();

      if (job.result) {
        job.result.progress = { ...job.progress };
      }

      this.emit('jobComplete', { jobId: id, job });
      this.jobs.set(id, job);
      return job;
    } catch (error) {
      await this.failJob(
        id,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  async getJob(id: string): Promise<PlaygroundJob> {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job ${id} not found`);
    return job;
  }

  async getProgress(id: string): Promise<PlaygroundProgress> {
    const job = await this.getJob(id);
    return job.progress;
  }

  async failJob(id: string, error: Error): Promise<PlaygroundJob> {
    const job = await this.getJob(id);
    job.progress = {
      ...job.progress,
      status: 'failed',
      endTime: new Date(),
      error: error.message,
    };
    job.updatedAt = new Date();

    // Create result if it doesn't exist
    if (!job.result) {
      job.result = this.createEmptyResult(job);
    }

    // Update result with error
    job.result.progress = { ...job.progress };
    job.result.error = {
      message: error.message,
      timestamp: new Date(),
    };

    this.emit('jobError', { jobId: id, error, job });
    this.jobs.set(id, job);
    return job;
  }

  private async sendWebhook(
    event: WebhookEventType,
    data: any,
    config: WebhookConfig,
  ): Promise<void> {
    const maxRetries = config.retries ?? 3;
    let retries = 0;

    const sendAttempt = async () => {
      try {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...config.headers,
          },
          body: JSON.stringify({
            status: event,
            jobId: data.jobId,
            timestamp: new Date().toISOString(),
            ...data,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
      } catch (error) {
        return false;
      }
    };

    while (retries < maxRetries) {
      if (await sendAttempt()) return;
      retries++;
      if (retries < maxRetries) {
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retries) * 1000),
        );
      } else {
        console.error(
          `Failed to send webhook for event ${event} after ${maxRetries} attempts`,
        );
      }
    }
  }

  private shouldSendWebhook(
    job: PlaygroundJob,
    eventType: WebhookEventType,
  ): boolean {
    if (!job.config.webhook) return false;
    if (!job.config.webhook.on) return true; // Send all events if not specified
    return job.config.webhook.on.includes(eventType);
  }

  private setupWebhookHandlers(): void {
    this.on('jobStart', async ({ jobId, job }) => {
      if (this.shouldSendWebhook(job, 'started')) {
        await this.sendWebhook(
          'started',
          {
            jobId,
            config: {
              input: job.config.input,
              plugins: job.config.plugins,
            },
          },
          job.config.webhook!,
        );
      }
    });

    this.on('jobComplete', async ({ jobId, job }) => {
      if (this.shouldSendWebhook(job, 'completed')) {
        await this.sendWebhook(
          'completed',
          {
            jobId,
            result: job.result,
            summary: {
              duration: job.progress.endTime
                ? new Date(job.progress.endTime).getTime() -
                  new Date(job.progress.startTime).getTime()
                : null,
              completedPlugins: job.progress.completedPlugins,
            },
          },
          job.config.webhook!,
        );
      }
    });

    this.on('jobError', async ({ jobId, job, error }) => {
      if (this.shouldSendWebhook(job, 'failed')) {
        await this.sendWebhook(
          'failed',
          {
            jobId,
            error: error.message,
            progress: job.progress,
          },
          job.config.webhook!,
        );
      }
    });

    this.on('pluginComplete', async ({ jobId, job, pluginName, metrics }) => {
      if (this.shouldSendWebhook(job, 'progress')) {
        await this.sendWebhook(
          'progress',
          {
            jobId,
            pluginName,
            metrics,
            progress: job.progress,
          },
          job.config.webhook!,
        );
      }
    });
  }
}
