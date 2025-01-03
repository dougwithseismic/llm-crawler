/**
 * Enhanced types for the crawler service
 */

import type { BrowserContext as PlaywrightBrowserContext } from 'playwright';
import type {
  ExtractPluginMetrics,
  ExtractPluginSummaries,
} from './types/plugin';

// Core types for the crawler
export type WebhookEventType = 'started' | 'progress' | 'completed' | 'failed';

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  retries?: number;
  on?: WebhookEventType[]; // If not provided, will send all events
}

export interface CrawlConfig {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  maxRequestsPerMinute?: number;
  maxConcurrency?: number;
  timeout?: {
    page?: number;
    request?: number;
  };
  headers?: Record<string, string>;
  userAgent?: string;
  respectRobotsTxt?: boolean;
  sitemapUrl?: string | null;
  urlFilter?: (url: string) => boolean;
  webhook?: WebhookConfig;
}

export interface CrawlProgress {
  pagesAnalyzed: number;
  totalPages: number;
  currentDepth: number;
  uniqueUrls: number;
  skippedUrls: number;
  failedUrls: number;
  startTime: Date;
  endTime?: Date;
  currentUrl?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface CrawlJob {
  id: string;
  config: CrawlConfig;
  progress: CrawlProgress;
  result?: CrawlResult;
  priority: number;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

// Base page analysis type that plugins extend
export interface BasePageAnalysis {
  url: string;
  status: number;
  redirectChain: string[];
  timing: {
    start: number;
    domContentLoaded: number;
    loaded: number;
  };
}

// Combined page analysis type that includes all plugin metrics
export type PageAnalysis = BasePageAnalysis & ExtractPluginMetrics<any>;

// Error tracking type
export interface ErrorSummary {
  totalErrors: number;
  errorTypes: Record<string, number>;
  errorPages: Array<{
    url: string;
    error: string;
    timestamp: Date;
  }>;
}

// Final result type
export interface CrawlResult {
  config: CrawlConfig;
  progress: CrawlProgress;
  pages: PageAnalysis[];
  errors: ErrorSummary;
  summary: ExtractPluginSummaries<any>;
}

// Event types for the crawler
export type CrawlEvent =
  | 'jobStart'
  | 'jobComplete'
  | 'jobError'
  | 'pageStart'
  | 'pageComplete'
  | 'pageError'
  | 'progress';

export interface CrawlEventMap {
  jobStart: { jobId: string; job: CrawlJob };
  jobComplete: { jobId: string; job: CrawlJob };
  jobError: { jobId: string; error: Error; job: CrawlJob };
  pageStart: { jobId: string; url: string; job: CrawlJob };
  pageComplete: {
    jobId: string;
    url: string;
    pageAnalysis: PageAnalysis;
    job: CrawlJob;
  };
  pageError: { jobId: string; url: string; error: Error; job: CrawlJob };
  progress: {
    jobId: string;
    progress: CrawlProgress;
    pageAnalysis: PageAnalysis;
    job: CrawlJob;
  };
}

// Browser context type for mocking
export interface BrowserContext {
  setUserAgent(userAgent: string): Promise<void>;
  exposeBinding(name: string, callback: Function): Promise<void>;
  addInitScript<T>(
    script: { content: string } | ((arg: T) => any),
    arg?: T,
  ): Promise<void>;
  removeAllListeners(): void;
  on(event: string, callback: Function): void;
}
