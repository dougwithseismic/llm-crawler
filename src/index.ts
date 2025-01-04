import { logger } from '@/config/logger';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// In production, serve static files from the React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));

  // Handle React routing, return all requests to React app
  app.get('/client/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, async () => {
  logger.info(`Starting server on port ${port}`);

  if (process.env.NODE_ENV === 'development') {
    // In development, the client is served by Vite on the same port
    open(`http://localhost:${port}/client`);
    logger.info(`GUI: http://localhost:${port}/client`);
  }

  const tunnelService = new TunnelService();
  await tunnelService.connect({
    port: Number(port),
    authtoken: process.env.TUNNEL_AUTH_TOKEN,
  });
  const tunnelUrl = await tunnelService.waitUntilConnected();
  logger.info(`

   WELCOME TO THE GREAT HALLS

   PORT     : http://localhost:${port}
   TUNNEL   : ${tunnelUrl}

   Go forth and forge your destiny!
   <doug@withseismic.com>
  `);
});
