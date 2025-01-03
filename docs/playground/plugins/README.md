# Creating Playground Plugins

The Playground service uses a flexible plugin system that allows you to create custom code execution and analysis modules. This guide explains how to create and implement your own plugins.

## Plugin Interface

Every plugin must implement the `PlaygroundPlugin` interface:

```typescript
interface PlaygroundPlugin<TMetric = any, TSummary = any> {
  name: string;                   // Unique plugin name
  enabled: boolean;               // Plugin enabled state
  storage?: PlaygroundStorage;    // Optional plugin storage
  initialize?(): Promise<void>;   // Optional initialization
  before?(context: PlaygroundContext): Promise<void>;    // Pre-execution hook
  execute(context: PlaygroundContext): Promise<TMetric>; // Main execution
  after?(context: PlaygroundContext): Promise<void>;     // Post-execution hook
  summarize?(metrics: TMetric[]): Promise<TSummary>;     // Optional results summary
}
```

## Creating a Plugin

Here's an example of a basic plugin:

```typescript
import { PlaygroundPlugin, PlaygroundContext } from '../types';

interface ExampleMetric {
  processedAt: Date;
  result: string;
}

interface ExampleSummary {
  totalProcessed: number;
  averageProcessingTime: number;
}

export class ExamplePlugin implements PlaygroundPlugin<ExampleMetric, ExampleSummary> {
  name = 'example-plugin';
  enabled = true;

  async initialize(): Promise<void> {
    // Optional: Set up plugin resources
    console.log('Initializing example plugin');
  }

  async before(context: PlaygroundContext): Promise<void> {
    // Optional: Pre-execution setup
    await context.storage.set('startTime', new Date());
  }

  async execute(context: PlaygroundContext): Promise<ExampleMetric> {
    // Main plugin logic
    const processedAt = new Date();
    const result = `Processed input: ${JSON.stringify(context.input)}`;

    return {
      processedAt,
      result
    };
  }

  async after(context: PlaygroundContext): Promise<void> {
    // Optional: Clean up or post-processing
    const startTime = await context.storage.get<Date>('startTime');
    console.log(`Processing took: ${new Date().getTime() - startTime!.getTime()}ms`);
  }

  async summarize(metrics: ExampleMetric[]): Promise<ExampleSummary> {
    // Optional: Summarize multiple execution results
    const totalProcessed = metrics.length;
    const totalTime = metrics.reduce((sum, m) => 
      sum + m.processedAt.getTime(), 0);

    return {
      totalProcessed,
      averageProcessingTime: totalTime / totalProcessed
    };
  }
}
```

## Plugin Context

Plugins receive a `PlaygroundContext` object that provides:

```typescript
interface PlaygroundContext {
  jobId: string;          // Current job ID
  input: any;             // Job input data
  output?: any;           // Optional output data
  startTime: Date;        // Execution start time
  storage: PlaygroundStorage;  // Plugin storage
  [key: string]: any;     // Additional context data
}
```

## Plugin Storage

Each plugin has access to a storage system for maintaining state:

```typescript
interface PlaygroundStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

## Plugin Lifecycle

1. **Initialization**: When the service starts, each plugin's `initialize()` method is called
2. **Pre-execution**: Before execution, `before()` is called with the job context
3. **Execution**: The `execute()` method runs the main plugin logic
4. **Post-execution**: After execution, `after()` is called for cleanup
5. **Summary**: If multiple metrics are collected, `summarize()` can process them

## Best Practices

1. **Type Safety**
   - Use TypeScript generics for metric and summary types
   - Define clear interfaces for your data structures
   - Avoid using `any` where possible

2. **Error Handling**
   - Implement proper try/catch blocks
   - Return meaningful error messages
   - Clean up resources in case of errors

3. **Storage Usage**
   - Use storage for temporary data only
   - Clean up after plugin execution
   - Handle storage errors gracefully

4. **Performance**
   - Keep plugins focused and lightweight
   - Implement proper cleanup in `after()`
   - Use async/await for asynchronous operations

## Example Use Cases

1. **Data Transformation**

```typescript
async execute(context: PlaygroundContext): Promise<TransformMetric> {
  const { input } = context;
  const transformed = someTransformation(input);
  return { transformed, timestamp: new Date() };
}
```

2. **API Integration**

```typescript
async execute(context: PlaygroundContext): Promise<ApiMetric> {
  const { apiKey, endpoint } = context.input;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  return { data: await response.json(), timestamp: new Date() };
}
```

3. **Data Validation**

```typescript
async execute(context: PlaygroundContext): Promise<ValidationMetric> {
  const { schema, data } = context.input;
  const validationResult = validateAgainstSchema(schema, data);
  return { valid: validationResult.valid, errors: validationResult.errors };
}
```

## Testing Plugins

Create comprehensive tests for your plugins:

```typescript
describe('ExamplePlugin', () => {
  let plugin: ExamplePlugin;
  let context: PlaygroundContext;

  beforeEach(() => {
    plugin = new ExamplePlugin();
    context = {
      jobId: 'test-job',
      input: { test: 'data' },
      startTime: new Date(),
      storage: new MemoryStorage()
    };
  });

  it('should process input correctly', async () => {
    const result = await plugin.execute(context);
    expect(result.result).toContain('test: data');
  });
});
```

## Registering Plugins

Register your plugins when creating the PlaygroundService:

```typescript
const playgroundService = new PlaygroundService({
  plugins: [
    new ExamplePlugin(),
    new YourCustomPlugin()
  ],
  config: { debug: true }
});
