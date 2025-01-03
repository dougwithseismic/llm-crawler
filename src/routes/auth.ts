import { Router } from 'express';
import { AppError } from '@/middleware/error-handler';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError(400, 'Missing credentials', 'INVALID_INPUT');
    }

    // Authentication logic...
  } catch (error) {
    next(error);
  }
});

export default router;
