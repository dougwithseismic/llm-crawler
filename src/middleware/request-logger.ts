import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Log the request
    logger.info(
      `${req.method} ${req.url} :: ${res.statusCode} :: ${duration}ms`,
    );
  });

  next();
};
