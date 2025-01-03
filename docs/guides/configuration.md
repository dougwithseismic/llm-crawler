# Configuration Guide

This guide covers all configuration options available in the LLM Crawler and provides recommendations for different use cases.

## Configuration Options

### Core Configuration

```typescript
interface CrawlConfig {
  // Required
  url: string;           // Starting URL for crawl
  webhook: {
    url: string;        // Webhook URL for updates
    headers?: Record<string, string>;
    retries?: number;   // 1-5 (default: 3)
    on?: WebhookEventType[];
  };

  // Optional
  maxDepth?: number;     // 1-10 (default: unlimited)
  maxPages?: number;     // 1-1000 (default: unlimited)
  maxRequestsPerMinute?: number;  // 1-300 (default: 60)
  maxConcurrency?: number;  // 1-100 (default: 10)
  timeout?: {
    page?: number;      // 1000-60000ms (default: 30000)
    request?: number;   // 1000-60000ms (default: 30000)
  };
  headers?: Record<string, string>;
  userAgent?: string;
  respectRobotsTxt?: boolean;  // default: false
  sitemapUrl?: string | null;
  urlFilter?: (url: string) => boolean;
}
```

## Use Case Configurations

### 1. Small Site Analysis

Best for sites with less than 100 pages:

```typescript
{
  maxDepth: 5,
  maxPages: 100,
  maxRequestsPerMinute: 60,
  maxConcurrency: 5,
  timeout: {
    page: 30000,
    request: 10000
  }
}
```

### 2. Large Site Scanning

For sites with thousands of pages:

```typescript
{
  maxDepth: 10,
  maxPages: 1000,
  maxRequestsPerMinute: 120,
  maxConcurrency: 10,
  timeout: {
    page: 45000,
    request: 15000
  },
  sitemapUrl: "https://example.com/sitemap.xml"
}
```

### 3. Respectful Crawling

When you want to be extra considerate of the target site:

```typescript
{
  maxRequestsPerMinute: 30,
  maxConcurrency: 3,
  respectRobotsTxt: true,
  userAgent: "FriendlyBot/1.0 (+https://your-company.com/bot)",
  timeout: {
    page: 60000,
    request: 20000
  }
}
```

### 4. Performance Analysis

When focusing on performance metrics:

```typescript
{
  maxConcurrency: 1,
  maxRequestsPerMinute: 30,
  timeout: {
    page: 60000,
    request: 30000
  },
  urlFilter: (url) => !url.includes('?') // Skip dynamic pages
}
```

## Environment Variables

```bash
# Required
NODE_ENV=development|production
PORT=3000
REDIS_URL=redis://localhost:6379

# Optional
DEBUG=crawler:*            # Enable debug logging
MAX_MEMORY_MB=4096        # Memory limit for browser
DEFAULT_USER_AGENT=       # Default crawler user agent
MAX_RETRIES=3            # Job retry attempts
WEBHOOK_TIMEOUT=30000    # Webhook request timeout
```

## Best Practices

### 1. Rate Limiting

- Start with lower rates and increase gradually
- Monitor target site response times
- Adjust based on site's capabilities
- Consider time of day for crawling

```typescript
{
  maxRequestsPerMinute: 30,  // Start conservative
  maxConcurrency: 3,         // Increase if stable
}
```

### 2. Resource Management

- Set appropriate memory limits
- Monitor CPU usage
- Adjust concurrency based on resources
- Clean up completed jobs

```typescript
{
  maxConcurrency: Math.min(
    availableCPUs - 1,
    Math.floor(availableMemoryGB * 2)
  ),
}
```

### 3. Error Handling

- Set reasonable timeouts
- Configure retry attempts
- Handle webhook failures
- Log errors appropriately

```typescript
{
  timeout: {
    page: 45000,    // Longer for complex pages
    request: 15000  // Shorter for initial request
  },
  webhook: {
    retries: 3,
    on: ['started', 'completed', 'failed']  // Skip progress for reliability
  }
}
```

### 4. URL Filtering

- Filter out non-relevant URLs
- Skip dynamic parameters
- Focus on important sections
- Avoid duplicate content

```typescript
{
  urlFilter: (url: string) => {
    // Skip search, pagination, and dynamic content
    if (url.includes('?') || url.includes('/search/')) return false;
    
    // Skip file downloads
    if (/\.(pdf|zip|doc)$/i.test(url)) return false;
    
    // Only crawl specific sections
    return url.includes('/blog/') || url.includes('/products/');
  }
}
```

## Production Recommendations

1. **Memory Management**

```typescript
{
  maxConcurrency: 5,        // Lower for stability
  maxRequestsPerMinute: 60, // Consistent rate
}
```

2. **Reliability Settings**

```typescript
{
  timeout: {
    page: 45000,
    request: 15000
  },
  maxRetries: 3,
  webhook: {
    retries: 3,
    timeout: 30000
  }
}
```

3. **Monitoring Setup**

```typescript
{
  debug: true,
  webhook: {
    on: ['started', 'completed', 'failed', 'progress'],
    url: 'https://your-monitoring-service.com/webhook'
  }
}
```

## Common Issues and Solutions

1. **Memory Leaks**
   - Reduce maxConcurrency
   - Implement shorter crawl sessions
   - Monitor browser instances

2. **Timeout Errors**
   - Increase timeout values
   - Reduce concurrency
   - Check network conditions

3. **Rate Limiting**
   - Reduce maxRequestsPerMinute
   - Implement exponential backoff
   - Use respectful crawling settings

4. **Webhook Failures**
   - Implement retry logic
   - Use reliable webhook service
   - Monitor webhook endpoints
