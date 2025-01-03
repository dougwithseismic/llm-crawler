# Playground API Reference

The Playground service exposes a RESTful API for managing execution jobs and plugins.

## Endpoints

### Create Job

```http
POST /playground/jobs
```

Create a new playground job with specified configuration.

#### Request Body

```typescript
{
  input: any;              // Input data for the job
  retries?: number;        // Optional number of retries (default: 3)
  plugins?: string[];      // Optional list of specific plugins to run
  async?: boolean;         // Optional flag for async execution (default: false)
  webhook?: {
    url: string;          // Webhook URL for notifications
    headers?: Record<string, string>;  // Optional custom headers
    retries?: number;     // Optional webhook retry count
    on?: Array<'started' | 'progress' | 'completed' | 'failed'>;  // Optional event filter
  }
}
```

#### Synchronous vs Asynchronous Execution

The `async` flag determines how the job execution behaves:

- `async: false` (default): The request waits for job completion and returns final results
- `async: true`: The request returns immediately with job ID, and progress can be monitored via webhooks or polling

#### Response

For synchronous execution:

```typescript
{
  id: string;             // Job ID
  config: {...};          // Job configuration
  progress: {
    status: 'completed';  // Final status
    startTime: string;    // Start timestamp
    endTime: string;      // Completion timestamp
    completedPlugins: string[];  // All completed plugins
  };
  result: {              // Complete results
    metrics: any[];      // Plugin metrics
    summary?: any;       // Optional summary
  }
}
```

For asynchronous execution:

```typescript
{
  id: string;             // Job ID
  config: {...};          // Job configuration
  progress: {
    status: 'queued';    // Initial status
    startTime: string;    // Creation timestamp
    completedPlugins: string[];  // Empty initially
  }
}
```

### Start Job

```http
POST /playground/jobs/:id/start
```

Start executing a previously created job.

#### Response

```typescript
{
  id: string;             // Job ID
  config: {...};          // Job configuration
  progress: {...};        // Current progress
  result?: {             // Optional result object
    metrics: any[];      // Plugin metrics
    summary?: any;       // Optional summary
  };
}
```

### Get Job Status

```http
GET /playground/jobs/:id
```

Retrieve the current status and results of a job.

#### Response

```typescript
{
  id: string;             // Job ID
  config: {...};          // Job configuration
  progress: {...};        // Current progress
  result?: {...};         // Optional result object
}
```

### Get Job Progress

```http
GET /playground/jobs/:id/progress
```

Get detailed progress information for a job.

#### Response

```typescript
{
  status: 'queued' | 'running' | 'completed' | 'failed';
  startTime: string;      // Start timestamp
  endTime?: string;       // Optional completion timestamp
  error?: string;         // Optional error message
  currentPlugin?: string; // Currently running plugin
  completedPlugins: string[];  // List of completed plugins
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200`: Success
- `404`: Job not found
- `500`: Server error

Error responses include a message:

```typescript
{
  error: string;  // Error description
}
```

## Webhook Events

When configured, the service sends webhook notifications for the following events:

### Event Types

- `started`: Job execution has started
- `progress`: Plugin execution completed
- `completed`: Job execution completed successfully
- `failed`: Job execution failed

### Webhook Payload Format

```typescript
{
  status: 'started' | 'progress' | 'completed' | 'failed';
  jobId: string;
  timestamp: string;
  // Additional event-specific data
}
```

#### Started Event

```typescript
{
  status: 'started',
  jobId: string,
  timestamp: string,
  config: {
    input: any,
    plugins: string[]
  }
}
```

#### Progress Event

```typescript
{
  status: 'progress',
  jobId: string,
  timestamp: string,
  pluginName: string,
  metrics: any,
  progress: {
    status: string,
    completedPlugins: string[]
    // ... other progress fields
  }
}
```

#### Completed Event

```typescript
{
  status: 'completed',
  jobId: string,
  timestamp: string,
  result: {
    metrics: any[],
    summary: any
  },
  summary: {
    duration: number,
    completedPlugins: string[]
  }
}
```

#### Failed Event

```typescript
{
  status: 'failed',
  jobId: string,
  timestamp: string,
  error: string,
  progress: {
    status: 'failed',
    error: string,
    // ... other progress fields
  }
}
