import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';
import { createApiResponse } from '@/utils/api-response';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errorCode?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error('Error occurred', {
    error,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  if (error instanceof AppError) {
    return res.status(error.statusCode).json(
      createApiResponse({
        success: false,
        error: {
          message: error.message,
          code: error.errorCode,
          details: error.details,
        },
      }),
    );
  }

  res.status(500).json(
    createApiResponse({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      },
    }),
  );
};
