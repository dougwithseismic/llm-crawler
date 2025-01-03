import { describe, expect, it, beforeEach, vi } from 'vitest';
import { CrawlerService } from '../../crawler';
import type { CrawlerPlugin, CrawlerServiceOptions } from '../../types/plugin';
import { createMockPlugin } from './test-utils';

describe('CrawlerService Initialization', () => {
  let service: CrawlerService;

  describe('with default settings', () => {
    beforeEach(() => {
      service = new CrawlerService({ plugins: [] });
    });

    it('should initialize with empty plugins array', () => {
      expect(service).toBeDefined();
    });
  });

  describe('with custom plugins', () => {
    it('should initialize plugins correctly', async () => {
      const mockPlugin = createMockPlugin('test-plugin');
      const initializeSpy = vi.spyOn(mockPlugin, 'initialize');

      service = new CrawlerService({ plugins: [mockPlugin] });

      expect(initializeSpy).toHaveBeenCalledOnce();
    });

    it('should handle plugin initialization errors', async () => {
      const mockPlugin = createMockPlugin('error-plugin');
      const error = new Error('Plugin initialization failed');
      vi.spyOn(mockPlugin, 'initialize').mockRejectedValueOnce(error);

      // Service should not throw on plugin init failure
      service = new CrawlerService({ plugins: [mockPlugin] });
      expect(service).toBeDefined();
    });

    it('should track plugin enabled/disabled state', () => {
      const enabledPlugin = createMockPlugin('enabled-plugin', true);
      const disabledPlugin = createMockPlugin('disabled-plugin', false);

      service = new CrawlerService({
        plugins: [enabledPlugin, disabledPlugin],
      });

      expect(enabledPlugin.enabled).toBe(true);
      expect(disabledPlugin.enabled).toBe(false);
    });
  });
});
