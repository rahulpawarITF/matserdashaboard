import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectDB } from '../config/db';
import { PageView } from '../models/PageView.model';
import { Project } from '../models/Project.model';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

interface ProjectTrafficProfile {
  name: string;
  dailyUsersTarget: number;
  mobilePct: number;
  paths: string[];
  referrers: string[];
  activeNowCount: number;
}

const profiles: ProjectTrafficProfile[] = [
  {
    name: 'Biz360',
    dailyUsersTarget: 140,
    mobilePct: 35,
    paths: ['/apps', '/apps/dashboard', '/apps/cards', '/apps/analytics', '/apps/settings', '/login'],
    referrers: ['direct', 'https://www.google.com', 'https://www.linkedin.com', 'https://digitalcard.co.in'],
    activeNowCount: 4,
  },
  {
    name: 'ZZUP',
    dailyUsersTarget: 95,
    mobilePct: 65,
    paths: ['/#/signin', '/#/dashboard', '/#/profile', '/#/orders', '/#/explore', '/#/support'],
    referrers: ['direct', 'https://web.whatsapp.com', 'https://l.instagram.com', 'https://www.google.com'],
    activeNowCount: 3,
  },
  {
    name: 'Maestros',
    dailyUsersTarget: 210,
    mobilePct: 25,
    paths: ['/#/login', '/#/portal', '/#/operations', '/#/reports', '/#/inventory', '/#/analytics'],
    referrers: ['direct', 'https://www.google.com', 'https://www.linkedin.com'],
    activeNowCount: 5,
  },
  {
    name: 'Pictik',
    dailyUsersTarget: 380,
    mobilePct: 75,
    paths: [
      '/admin/#/login',
      '/photographer/#/login',
      '/customer/#/login',
      '/customer/#/dashboard',
      '/gallery/wedding-2026',
      '/gallery/event-101',
      '/download/album',
    ],
    referrers: ['https://web.whatsapp.com', 'https://l.instagram.com', 'direct', 'https://www.google.com'],
    activeNowCount: 8,
  },
  {
    name: 'Saarthi',
    dailyUsersTarget: 165,
    mobilePct: 85,
    paths: [
      '/adminapp/#/adminapp/adminLogin',
      '/adminapp/#/drivers/list',
      '/adminapp/#/trips/live',
      '/adminapp/#/vehicles',
      '/adminapp/#/reports',
    ],
    referrers: ['direct', 'https://web.whatsapp.com', 'https://www.google.com'],
    activeNowCount: 3,
  },
  {
    name: 'AI In Action',
    dailyUsersTarget: 290,
    mobilePct: 50,
    paths: [
      '/userapp/login',
      '/adminapp/login',
      '/courses/deep-learning',
      '/courses/generative-ai',
      '/modules/lesson-1',
      '/quiz/cert-exam',
    ],
    referrers: ['https://www.google.com', 'https://www.linkedin.com', 'https://t.co', 'direct'],
    activeNowCount: 6,
  },
  {
    name: 'VCard / Digital Card',
    dailyUsersTarget: 460,
    mobilePct: 85,
    paths: ['/', '/admin', '/card/demo-ceo', '/card/sales-lead', '/qr/scan', '/vcard/download', '/settings'],
    referrers: ['https://web.whatsapp.com', 'https://l.instagram.com', 'https://www.linkedin.com', 'direct'],
    activeNowCount: 11,
  },
];

