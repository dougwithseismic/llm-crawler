import { Router } from 'express';
import { ServiceContainer } from '@/utils/service-container';
import { AppError } from '@/middleware/error-handler';

const router = Router();
const container = ServiceContainer.getInstance();

router.get('/example', async (req, res, next) => {
  try {
    const redis = container.get('redis');
    const config = container.get('config');

    // Use services...

    res.json({ message: 'Success' });
  } catch (error) {
    next(
      new AppError(500, 'Failed to process request', 'PROCESSING_ERROR', error),
    );
  }
});

export default router;
