import type { Page } from 'playwright';
import type { CrawlJob } from '../types.improved';

/**
 * Base interface for plugin metrics
 * Each plugin will extend this to define its own metric type
 */
export type BasePluginMetric = unknown;

/**
 * Base interface for plugin summary
 * Each plugin will extend this to define its own summary type
 */
export type BasePluginSummary = unknown;

/**
 * Base interface for crawler plugins
 * @template N - Plugin name literal type
 * @template M - Plugin metrics type
 * @template S - Plugin summary type
 */
export interface CrawlerPlugin<
  N extends string = string,
  M = BasePluginMetric,
  S = BasePluginSummary,
> {
  readonly name: N;
  enabled: boolean;
  initialize(): Promise<void>;
  beforeCrawl?(job: CrawlJob): Promise<void>;
  afterCrawl?(job: CrawlJob): Promise<void>;
  beforeEach?(page: Page): Promise<void>;
  afterEach?(page: Page): Promise<void>;
  evaluate(page: Page, loadTime: number): Promise<Record<N, M>>;
  summarize(pages: Array<Record<N, M>>): Promise<Record<N, S>>;
  destroy?(): Promise<void>;
}

// Plugin constructor options
export interface PluginConstructorOptions {
  enabled?: boolean;
  config?: Record<string, unknown>;
}

// Service configuration interface
export interface CrawlerServiceConfig {
  debug?: boolean;
}

// Service options interface
export interface CrawlerServiceOptions<
  T extends CrawlerPlugin<string, BasePluginMetric, BasePluginSummary>[],
> {
  plugins: T;
  config?: CrawlerServiceConfig;
}

/**
 * Helper type to extract metric types from plugins array
 */
export type ExtractPluginMetrics<
  T extends CrawlerPlugin<string, BasePluginMetric, BasePluginSummary>[],
> = UnionToIntersection<
  T[number] extends CrawlerPlugin<infer N, infer M, any> ? Record<N, M> : never
>;

/**
 * Helper type to extract summary types from plugins array
 */
export type ExtractPluginSummaries<
  T extends CrawlerPlugin<string, BasePluginMetric, BasePluginSummary>[],
> = UnionToIntersection<
  T[number] extends CrawlerPlugin<infer N, any, infer S> ? Record<N, S> : never
>;

/**
 * Utility type to convert union to intersection
 * This allows us to combine all plugin metrics/summaries into a single type
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;
