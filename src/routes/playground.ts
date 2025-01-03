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
    const job = await playgroundService.createJob({
      input: req.body.input,
      retries: req.body.retries ?? 3,
      plugins: req.body.plugins,
    });

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
