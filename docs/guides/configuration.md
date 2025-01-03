# Configuration Guide

This guide covers all configuration options available in the GTM Crawler and provides recommendations for different use cases.

## Configuration Parameters

### Core Parameters

```typescript
interface CrawlConfig {
  /**
   * The starting URL for the crawl.
   * This should be a valid URL with protocol (http/https).
   * Example: "https://example.com"
   * Required: Yes
   */
  url: string;

  /**
   * Maximum depth to crawl from the starting URL.
   * - 1: Only crawl the starting URL
   * - 2: Crawl starting URL and direct links
   * - 3+: Continue following links to specified depth
   * Range: 1-10
   * Default: unlimited
   */
  maxDepth?: number;

  /**
   * Maximum number of pages to crawl.
   * Useful for limiting resource usage and execution time.
   * Range: 1-1000
   * Default: unlimited
   */
  maxPages?: number;

  /**
   * Maximum number of requests per minute.
   * Controls crawl rate to avoid overwhelming target servers.
   * Range: 1-300
   * Default: 60
   */
  maxRequestsPerMinute?: number;

  /**
   * Maximum number of concurrent page loads.
   * Higher values increase speed but also resource usage.
   * Range: 1-100
   * Default: 10
   */
  maxConcurrency?: number;

  /**
   * Timeout settings for various operations.
   */
  timeout?: {
    /**
     * Maximum time to wait for page load completion.
     * Includes initial load and network idle.
     * Range: 1000-60000ms
     * Default: 30000
     */
    page?: number;

    /**
     * Maximum time to wait for individual requests.
     * Applies to resource loading (images, scripts, etc.).
     * Range: 1000-60000ms
     * Default: 30000
     */
    request?: number;
  };

  /**
   * Custom HTTP headers to send with requests.
   * Useful for authentication or custom identifiers.
   * Example: { "Authorization": "Bearer token" }
   */
  headers?: Record<string, string>;

  /**
   * Custom User-Agent string for requests.
   * Identifies your crawler to target servers.
   * Example: "MyBot/1.0 (+https://mybot.com)"
   */
  userAgent?: string;

  /**
   * Whether to respect robots.txt rules.
   * Recommended true for production use.
   * Default: false
   */
  respectRobotsTxt?: boolean;

  /**
   * URL to sitemap for guided crawling.
   * Can improve crawl efficiency and coverage.
   * Example: "https://example.com/sitemap.xml"
   */
  sitemapUrl?: string | null;

  /**
   * Custom function to filter URLs before crawling.
   * Return true to crawl, false to skip.
   * Example: (url) => url.includes('/blog/')
   */
  urlFilter?: (url: string) => boolean;

  /**
   * Webhook configuration for status updates.
   * Required for receiving crawl results and progress.
   */
  webhook: {
    /**
     * URL to receive webhook notifications.
     * Must be publicly accessible.
     * Required: Yes
     */
    url: string;

    /**
     * Custom headers for webhook requests.
     * Useful for authentication.
     * Example: { "Authorization": "Bearer token" }
     */
    headers?: Record<string, string>;

    /**
     * Number of retry attempts for failed webhook calls.
     * Range: 1-5
     * Default: 3
     */
    retries?: number;

    /**
     * Array of events to receive webhooks for.
     * Options: 'started', 'progress', 'completed', 'failed'
     * Default: All events
     */
    on?: ('started' | 'progress' | 'completed' | 'failed')[];
  };
}
```

## Use Case Configurations

### 1. Small Site Analysis

Best for sites with less than 100 pages:

```typescript
{
  maxDepth: 5,          // Moderate depth
  maxPages: 100,        // Limited page count
  maxRequestsPerMinute: 60,  // Standard rate
  maxConcurrency: 5,    // Moderate concurrency
  timeout: {
    page: 30000,        // Standard page timeout
    request: 10000      // Quick request timeout
  }
}
```

### 2. Large Site Scanning

For sites with thousands of pages:

```typescript
{
  maxDepth: 10,         // Deep crawl
  maxPages: 1000,       // High page limit
  maxRequestsPerMinute: 120,  // Faster rate
  maxConcurrency: 10,   // High concurrency
  timeout: {
    page: 45000,        // Longer page timeout
    request: 15000      // Standard request timeout
  },
  sitemapUrl: "https://example.com/sitemap.xml"  // Use sitemap for efficiency
}
```

### 3. Respectful Crawling

When you want to be extra considerate of the target site:

```typescript
{
  maxRequestsPerMinute: 30,   // Low rate
  maxConcurrency: 3,          // Low concurrency
  respectRobotsTxt: true,     // Honor robots.txt
  userAgent: "FriendlyBot/1.0 (+https://your-company.com/bot)",
  timeout: {
    page: 60000,              // Patient timeouts
    request: 20000
  }
}
```

### 4. Performance Analysis

When focusing on performance metrics:

```typescript
{
  maxConcurrency: 1,          // Single thread for accurate timing
  maxRequestsPerMinute: 30,   // Slower rate for better measurement
  timeout: {
    page: 60000,              // Long timeouts for slow pages
    request: 30000
  },
  urlFilter: (url) => !url.includes('?')  // Skip dynamic pages
}
```

## Environment Variables

```bash
# Required
NODE_ENV=development|production  # Application environment
PORT=3000                       # Server port
REDIS_URL=redis://localhost:6379  # Redis connection URL

# Optional
DEBUG=crawler:*            # Enable debug logging
MAX_MEMORY_MB=4096        # Memory limit for browser
DEFAULT_USER_AGENT=       # Default crawler user agent
MAX_RETRIES=3            # Job retry attempts
WEBHOOK_TIMEOUT=30000    # Webhook request timeout
ENABLE_TUNNEL=true       # Enable ngrok tunnel
NGROK_AUTHTOKEN=         # Your ngrok auth token
```

## Best Practices

### 1. Rate Limiting

```typescript
{
  maxRequestsPerMinute: 30,  // Start conservative
  maxConcurrency: 3,         // Increase if stable
}
```

### 2. Resource Management

```typescript
{
  maxConcurrency: Math.min(
    availableCPUs - 1,
    Math.floor(availableMemoryGB * 2)
  ),
}
```

### 3. Error Handling

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
