# Getting Started with GTM Crawler

This guide will help you set up and start using the GTM Crawler service.

## Prerequisites

- Node.js 18 or higher
- npm or pnpm package manager
- Redis server (for queue management)
- ngrok account (for tunnel setup)

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd llm-crawler
```

2. Install dependencies and set up the tunnel:

```bash
pnpm setup:tunnel
```

This will:

- Install project dependencies
- Guide you through ngrok tunnel setup
- Prompt for your ngrok authtoken (get it from <https://dashboard.ngrok.com/get-started/your-authtoken>)
- Configure the environment for tunnel access
- Start the development server automatically

3. Configure environment variables:

```bash
# Required environment variables in .env.local
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
ENABLE_TUNNEL=true          # Added by setup:tunnel
NGROK_AUTHTOKEN=your-token  # Added by setup:tunnel
```

## Basic Usage

Once the server is running (started automatically by setup:tunnel), you'll see a tunnel URL in your terminal. Use this URL as your base endpoint for API requests.

1. Make your first crawl request:

```bash
# Replace {tunnel-url} with your ngrok URL
curl -X POST {tunnel-url}/crawl/example.com \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "url": "https://your-webhook-url.com/updates"
    }
  }'
```

2. Monitor progress through webhook updates:

- Job start notification
- Regular progress updates
- Final results or error notification

## Configuration Options

The crawler is highly configurable. Here are the main options:

```typescript
interface CrawlConfig {
  maxDepth?: number;        // Maximum crawl depth (default: unlimited)
  maxPages?: number;        // Maximum pages to crawl (default: unlimited)
  maxRequestsPerMinute?: number;  // Rate limiting (default: 60)
  maxConcurrency?: number;  // Parallel requests (default: 10)
  timeout?: {
    page?: number;         // Page load timeout in ms (default: 30000)
    request?: number;      // Request timeout in ms (default: 30000)
  };
  headers?: Record<string, string>;  // Custom HTTP headers
  userAgent?: string;      // Custom user agent
  respectRobotsTxt?: boolean;  // Honor robots.txt (default: false)
  sitemapUrl?: string;     // Sitemap URL for guided crawling
  webhook: {
    url: string;          // Required webhook URL
    headers?: Record<string, string>;  // Webhook auth headers
    retries?: number;     // Retry attempts (default: 3)
    on?: ('started' | 'progress' | 'completed' | 'failed')[];  // Event filters
  };
}
```

## Example Configuration

Here's a complete example with all options:

```bash
# Replace {tunnel-url} with your ngrok URL
curl -X POST {tunnel-url}/crawl/example.com \
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

## Next Steps

- Learn about the [Plugin System](../plugins/README.md)
- Explore [Advanced Configuration](configuration.md)
- See [Example Use Cases](../examples/README.md)
- Check the [API Reference](../api/README.md)

## Troubleshooting

Common issues and solutions:

1. **Connection Errors**
   - Verify Redis is running
   - Check network connectivity
   - Ensure valid webhook URL
   - Verify ngrok tunnel is active

2. **Timeout Issues**
   - Adjust timeout settings
   - Reduce concurrency
   - Check target site response times

3. **Memory Problems**
   - Limit maxPages
   - Reduce maxConcurrency
   - Monitor system resources

4. **Tunnel Issues**
   - Verify NGROK_AUTHTOKEN is correct
   - Check ENABLE_TUNNEL is set to true
   - Restart the server if tunnel fails
   - Use `pnpm setup:tunnel` to reconfigure

For more help, check our [troubleshooting guide](troubleshooting.md) or open an issue on GitHub.
