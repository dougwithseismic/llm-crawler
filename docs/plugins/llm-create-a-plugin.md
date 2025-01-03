# Creating a New Plugin

This guide walks through creating a new plugin for the GTM Crawler, explaining each component and method available.

## Plugin Structure

Every plugin must implement the `CrawlerPlugin` interface with three type parameters:

- `N`: Literal string type for plugin name
- `M`: Plugin metrics type
- `S`: Plugin summary type

```typescript
interface CrawlerPlugin<N extends string, M, S> {
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
```

## Step-by-Step Creation

### 1. Define Your Types

Start by defining the types for your plugin's metrics and summary:

```typescript
interface MyPluginMetrics {
  timestamp: string;
  customValue: number;
  data: {
    key: string;
    value: string;
  }[];
}

interface MyPluginSummary {
  totalCustomValue: number;
  averageCustomValue: number;
  uniqueKeys: string[];
}
```

### 2. Create Plugin Options

Define any configuration options your plugin needs:

```typescript
interface MyPluginOptions extends PluginConstructorOptions {
  apiKey?: string;
  customSetting?: boolean;
}
```

### 3. Implement the Plugin Class

Here's a template with explanations for each method:

```typescript
export class MyPlugin implements CrawlerPlugin<'myPlugin', MyPluginMetrics, MyPluginSummary> {
  readonly name = 'myPlugin';
  enabled: boolean;
  private apiKey: string;
  private customSetting: boolean;

  constructor(options: MyPluginOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.apiKey = options.apiKey ?? process.env.MY_PLUGIN_API_KEY ?? '';
    this.customSetting = options.customSetting ?? false;
  }

  /**
   * Called once when the crawler service starts
   * Use for:
   * - API client initialization
   * - Database connections
   * - Resource allocation
   */
  async initialize(): Promise<void> {
    // Setup code here
    if (!this.apiKey) {
      throw new Error('API key required');
    }
  }

  /**
   * Called before starting to crawl a website
   * Use for:
   * - Job-specific setup
   * - Resource allocation
   * - Initial API calls
   */
  async beforeCrawl(job: CrawlJob): Promise<void> {
    console.log(`Starting crawl of ${job.config.url}`);
    // Job setup code
  }

  /**
   * Called before loading each page
   * Use for:
   * - Adding custom scripts
   * - Setting cookies
   * - Modifying headers
   * - Preparing page state
   */
  async beforeEach(page: Page): Promise<void> {
    await page.addScriptTag({
      content: `
        window.__myPlugin = {
          startTime: Date.now(),
          customSetting: ${this.customSetting}
        };
      `,
    });
  }

  /**
   * Main analysis method - called for each page
   * Use for:
   * - Collecting page metrics
   * - Running page analysis
   * - Extracting data
   * Returns: Record with plugin name key and metrics
   */
  async evaluate(page: Page, loadTime: number): Promise<Record<'myPlugin', MyPluginMetrics>> {
    const metrics = await page.evaluate(() => {
      // Example page analysis
      const data = Array.from(document.querySelectorAll('[data-custom]')).map(el => ({
        key: el.getAttribute('data-custom') || '',
        value: el.textContent || ''
      }));

      return {
        timestamp: new Date().toISOString(),
        customValue: document.querySelectorAll('.target-class').length,
        data
      };
    });

    return { myPlugin: metrics };
  }

  /**
   * Called after analyzing each page
   * Use for:
   * - Cleanup of page modifications
   * - Resource release
   * - State reset
   */
  async afterEach(page: Page): Promise<void> {
    await page.evaluate(() => {
      delete (window as any).__myPlugin;
    });
  }

  /**
   * Called after completing a website crawl
   * Use for:
   * - Final API calls
   * - Resource cleanup
   * - Job completion tasks
   */
  async afterCrawl(job: CrawlJob): Promise<void> {
    console.log(`Completed crawl of ${job.config.url}`);
    // Cleanup code
  }

  /**
   * Generate final analysis from all pages
   * Use for:
   * - Aggregating metrics
   * - Computing statistics
   * - Generating reports
   * Returns: Record with plugin name key and summary
   */
  async summarize(pages: Array<Record<'myPlugin', MyPluginMetrics>>): Promise<Record<'myPlugin', MyPluginSummary>> {
    const allMetrics = pages.map(p => p.myPlugin);
    const totalCustomValue = allMetrics.reduce((sum, m) => sum + m.customValue, 0);
    
    return {
      myPlugin: {
        totalCustomValue,
        averageCustomValue: totalCustomValue / pages.length,
        uniqueKeys: [...new Set(allMetrics.flatMap(m => m.data.map(d => d.key)))]
      }
    };
  }

  /**
   * Called when the crawler service shuts down
   * Use for:
   * - Closing connections
   * - Cleanup of global resources
   * - Final logging
   */
  async destroy(): Promise<void> {
    // Cleanup code
  }
}
```

## Usage Example

```typescript
// Create plugin instance
const plugin = new MyPlugin({
  apiKey: 'your-api-key',
  customSetting: true
});

// Use in crawler service
const crawler = new CrawlerService({
  plugins: [plugin],
  config: { debug: true }
});

// Create and run a job
const job = await crawler.createJob({
  url: 'https://example.com',
  webhook: {
    url: 'https://your-server.com/webhook'
  }
});
```

## Best Practices

1. **Error Handling**

   ```typescript
   async evaluate(page: Page): Promise<Record<'myPlugin', MyPluginMetrics>> {
     try {
       const metrics = await page.evaluate(() => {
         // Your evaluation code
       });
       return { myPlugin: metrics };
     } catch (error) {
       console.error(`Plugin evaluation failed: ${error}`);
       return {
         myPlugin: {
           timestamp: new Date().toISOString(),
           customValue: 0,
           data: []
         }
       };
     }
   }
   ```

2. **Resource Management**

   ```typescript
   private resources: any[] = [];

   async initialize(): Promise<void> {
     // Allocate resources
     this.resources.push(await createResource());
   }

   async destroy(): Promise<void> {
     // Clean up resources
     await Promise.all(this.resources.map(r => r.dispose()));
     this.resources = [];
   }
   ```

3. **Type Safety**

   ```typescript
   // Use strict types
   private validateMetrics(metrics: unknown): MyPluginMetrics {
     if (!metrics || typeof metrics !== 'object') {
       throw new Error('Invalid metrics');
     }
     // Add your validation logic
     return metrics as MyPluginMetrics;
   }
   ```

## Available Hooks

| Hook | When Called | Use Cases |
|------|-------------|-----------|
| `initialize()` | Service start | Setup, connections |
| `beforeCrawl()` | Job start | Job setup, initial state |
| `beforeEach()` | Before page load | Page preparation |
| `evaluate()` | After page load | Data collection |
| `afterEach()` | After evaluation | Page cleanup |
| `afterCrawl()` | Job completion | Job cleanup |
| `summarize()` | Results processing | Analysis, reports |
| `destroy()` | Service shutdown | Resource cleanup |

## Plugin Options

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | `boolean` | Enable/disable plugin |
| `config` | `Record<string, unknown>` | Custom configuration |
| Custom options | Any | Plugin-specific options |
