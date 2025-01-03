import { logger } from './config/logger';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config/app-config';
import { redis } from './config/redis';
import { errorHandler } from './middleware/error-handler';
import { createMiddlewareChain } from './middleware/middleware-chain';
import { apiRateLimiter, authRateLimiter } from './middleware/rate-limiter';
import { requestLogger } from './middleware/request-logger';

// Bull Board imports
import { ServiceContainer } from './utils/service-container';

// Initialize Express and HTTP server
const app = express();
const server = createServer(app);
const container = ServiceContainer.getInstance();

// Register core services
container.register('config', config);
container.register('redis', redis);

// Setup middleware chain for protected routes
const protectedRouteMiddleware = createMiddlewareChain(
  apiRateLimiter,
  // Add more middleware here...
);

// Setup middleware chain for auth routes
const authMiddleware = createMiddlewareChain(
  authRateLimiter,
  // Add auth specific middleware...
);

// Setup core middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Setup routes
app.use('/api', protectedRouteMiddleware, require('./routes/api').default);
app.use('/auth', authMiddleware, require('./routes/auth').default);

// Sentry test route
app.get('/debug-sentry', function mainHandler(req, res) {
  throw new Error('My first Sentry error!');
});

// Error handling should be last
app.use(errorHandler);

try {
  const port = process.env.PORT || 3000;

  server.listen(port, async () => {
    logger.info(`SWARM SERVER :: 🐄🐄🐄 is running on port ${port}`);
  });
} catch (error) {
  logger.error('Failed to start server', { error });
  process.exit(1);
}
