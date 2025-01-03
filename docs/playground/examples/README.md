# Playground Examples

This guide provides practical examples of using the Playground service for various use cases. Each example includes complete code and explanations.

## Table of Contents

1. [Data Processing Pipeline](#data-processing-pipeline)
2. [API Integration Chain](#api-integration-chain)
3. [Data Validation System](#data-validation-system)
4. [Machine Learning Pipeline](#machine-learning-pipeline)
5. [Document Processing](#document-processing)

## Data Processing Pipeline

Create a pipeline that processes data through multiple stages.

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
    "plugins": ["data-processor"]
  }'
```

## API Integration Chain

Chain multiple API calls with data transformation between them.

### Plugin Implementation

```typescript
interface ApiChainMetric {
  source: string;
  responseStatus: number;
  transformedData: any;
}

class ApiChainPlugin implements PlaygroundPlugin<ApiChainMetric> {
  name = 'api-chain';
  enabled = true;

  async execute(context: PlaygroundContext): Promise<ApiChainMetric> {
    const { endpoint, transformFn } = context.input;

    // Make API call
    const response = await fetch(endpoint);
    const data = await response.json();

    // Transform data
    const transformed = eval(transformFn)(data);

    return {
      source: endpoint,
      responseStatus: response.status,
      transformedData: transformed
    };
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
        "path": "api-chain-events",
        "options": {}
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
            "endpoint": "https://api.example.com/data",
            "transformFn": "data => data.map(x => x.value.toUpperCase())"
          },
          "plugins": ["api-chain"]
        }
      }
    }
  ]
}
```

## Data Validation System

Implement a validation system with custom rules and reporting.

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

### Usage with Make.com

```typescript
// Make.com Scenario
{
  "trigger": {
    "type": "event",
    "path": "validation-events"
  },
  "actions": [
    {
      "type": "http",
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
        "plugins": ["validator"]
      }
    }
  ]
}
```

## Integration Patterns

### 1. Event-Driven Processing

Chain operations based on events:

```typescript
// Event listener triggers new job based on completion
Event → Process Results → Start New Job → Process Final Results
```

### 2. Conditional Processing

Use events to make decisions:

```typescript
// n8n decision workflow
Event Listener → Switch Node (based on result) →
  → Success: Process data
  → Error: Notify team
```

### 3. Parallel Processing

Run multiple jobs and aggregate results:

```typescript
// Make.com parallel scenario
Trigger → Split → 
  → Job 1
  → Job 2
  → Job 3
→ Aggregate Results
```

## Best Practices

1. **Error Handling**
   - Implement proper try/catch blocks
   - Handle events properly
   - Log errors comprehensively

2. **Performance**
   - Process data in chunks
   - Implement proper timeouts
   - Use caching when appropriate

3. **Monitoring**
   - Track job progress
   - Monitor resource usage
   - Set up alerts for failures

4. **Security**
   - Validate input data
   - Implement proper authentication
   - Sanitize outputs
