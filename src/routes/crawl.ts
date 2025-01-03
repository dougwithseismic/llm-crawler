import { Router } from 'express';
import { z } from 'zod';
import { CrawlerService } from '../services/crawler';
import { ContentPlugin } from '../services/crawler/plugins/content';
import { QueueService } from '../services/crawler/queue-service';

/**
 * Crawler API Endpoint
 *
 * POST /crawl/:sitedomain
 *
 * Crawls a website and analyzes its content using the ContentPlugin.
 * Jobs are processed sequentially through a queue.
 *
 * The API immediately returns a jobId and status updates are sent to the webhook URL.
 * A webhook URL is required as crawls can take a long time to complete.
 *
 * @example
 * Basic usage (with required webhook):
 * ```bash
 * curl -X POST http://localhost:3000/crawl/example.com \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "webhook": {
 *       "url": "https://your-server.com/webhook"
 *     }
 *   }'
 * ```
 *
 * Full configuration:
 * ```bash
 * curl -X POST http://localhost:3000/crawl/example.com \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "maxDepth": 3,
 *     "maxPages": 100,
 *     "maxRequestsPerMinute": 60,
 *     "maxConcurrency": 10,
 *     "timeout": {
 *       "page": 30000,
 *       "request": 10000
 *     },
 *     "userAgent": "MyBot/1.0",
 *     "respectRobotsTxt": true,
 *     "sitemapUrl": "https://example.com/sitemap.xml",
 *     "webhook": {
 *       "url": "https://your-server.com/webhook",
 *       "headers": {
 *         "Authorization": "Bearer your-token"
 *       },
 *       "retries": 3
 *     }
 *   }'
 * ```
 *
 * Webhook Updates:
 * 1. Job Started:
 * ```json
 * {
 *   "status": "started",
 *   "jobId": "550e8400-e29b-41d4-a716-446655440000",
 *   "timestamp": "2024-01-03T12:00:00.000Z"
 * }
 * ```
 *
 * 2. Progress Updates (sent periodically):
 * ```json
 * {
 *   "status": "progress",
 *   "jobId": "550e8400-e29b-41d4-a716-446655440000",
 *   "timestamp": "2024-01-03T12:00:10.000Z",
 *   "progress": {
 *     "pagesAnalyzed": 50,
 *     "totalPages": 100,
 *     "currentUrl": "https://example.com/page",
 *     "uniqueUrls": 45,
 *     "skippedUrls": 5
 *   }
 * }
 * ```
 *
 * 3. Job Completed:
 * ```json
 * {
 *   "status": "completed",
 *   "jobId": "550e8400-e29b-41d4-a716-446655440000",
 *   "timestamp": "2024-01-03T12:01:00.000Z",
 *   "result": {
 *     "pages": [...],
 *     "summary": {...}
 *   }
 * }
 * ```
 *
 * 4. Job Failed:
 * ```json
 * {
 *   "status": "failed",
 *   "jobId": "550e8400-e29b-41d4-a716-446655440000",
 *   "timestamp": "2024-01-03T12:00:15.000Z",
 *   "error": "Error message"
 * }
 * ```
 */

const router = Router();

// Initialize services (singleton pattern)
const crawler = new CrawlerService({
  plugins: [new ContentPlugin()],
  config: { debug: process.env.NODE_ENV === 'development' },
});
const queue = new QueueService(crawler);

const CrawlConfigSchema = z.object({
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
  userAgent: z.string().optional(),
  respectRobotsTxt: z.boolean().optional(),
  sitemapUrl: z.string().url().nullable().optional(),
  webhook: z.object({
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
    retries: z.number().min(1).max(5).optional(),
    on: z
      .array(z.enum(['started', 'progress', 'completed', 'failed']))
      .optional(),
  }), // webhook is required
});

router.post('/:sitedomain', async (req, res) => {
  try {
    // Parse and validate domain using URL API
    const { sitedomain } = req.params;
    let domain: string;

    try {
      // Try with https first
      const url = new URL(`https://${sitedomain}`);
      domain = url.hostname;
    } catch {
      try {
        // If https fails, try with http
        const url = new URL(`http://${sitedomain}`);
        domain = url.hostname;
      } catch {
        return res.status(400).json({
          error: 'Invalid domain',
          message: 'Please provide a valid domain name (e.g., example.com)',
        });
      }
    }

    // Validate and parse configuration from request body
    const configResult = CrawlConfigSchema.safeParse(req.body);
    if (!configResult.success) {
      return res.status(400).json({
        error: 'Invalid configuration',
        issues: configResult.error.issues,
      });
    }

    // Create crawl job with validated configuration
    const job = await crawler.createJob({
      url: `https://${domain}`,
      ...configResult.data,
    });

    // Add job to queue (non-blocking)
    queue.enqueue(job).catch((error) => {
      console.error('Failed to enqueue job:', error);
      // We'll handle this via webhook since we've already returned to the client
    });

    // Return immediately with job details
    return res.json({
      message:
        'Crawl job accepted. Status updates will be sent to the webhook URL.',
      jobId: job.id,
      status: 'accepted',
      queueInfo: {
        position: queue.getQueueLength(),
        isProcessing: queue.getIsProcessing(),
        estimatedStart: queue.getIsProcessing()
          ? 'Will start after current job completes'
          : 'Starting shortly',
      },
      webhook: {
        url: configResult.data.webhook.url,
        expectedUpdates: [
          'started',
          'progress (every 10 seconds + every 10 pages)',
          'completed/failed',
        ],
      },
    });
  } catch (error) {
    console.error('Crawl route error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

export default router;
