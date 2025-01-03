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
  timeout?: number;        // Optional timeout in milliseconds
  retries?: number;        // Optional number of retries (default: 3)
  plugins?: string[];      // Optional list of specific plugins to run
  debug?: boolean;         // Optional debug mode flag
}
```

#### Response

```typescript
{
  id: string;             // Unique job ID
  config: {...};          // Job configuration
  progress: {
    status: string;       // Job status
    startTime: string;    // Start timestamp
    completedPlugins: string[];  // Completed plugin names
  };
  // Additional job metadata
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

## Event System

The Playground service emits events during job execution that can be consumed by external systems. These events include:

- `jobStart`: Job execution started
- `jobComplete`: Job execution completed
- `jobError`: Job execution failed
- `pluginStart`: Plugin execution started
- `pluginComplete`: Plugin execution completed
- `pluginError`: Plugin execution failed

Each event includes relevant data about the job and its current state. For detailed information about consuming these events and integrating with external systems, see the [Webhook Events Guide](../guides/webhooks.md).
