import { Router } from 'express';
import { z } from 'zod';
import { CrawlerService } from '../services/crawler';
import { LinkedInPlugin } from '../services/crawler/plugins/linkedin';
import { QueueService } from '../services/crawler/queue-service';

const router = Router();

const LinkedInCrawlConfigSchema = z
  .object({
    li_at: z.string().optional(),
    maxDepth: z.number().min(1).max(10).optional(),
    maxPages: z.number().min(1).max(1000).optional(),
    maxRequestsPerMinute: z.number().min(1).max(300).optional(),
    maxConcurrency: z.number().min(1).max(100).optional(),
    timeout: z
      .object({
        page: z.number().min(1000).max(60000).optional(),
        request: z.number().min(1000).max(60000).optional(),
      })
      .optional(),
    headers: z.record(z.string()).optional(),
    webhook: z.object({
      url: z.string().url(),
      headers: z.record(z.string()).optional(),
      retries: z.number().min(1).max(5).optional(),
      on: z
        .array(z.enum(['started', 'progress', 'completed', 'failed']))
        .optional(),
    }),
  })
  .transform((data) => ({
    ...data,
    // Force some LinkedIn-specific settings
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    respectRobotsTxt: false,
  }));

router.post('/:profile', async (req, res) => {
  try {
    const { profile } = req.params;
    const configResult = LinkedInCrawlConfigSchema.safeParse(req.body);

    if (!configResult.success) {
      return res.status(400).json({
        error: 'Invalid configuration',
        issues: configResult.error.issues,
      });
    }

    const li_at = configResult.data.li_at ?? process.env.COOKIE_LI_AT;
    if (!li_at) {
      return res.status(400).json({
        error: 'LinkedIn cookie required',
        message:
          'Please provide li_at cookie in request body or set COOKIE_LI_AT environment variable',
      });
    }

    const crawler = new CrawlerService({
      plugins: [new LinkedInPlugin({ li_at })],
      config: { debug: process.env.NODE_ENV === 'development' },
    });

    const job = await crawler.createJob({
      url: `https://www.linkedin.com/in/${profile}`,
      ...configResult.data,
    });

    const queue = new QueueService(crawler);
    queue.enqueue(job).catch(console.error);

    return res.json({
      message:
        'LinkedIn crawl job accepted. Status updates will be sent to the webhook URL.',
      jobId: job.id,
      status: 'accepted',
      queueInfo: {
        position: queue.getQueueLength(),
        isProcessing: queue.getIsProcessing(),
        estimatedStart: queue.getIsProcessing()
          ? 'Will start after current job completes'
          : 'Starting shortly',
      },
    });
  } catch (error) {
    console.error('LinkedIn crawl route error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

export default router;
