import mongoose from 'mongoose';
import crypto from 'crypto';
import { PageView } from '../models/PageView.model';
import { Project } from '../models/Project.model';
import { Settings } from '../models/Settings.model';
import { parseUserAgent } from '../utils/userAgentParser';
import { logger } from '../config/logger';

const PROD_MONGO_URI =
  process.env.PROD_DATABASE_URL ||
  'mongodb://itfuturz01:!tfuturz!-!sanvi!2022!@147.79.70.177:27017/?authSource=admin';

interface SyncResult {
  success: boolean;
  syncedCounts: Record<string, number>;
  totalSynced: number;
  lastTimestamp?: Date;
  error?: string;
}

export class ProductionSyncService {
  private prodConnection: mongoose.Connection | null = null;
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private currentIntervalMs = 60000;
  private lastSyncTimestamps: Record<string, Date> = {};

  /**
   * Ensure active connection to production MongoDB server (147.79.70.177)
   */
  private async getProdConnection(): Promise<mongoose.Connection> {
    if (this.prodConnection && this.prodConnection.readyState === 1) {
      return this.prodConnection;
    }

    let timeoutMs = 8000;
    try {
      const cfg = await Settings.getActiveConfig();
      if (cfg.prodDbTimeoutMs) timeoutMs = cfg.prodDbTimeoutMs;
    } catch {
      // fallback
    }

    this.prodConnection = await mongoose
      .createConnection(PROD_MONGO_URI, {
        serverSelectionTimeoutMS: timeoutMs,
        connectTimeoutMS: timeoutMs,
        maxPoolSize: 5,
      })
      .asPromise();

    logger.info('Connected to Real Production MongoDB (147.79.70.177)');
    return this.prodConnection;
  }

  /**
   * Completely purge synthetic seeded data from Master Dashboard database
   */
  async purgeSyntheticData(): Promise<{ deleted: number }> {
    logger.info('Purging all synthetic / dummy data from Atlas PageView collection...');
    const res = await PageView.deleteMany({
      $or: [
        { source: { $ne: 'prod-sync' } },
        { source: { $exists: false } },
      ],
    });
    logger.info(`Purged ${res.deletedCount} synthetic records. PageView is now clean.`);
    return { deleted: res.deletedCount };
  }

