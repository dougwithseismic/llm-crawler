# LLM Crawler Examples

This guide provides practical examples of using the LLM Crawler for various common scenarios.

## Basic Examples

### 1. Simple Site Crawl

Basic crawl of a website with default settings:

```typescript
const response = await fetch('http://localhost:3000/crawl/example.com', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    webhook: {
      url: 'https://your-server.com/webhook'
    }
  })
});

const { jobId } = await response.json();
```

### 2. Limited Depth Crawl

Crawl only the first two levels of a site:

```typescript
const config = {
  maxDepth: 2,
  maxPages: 50,
  webhook: {
    url: 'https://your-server.com/webhook',
    on: ['completed', 'failed']  // Only get final results
  }
};

const response = await fetch('http://localhost:3000/crawl/example.com', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(config)
});
```

## Advanced Use Cases

### 1. SEO Analysis

Crawl a site to analyze SEO metrics:

```typescript
// Custom SEO Plugin
class SeoPlugin implements CrawlerPlugin<'seo', SeoMetrics, SeoSummary> {
  readonly name = 'seo';
  enabled = true;

  async evaluate(page: Page): Promise<Record<'seo', SeoMetrics>> {
    const metrics = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      h1Count: document.querySelectorAll('h1').length,
      metaRobots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
      structuredData: Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(script => script.textContent)
    }));

    return { seo: metrics };
  }

  async summarize(pages: Array<Record<'seo', SeoMetrics>>): Promise<Record<'seo', SeoSummary>> {
    // Analyze SEO metrics across all pages
    const summary = {
      totalPages: pages.length,
      missingTitles: pages.filter(p => !p.seo.title).length,
      missingDescriptions: pages.filter(p => !p.seo.description).length,
      multipleH1s: pages.filter(p => p.seo.h1Count > 1).length,
      hasStructuredData: pages.filter(p => p.seo.structuredData.length > 0).length
    };

    return { seo: summary };
  }
}

// Use the plugin
const crawler = new CrawlerService({
  plugins: [new SeoPlugin()],
  config: { debug: true }
});
```

### 2. Content Audit

Analyze content quality and structure:

```typescript
// Webhook handler for content audit
app.post('/webhook', async (req, res) => {
  const { status, result } = req.body;

  if (status === 'completed') {
    const contentAnalysis = result.pages.map(page => ({
      url: page.url,
      metrics: {
        wordCount: page.content.wordCount,
        readingTime: Math.ceil(page.content.wordCount / 200), // words per minute
        headingStructure: {
          h1: page.content.headings.h1,
          h2: page.content.headings.h2,
          h3: page.content.headings.h3
        },
        images: page.content.images,
        links: page.content.links
      }
    }));

    // Generate report
    await generateContentReport(contentAnalysis);
  }

  res.sendStatus(200);
});
```

### 3. Performance Monitoring

Monitor site performance metrics:

```typescript
// Performance tracking configuration
const config = {
  maxConcurrency: 1, // Ensure accurate timing
  maxRequestsPerMinute: 30,
  timeout: {
    page: 60000, // Allow time for full page load
    request: 30000
  },
  webhook: {
    url: 'https://your-server.com/performance-webhook',
    headers: {
      'Authorization': 'Bearer your-token'
    }
  }
};

// Webhook handler for performance data
app.post('/performance-webhook', async (req, res) => {
  const { status, result } = req.body;

  if (status === 'completed') {
    const performanceData = result.pages.map(page => ({
      url: page.url,
      timing: {
        ttfb: page.timing.start,
        domContentLoaded: page.timing.domContentLoaded - page.timing.start,
        fullLoad: page.timing.loaded - page.timing.start
      }
    }));

    // Store metrics
    await storePerformanceMetrics(performanceData);
  }

  res.sendStatus(200);
});
```

### 4. Custom URL Filtering

Implement custom crawling rules:

```typescript
const config = {
  maxPages: 500,
  urlFilter: (url: string) => {
    // Parse URL
    const urlObj = new URL(url);
    
    // Skip non-product pages
    if (!urlObj.pathname.startsWith('/products/')) {
      return false;
    }
    
    // Skip pagination
    if (urlObj.searchParams.has('page')) {
      return false;
    }
    
    // Skip certain categories
    const excludedCategories = ['clearance', 'discontinued'];
    if (excludedCategories.some(cat => urlObj.pathname.includes(cat))) {
      return false;
    }
    
    return true;
  },
  webhook: {
    url: 'https://your-server.com/webhook'
  }
};
```

## Integration Examples

### 1. Express.js Integration

```typescript
import express from 'express';
import { CrawlerService } from './services/crawler';
import { ContentPlugin } from './services/crawler/plugins/content';

const app = express();
const crawler = new CrawlerService({
  plugins: [new ContentPlugin()],
  config: { debug: process.env.NODE_ENV === 'development' }
});

app.post('/analyze-site', async (req, res) => {
  const { domain } = req.body;
  
  try {
    const job = await crawler.createJob({
      url: `https://${domain}`,
      maxPages: 100,
      webhook: {
        url: `${process.env.API_URL}/webhook`,
        headers: {
          'Authorization': `Bearer ${process.env.WEBHOOK_SECRET}`
        }
      }
    });

    res.json({
      message: 'Analysis started',
      jobId: job.id
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start analysis',
      message: error.message
    });
  }
});
```

### 2. Queue Integration

```typescript
import { QueueService } from './services/crawler/queue-service';

const queue = new QueueService(crawler);

// Add rate limiting
app.post('/analyze-bulk', async (req, res) => {
  const { domains } = req.body;
  
  try {
    const jobs = await Promise.all(
      domains.map(domain => 
        crawler.createJob({
          url: `https://${domain}`,
          maxPages: 50,
          webhook: {
            url: `${process.env.API_URL}/webhook`
          }
        })
      )
    );

    // Enqueue all jobs
    await Promise.all(jobs.map(job => queue.enqueue(job)));

    res.json({
      message: 'Bulk analysis started',
      jobs: jobs.map(j => ({
        jobId: j.id,
        domain: new URL(j.config.url).hostname
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start bulk analysis',
      message: error.message
    });
  }
});
```

## Error Handling Examples

```typescript
// Retry configuration
const config = {
  maxRetries: 3,
  webhook: {
    url: 'https://your-server.com/webhook',
    retries: 3,
    on: ['failed']
  }
};

// Error webhook handler
app.post('/webhook', async (req, res) => {
  const { status, jobId, error } = req.body;

  if (status === 'failed') {
    console.error(`Job ${jobId} failed:`, error);
    
    // Analyze error type
    if (error.includes('timeout')) {
      // Handle timeout errors
      await handleTimeout(jobId);
    } else if (error.includes('blocked')) {
      // Handle rate limiting
      await handleRateLimiting(jobId);
    } else {
      // Handle other errors
      await handleGeneralError(jobId, error);
    }
  }

  res.sendStatus(200);
});
```

These examples demonstrate common use cases and patterns for using the LLM Crawler. For more specific examples or custom implementations, please refer to the API documentation or open an issue on GitHub.
