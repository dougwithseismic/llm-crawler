# Getting Started with Playground

This guide will help you quickly get started with the Playground service, a flexible execution environment for running custom code through plugins.

## Overview

The Playground service allows you to:

- Execute custom code through plugins
- Process data with configurable pipelines
- Track execution progress and results
- Chain multiple processing steps
- Integrate with external systems through events

## Quick Start

### 1. Create a Job

First, create a job with your input data:

```bash
curl -X POST http://localhost:3000/playground/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "data": "your input data"
    },
    "plugins": ["example-plugin"]
  }'
```

Response:

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
    "startTime": "2025-01-03T19:54:17.000Z",
    "completedPlugins": []
  }
}
```

### 2. Start the Job

Use the job ID to start execution:

```bash
curl -X POST http://localhost:3000/playground/jobs/job-123/start
```

### 3. Check Progress

Monitor the job's progress:

```bash
curl http://localhost:3000/playground/jobs/job-123/progress
```

## Basic Configuration

### Job Configuration Options

```typescript
{
  // Required
  input: any;              // Input data for processing

  // Optional
  timeout?: number;        // Processing timeout (ms)
  retries?: number;        // Number of retry attempts
  plugins?: string[];      // Specific plugins to run
  debug?: boolean;         // Enable debug mode
}
```

## Using Built-in Plugins

The service comes with some built-in plugins. Here's how to use them:

### Example Plugin

```bash
curl -X POST http://localhost:3000/playground/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "data": "test data"
    },
    "plugins": ["example-plugin"]
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
- Plugin results
- Error details (if any)

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
    "timestamp": "2025-01-03T19:54:17.000Z"
  }
}
```

## Next Steps

1. [Create Custom Plugins](../plugins/README.md)
   - Learn how to create plugins
   - Understand plugin lifecycle
   - Implement custom logic

2. [Event System](./webhooks.md)
   - Understand available events
   - Integrate with external systems
   - Handle event data

3. [Explore Examples](../examples/README.md)
   - View implementation examples
   - Learn integration patterns
   - Understand best practices

## Common Use Cases

1. **Data Processing**
   - Transform data formats
   - Validate input data
   - Generate reports

2. **API Integration**
   - Chain API calls
   - Transform responses
   - Handle errors

3. **Automation**
   - Schedule jobs
   - Process queues
   - Monitor results

## Tips and Best Practices

1. **Job Management**
   - Use meaningful input data
   - Set appropriate timeouts
   - Configure retry attempts

2. **Event Handling**
   - Listen for relevant events
   - Process events asynchronously
   - Handle event failures

3. **Error Handling**
   - Check job status regularly
   - Monitor event emissions
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

2. **Event Issues**
   - Verify event listener setup
   - Check event data format
   - Review error messages

3. **Plugin Errors**
   - Check plugin configuration
   - Verify input data
   - Review error messages

### Getting Help

- Check the [API Reference](../api/README.md)
- Review [Example Code](../examples/README.md)
- Examine error messages and logs
