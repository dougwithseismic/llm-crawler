import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaygroundService } from '../playground';
import type { PlaygroundPlugin, PlaygroundContext } from '../types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock plugin for testing
class MockPlugin implements PlaygroundPlugin {
  name = 'mock';
  enabled = true;
  initialize = vi.fn();
  before = vi.fn();
  execute = vi.fn();
  after = vi.fn();
  summarize = vi.fn();
}

describe('PlaygroundService', () => {
  let service: PlaygroundService;
  let mockPlugin: MockPlugin;

  beforeEach(() => {
    mockPlugin = new MockPlugin();
    service = new PlaygroundService({
      plugins: [mockPlugin],
      config: { debug: true },
    });
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('createJob', () => {
    it('should create and start a job with correct initial state', async () => {
      // Setup mock returns
      mockPlugin.execute.mockResolvedValue({ processed: true });
      mockPlugin.summarize.mockResolvedValue({ total: 1 });

      const config = { input: 'test' };
      const job = await service.createJob(config);

      expect(job.id).toBeDefined();
      expect(job.config).toEqual(config);
      expect(job.progress.status).toBe('completed');
      expect(job.progress.completedPlugins).toContain('mock');
      expect(job.retries).toBe(0);
      expect(job.maxRetries).toBe(3);
      expect(job.result).toBeDefined();
      expect(job.result?.metrics).toHaveLength(1);
      expect(job.result?.summary).toEqual({ mock: { total: 1 } });
    });

    it('should return immediately for async jobs', async () => {
      // Setup mock with delay
      mockPlugin.execute.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { processed: true };
      });

      const config = { input: 'test', async: true };
      const job = await service.createJob(config);

      // Should return before job completes
      expect(job.id).toBeDefined();
      expect(job.progress.status).toBe('running');
      expect(job.progress.completedPlugins).toEqual([]);
      expect(job.result?.metrics).toHaveLength(0);
    });

    it('should respect custom retries config and handle errors', async () => {
      // Setup mock to throw error
      const error = new Error('Plugin execution failed');
      mockPlugin.execute.mockRejectedValue(error);

      const config = { input: 'test', retries: 5 };
      const job = await service.createJob(config);

      expect(job.maxRetries).toBe(5);
      expect(job.progress.status).toBe('completed');
      expect(job.result?.error).toBeDefined();
      expect(job.result?.error?.message).toBe('Plugin execution failed');
      expect(job.result?.error?.plugin).toBe('mock');
    });
  });

  describe('startJob', () => {
    it('should run job through plugin lifecycle', async () => {
      // Setup mock returns
      mockPlugin.execute.mockResolvedValue({ processed: true });
      mockPlugin.summarize.mockResolvedValue({ total: 1 });

      // Create job (which starts it automatically)
      const job = await service.createJob({ input: 'test' });

      // Verify plugin lifecycle
      expect(mockPlugin.before).toHaveBeenCalled();
      expect(mockPlugin.execute).toHaveBeenCalled();
      expect(mockPlugin.after).toHaveBeenCalled();
      expect(mockPlugin.summarize).toHaveBeenCalled();

      // Verify job completion
      expect(job.progress.status).toBe('completed');
      expect(job.progress.completedPlugins).toContain('mock');
      expect(job.result?.metrics).toHaveLength(1);
      expect(job.result?.summary).toEqual({ mock: { total: 1 } });
    });

    it('should handle plugin execution error', async () => {
      // Setup mock to throw error
      const error = new Error('Plugin execution failed');
      mockPlugin.execute.mockRejectedValue(error);

      // Create job (which starts it automatically)
      const result = await service.createJob({ input: 'test' });

      // Verify error handling
      expect(result.progress.status).toBe('completed');
      expect(result.result?.error).toBeDefined();
      expect(result.result?.error?.message).toBe('Plugin execution failed');
      expect(result.result?.error?.plugin).toBe('mock');
    });

    it('should skip disabled plugins', async () => {
      // Disable plugin
      mockPlugin.enabled = false;

      // Create job (which starts it automatically)
      const job = await service.createJob({ input: 'test' });

      // Verify plugin was not called
      expect(mockPlugin.execute).not.toHaveBeenCalled();
    });

    it('should respect plugin filter in config', async () => {
      // Create job with different plugin name (starts automatically)
      const job = await service.createJob({
        input: 'test',
        plugins: ['other'],
      });

      // Verify plugin was not called
      expect(mockPlugin.execute).not.toHaveBeenCalled();
    });
  });

  describe('getJob', () => {
    it('should retrieve existing job', async () => {
      mockPlugin.execute.mockResolvedValue({ processed: true });
      const job = await service.createJob({ input: 'test' });
      const retrieved = await service.getJob(job.id);

      expect(retrieved).toEqual(job);
    });

    it('should throw error for non-existent job', async () => {
      await expect(service.getJob('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('getProgress', () => {
    it('should retrieve job progress', async () => {
      mockPlugin.execute.mockResolvedValue({ processed: true });
      const job = await service.createJob({ input: 'test' });
      const progress = await service.getProgress(job.id);

      expect(progress).toEqual(job.progress);
    });
  });

  describe('failJob', () => {
    it('should properly mark job as failed', async () => {
      mockPlugin.execute.mockResolvedValue({ processed: true });
      const job = await service.createJob({ input: 'test' });
      const error = new Error('Test error');
      const failed = await service.failJob(job.id, error);

      expect(failed.progress.status).toBe('failed');
      expect(failed.progress.error).toBe(error.message);
      expect(failed.result?.error?.message).toBe(error.message);
    });
  });

  describe('webhooks', () => {
    const webhookUrl = 'https://example.com/webhook';
    const webhookConfig = {
      url: webhookUrl,
      headers: { 'X-Custom-Header': 'test' },
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({ ok: true });
      mockPlugin.execute.mockResolvedValue({ processed: true });
    });

    it('should send webhook on job start', async () => {
      const job = await service.createJob({
        input: 'test',
        webhook: webhookConfig,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'test',
          }),
          body: expect.stringContaining('"status":"started"'),
        }),
      );
    });

    it('should send webhook on job completion', async () => {
      const job = await service.createJob({
        input: 'test',
        webhook: webhookConfig,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"status":"completed"'),
        }),
      );
    });

    it('should send webhook on plugin events', async () => {
      const job = await service.createJob({
        input: 'test',
        webhook: webhookConfig,
      });

      // Should have called for progress events
      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"status":"progress"'),
        }),
      );
    });

    it('should respect event filter in webhook config', async () => {
      const job = await service.createJob({
        input: 'test',
        webhook: {
          ...webhookConfig,
          on: ['started', 'completed'], // Only these events
        },
      });

      // Should not have called for progress events
      const calls = mockFetch.mock.calls;
      const progressCalls = calls.filter(([_, options]) =>
        options.body.includes('"status":"progress"'),
      );
      expect(progressCalls).toHaveLength(0);
    });

    it('should retry failed webhook calls', async () => {
      // Mock first call to fail, second to succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ ok: true });

      // Disable plugin to control webhook calls
      mockPlugin.enabled = false;

      const job = await service.createJob({
        input: 'test',
        webhook: webhookConfig,
      });

      // Should have been called for started event (fail + retry) only
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toBe(webhookUrl);
      expect(mockFetch.mock.calls[1][0]).toBe(webhookUrl);
    });

    it('should handle webhook errors gracefully', async () => {
      // Mock all webhook calls to fail
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Disable plugin to control webhook calls
      mockPlugin.enabled = false;

      const job = await service.createJob({
        input: 'test',
        webhook: {
          ...webhookConfig,
          retries: 2, // Set retries to 2
        },
      });

      // Should not throw error and job should complete
      expect(job).toBeDefined();
      // Should retry started event twice
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls.every(([url]) => url === webhookUrl)).toBe(
        true,
      );
    });
  });
});
