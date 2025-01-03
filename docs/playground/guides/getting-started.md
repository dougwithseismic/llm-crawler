# Getting Started with Playground

This guide will help you quickly get started with the Playground service, a flexible execution environment for running custom code through plugins.

## Overview

The Playground service allows you to:

- Execute custom code through plugins
- Process data with configurable pipelines
- Choose between synchronous and asynchronous execution
- Track execution progress and results
- Receive real-time updates via webhooks

## Quick Start

### 1. Create and Execute a Job

The service supports two execution modes: synchronous and asynchronous.

#### Synchronous Execution (Default)

In synchronous mode, the request waits for job completion:

```bash
curl -X POST http://localhost:3000/playground/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "data": "your input data"
    },
    "plugins": ["example-plugin"],
    "async": false
  }'
```

Response includes complete results:

```json
{
  "id": "job-123",
  "config": {
    "input": {
      "data": "your input data"
    },
    "plugins": ["example-plugin"]
  },
  "progress": {
    "status": "completed",
    "startTime": "2025-01-03T19:05:32.000Z",
    "endTime": "2025-01-03T19:05:33.000Z",
    "completedPlugins": ["example-plugin"]
  },
  "result": {
    "metrics": [...],
    "summary": {...}
  }
}
```

#### Asynchronous Execution

For long-running jobs, use async mode:

```bash
curl -X POST http://localhost:3000/playground/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "data": "your input data"
    },
    "plugins": ["example-plugin"],
    "async": true,
    "webhook": {
      "url": "https://your-server.com/webhook",
      "on": ["completed", "failed"]
    }
  }'
```

Response returns immediately:

```json
{
  "id": "job-123",
  "config": {
    "input": {
      "data": "your input data"
    },
    "plugins": ["example-plugin"]
  },
  "progress": {
    "status": "queued",
    "startTime": "2025-01-03T19:05:32.000Z",
    "completedPlugins": []
  }
}
```

### 2. Monitor Progress

For async jobs, you can either:

1. Poll the progress endpoint:

```bash
curl http://localhost:3000/playground/jobs/job-123/progress
```

2. Or receive webhook notifications:

```json
{
  "status": "progress",
  "jobId": "job-123",
  "timestamp": "2025-01-03T19:05:32.000Z",
  "pluginName": "example-plugin",
  "progress": {
    "status": "running",
    "completedPlugins": []
  }
}
```

### 3. Get Final Results

For async jobs, fetch results when complete:

```bash
curl http://localhost:3000/playground/jobs/job-123
```

## Basic Configuration

### Job Configuration Options

```typescript
{
  // Required
  input: any;              // Input data for processing

  // Optional
  async?: boolean;         // Enable async execution
  retries?: number;        // Number of retry attempts
  plugins?: string[];      // Specific plugins to run
  webhook?: {
    url: string;          // Webhook endpoint
    headers?: Record<string, string>;  // Custom headers
    retries?: number;     // Retry attempts
    on?: Array<'started' | 'progress' | 'completed' | 'failed'>;
  }
}
```

## Using Built-in Plugins

The service comes with some built-in plugins:

```bash
curl -X POST http://localhost:3000/playground/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "data": "test data"
    },
    "plugins": ["example-plugin"],
    "async": true
  }'
```

## Monitoring Jobs

### Get Job Details

```bash
curl http://localhost:3000/playground/jobs/job-123
```

Response includes:

- Current status
- Progress information
- Plugin results (if completed)
- Error details (if failed)

### Track Progress

```bash
curl http://localhost:3000/playground/jobs/job-123/progress
```

Response shows:

- Current status
- Completed plugins
- Running plugin
- Error information

## Error Handling

The service provides detailed error information:

```json
{
  "error": {
    "message": "Error description",
    "plugin": "plugin-name",
    "timestamp": "2025-01-03T19:05:32.000Z"
  }
}
```

## Next Steps

1. [Create Custom Plugins](../plugins/README.md)
   - Learn how to create plugins
   - Understand plugin lifecycle
   - Implement custom logic

2. [Configure Webhooks](./webhooks.md)
   - Set up real-time notifications
   - Handle webhook events
   - Implement retry logic

3. [Explore Examples](../examples/README.md)
   - View implementation examples
   - Learn integration patterns
   - Understand best practices

## Common Use Cases

1. **Synchronous Processing**
   - Data validation
   - Quick transformations
   - Simple API integrations

2. **Asynchronous Processing**
   - Long-running tasks
   - Complex data processing
   - Multi-step workflows

## Tips and Best Practices

1. **Choosing Execution Mode**
   - Use sync mode for quick operations
   - Use async mode for long-running tasks
   - Consider timeout limits

2. **Webhook Usage**
   - Filter events based on needs
   - Implement proper error handling
   - Use retries for reliability

3. **Error Handling**
   - Check job status regularly
   - Monitor webhook deliveries
   - Log error details

4. **Performance**
   - Process data in chunks
   - Use appropriate plugins
   - Monitor resource usage

## Troubleshooting

### Common Issues

1. **Job Not Starting**
   - Check job ID
   - Verify input format
   - Check plugin availability

2. **Webhook Issues**
   - Verify endpoint URL
   - Check event filtering
   - Review error messages

3. **Plugin Errors**
   - Check plugin configuration
   - Verify input data
   - Review error messages

### Getting Help

- Check the [API Reference](../api/README.md)
- Review [Example Code](../examples/README.md)
- Examine error messages and logs
