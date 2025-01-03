import { Request, Response, NextFunction } from 'express';

type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

export const createMiddlewareChain = (...middlewares: Middleware[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const executeMiddleware = async (index: number): Promise<void> => {
      if (index === middlewares.length) {
        return next();
      }

      try {
        await new Promise<void>((resolve, reject) => {
          middlewares[index](req, res, (error?: any) => {
            if (error) reject(error);
            else resolve();
          });
        });

        await executeMiddleware(index + 1);
      } catch (error) {
        next(error);
      }
    };

    await executeMiddleware(0);
  };
};
