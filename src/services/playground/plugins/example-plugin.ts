import type { PlaygroundPlugin, PlaygroundContext } from '../types';

interface ExampleMetric {
  processedAt: Date;
  inputLength: number;
  outputLength: number;
  processingTimeMs: number;
}

interface ExampleSummary {
  totalProcessed: number;
  averageProcessingTime: number;
  totalInputLength: number;
  totalOutputLength: number;
}

export class ExamplePlugin
  implements PlaygroundPlugin<ExampleMetric, ExampleSummary>
{
  name = 'example';
  enabled = true;

  async initialize(): Promise<void> {
    console.log('Example plugin initialized');
  }

  async before(context: PlaygroundContext): Promise<void> {
    await context.storage.set('startTime', Date.now());
    console.log('Example plugin before hook');
  }

  async execute(context: PlaygroundContext): Promise<ExampleMetric> {
    const startTime =
      (await context.storage.get<number>('startTime')) || Date.now();

    // Simple example: reverse the input string if it's a string
    const input = context.input;
    const output =
      typeof input === 'string'
        ? input.split('').reverse().join('')
        : JSON.stringify(input);

    // Store the output
    context.output = output;

    const endTime = Date.now();

    // Calculate lengths based on raw input/output
    const inputLength =
      typeof input === 'string' ? input.length : JSON.stringify(input).length;

    return {
      processedAt: new Date(),
      inputLength,
      outputLength: output.length,
      processingTimeMs: endTime - startTime,
    };
  }

  async after(context: PlaygroundContext): Promise<void> {
    await context.storage.delete('startTime');
    console.log('Example plugin after hook');
  }

  async summarize(metrics: ExampleMetric[]): Promise<ExampleSummary> {
    const totalProcessed = metrics.length;
    const totalProcessingTime = metrics.reduce(
      (sum, m) => sum + m.processingTimeMs,
      0,
    );

    return {
      totalProcessed,
      averageProcessingTime:
        totalProcessed > 0 ? totalProcessingTime / totalProcessed : 0,
      totalInputLength: metrics.reduce((sum, m) => sum + m.inputLength, 0),
      totalOutputLength: metrics.reduce((sum, m) => sum + m.outputLength, 0),
    };
  }
}
