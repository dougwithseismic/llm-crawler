import { z } from 'zod';
import { logger } from './logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  REDIS_URL: z.string().url(),
  RATE_LIMIT: z
    .object({
      API: z.object({
        WINDOW_MS: z.number(),
        MAX_REQUESTS: z.number(),
        FAILURE_THRESHOLD: z.number(),
      }),
      AUTH: z.object({
        WINDOW_MS: z.number(),
        MAX_ATTEMPTS: z.number(),
      }),
    })
    .default({
      API: {
        WINDOW_MS: 60000,
        MAX_REQUESTS: 100,
        FAILURE_THRESHOLD: 10,
      },
      AUTH: {
        WINDOW_MS: 900000,
        MAX_ATTEMPTS: 5,
      },
    }),
});

const loadConfig = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    logger.error('Configuration validation failed', { error });
    console.error({ error });
    process.exit(1);
  }
};

export interface AppConfig {
  port: number;
  tunnel: {
    enabled: boolean;
    authtoken?: string;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  tunnel: {
    enabled: process.env.ENABLE_TUNNEL === 'true',
    authtoken: process.env.NGROK_AUTHTOKEN,
  },
};
