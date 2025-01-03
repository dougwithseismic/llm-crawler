import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';

export const healthRouter: ExpressRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({ status: 'ok' });
});