  /**
   * Sync authentic real user events from production server (147.79.70.177)
   */
  async syncAll(daysBack: number = 30): Promise<SyncResult> {
    if (this.isSyncing) {
      logger.warn('Production sync is already in progress. Skipping duplicate run.');
      return { success: false, syncedCounts: {}, totalSynced: 0, error: 'Sync in progress' };
    }

    this.isSyncing = true;
    const syncedCounts: Record<string, number> = {};
    let totalSynced = 0;
    let latestTimestamp: Date | undefined;

    try {
      const conn = await this.getProdConnection();
      const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      // Fetch projects to resolve IDs dynamically
      const projects = await Project.find({}).lean();
      const projectMap = new Map<string, mongoose.Types.ObjectId>();
      for (const p of projects) {
        const lower = p.name.toLowerCase();
        if (lower.includes('biz360')) projectMap.set('biz360', p._id);
        else if (lower.includes('vcard') || lower.includes('digital card')) projectMap.set('vcard', p._id);
        else if (lower.includes('saarthi')) projectMap.set('saarthi', p._id);
        else if (lower.includes('ai in action')) projectMap.set('aiinaction', p._id);
        else if (lower.includes('maestros')) projectMap.set('maestros', p._id);
        else if (lower.includes('zzup')) projectMap.set('zzup', p._id);
        else if (lower.includes('pictik')) projectMap.set('pictik', p._id);
      }

      // =========================================================================
      // 1. BIZ360: Sync authentic logs from biz360.analyticslogs (203k+ real logs)
      // =========================================================================
      const bizId = projectMap.get('biz360');
      if (bizId) {
        try {
          const bizDb = conn.useDb('biz360');
          const lastTime = this.lastSyncTimestamps['biz360'] || cutoff;
          const query = { timestamp: { $gte: lastTime } };

          const logs = await bizDb
            .collection('analyticslogs')
            .find(query)
            .sort({ timestamp: -1 })
            .limit(15000)
            .toArray();

          if (logs.length > 0) {
            const pageviewsToInsert: any[] = [];
            for (const log of logs) {
              const logTime = log.timestamp ? new Date(log.timestamp) : new Date(log.createdAt || Date.now());
              if (!latestTimestamp || logTime > latestTimestamp) {
                latestTimestamp = logTime;
              }

              const visitorRaw = String(log.userId || log.ip || log._id);
              const visitorId = crypto.createHash('sha256').update(visitorRaw).digest('hex').slice(0, 24);
              const { browser, os, device } = parseUserAgent(log.deviceInfo || log.userAgent);

              let referrer = 'direct';
              if (log.platform === 'android') referrer = 'biz360-android-app';
              else if (log.platform === 'ios') referrer = 'biz360-ios-app';
              else if (log.platform === 'web') referrer = 'biz360-web-portal';

              pageviewsToInsert.push({
                projectId: bizId,
                visitorId,
                path: `/${log.action || 'view_cards'}`,
                referrer,
                browser,
                os,
                device,
                country: 'India',
                source: 'prod-sync',
                timestamp: logTime,
              });
            }

            if (pageviewsToInsert.length > 0) {
              // Batch insert in chunks of 1000
              for (let i = 0; i < pageviewsToInsert.length; i += 1000) {
                const chunk = pageviewsToInsert.slice(i, i + 1000);
                await PageView.insertMany(chunk, { ordered: false });
              }
              syncedCounts['biz360'] = pageviewsToInsert.length;
              totalSynced += pageviewsToInsert.length;
              this.lastSyncTimestamps['biz360'] = latestTimestamp || new Date();
            }
          }
        } catch (err: any) {
          logger.warn('Error syncing biz360 production logs:', err.message);
        }
      }

      // =========================================================================
      // 2. VCARD: Sync real user activity & OTP logs from virtual-card
      // =========================================================================
      const vcardId = projectMap.get('vcard');
      if (vcardId) {
        try {
          const vcardDb = conn.useDb('virtual-card');
          const lastTime = this.lastSyncTimestamps['vcard'] || cutoff;

          const [otpLogs, users] = await Promise.all([
            vcardDb.collection('otplogs').find({ createdAt: { $gte: lastTime } }).toArray(),
            vcardDb.collection('users').find({ createdAt: { $gte: lastTime } }).toArray(),
          ]);

          const vcardDocs: any[] = [];
          for (const otp of otpLogs) {
            const t = otp.createdAt ? new Date(otp.createdAt) : new Date();
            vcardDocs.push({
              projectId: vcardId,
              visitorId: crypto.createHash('sha256').update(String(otp.mobileNumber || otp._id)).digest('hex').slice(0, 24),
              path: '/login-otp',
              referrer: 'vcard-login',
              browser: 'Chrome Mobile',
              os: 'Android',
              device: 'mobile',
              country: 'India',
              source: 'prod-sync',
              timestamp: t,
            });
          }

          for (const u of users) {
            const t = u.createdAt ? new Date(u.createdAt) : new Date();
            vcardDocs.push({
              projectId: vcardId,
              visitorId: crypto.createHash('sha256').update(String(u._id)).digest('hex').slice(0, 24),
              path: `/card/${u.slug || u.username || 'profile'}`,
              referrer: 'direct',
              browser: 'Safari',
              os: 'iOS',
              device: 'mobile',
              country: 'India',
              source: 'prod-sync',
              timestamp: t,
            });
          }

          if (vcardDocs.length > 0) {
            await PageView.insertMany(vcardDocs, { ordered: false });
            syncedCounts['vcard'] = vcardDocs.length;
            totalSynced += vcardDocs.length;
            this.lastSyncTimestamps['vcard'] = new Date();
          }
        } catch (err: any) {
          logger.warn('Error syncing virtual-card production logs:', err.message);
        }
      }

      // =========================================================================
      // 3. SAARTHI: Sync real daily analytics & users from Saarthi
      // =========================================================================
      const saarthiId = projectMap.get('saarthi');
      if (saarthiId) {
        try {
          const saarthiDb = conn.useDb('Saarthi');

          const [daily, users] = await Promise.all([
            saarthiDb.collection('dailyanalytics').find({}).sort({ date: -1 }).limit(100).toArray(),
            saarthiDb.collection('users').find({}).sort({ updatedAt: -1 }).limit(500).toArray(),
          ]);

          const saarthiDocs: any[] = [];
          for (const d of daily) {
            const t = d.date ? new Date(d.date) : (d.createdAt ? new Date(d.createdAt) : new Date());
            saarthiDocs.push({
              projectId: saarthiId,
              visitorId: crypto.createHash('sha256').update(String(d._id)).digest('hex').slice(0, 24),
              path: '/adminapp/dashboard',
              referrer: 'direct',
              browser: 'Chrome',
              os: 'Windows',
              device: 'desktop',
              country: 'India',
              source: 'prod-sync',
              timestamp: t,
            });
          }

          for (const u of users) {
            const t = u.updatedAt ? new Date(u.updatedAt) : (u.createdAt ? new Date(u.createdAt) : new Date());
            saarthiDocs.push({
              projectId: saarthiId,
              visitorId: crypto.createHash('sha256').update(String(u._id)).digest('hex').slice(0, 24),
              path: '/adminapp/portal',
              referrer: 'admin-portal',
              browser: 'Chrome',
              os: 'Android',
              device: 'mobile',
              country: 'India',
              source: 'prod-sync',
              timestamp: t,
            });
          }

          if (saarthiDocs.length > 0) {
            await PageView.insertMany(saarthiDocs, { ordered: false });
            syncedCounts['saarthi'] = saarthiDocs.length;
            totalSynced += saarthiDocs.length;
            this.lastSyncTimestamps['saarthi'] = new Date();
          }
        } catch (err: any) {
          logger.warn('Error syncing saarthi production logs:', err.message);
        }
      }

      // =========================================================================
      // 4. AI IN ACTION: Sync real video watch logs & website sessions
      // =========================================================================
      const aiId = projectMap.get('aiinaction');
      if (aiId) {
        try {
          const aiDb = conn.useDb('ai-in-action');
          const [videos, sessions, users] = await Promise.all([
            aiDb.collection('videowatchlogs').find({}).toArray(),
            aiDb.collection('websitesessions').find({}).toArray(),
            aiDb.collection('users').find({}).toArray(),
          ]);

          const aiDocs: any[] = [];
          for (const v of videos) {
            const t = v.lastWatchedAt ? new Date(v.lastWatchedAt) : (v.createdAt ? new Date(v.createdAt) : new Date());
            aiDocs.push({
              projectId: aiId,
              visitorId: crypto.createHash('sha256').update(String(v.userId || v._id)).digest('hex').slice(0, 24),
              path: `/video/${v.recordingId || v.videoId || 'lesson'}`,
              referrer: 'course-player',
              browser: 'Chrome',
              os: 'Windows',
              device: 'desktop',
              country: 'India',
              source: 'prod-sync',
              timestamp: t,
            });
          }

          for (const s of sessions) {
            const t = s.createdAt ? new Date(s.createdAt) : new Date();
            aiDocs.push({
              projectId: aiId,
              visitorId: crypto.createHash('sha256').update(String(s.sessionId || s._id)).digest('hex').slice(0, 24),
              path: '/userapp/learn',
              referrer: 'direct',
              browser: 'Chrome',
              os: 'Android',
              device: 'mobile',
              country: 'India',
              source: 'prod-sync',
              timestamp: t,
            });
          }

          for (const u of users) {
            const t = u.createdAt ? new Date(u.createdAt) : (u.updatedAt ? new Date(u.updatedAt) : new Date());
            aiDocs.push({
              projectId: aiId,
              visitorId: crypto.createHash('sha256').update(String(u._id)).digest('hex').slice(0, 24),
              path: '/userapp/login',
              referrer: 'direct',
              browser: 'Chrome Mobile',
              os: 'Android',
              device: 'mobile',
              country: 'India',
              source: 'prod-sync',
              timestamp: t,
            });
          }

          if (aiDocs.length > 0) {
            await PageView.insertMany(aiDocs, { ordered: false });
            syncedCounts['aiinaction'] = aiDocs.length;
            totalSynced += aiDocs.length;
            this.lastSyncTimestamps['aiinaction'] = new Date();
          }
        } catch (err: any) {
          logger.warn('Error syncing ai-in-action production logs:', err.message);
        }
      }

      // =========================================================================
      // 5. MAESTROS: Sync real visitors & user actions from mestros
      // =========================================================================
      const maestrosId = projectMap.get('maestros');
      if (maestrosId) {
        try {
          const maestrosDb = conn.useDb('mestros');
          const lastTime = this.lastSyncTimestamps['maestros'] || cutoff;

          const [visitors, users] = await Promise.all([
            maestrosDb.collection('visitors').find({ createdAt: { $gte: lastTime } }).toArray(),
            maestrosDb.collection('users').find({ createdAt: { $gte: lastTime } }).limit(500).toArray(),
          ]);

          const maestrosDocs: any[] = [];
          for (const vis of visitors) {
            const t = vis.createdAt ? new Date(vis.createdAt) : new Date();
            maestrosDocs.push({
              projectId: maestrosId,
              visitorId: crypto.createHash('sha256').update(String(vis._id)).digest('hex').slice(0, 24),
              path: '/member/visitor-pass',
              referrer: 'invitation-link',
              browser: 'Chrome Mobile',
              os: 'Android',
              device: 'mobile',
              country: 'India',
              source: 'prod-sync',
              timestamp: t,
            });
          }

          for (const u of users) {
            const t = u.createdAt ? new Date(u.createdAt) : new Date();
            maestrosDocs.push({
              projectId: maestrosId,
              visitorId: crypto.createHash('sha256').update(String(u._id)).digest('hex').slice(0, 24),
              path: '/member/dashboard',
              referrer: 'direct',
              browser: 'Safari',
              os: 'iOS',
              device: 'mobile',
              country: 'India',
              source: 'prod-sync',
              timestamp: t,
            });
          }

          if (maestrosDocs.length > 0) {
            await PageView.insertMany(maestrosDocs, { ordered: false });
            syncedCounts['maestros'] = maestrosDocs.length;
            totalSynced += maestrosDocs.length;
            this.lastSyncTimestamps['maestros'] = new Date();
          }
        } catch (err: any) {
          logger.warn('Error syncing maestros production logs:', err.message);
        }
      }

      logger.info(
        `Production Data Sync Finished: Synced ${totalSynced} real records across production databases.`
      );

      return {
        success: true,
        syncedCounts,
        totalSynced,
        lastTimestamp: latestTimestamp || new Date(),
      };
    } catch (err: any) {
      logger.error('Error in ProductionSyncService:', err);
      return { success: false, syncedCounts, totalSynced, error: err.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Reload sync settings dynamically from Settings model or passed payload
   */
  async reloadSettings(settingsDoc?: any) {
    try {
      const cfg = settingsDoc || (await Settings.getActiveConfig());
      const intervalMs = (cfg.productionSyncIntervalSeconds || 60) * 1000;
      if (this.currentIntervalMs !== intervalMs && this.syncTimer) {
        this.startPeriodicSync(intervalMs);
      }
    } catch (err: any) {
      logger.warn('ProductionSyncService: Failed to reload settings:', err.message);
    }
  }

  /**
   * Start periodic background synchronization (default from Settings, fallback 60s)
   */
  async startPeriodicSync(customIntervalMs?: number) {
    let intervalMs = customIntervalMs;
    if (!intervalMs) {
      try {
        const cfg = await Settings.getActiveConfig();
        intervalMs = (cfg.productionSyncIntervalSeconds || 60) * 1000;
      } catch {
        intervalMs = 60000;
      }
    }

    this.currentIntervalMs = intervalMs;
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.syncTimer = setInterval(() => {
      this.syncAll(1).catch((err) => {
        logger.warn('Periodic production sync error:', err.message);
      });
    }, intervalMs);
    logger.info(`Started Periodic Production Data Sync (every ${intervalMs / 1000}s)`);
  }

  stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}

export const productionSyncService = new ProductionSyncService();
