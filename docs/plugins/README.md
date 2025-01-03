# Plugin System

The LLM Crawler uses a flexible plugin system that allows you to extend its functionality with custom analysis capabilities.

## Overview

Plugins are TypeScript classes that implement the `CrawlerPlugin` interface. Each plugin can:

- Define custom metrics to collect from pages
- Process and analyze page content
- Generate summaries of collected data
- Hook into the crawler lifecycle

## Plugin Interface

```typescript
interface CrawlerPlugin<
  N extends string = string,  // Plugin name
  M = BasePluginMetric,      // Metrics type
  S = BasePluginSummary      // Summary type
> {
  readonly name: N;          // Unique plugin name
  enabled: boolean;          // Plugin state
  initialize(): Promise<void>;  // Setup hook
  beforeCrawl?(job: CrawlJob): Promise<void>;  // Pre-crawl hook
  afterCrawl?(job: CrawlJob): Promise<void>;   // Post-crawl hook
  evaluate(page: Page, loadTime: number): Promise<Record<N, M>>;  // Page analysis
  summarize(pages: Array<Record<N, M>>): Promise<Record<N, S>>;  // Results summary
  destroy?(): Promise<void>;  // Cleanup hook
}
```

## Creating a Plugin

Here's an example of a basic plugin that analyzes page performance:

```typescript
interface PerformanceMetrics {
  loadTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
}

interface PerformanceSummary {
  averageLoadTime: number;
  averageFCP: number;
  averageLCP: number;
  slowestPages: Array<{
    url: string;
    loadTime: number;
  }>;
}

export class PerformancePlugin implements CrawlerPlugin<
  'performance',
  PerformanceMetrics,
  PerformanceSummary
> {
  readonly name = 'performance';
  enabled = true;

  async initialize(): Promise<void> {
    // Plugin initialization (if needed)
  }

  async evaluate(
    page: Page,
    loadTime: number
  ): Promise<Record<'performance', PerformanceMetrics>> {
    const metrics = await page.evaluate(() => ({
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      largestContentfulPaint: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime || 0,
    }));

    return { performance: metrics };
  }

  async summarize(
    pages: Array<Record<'performance', PerformanceMetrics>>
  ): Promise<Record<'performance', PerformanceSummary>> {
    const metrics = pages.map(p => p.performance);
    
    // Calculate averages
    const averageLoadTime = metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length;
    const averageFCP = metrics.reduce((sum, m) => sum + m.firstContentfulPaint, 0) / metrics.length;
    const averageLCP = metrics.reduce((sum, m) => sum + m.largestContentfulPaint, 0) / metrics.length;

    // Find slowest pages
    const slowestPages = pages
      .map((p, i) => ({
        url: p.performance.url,
        loadTime: metrics[i].loadTime,
      }))
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, 5);

    return {
      performance: {
        averageLoadTime,
        averageFCP,
        averageLCP,
        slowestPages,
      },
    };
  }
}
```

## Using Plugins

1. Create your plugin class:

```typescript
// src/services/crawler/plugins/my-plugin.ts
export class MyPlugin implements CrawlerPlugin<'myPlugin', MyMetrics, MySummary> {
  // Plugin implementation
}
```

2. Register the plugin with the crawler:

```typescript
import { CrawlerService } from '../services/crawler';
import { MyPlugin } from '../services/crawler/plugins/my-plugin';

const crawler = new CrawlerService({
  plugins: [new MyPlugin()],
  config: { debug: true },
});
```

## Built-in Plugins

### 1. Content Plugin

Analyzes page content including:

- Title and meta description
- Word count
- Heading structure
- Image count
- Internal/external links

```typescript
interface ContentMetrics {
  title: string;
  description: string | null;
  wordCount: number;
  headings: {
    h1: number;
    h2: number;
    h3: number;
  };
  images: number;
  links: {
    internal: number;
    external: number;
  };
}
```

## Plugin Best Practices

1. **Performance**
   - Keep page evaluation fast
   - Minimize DOM operations
   - Use efficient selectors
   - Cache results when possible

2. **Error Handling**
   - Handle missing elements gracefully
   - Provide fallback values
   - Log errors appropriately
   - Don't break the crawl process

3. **Memory Management**
   - Clean up resources
   - Avoid memory leaks
   - Use appropriate data structures
   - Implement destroy() when needed

4. **Type Safety**
   - Use strict TypeScript types
   - Avoid type assertions
   - Document type parameters
   - Use meaningful interfaces

## Plugin Development Guide

1. **Planning**
   - Define clear metrics
   - Plan data collection
   - Consider performance impact
   - Design type structure

2. **Implementation**
   - Create plugin class
   - Implement required methods
   - Add error handling
   - Test thoroughly

3. **Testing**
   - Unit test core logic
   - Test with real pages
   - Verify error cases
   - Check performance

4. **Documentation**
   - Document metrics
   - Explain configuration
   - Provide examples
   - List limitations

## Example Plugins

Check the `examples/` directory for more plugin examples:

- SEO Analysis Plugin
- Accessibility Plugin
- Security Scanner Plugin
- Schema Validator Plugin
