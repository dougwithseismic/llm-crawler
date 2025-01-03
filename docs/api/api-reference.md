# API Reference

Comprehensive documentation of the LLM Crawler REST API endpoints, including request/response formats, headers, and examples.

## Base URL

When using the tunnel (recommended):

```
https://{your-ngrok-url}
```

Local development:

```
http://localhost:3000
```

## Authentication

Currently, the API does not require authentication. However, you can implement custom authentication through the `headers` configuration in both the crawler and webhook settings.

## Endpoints

### Create Crawl Job

Creates a new crawl job for the specified domain.

```http
POST /crawl/:sitedomain
```

#### URL Parameters

| Parameter    | Type   | Description                                    |
|-------------|--------|------------------------------------------------|
| sitedomain  | string | Domain to crawl (e.g., example.com)           |

#### Request Headers

| Header          | Type   | Required | Description                    |
|----------------|--------|----------|--------------------------------|
| Content-Type   | string | Yes      | Must be "application/json"     |

#### Request Body

```typescript
{
  // Crawl Depth Control
  maxDepth?: number;        // Range: 1-10, Default: unlimited
  maxPages?: number;        // Range: 1-1000, Default: unlimited

  // Rate Limiting
  maxRequestsPerMinute?: number;  // Range: 1-300, Default: 60
  maxConcurrency?: number;        // Range: 1-100, Default: 10

  // Timeouts
  timeout?: {
    page?: number;         // Range: 1000-60000ms, Default: 30000
    request?: number;      // Range: 1000-60000ms, Default: 30000
  };

  // Request Customization
  headers?: {              // Custom HTTP headers for requests
    [key: string]: string;
  };
  userAgent?: string;      // Custom User-Agent string

  // Crawl Behavior
  respectRobotsTxt?: boolean;  // Default: false
  sitemapUrl?: string;         // URL to sitemap.xml

  // URL Filtering
  urlFilter?: (url: string) => boolean;  // Custom URL filter function

  // Required: Webhook Configuration
  webhook: {
    url: string;          // Webhook endpoint URL
    headers?: {           // Custom webhook request headers
      [key: string]: string;
    };
    retries?: number;     // Range: 1-5, Default: 3
    on?: Array<'started' | 'progress' | 'completed' | 'failed'>;
  };
}
```

#### Response

**Success Response (200 OK)**

```typescript
{
  message: string;        // Success message
  jobId: string;         // Unique job identifier (UUID)
  status: 'accepted';    // Job status
  queueInfo: {
    position: number;    // Position in queue (0 = next)
    isProcessing: boolean;  // Whether queue is processing
    estimatedStart: string;  // Human-readable start estimate
  };
  webhook: {
    url: string;        // Confirmed webhook URL
    expectedUpdates: string[];  // List of update types
  };
}
```

Example:

```json
{
  "message": "Crawl job accepted. Status updates will be sent to the webhook URL.",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "accepted",
  "queueInfo": {
    "position": 0,
    "isProcessing": false,
    "estimatedStart": "Starting shortly"
  },
  "webhook": {
    "url": "https://your-server.com/webhook",
    "expectedUpdates": [
      "started",
      "progress (every 10 seconds + every 10 pages)",
      "completed/failed"
    ]
  }
}
```

**Error Responses**

1. Invalid Domain (400 Bad Request)

```json
{
  "error": "Invalid domain",
  "message": "Please provide a valid domain name (e.g., example.com)"
}
```

2. Invalid Configuration (400 Bad Request)

```json
{
  "error": "Invalid configuration",
  "issues": [
    {
      "code": "invalid_type",
      "path": ["maxPages"],
      "message": "Expected number, received string"
    }
  ]
}
```

3. Server Error (500 Internal Server Error)

```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

## Webhook Updates

The API sends updates to your webhook URL at various stages of the crawl process.

### 1. Job Started Event

Sent when the crawler begins processing your job.

```typescript
{
  status: 'started';
  jobId: string;         // Job UUID
  timestamp: string;     // ISO date string
}
```

Example:

```json
{
  "status": "started",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-03T12:00:00.000Z"
}
```

### 2. Progress Updates

Sent periodically (every 10 seconds) and after every 10 pages crawled.

```typescript
{
  status: 'progress';
  jobId: string;
  timestamp: string;
  progress: {
    pagesAnalyzed: number;   // Pages processed
    totalPages: number;      // Total pages found
    currentUrl: string;      // Current page URL
    uniqueUrls: number;      // Unique URLs found
    skippedUrls: number;     // URLs filtered out
    failedUrls: number;      // Failed requests
  };
}
```

Example:

```json
{
  "status": "progress",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-03T12:00:10.000Z",
  "progress": {
    "pagesAnalyzed": 50,
    "totalPages": 100,
    "currentUrl": "https://example.com/page",
    "uniqueUrls": 45,
    "skippedUrls": 5,
    "failedUrls": 0
  }
}
```

### 3. Job Completed Event

Sent when the crawler finishes processing all pages.

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

### 4. Job Failed Event

Sent when the crawler encounters an unrecoverable error.

```typescript
{
  status: 'failed';
  jobId: string;
  timestamp: string;
  error: string;         // Error description
}
```

Example:

```json
{
  "status": "failed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-03T12:00:15.000Z",
  "error": "Failed to access domain: Connection timeout"
}
```

## Rate Limiting

The API implements the following rate limits:

| Scope          | Limit                    | Window  |
|----------------|--------------------------|---------|
| IP Address     | 60 requests              | 1 minute |
| Domain         | 300 requests             | 1 minute |
| Concurrent Jobs | 10 jobs                 | N/A     |

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1672747200
```

## Error Codes

| Code | Description                                      |
|------|--------------------------------------------------|
| 400  | Bad Request - Invalid parameters or configuration |
| 429  | Too Many Requests - Rate limit exceeded          |
| 500  | Internal Server Error - Server-side failure      |
| 503  | Service Unavailable - Queue/system overload      |

## Example Usage

### Basic Crawl

```bash
curl -X POST "https://your-ngrok-url/crawl/example.com" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "url": "https://your-server.com/webhook"
    }
  }'
```

### Advanced Configuration

```bash
curl -X POST "https://your-ngrok-url/crawl/example.com" \
  -H "Content-Type: application/json" \
  -d '{
    "maxDepth": 3,
    "maxPages": 100,
    "maxRequestsPerMinute": 60,
    "maxConcurrency": 10,
    "timeout": {
      "page": 30000,
      "request": 10000
    },
    "userAgent": "MyBot/1.0",
    "respectRobotsTxt": true,
    "sitemapUrl": "https://example.com/sitemap.xml",
    "webhook": {
      "url": "https://your-server.com/webhook",
      "headers": {
        "Authorization": "Bearer your-token"
      },
      "retries": 3,
      "on": ["started", "completed", "failed"]
    }
  }'
```

## Best Practices

1. **Webhook Reliability**
   - Implement idempotent webhook handlers
   - Use webhook retries
   - Store webhook secret securely
   - Acknowledge webhooks quickly

2. **Rate Limiting**
   - Respect rate limits
   - Implement exponential backoff
   - Monitor rate limit headers
   - Adjust crawl rates based on target site

3. **Error Handling**
   - Handle all webhook event types
   - Implement proper error recovery
   - Monitor failed jobs
   - Log errors with context

4. **Resource Management**
   - Set reasonable maxPages limits
   - Adjust concurrency based on target site
   - Use appropriate timeouts
   - Monitor resource usage
