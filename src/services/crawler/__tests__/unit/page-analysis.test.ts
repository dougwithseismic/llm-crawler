import { describe, expect, it, beforeEach, vi } from 'vitest';
import { chromium, type Page, type Browser } from 'playwright';
import { PlaywrightCrawler, createPlaywrightRouter } from 'crawlee';
import { CrawlerService } from '../../crawler';
import type { CrawlConfig } from '../../types.improved';
import { createMockPlugin } from './test-utils';

// Mock modules first (hoisted)
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
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
    } as Partial<Browser>),
  },
}));

vi.mock('crawlee', () => {
  const mockRun = vi.fn().mockResolvedValue(undefined);
  return {
    PlaywrightCrawler: vi.fn().mockImplementation(() => ({
      run: mockRun,
    })),
    createPlaywrightRouter: vi.fn().mockReturnValue({
      addDefaultHandler: vi.fn(),
    }),
  };
});

describe('Page Analysis', () => {
  let service: CrawlerService;
  let mockCrawlerRun: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCrawlerRun = vi.mocked(new PlaywrightCrawler({})).run;
  });

  describe('basic metrics collection', () => {
    it('should set up crawler with page analysis capabilities', async () => {
      service = new CrawlerService({ plugins: [] });
      const config: CrawlConfig = {
        url: 'https://example.com',
      };

      const job = await service.createJob(config);
      await service.startJob(job.id);

      // Verify crawler was created and run
      expect(PlaywrightCrawler).toHaveBeenCalled();
      expect(mockCrawlerRun).toHaveBeenCalledWith([config.url]);
    });
  });

  describe('plugin metric collection', () => {
    it('should initialize plugins correctly', async () => {
      const mockPlugin = createMockPlugin('test-plugin');
      const initializeSpy = vi.spyOn(mockPlugin, 'initialize');

      service = new CrawlerService({ plugins: [mockPlugin] });

      expect(initializeSpy).toHaveBeenCalledOnce();
    });

    it('should respect plugin enabled state', async () => {
      const enabledPlugin = createMockPlugin('enabled-plugin', true);
      const disabledPlugin = createMockPlugin('disabled-plugin', false);

      service = new CrawlerService({
        plugins: [enabledPlugin, disabledPlugin],
      });

      expect(enabledPlugin.enabled).toBe(true);
      expect(disabledPlugin.enabled).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle plugin initialization errors gracefully', async () => {
      const errorPlugin = createMockPlugin('error-plugin');
      vi.spyOn(errorPlugin, 'initialize').mockRejectedValueOnce(
        new Error('Init error'),
      );

      // Service should not throw on plugin init failure
      service = new CrawlerService({ plugins: [errorPlugin] });
      expect(service).toBeDefined();
    });

    it('should complete job even with navigation errors', async () => {
      const mockErrorPage = {
        goto: vi.fn().mockRejectedValue(new Error('Navigation failed')),
        evaluate: vi.fn(),
        setExtraHTTPHeaders: vi.fn(),
        context: vi.fn().mockReturnValue({
          addInitScript: vi.fn(),
        }),
        close: vi.fn(),
      } as unknown as Page;

      vi.mocked(chromium.launch).mockResolvedValueOnce({
        newPage: vi.fn().mockResolvedValue(mockErrorPage),
        close: vi.fn(),
      } as unknown as Browser);

      service = new CrawlerService({ plugins: [] });
      const config: CrawlConfig = {
        url: 'https://example.com',
      };

      const job = await service.createJob(config);
      await service.startJob(job.id);

      const completedJob = await service.getJob(job.id);
      expect(completedJob.progress.status).toBe('completed');
    });
  });
});
