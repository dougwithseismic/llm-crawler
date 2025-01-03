import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';
import { BaseError, QueueError } from '@/types/errors';
import { z } from 'zod';
import { prometheus } from '@/module/metrics/prometheus';

const getErrorType = (error: unknown): string => {
  if (error instanceof Error) {
    return error.constructor.name;
  }
  return 'UnknownError';
};

const apiErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Track error metrics
  prometheus.httpErrorsTotal.inc({
    path: req.path,
    method: req.method,
    error_type: getErrorType(error),
  });

  if (error instanceof QueueError) {
    return res.status(503).json({
      error: 'Queue service unavailable',
      details: error.message,
    });
  }

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.errors,
    });
  }

  if (error instanceof BaseError) {
    return res.status(error.statusCode).json({
      error: error.message,
    });
  }

  // Unhandled errors
  logger.error('Unhandled error:', error);
  return res.status(500).json({
    error: 'Internal server error',
  });
};

export { apiErrorHandler };
