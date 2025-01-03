# Webhook Integration Guide

The Playground service provides a comprehensive webhook system for real-time notifications about job and plugin execution events. This guide explains how to configure webhooks and integrate them with automation platforms like n8n and Make.com.

## Webhook Configuration

When creating a job, you can specify webhook settings:

```typescript
{
  "webhook": {
    "url": "https://your-webhook-endpoint.com/hook",
    "headers": {
      "Authorization": "Bearer your-token",
      "Custom-Header": "custom-value"
    },
    "on": ["completed", "failed"],  // Optional: specific events to receive
    "retries": 3  // Optional: retry count
  }
}
```

## Event Types

The service supports four distinct event types:

1. **started**
   - Emitted when job execution begins
   - Includes job configuration and input data

2. **progress**
   - Emitted after each plugin completes
   - Includes plugin metrics and current progress

3. **completed**
   - Emitted when job successfully finishes
   - Includes complete results and execution summary

4. **failed**
   - Emitted when job encounters an error
   - Includes error details and final progress state

## Event Filtering

Use the `on` property to specify which events you want to receive:

```typescript
{
  "webhook": {
    "url": "https://your-endpoint.com/hook",
    "on": ["started", "completed"]  // Only receive these events
  }
}
```

If `on` is not specified, you'll receive all event types.

## Event Payloads

### Started Event

```json
{
  "status": "started",
  "jobId": "job-123",
  "timestamp": "2025-01-03T19:06:00.000Z",
  "config": {
    "input": {
      "data": "your input"
    },
    "plugins": ["example-plugin"]
  }
}
```

### Progress Event

```json
{
  "status": "progress",
  "jobId": "job-123",
  "timestamp": "2025-01-03T19:06:00.000Z",
  "pluginName": "example-plugin",
  "metrics": {
    "processedItems": 10,
    "duration": 1500
  },
  "progress": {
    "status": "running",
    "completedPlugins": ["example-plugin"],
    "currentPlugin": "next-plugin"
  }
}
```

### Completed Event

```json
{
  "status": "completed",
  "jobId": "job-123",
  "timestamp": "2025-01-03T19:06:00.000Z",
  "result": {
    "metrics": [
      {
        "plugin-name": {
          "processedItems": 10,
          "duration": 1500
        }
      }
    ],
    "summary": {
      "totalProcessed": 10,
      "averageTime": 1500
    }
  },
  "summary": {
    "duration": 3000,
    "completedPlugins": ["example-plugin", "next-plugin"]
  }
}
```

### Failed Event

```json
{
  "status": "failed",
  "jobId": "job-123",
  "timestamp": "2025-01-03T19:06:00.000Z",
  "error": "Plugin execution failed",
  "progress": {
    "status": "failed",
    "error": "Plugin execution failed",
    "completedPlugins": ["example-plugin"],
    "currentPlugin": "failed-plugin"
  }
}
```

## Integration Examples

### n8n Integration

n8n is a powerful workflow automation platform that can receive webhook events and trigger automated workflows.

1. **Event Listener Setup**

```typescript
// n8n Webhook Node Configuration
{
  "authentication": "headerAuth",
  "headerName": "Authorization",
  "headerValue": "Bearer your-token",
  "path": "playground-events",
  "responseMode": "lastNode",
  "responseData": "allEntries"
}

// Example workflow:
// 1. Webhook Node: Listen for events
// 2. Switch Node: Route based on event.status
// 3. Action Nodes: Process each event type
```

2. **Error Handling Workflow**

```typescript
// Listen for 'failed' events
// Send alerts via email/Slack
// Log errors to monitoring system
```

### Make.com Integration

Make.com provides visual workflow automation with excellent webhook support.

1. **Real-time Processing**

```typescript
// Make.com Webhook Configuration
{
  "type": "instant",
  "headers": {
    "Authorization": "Bearer your-token"
  }
}

// Example scenario:
// 1. Webhook → receive event
// 2. Router → based on event.status
// 3. Actions based on event type
```

## Use Cases

### 1. Progress Monitoring

Create real-time progress dashboards:

```typescript
// Listen for 'progress' events
Webhook → Update Dashboard → Store Metrics
```

### 2. Error Alerting

Set up comprehensive error monitoring:

```typescript
// Listen for 'failed' events
Webhook → Alert System → Error Database
```

### 3. Result Processing

Automate result handling:

```typescript
// Listen for 'completed' events
Webhook → Process Results → Update Systems
```

## Best Practices

1. **Event Filtering**
   - Only subscribe to needed events
   - Process events asynchronously
   - Handle each event type appropriately

2. **Reliability**
   - Implement proper error handling
   - Use webhook retries
   - Log delivery attempts

3. **Security**
   - Use HTTPS endpoints
   - Implement authentication
   - Validate event data

4. **Performance**
   - Process events efficiently
   - Implement proper timeouts
   - Monitor processing times

## Troubleshooting

1. **Missing Events**
   - Check event filtering configuration
   - Verify webhook URL accessibility
   - Review server logs

2. **Failed Deliveries**
   - Check retry configuration
   - Verify endpoint availability
   - Monitor error logs

3. **Processing Issues**
   - Validate event payload handling
   - Check business logic
   - Review system logs
