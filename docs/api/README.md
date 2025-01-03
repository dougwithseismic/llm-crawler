# API Reference

This document details the REST API endpoints provided by the GTM Crawler service.

## Endpoints

### Create Crawl Job

```http
POST /crawl/:sitedomain
```

Creates a new crawl job for the specified domain.

#### URL Parameters

- `sitedomain` (required): The domain to crawl (e.g., example.com)

#### Request Body

```typescript
{
  // Optional parameters
  maxDepth?: number;        // Maximum crawl depth (1-10)
  maxPages?: number;        // Maximum pages to crawl (1-1000)
  maxRequestsPerMinute?: number;  // Rate limiting (1-300)
  maxConcurrency?: number;  // Parallel requests (1-100)
  timeout?: {
    page?: number;         // Page timeout (1000-60000ms)
    request?: number;      // Request timeout (1000-60000ms)
  };
  headers?: Record<string, string>;  // Custom HTTP headers
  userAgent?: string;      // Custom user agent
  respectRobotsTxt?: boolean;  // Honor robots.txt
  sitemapUrl?: string | null;  // Sitemap URL

  // Required parameters
  webhook: {
    url: string;          // Webhook URL for updates
    headers?: Record<string, string>;  // Webhook headers
    retries?: number;     // Retry attempts (1-5)
    on?: Array<'started' | 'progress' | 'completed' | 'failed'>;
  };
}
```

#### Response

```typescript
{
  message: string;        // Success message
  jobId: string;         // Unique job identifier
  status: 'accepted';    // Job status
  queueInfo: {
    position: number;    // Position in queue
    isProcessing: boolean;  // Queue status
    estimatedStart: string;  // Estimated start time
  };
  webhook: {
    url: string;        // Configured webhook URL
    expectedUpdates: string[];  // Expected update types
  };
}
```

#### Example

```bash
curl -X POST http://localhost:3000/crawl/example.com \
  -H "Content-Type: application/json" \
  -d '{
    "maxDepth": 3,
    "maxPages": 100,
    "webhook": {
      "url": "https://your-server.com/webhook"
    }
  }'
```

### Webhook Updates

The crawler sends updates to your webhook URL at various stages of the crawl process.

#### 1. Job Started

```typescript
{
  status: 'started';
  jobId: string;
  timestamp: string;  // ISO date string
}
```

#### 2. Progress Updates

```typescript
{
  status: 'progress';
  jobId: string;
  timestamp: string;
  progress: {
    pagesAnalyzed: number;
    totalPages: number;
    currentUrl: string;
    uniqueUrls: number;
    skippedUrls: number;
    failedUrls: number;
  };
}
```

#### 3. Job Completed

```typescript
{
  status: 'completed';
  jobId: string;
  timestamp: string;
  result: {
    pages: Array<{
      url: string;
      status: number;
      redirectChain: string[];
      timing: {
        start: number;
        domContentLoaded: number;
        loaded: number;
      };
      // Plugin-specific metrics
      content?: {
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
      };
    }>;
    summary: {
      // Plugin-specific summaries
      content?: {
        totalPages: number;
        averageWordCount: number;
        totalImages: number;
        totalLinks: {
          internal: number;
          external: number;
        };
        missingMetadata: {
          title: number;
          description: number;
        };
      };
    };
  };
}
```

#### 4. Job Failed

```typescript
{
  status: 'failed';
  jobId: string;
  timestamp: string;
  error: string;
}
```

## Error Responses

The API uses standard HTTP status codes and returns errors in a consistent format:

```typescript
{
  error: string;       // Error type
  message: string;     // Error description
  issues?: any[];      // Validation issues (if applicable)
}
```

Common error codes:

- `400`: Invalid request (e.g., invalid domain, bad configuration)
- `429`: Too many requests
- `500`: Internal server error

## Rate Limiting

The API implements rate limiting based on:

- IP address
- Domain being crawled
- Overall system load

Default limits:

- 60 requests per minute per IP
- 10 concurrent crawl jobs
- 300 requests per minute per domain

## Best Practices

1. **Webhook Reliability**
   - Implement idempotent webhook handlers
   - Use webhook retries
   - Store webhook secret securely

2. **Resource Management**
   - Set reasonable maxPages limits
   - Adjust concurrency based on target site
   - Use appropriate timeouts

3. **Error Handling**
   - Handle all webhook event types
   - Implement proper error recovery
   - Monitor failed jobs

4. **Performance**
   - Cache results when possible
   - Use appropriate rate limits
   - Monitor resource usage
