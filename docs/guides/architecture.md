# LLM Crawler Architecture

This document provides a detailed overview of the LLM Crawler's architecture and core components.

## System Overview

The LLM Crawler is built with a modular, plugin-based architecture that separates concerns into distinct components:

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   API Router    │────▶│ Queue Service│────▶│   Crawler   │
└─────────────────┘     └──────────────┘     └─────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │   Plugins   │
                                            └─────────────┘
```

## Core Components

### 1. Crawler Service (`crawler.ts`)

The heart of the system, responsible for:

- Managing crawl jobs
- Handling page navigation and analysis
- Coordinating plugin execution
- Managing browser instances
- Error handling and recovery

Key features:

- Event-driven architecture using TypeScript's type-safe events
- Configurable crawling parameters
- Robust error handling and reporting
- Support for robots.txt and sitemaps
- Progress tracking and status updates

### 2. Queue Service (`queue-service.ts`)

Manages job execution and ensures:

- Sequential processing of crawl jobs
- Job priority handling
- Retry logic for failed jobs
- Resource management
- State persistence

### 3. Plugin System (`plugins/`)

Provides extensibility through:

- Standardized plugin interface
- Lifecycle hooks (initialize, evaluate, summarize)
- Isolated metric collection
- Aggregated result summaries

Example plugin implementation (Content Plugin):

```typescript
interface ContentMetrics {
  title: string;
  description: string | null;
  wordCount: number;
  headings: { h1: number; h2: number; h3: number; };
  images: number;
  links: { internal: number; external: number; };
}

class ContentPlugin implements CrawlerPlugin<'content', ContentMetrics, ContentSummary> {
  // Plugin implementation
}
```

### 4. API Layer (`routes/crawl.ts`)

Provides RESTful endpoints for:

- Job creation and management
- Configuration validation
- Progress monitoring
- Webhook notifications

## Data Flow

1. **Job Creation**

   ```
   Client Request → API Validation → Job Creation → Queue Addition
   ```

2. **Job Execution**

   ```
   Queue → Crawler → Browser Instance → Page Analysis → Plugin Execution
   ```

3. **Result Processing**

   ```
   Page Results → Plugin Processing → Result Aggregation → Webhook Notifications
   ```

## Type System

The crawler uses TypeScript for type safety and better developer experience:

```typescript
interface CrawlJob {
  id: string;
  config: CrawlConfig;
  progress: CrawlProgress;
  result?: CrawlResult;
  priority: number;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CrawlResult {
  config: CrawlConfig;
  progress: CrawlProgress;
  pages: PageAnalysis[];
  errors: ErrorSummary;
  summary: ExtractPluginSummaries<any>;
}
```

## Event System

The crawler emits typed events for different stages:

- `jobStart`: When a crawl job begins
- `jobComplete`: When a job finishes successfully
- `jobError`: When a job encounters an error
- `pageStart`: Before processing a page
- `pageComplete`: After processing a page
- `pageError`: When page processing fails
- `progress`: Regular progress updates

## Error Handling

Multiple layers of error handling ensure reliability:

1. **Job Level**
   - Retry logic for failed jobs
   - Error aggregation and reporting
   - State recovery

2. **Page Level**
   - Navigation timeouts
   - Resource loading errors
   - Plugin execution failures

3. **System Level**
   - Queue persistence
   - Browser crash recovery
   - Resource cleanup

## Performance Considerations

The crawler implements several optimizations:

1. **Resource Management**
   - Browser instance pooling
   - Concurrent page processing
   - Memory usage monitoring

2. **Rate Limiting**
   - Configurable request rates
   - Automatic throttling
   - Concurrency control

3. **Caching**
   - robots.txt caching
   - DNS caching
   - Result caching

## Future Improvements

Planned enhancements:

1. **Scalability**
   - Distributed crawling
   - Worker process pools
   - Shared state management

2. **Monitoring**
   - Detailed metrics collection
   - Performance profiling
   - Resource usage tracking

3. **Features**
   - JavaScript rendering options
   - Custom browser profiles
   - Advanced filtering options
