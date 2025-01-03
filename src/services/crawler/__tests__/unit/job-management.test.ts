import { describe, expect, it, beforeEach } from 'vitest';
import { CrawlerService } from '../../crawler';
import type { CrawlConfig, CrawlJob } from '../../types.improved';

describe('Job Management', () => {
  let service: CrawlerService;

  beforeEach(() => {
    service = new CrawlerService({ plugins: [] });
  });

  describe('job creation', () => {
    it('should create a job with valid configuration', async () => {
      const config: CrawlConfig = {
        url: 'https://example.com',
        crawlSpeed: 'medium',
      };

      const job = await service.createJob(config);

      expect(job).toMatchObject({
        id: expect.any(String),
        config,
        progress: {
          pagesAnalyzed: 0,
          totalPages: 0,
          currentDepth: 0,
          uniqueUrls: 0,
          skippedUrls: 0,
          failedUrls: 0,
          status: 'queued',
          startTime: expect.any(Date),
        },
        priority: 0,
        retries: 0,
        maxRetries: 3,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('job retrieval', () => {
    it('should retrieve an existing job', async () => {
      const config: CrawlConfig = {
        url: 'https://example.com',
        crawlSpeed: 'medium',
      };

      const createdJob = await service.createJob(config);
      const retrievedJob = await service.getJob(createdJob.id);

      expect(retrievedJob).toEqual(createdJob);
    });

    it('should throw error for non-existent job', async () => {
      await expect(service.getJob('non-existent-id')).rejects.toThrow(
        'Job non-existent-id not found',
      );
    });
  });

  describe('progress tracking', () => {
    let job: CrawlJob;

    beforeEach(async () => {
      const config: CrawlConfig = {
        url: 'https://example.com',
        crawlSpeed: 'medium',
      };
      job = await service.createJob(config);
    });

    it('should get current progress', async () => {
      const progress = await service.getProgress(job.id);
      expect(progress).toEqual(job.progress);
    });

    it('should update progress', async () => {
      const update = {
        pagesAnalyzed: 5,
        totalPages: 10,
        currentUrl: 'https://example.com/page',
      };

      const updatedProgress = await service.updateProgress(job.id, update);

      expect(updatedProgress).toMatchObject({
        ...job.progress,
        ...update,
      });
    });
  });
});
