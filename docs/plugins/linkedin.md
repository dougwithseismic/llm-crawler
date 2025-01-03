# LinkedIn Plugin

The LinkedIn plugin enables authenticated crawling of LinkedIn pages by handling cookie-based authentication. It collects basic metadata from LinkedIn pages while respecting the platform's structure.

## Overview

This plugin:

- Handles LinkedIn authentication via `li_at` cookie
- Collects page title and meta tags
- Maintains session state across page loads
- Enforces LinkedIn-specific crawler settings

## Configuration

The plugin accepts the following options:

```typescript
interface LinkedInPluginOptions {
  enabled?: boolean;
  li_at?: string;  // LinkedIn authentication cookie
  config?: Record<string, unknown>;
}
```

### Authentication

The plugin requires a valid LinkedIn `li_at` cookie which can be provided in two ways:

1. Through the constructor options
2. Via the `COOKIE_LI_AT` environment variable

```typescript
// Option 1: Constructor
const plugin = new LinkedInPlugin({ 
  li_at: 'your_linkedin_cookie' 
});

// Option 2: Environment Variable
process.env.COOKIE_LI_AT = 'your_linkedin_cookie';
const plugin = new LinkedInPlugin();
```

## Usage

### Basic Example

```typescript
import { CrawlerService } from '../services/crawler';
import { LinkedInPlugin } from '../services/crawler/plugins/linkedin';

const crawler = new CrawlerService({
  plugins: [new LinkedInPlugin({ li_at: 'your_linkedin_cookie' })],
  config: { debug: true }
});

const job = await crawler.createJob({
  url: 'https://www.linkedin.com/in/someprofile',
  webhook: {
    url: 'https://your-server.com/webhook'
  }
});
```

### REST API Example

```bash
curl -X POST "http://localhost:3000/linkedin/johndoe" \
  -H "Content-Type: application/json" \
  -d '{
    "li_at": "your_linkedin_cookie",
    "webhook": {
      "url": "http://localhost:3000/test/webhook"
    }
  }'
```

## Metrics

The plugin collects the following metrics for each page:

```typescript
interface LinkedInMetrics {
  title: string;           // Page title
  metaTags: {             // Meta tag collection
    [name: string]: string;  // name/property -> content mapping
  };
}
```

### Example Output

```json
{
  "linkedin": {
    "title": "John Doe | Professional Profile",
    "metaTags": {
      "description": "View John Doe's professional profile on LinkedIn...",
      "og:title": "John Doe | LinkedIn",
      "og:description": "View John Doe's profile on LinkedIn...",
      "og:image": "https://media.linkedin.com/...",
      "og:type": "profile",
      // ... other meta tags
    }
  }
}
```

## Best Practices

1. **Cookie Management**
   - Rotate cookies periodically
   - Use dedicated crawler accounts
   - Store cookies securely (e.g., in environment variables)

2. **Rate Limiting**
   - Respect LinkedIn's rate limits
   - Use reasonable delays between requests
   - Set appropriate `maxRequestsPerMinute` in config

3. **Error Handling**
   - Handle authentication failures gracefully
   - Monitor for blocked requests
   - Implement retry logic for transient failures

## Limitations

1. Only collects publicly available data
2. Requires valid LinkedIn authentication
3. Must comply with LinkedIn's terms of service
4. Rate limits may apply
5. Cookie expiration requires renewal

## Security Considerations

1. Never commit LinkedIn cookies to version control
2. Use environment variables for cookie storage
3. Implement proper access controls for the API
4. Monitor for unauthorized usage
5. Regularly rotate cookies and credentials
