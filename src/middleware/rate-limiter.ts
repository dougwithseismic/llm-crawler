import { rateLimit } from 'express-rate-limit';
import { MemoryStore } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '@/config/logger';
import { createApiResponse } from '@/utils/api-response';
import { CircuitBreaker } from './circuit-breaker';

interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  circuitBreaker?: {
    failureThreshold?: number;
    resetTimeout?: number;
    monitorWindow?: number;
  };
}

const defaultKeyGenerator = (req: Request): string => {
  const identifier =
    req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'];

  return `${req.method}:${req.path}:${identifier}`;
};

const defaultRateLimitHandler = (req: Request, res: Response) => {
  const retryAfter = res.getHeader('Retry-After');

  logger.warn('Rate limit exceeded', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    headers: req.headers,
  });

  res.status(429).json(
    createApiResponse({
      success: false,
      error: {
        message: 'Too many requests',
        details: {
          retryAfter,
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds`,
        },
      },
    }),
  );
};

export const createRateLimiter = ({
  windowMs = 60 * 1000, // 1 minute
  max = 100,
  keyPrefix = 'rl',
  keyGenerator = defaultKeyGenerator,
  handler = defaultRateLimitHandler,
  circuitBreaker: circuitBreakerConfig,
}: RateLimitConfig = {}) => {
  const breaker = circuitBreakerConfig
    ? new CircuitBreaker(circuitBreakerConfig)
    : null;

  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests, please try again later.',
    standardHeaders: 'draft-6',
    handler: (req, res) => {
      if (breaker?.isOpen()) {
        res.status(503).json(
          createApiResponse({
            success: false,
            error: {
              message: 'Service temporarily unavailable',
              details: {
                message: 'Circuit breaker is open. Please try again later.',
              },
            },
          }),
        );
        return;
      }

      handler(req, res);
      breaker?.recordFailure();
    },
    requestWasSuccessful: (req, res) => {
      const success = res.statusCode < 400;
      if (success && breaker) {
        breaker.recordSuccess();
      }
      return success;
    },
    skip: (req) => {
      return req.path === '/health' || req.ip === '127.0.0.1';
    },
    store: new MemoryStore(),
    keyGenerator,
  });
};

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyPrefix: 'api-rl',
  circuitBreaker: {
    failureThreshold: 10,
    resetTimeout: 30000, // 30 seconds
    monitorWindow: 60000, // 1 minute
  },
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  keyPrefix: 'auth-rl',
});

export const heavyOperationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  keyPrefix: 'heavy-rl',
});
