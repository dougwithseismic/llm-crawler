# Playground Examples

This guide provides practical examples of using the Playground service for various use cases. Each example includes complete code and explanations.

## Table of Contents

1. [Synchronous Processing](#synchronous-processing)
2. [Asynchronous Processing](#asynchronous-processing)
3. [Data Validation](#data-validation)
4. [API Integration Chain](#api-integration-chain)
5. [Document Processing](#document-processing)

## Synchronous Processing

For quick operations that need immediate results.

### Plugin Implementation

```typescript
interface ProcessingMetric {
  stage: string;
  processedCount: number;
  timestamp: Date;
}

class DataProcessingPlugin implements PlaygroundPlugin<ProcessingMetric> {
  name = 'data-processor';
  enabled = true;

  async execute(context: PlaygroundContext): Promise<ProcessingMetric> {
    const { data } = context.input;
    
    // Process data
    const processed = data.map(item => ({
      ...item,
      processed: true,
      timestamp: new Date()
    }));

    // Store results
    await context.storage.set('processed_data', processed);

    return {
      stage: 'processing',
      processedCount: processed.length,
      timestamp: new Date()
    };
  }
}
```

### Usage Example

```bash
curl -X POST http://localhost:3000/playground/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "data": [
        {"id": 1, "value": "test1"},
        {"id": 2, "value": "test2"}
      ]
    },
    "plugins": ["data-processor"],
    "async": false
  }'
```

## Asynchronous Processing

For long-running operations with progress tracking.

### Plugin Implementation

```typescript
interface AsyncProcessingMetric {
  progress: number;
  processedItems: number;
  remainingItems: number;
}

class LongRunningPlugin implements PlaygroundPlugin<AsyncProcessingMetric> {
  name = 'long-running-processor';
  enabled = true;

  async execute(context: PlaygroundContext): Promise<AsyncProcessingMetric> {
    const { items } = context.input;
    let processed = 0;
    
    for (const item of items) {
      // Simulate long processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      processed++;
      
      // Store progress
      await context.storage.set('progress', {
        processed,
        total: items.length
      });
    }

    return {
      progress: 100,
      processedItems: processed,
      remainingItems: 0
    };
  }
}
```

### Usage Example

```bash
curl -X POST http://localhost:3000/playground/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "items": [1, 2, 3, 4, 5]
    },
    "plugins": ["long-running-processor"],
    "async": true,
    "webhook": {
      "url": "https://your-server.com/webhook",
      "on": ["progress", "completed"]
    }
  }'
```

## Data Validation

Implement a validation system with custom rules.

### Plugin Implementation

```typescript
interface ValidationMetric {
  valid: boolean;
  errors: string[];
  timestamp: Date;
}

class ValidationPlugin implements PlaygroundPlugin<ValidationMetric> {
  name = 'validator';
  enabled = true;

  async execute(context: PlaygroundContext): Promise<ValidationMetric> {
    const { schema, data } = context.input;
    const errors: string[] = [];

    // Validate against schema
    Object.entries(schema).forEach(([field, rules]) => {
      if (!this.validateField(data[field], rules)) {
        errors.push(`Invalid ${field}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      timestamp: new Date()
    };
  }

  private validateField(value: any, rules: any): boolean {
    // Implementation of validation rules
    return true; // Simplified for example
  }
}
```

### Usage with n8n

```typescript
// n8n Workflow
{
  "nodes": [
    {
      "name": "Event Listener",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "validation-events"
      }
    },
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3000/playground/jobs",
        "method": "POST",
        "body": {
          "input": {
            "schema": {
              "email": { "type": "email", "required": true },
              "age": { "type": "number", "min": 18 }
            },
            "data": {
              "email": "test@example.com",
              "age": 25
            }
          },
          "plugins": ["validator"],
          "async": true
        }
      }
    }
  ]
}
```

## Integration Patterns

### 1. Sync/Async Decision

Choose execution mode based on operation:

```typescript
// Quick operations: Use sync mode
{
  "async": false,
  "plugins": ["quick-processor"]
}

// Long operations: Use async mode with webhooks
{
  "async": true,
  "webhook": {
    "url": "https://your-server.com/webhook",
    "on": ["progress", "completed"]
  },
  "plugins": ["long-processor"]
}
```

### 2. Progress Tracking

Monitor long-running operations:

```typescript
// n8n workflow
Event Listener → Switch Node (based on event.status) →
  → Progress: Update Dashboard
  → Completed: Process Results
  → Failed: Send Alert
```

### 3. Parallel Processing

Run multiple jobs and aggregate results:

```typescript
// Make.com parallel scenario
Trigger → Split → 
  → Async Job 1
  → Async Job 2
  → Async Job 3
→ Wait All Complete → Aggregate Results
```

## Best Practices

1. **Execution Mode**
   - Use sync mode for sub-second operations
   - Use async mode for operations > 1 second
   - Consider client timeout limits

2. **Error Handling**
   - Implement proper try/catch blocks
   - Use webhook error events
   - Log errors comprehensively

3. **Progress Updates**
   - Store progress in plugin storage
   - Emit progress events regularly
   - Include meaningful metrics

4. **Performance**
   - Process data in chunks
   - Use appropriate execution mode
   - Monitor resource usage
