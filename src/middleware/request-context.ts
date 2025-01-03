import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  startTime: number;
  userId?: string;
  source?: string;
}

export const contextStorage = new AsyncLocalStorage<RequestContext>();

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const context: RequestContext = {
    requestId,
    startTime: Date.now(),
    userId: req.headers['x-user-id'] as string,
    source: req.headers['x-source'] as string,
  };

  contextStorage.run(context, () => {
    res.setHeader('x-request-id', requestId);
    next();
  });
};
