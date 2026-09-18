import { Router } from 'express';
import cors from 'cors';
import express from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Permissive CORS for tracking script and beacon collection
const publicCors = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

// 1. Public tracking script
router.get('/script.js', publicCors, analyticsController.serveScript);

// 2. Public 1x1 transparent tracking pixel
router.get('/pixel.gif', publicCors, analyticsController.servePixel);

// 3. Public live visit gateway & redirect (QR Code / Mobile link)
router.get('/visit/:id', publicCors, analyticsController.visitAndRedirect);

// 4. Public beacon ingestion (supports text/plain beacon bodies from sendBeacon)
router.options('/collect', publicCors, (_req, res) => res.sendStatus(204));
router.post(
  '/collect',
  publicCors,
  express.text({ type: ['text/plain', 'application/json'] }),
  analyticsController.collect
);

// 3. Protected analytics queries (Master Dashboard UI)
router.get('/global', authMiddleware, analyticsController.getGlobalAnalytics);
router.get('/project/:id', authMiddleware, analyticsController.getProjectAnalytics);
router.get('/project/:id/realtime', authMiddleware, analyticsController.getProjectRealtime);
router.post('/sync-production', authMiddleware, analyticsController.syncProduction);

export default router;
