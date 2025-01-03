import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExamplePlugin } from '../plugins/example-plugin';
import type { PlaygroundContext } from '../types';

describe('ExamplePlugin', () => {
  let plugin: ExamplePlugin;
  let context: PlaygroundContext;

  beforeEach(() => {
    plugin = new ExamplePlugin();
    context = {
      jobId: 'test-job',
      input: '',
      startTime: new Date(),
      storage: {
        get: async () => null,
        set: async () => {},
        delete: async () => {},
        clear: async () => {},
      },
    };
  });

  describe('initialize', () => {
    it('should initialize without error', async () => {
      await expect(plugin.initialize()).resolves.toBeUndefined();
    });
  });

  describe('before', () => {
    it('should set startTime in storage', async () => {
      const setMock = vi.fn();
      context.storage.set = setMock;

      await plugin.before(context);

      expect(setMock).toHaveBeenCalledWith('startTime', expect.any(Number));
    });
  });

  describe('execute', () => {
    it('should reverse string input', async () => {
      context.input = 'hello';
      const result = await plugin.execute(context);

      expect(context.output).toBe('olleh');
      expect(result).toEqual({
        processedAt: expect.any(Date),
        inputLength: 5,
        outputLength: 5,
        processingTimeMs: expect.any(Number),
      });
    });

    it('should stringify non-string input', async () => {
      context.input = { test: 123 };
      const result = await plugin.execute(context);

      expect(context.output).toBe('{"test":123}');
      expect(result).toEqual({
        processedAt: expect.any(Date),
        inputLength: 12, // Length of stringified object
        outputLength: 12,
        processingTimeMs: expect.any(Number),
      });
    });

    it('should handle empty input', async () => {
      context.input = '';
      const result = await plugin.execute(context);

      expect(context.output).toBe('');
      expect(result).toEqual({
        processedAt: expect.any(Date),
        inputLength: 0,
        outputLength: 0,
        processingTimeMs: expect.any(Number),
      });
    });
  });

  describe('after', () => {
    it('should delete startTime from storage', async () => {
      const deleteMock = vi.fn();
      context.storage.delete = deleteMock;

      await plugin.after(context);

      expect(deleteMock).toHaveBeenCalledWith('startTime');
    });
  });

  describe('summarize', () => {
    it('should calculate correct summary metrics', async () => {
      const metrics = [
        {
          processedAt: new Date(),
          inputLength: 10,
          outputLength: 15,
          processingTimeMs: 100,
        },
        {
          processedAt: new Date(),
          inputLength: 20,
          outputLength: 25,
          processingTimeMs: 200,
        },
      ];

      const summary = await plugin.summarize(metrics);

      expect(summary).toEqual({
        totalProcessed: 2,
        averageProcessingTime: 150,
        totalInputLength: 30,
        totalOutputLength: 40,
      });
    });

    it('should handle empty metrics array', async () => {
      const summary = await plugin.summarize([]);

      expect(summary).toEqual({
        totalProcessed: 0,
        averageProcessingTime: 0,
        totalInputLength: 0,
        totalOutputLength: 0,
      });
    });
  });
});
