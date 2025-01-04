import { Router } from 'express';
import { PlaygroundService } from '../services/playground/playground';
import { ExamplePlugin } from '../services/playground/plugins/example-plugin';

const router = Router();
const playgroundService = new PlaygroundService({
  plugins: [new ExamplePlugin()],
  config: { debug: process.env.NODE_ENV === 'development' },
});

// Create a new playground job
router.post('/jobs', async (req, res) => {
  try {
    const service = new PlaygroundService({
      plugins: req.body.plugins.map(() => new ExamplePlugin()),
      config: { debug: process.env.NODE_ENV === 'development' },
    });

    const config = {
      input: req.body.input,
      timeout: req.body.timeout,
      retries: req.body.retries,
      debug: req.body.debug,
      webhook: req.body.webhook,
      async: req.body.async,
    };

    const job = await service.createJob(config);

    // If async is true, return immediately with job ID
    if (config.async) {
      res.json({
        jobId: job.id,
        status: 'accepted',
        message: 'Job started successfully',
      });
      return;
    }

    // Otherwise wait for job completion
    res.json(job);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start a job
router.post('/jobs/:id/start', async (req, res) => {
  try {
    const job = await playgroundService.startJob(req.params.id);
    res.json(job);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get job status
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await playgroundService.getJob(req.params.id);
    res.json(job);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

// Get job progress
router.get('/jobs/:id/progress', async (req, res) => {
  try {
    const progress = await playgroundService.getProgress(req.params.id);
    res.json(progress);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

export default router;
