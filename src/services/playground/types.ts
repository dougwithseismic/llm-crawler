import { EventEmitter } from 'events';

export interface PlaygroundStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export type WebhookEventType = 'started' | 'progress' | 'completed' | 'failed';

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  retries?: number;
  on?: WebhookEventType[]; // If not provided, will send all events
}

export interface PlaygroundPlugin<TMetric = any, TSummary = any> {
  name: string;
  enabled: boolean;
  storage?: PlaygroundStorage;
  initialize?(): Promise<void>;
  before?(context: PlaygroundContext): Promise<void>;
  execute(context: PlaygroundContext): Promise<TMetric>;
  after?(context: PlaygroundContext): Promise<void>;
  summarize?(metrics: TMetric[]): Promise<TSummary>;
}

export interface PlaygroundContext {
  jobId: string;
  input: any;
  output?: any;
  startTime: Date;
  storage: PlaygroundStorage;
  [key: string]: any;
}

export interface PlaygroundConfig {
  input: any;
  retries?: number;
  plugins?: string[];
  webhook?: WebhookConfig;
  async?: boolean; // If true, don't wait for job completion before responding
}

export interface PlaygroundProgress {
  status: 'queued' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  error?: string;
  currentPlugin?: string;
  completedPlugins: string[];
}

export interface PlaygroundResult<TMetric = any, TSummary = any> {
  config: PlaygroundConfig;
  progress: PlaygroundProgress;
  metrics: TMetric[];
  summary?: TSummary;
  error?: {
    message: string;
    plugin?: string;
    timestamp: Date;
  };
}

export interface PlaygroundJob<TMetric = any, TSummary = any> {
  id: string;
  config: PlaygroundConfig;
  progress: PlaygroundProgress;
  result?: PlaygroundResult<TMetric, TSummary>;
  priority: number;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaygroundServiceOptions {
  plugins: Array<PlaygroundPlugin>;
  config?: {
    debug?: boolean;
  };
}

export type PlaygroundEventMap = {
  jobStart: { jobId: string; job: PlaygroundJob };
  jobComplete: { jobId: string; job: PlaygroundJob };
  jobError: { jobId: string; error: Error; job: PlaygroundJob };
  pluginStart: { jobId: string; pluginName: string; job: PlaygroundJob };
  pluginComplete: {
    jobId: string;
    pluginName: string;
    metrics: any;
    job: PlaygroundJob;
  };
  pluginError: {
    jobId: string;
    pluginName: string;
    error: Error;
    job: PlaygroundJob;
  };
};
