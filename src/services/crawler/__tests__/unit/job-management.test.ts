import { describe, expect, it, beforeEach } from 'vitest';
import { CrawlerService } from '../../crawler';
import type { CrawlConfig, CrawlJob } from '../../types.improved';

// Helper to ensure timestamp differences
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Job Management', () => {
  let service: CrawlerService;
  let basicConfig: CrawlConfig;

  beforeEach(() => {
    service = new CrawlerService({ plugins: [] });
    basicConfig = {
      url: 'https://example.com',
      maxDepth: 2,
      maxPages: 10,
    };
  });

  describe('createJob', () => {
    it('should create a job with correct initial state', async () => {
      const job = await service.createJob(basicConfig);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.config).toEqual(basicConfig);
      expect(job.progress).toEqual(
        expect.objectContaining({
          pagesAnalyzed: 0,
          totalPages: 0,
          currentDepth: 0,
          uniqueUrls: 0,
          skippedUrls: 0,
          failedUrls: 0,
          status: 'queued',
        }),
      );
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.updatedAt).toBeInstanceOf(Date);
    });

    it('should create unique jobs with different IDs', async () => {
      const job1 = await service.createJob(basicConfig);
      const job2 = await service.createJob(basicConfig);

      expect(job1.id).not.toEqual(job2.id);
    });
  });

  describe('getJob', () => {
    it('should retrieve an existing job', async () => {
      const createdJob = await service.createJob(basicConfig);
      const retrievedJob = await service.getJob(createdJob.id);

      expect(retrievedJob).toEqual(createdJob);
    });

    it('should throw error for non-existent job', async () => {
      await expect(service.getJob('non-existent-id')).rejects.toThrow(
        'Job non-existent-id not found',
      );
    });
  });

  describe('updateProgress', () => {
    it('should update job progress correctly', async () => {
      const job = await service.createJob(basicConfig);
      const initialUpdatedAt = job.updatedAt;

      // Wait a bit to ensure timestamp difference
      await wait(10);

      const progressUpdate = {
        pagesAnalyzed: 5,
        currentDepth: 1,
        uniqueUrls: 3,
        status: 'running' as const,
      };

      const updatedProgress = await service.updateProgress(
        job.id,
        progressUpdate,
      );

      expect(updatedProgress).toEqual(expect.objectContaining(progressUpdate));

      // Verify the job was updated
      const updatedJob = await service.getJob(job.id);
      expect(updatedJob.progress).toEqual(
        expect.objectContaining(progressUpdate),
      );
      expect(updatedJob.updatedAt.getTime()).toBeGreaterThan(
        initialUpdatedAt.getTime(),
      );
    });
  });

  describe('failJob', () => {
    it('should properly mark a job as failed', async () => {
      const job = await service.createJob(basicConfig);
      const initialUpdatedAt = job.updatedAt;

      // Wait a bit to ensure timestamp difference
      await wait(10);

      const error = new Error('Test error');
      const failedJob = await service.failJob(job.id, error);

      expect(failedJob.progress.status).toBe('failed');
      expect(failedJob.progress.error).toBe(error.message);
      expect(failedJob.progress.endTime).toBeDefined();
      expect(failedJob.updatedAt.getTime()).toBeGreaterThan(
        initialUpdatedAt.getTime(),
      );
    });
  });
});
