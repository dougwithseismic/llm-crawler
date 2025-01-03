import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { Redis } from 'ioredis';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';

// Import routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';
import crawlRoutes from './routes/crawl';
import { logger } from './config/logger';
import { TunnelService } from './services/tunnel-service';
import testRoutes from './routes/test';

const app = express();
const port = process.env.PORT || 3000;

// Redis client for rate limiting
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/', healthRoutes);
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/crawl', crawlRoutes);
app.use('/test', testRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, async () => {
  logger.info(`Starting server on port ${port}`);
  const tunnelService = new TunnelService();
  await tunnelService.connect({
    port: Number(port),
    authtoken: process.env.TUNNEL_AUTH_TOKEN,
  });
  const tunnelUrl = await tunnelService.waitUntilConnected();
  logger.info(`

   WELCOME TO THE GREAT HALLS

   PORT     : https://localhost://${port}
   TUNNEL   : ${tunnelUrl}

   Go forth and forge your destiny!
   <doug@withseismic.com>
  `);
});
