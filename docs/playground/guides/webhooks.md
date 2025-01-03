# Event System Guide

The Playground service provides a comprehensive event system that allows external systems to monitor and react to job and plugin execution events. This guide explains how to integrate with these events using automation platforms like n8n and Make.com.

## Available Events

The service emits the following events:

### Job Events

1. **jobStart**

```typescript
{
  "event": "jobStart",
  "data": {
    "jobId": "job-123",
    "job": {
      "id": "job-123",
      "config": {...},
      "progress": {...}
    }
  },
  "timestamp": "2025-01-03T19:54:37.000Z"
}
```

2. **jobComplete**

```typescript
{
  "event": "jobComplete",
  "data": {
    "jobId": "job-123",
    "job": {
      "id": "job-123",
      "config": {...},
      "progress": {...},
      "result": {
        "metrics": [...],
        "summary": {...}
      }
    }
  },
  "timestamp": "2025-01-03T19:54:37.000Z"
}
```

3. **jobError**

```typescript
{
  "event": "jobError",
  "data": {
    "jobId": "job-123",
    "error": {
      "message": "Error description"
    },
    "job": {...}
  },
  "timestamp": "2025-01-03T19:54:37.000Z"
}
```

### Plugin Events

1. **pluginStart**

```typescript
{
  "event": "pluginStart",
  "data": {
    "jobId": "job-123",
    "pluginName": "example-plugin",
    "job": {...}
  },
  "timestamp": "2025-01-03T19:54:37.000Z"
}
```

2. **pluginComplete**

```typescript
{
  "event": "pluginComplete",
  "data": {
    "jobId": "job-123",
    "pluginName": "example-plugin",
    "metrics": {...},
    "job": {...}
  },
  "timestamp": "2025-01-03T19:54:37.000Z"
}
```

3. **pluginError**

```typescript
{
  "event": "pluginError",
  "data": {
    "jobId": "job-123",
    "pluginName": "example-plugin",
    "error": {
      "message": "Plugin error description"
    },
    "job": {...}
  },
  "timestamp": "2025-01-03T19:54:37.000Z"
}
```

## Integration Examples

### n8n Integration

n8n is a powerful workflow automation platform that can listen for events and trigger automated workflows.

1. **Event Listener Workflow**

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
// 1. Event Listener
// 2. Switch Node (based on event type)
// 3. Actions based on event:
//    - Store results in database
//    - Send notifications
//    - Trigger other processes
```

2. **Error Handling Workflow**

```typescript
// Listen for pluginError or jobError events
// Send notifications via email/Slack
// Log errors to monitoring system
```

### Make.com (Formerly Integromat) Integration

Make.com provides visual workflow automation with excellent event handling capabilities.

1. **Real-time Processing Workflow**

```typescript
// Make.com Event Listener Configuration
{
  "type": "instant",
  "headers": {
    "Authorization": "Bearer your-token"
  }
}

// Example scenario:
// 1. Event Listener → receive event
// 2. Router → based on event type
// 3. Actions:
//    - Update CRM
//    - Send notifications
//    - Process results
```

## Use Cases

### 1. Data Pipeline Automation

Create automated data processing pipelines:

- Listen for job completion events
- Process results automatically
- Load processed data into target systems

```typescript
// Example Make.com scenario
Event Listener → Filter → Transform → Database
```

### 2. Error Monitoring

Set up comprehensive error monitoring:

- Capture all error events
- Send alerts to appropriate channels
- Log errors for analysis

```typescript
// Example n8n workflow
Event Listener → Switch → 
  → Slack (urgent alerts)
  → Email (daily summaries)
  → Log Database
```

### 3. Progress Tracking

Monitor job progress in real-time:

- Track plugin execution events
- Update progress dashboards
- Generate timing metrics

```typescript
// Example integration
Event Listener → Process Events → 
  → Update Dashboard
  → Store Metrics
  → Generate Reports
```

### 4. Multi-system Integration

Coordinate multiple systems:

- React to job events
- Synchronize data across platforms
- Maintain audit trails

```typescript
// Example workflow
Event Listener → Router →
  → CRM Update
  → Analytics Platform
  → Audit Log
```

## Best Practices

1. **Reliability**
   - Implement proper error handling
   - Use event queues
   - Store failed event processing attempts

2. **Security**
   - Use secure connections
   - Implement authentication
   - Validate event data

3. **Performance**
   - Process events asynchronously
   - Implement proper timeouts
   - Monitor processing times

4. **Monitoring**
   - Log event processing attempts
   - Track success/failure rates
   - Monitor processing times

## Troubleshooting

1. **Event Not Received**
   - Check event listener configuration
   - Verify network/firewall settings
   - Check authentication settings

2. **Processing Issues**
   - Verify event data format
   - Check handler logic
   - Review error logs

3. **Integration Problems**
   - Verify system connectivity
   - Check data mapping
   - Review system logs
