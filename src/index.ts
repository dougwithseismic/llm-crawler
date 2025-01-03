import { logger } from '@/config/logger';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

// Import routes
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
import crawlRoutes from './routes/crawl';
import healthRoutes from './routes/health';
import linkedinRoutes from './routes/linkedin';
import testRoutes from './routes/test';
import { TunnelService } from './services/tunnel-service';
import playgroundRouter from './routes/playground';

const app = express();
const port = process.env.PORT || 3000;

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
app.use('/linkedin', linkedinRoutes);
app.use('/test', testRoutes);
app.use('/playground', playgroundRouter);

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
