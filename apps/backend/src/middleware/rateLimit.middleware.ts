import rateLimit from 'express-rate-limit';

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // relaxed in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many login attempts, please try again after 15 minutes' } }
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5000, // Generous throughput for dashboard multi-tab operations
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please try again later' } }
});

export const analyticsBeaconRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10000, // High throughput: 10,000 beacons/min per IP (supports shared office NAT, multiple tabs)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Beacon throughput limit reached' } }
});
