import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { connectDB } from './config/db';
import { logger } from './config/logger';
import { swaggerSpec } from './config/swagger';
import { initSocket } from './sockets/socket';
import { errorHandler } from './middleware/errorHandler.middleware';
import { apiRateLimit, analyticsBeaconRateLimit } from './middleware/rateLimit.middleware';
import { startScheduler } from './workers/scheduler';
import { heartbeatService } from './services/heartbeat.service';
import { registeredUsersService } from './services/registeredUsers.service';

// Routes
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import serviceRoutes from './routes/service.routes';
import dashboardRoutes from './routes/dashboard.routes';
import alertRoutes from './routes/alert.routes';
import systemRoutes from './routes/system.routes';
import analyticsRoutes from './routes/analytics.routes';

const startServer = async () => {
  await connectDB();
  
  const app = express();
  
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  app.use(cors({
    origin: (origin, callback) => {
      // Allow all origins for analytics or dev/client
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === env.CLIENT_URL) {
        callback(null, true);
      } else {
        // Allow cross-origin tracking requests from client project domains
        callback(null, true);
      }
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
  // Public analytics beacon ingestion with high-throughput limiter (10k req/min)
  app.get('/analytics.js', analyticsBeaconRateLimit, (_req, res) => res.redirect('/api/analytics/script.js'));
  app.use('/api/analytics', analyticsBeaconRateLimit, analyticsRoutes);

  // Standard API rate limit (200 req/min per IP) for dashboard & administrative operations
  app.use(apiRateLimit);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/system', systemRoutes);

  const frontendPath = path.resolve(__dirname, '../public');
  app.use(express.static(frontendPath));
  app.get('*', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
      return next();
    }

    return res.sendFile(path.join(frontendPath, 'index.html'), (error) => {
      if (error) next(error);
    });
  });

  app.use(errorHandler);

  const server = http.createServer(app);
  
  initSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    
    // Start Smart Tiered Heartbeat Monitor (20s Safe Production default, auto-elevates to 3s when dashboard active)
    heartbeatService.start('safe');

    // Fetch authentic registered user counts across all production databases
    registeredUsersService.refreshUserCounts().catch(err => {
      logger.warn('Initial registered users refresh notice:', err.message);
    });

    startScheduler().catch(err => {
      logger.warn('Scheduler startup notice:', err.message);
    });
  });
};

startServer().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