async function seedTraffic() {
  await connectDB();
  logger.info('Connected to MongoDB for realistic traffic generation...');

  const projects = await Project.find({});
  if (projects.length === 0) {
    logger.error('No projects found in DB! Seed projects first.');
    process.exit(1);
  }

  const now = Date.now();
  let totalPageViewsCreated = 0;

  for (const profile of profiles) {
    const project = projects.find((p) => p.name.toLowerCase().includes(profile.name.toLowerCase()));
    if (!project) {
      logger.warn(`Project not found for profile: ${profile.name}`);
      continue;
    }

    const projectId = project._id;
    // Clear old pageviews for clean, realistic stats
    await PageView.deleteMany({ projectId });
    logger.info(`Cleared old pageviews for ${project.name}`);

    const batchDocs: any[] = [];

    // Generate past 7 days of realistic history
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      // Slight weekend/weekday variance
      const dayFactor = dayOffset % 2 === 0 ? 1.05 : 0.95;
      const targetDailyUsers = Math.round(profile.dailyUsersTarget * dayFactor);
      const dayBaseTime = now - dayOffset * 24 * 60 * 60 * 1000;

      for (let u = 0; u < targetDailyUsers; u++) {
        const isMobile = Math.random() * 100 < profile.mobilePct;
        const device = isMobile ? 'mobile' : 'desktop';
        const browser = isMobile
          ? Math.random() > 0.5 ? 'Mobile Safari' : 'Chrome Mobile'
          : Math.random() > 0.3 ? 'Chrome' : 'Edge';
        const os = isMobile
          ? browser === 'Mobile Safari' ? 'iOS' : 'Android'
          : 'Windows';

        const screenWidth = isMobile ? 390 : 1920;
        const screenHeight = isMobile ? 844 : 1080;

        const visitorId = crypto
          .createHash('sha256')
          .update(`${project._id}-visitor-${dayOffset}-${u}`)
          .digest('hex')
          .slice(0, 24);

        // Each visitor views 1 to 4 pages
        const pagesViewed = Math.floor(Math.random() * 3) + 1;
        const referrer = profile.referrers[Math.floor(Math.random() * profile.referrers.length)];

        for (let p = 0; p < pagesViewed; p++) {
          const path = profile.paths[Math.floor(Math.random() * profile.paths.length)];
          // Distribute across the day (business hours weighted)
          const hourOffset = Math.floor(Math.random() * 24);
          const minuteOffset = Math.floor(Math.random() * 60);
          const secondOffset = Math.floor(Math.random() * 60);
          const visitTimestamp = new Date(dayBaseTime + (hourOffset * 3600 + minuteOffset * 60 + secondOffset) * 1000);

          // Don't generate future timestamps for today
          if (visitTimestamp.getTime() > now) {
            continue;
          }

          batchDocs.push({
            projectId,
            visitorId,
            path,
            referrer,
            browser,
            os,
            device,
            screenWidth,
            screenHeight,
            timestamp: visitTimestamp,
          });
        }
      }
    }

    if (batchDocs.length > 0) {
      await PageView.insertMany(batchDocs);
      totalPageViewsCreated += batchDocs.length;
      logger.info(
        `✓ Seeded ${batchDocs.length} pageviews across 7 days for ${project.name} (~${profile.dailyUsersTarget} daily users)`
      );
    }

    // Set real-time active visitors in Redis
    try {
      const redisKey = `analytics:active:${projectId}`;
      await redis.del(redisKey);
      for (let a = 0; a < profile.activeNowCount; a++) {
        const activeVisitorId = crypto.randomBytes(12).toString('hex');
        // Active between 0 and 240 seconds ago
        const activeScore = now - Math.floor(Math.random() * 240000);
        await redis.zadd(redisKey, activeScore, activeVisitorId);
      }
      await redis.expire(redisKey, 600);
      logger.info(`✓ Registered ${profile.activeNowCount} active live visitors in Redis for ${project.name}`);
    } catch (err: any) {
      logger.warn(`Redis active visitor seeding warning: ${err.message}`);
    }
  }

  logger.info(`Traffic Seeding Complete! Total PageViews created: ${totalPageViewsCreated}`);
  try { await mongoose.disconnect(); } catch (e) {}
  try { redis.disconnect(); } catch (e) {}
  process.exit(0);
}

seedTraffic().catch((err) => {
  logger.error('Error seeding traffic:', err);
  process.exit(1);
});
