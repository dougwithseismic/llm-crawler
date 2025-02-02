import { describe, expect, it, beforeEach, vi } from 'vitest';
import { chromium } from 'playwright';
import { PlaywrightCrawler, createPlaywrightRouter } from 'crawlee';
import { CrawlerService } from '../../crawler';
import type { CrawlConfig, CrawlEventMap } from '../../types.improved';

// Mock external dependencies
vi.mock('playwright', async () => {
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue({
      goto: vi.fn(),
      evaluate: vi.fn().mockResolvedValue({
        url: 'https://example.com',
        status: 200,
        redirectChain: [],
        timing: {
          start: 0,
          domContentLoaded: 100,
          loaded: 200,
        },
      }),
      setExtraHTTPHeaders: vi.fn(),
      context: vi.fn().mockReturnValue({
        addInitScript: vi.fn(),
      }),
      close: vi.fn(),
    }),
    close: vi.fn(),
    removeAllListeners: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    eventNames: vi.fn(),
    listenerCount: vi.fn(),
    listeners: vi.fn(),
    prependListener: vi.fn(),
    prependOnceListener: vi.fn(),
    rawListeners: vi.fn(),
  };

  return {
    chromium: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
  };
});

vi.mock('crawlee', async () => {
  const mockCrawler = {
    run: vi.fn().mockResolvedValue(undefined),
  };

  return {
    PlaywrightCrawler: vi.fn().mockImplementation(() => mockCrawler),
    createPlaywrightRouter: vi.fn().mockReturnValue({
      addDefaultHandler: vi.fn(),
    }),
  };
});

describe('Event System', () => {
  let service: CrawlerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CrawlerService({ plugins: [] });
  });

  describe('event registration', () => {
    it('should allow registering event handlers', () => {
      const handlers = {
        jobStart: vi.fn(),
        jobComplete: vi.fn(),
        jobError: vi.fn(),
        pageStart: vi.fn(),
        pageComplete: vi.fn(),
        pageError: vi.fn(),
        progress: vi.fn(),
      };

      // Register all event handlers
      Object.entries(handlers).forEach(([event, handler]) => {
        service.on(event as keyof CrawlEventMap, handler);
      });

      // Verify service has event listeners
      Object.keys(handlers).forEach((event) => {
        expect(service.listenerCount(event)).toBe(1);
      });
    });

    it('should extend EventEmitter', () => {
      expect(service.emit).toBeDefined();
      expect(service.on).toBeDefined();
      expect(service.once).toBeDefined();
      expect(service.removeListener).toBeDefined();
    });
  });

  describe('job lifecycle', () => {
    it('should handle job lifecycle events', async () => {
      const config: CrawlConfig = {
        url: 'https://example.com',
      };

      const job = await service.createJob(config);

      // Verify job is created with correct initial state
      expect(job.progress.status).toBe('queued');

      await service.startJob(job.id);

      // Verify job completes successfully
      const completedJob = await service.getJob(job.id);
      expect(completedJob.progress.status).toBe('completed');
    });

    it('should handle job failures', async () => {
      const config: CrawlConfig = {
        url: 'https://example.com',
      };

      const job = await service.createJob(config);
      const error = new Error('Test error');
      await service.failJob(job.id, error);

      const failedJob = await service.getJob(job.id);
      expect(failedJob.progress.status).toBe('failed');
      expect(failedJob.progress.error).toBe(error.message);
    });
  });

  describe('crawler integration', () => {
    it('should set up crawler with event handling', async () => {
      const config: CrawlConfig = {
        url: 'https://example.com',
      };

      const job = await service.createJob(config);
      await service.startJob(job.id);

      // Verify crawler was created with correct configuration
      expect(PlaywrightCrawler).toHaveBeenCalled();
      const mockCrawler = vi.mocked(PlaywrightCrawler).mock.results[0]?.value;
      expect(mockCrawler.run).toHaveBeenCalledWith([config.url]);
    });

    it('should handle navigation errors', async () => {
      // Mock navigation error
      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockRejectedValue(new Error('Navigation failed')),
          evaluate: vi.fn(),
          setExtraHTTPHeaders: vi.fn(),
          context: vi.fn().mockReturnValue({
            addInitScript: vi.fn(),
          }),
          close: vi.fn(),
        }),
        close: vi.fn(),
      };

      vi.mocked(chromium.launch).mockResolvedValueOnce(mockBrowser as any);

      const config: CrawlConfig = {
        url: 'https://example.com',
      };

      const job = await service.createJob(config);
      await service.startJob(job.id);

      // Verify job completes despite error
      const completedJob = await service.getJob(job.id);
      expect(completedJob.progress.status).toBe('completed');
    });
  });
});
