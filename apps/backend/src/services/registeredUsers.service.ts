import mongoose from 'mongoose';
import { Settings } from '../models/Settings.model';
import { logger } from '../config/logger';

const PROD_MONGO_URI =
  process.env.PROD_DATABASE_URL ||
  'mongodb://itfuturz01:!tfuturz!-!sanvi!2022!@147.79.70.177:27017/?authSource=admin';

export interface ProjectUserCountInfo {
  totalCount: number;
  userCount: number;
  adminCount: number;
  activeToday: number;
  activeWeek: number;
  userSource: string;
  adminSource: string;
  dbName: string;
  collection: string;
  lastUpdated: Date;
  // Backward compatibility
  count: number;
}

export interface UserCountsSummary {
  totalUsers: number;
  totalAdmins: number;
  totalCombined: number;
}

interface ProjectMapping {
  nameMatch: RegExp;
  db: string;
  userCols: string[];
  adminCols: string[];
}

const PROJECT_MAPPINGS: ProjectMapping[] = [
  { nameMatch: /biz360/i, db: 'biz360', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /textile mandee|textile/i, db: 'textile_mandee', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /travel nexus|travelnexus/i, db: 'travel-nexus', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /ndvibe/i, db: 'NDVIBE', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /saarthi/i, db: 'Saarthi-realdb', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /lng/i, db: 'LNG', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /vcard|digital card/i, db: 'virtual-card', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /gbs connect|gbs/i, db: 'gbs_community', userCols: ['users', 'visitorusers'], adminCols: ['admins'] },
  { nameMatch: /maestros|mestros/i, db: 'mestros', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /circle/i, db: 'circle', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /zzup/i, db: 'ev-rides', userCols: ['customers', 'drivers'], adminCols: ['admins'] },
  { nameMatch: /ai in action|aiinaction/i, db: 'ai-in-action', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /sai world/i, db: 'saiworld_crm', userCols: ['users', 'referenceusers'], adminCols: ['admins'] },
  { nameMatch: /rojee/i, db: 'rojee', userCols: ['users'], adminCols: ['admins'] },
  { nameMatch: /tramily/i, db: 'tramily-crm', userCols: ['clients'], adminCols: ['users'] },
  { nameMatch: /pictik/i, db: 'next_big_thing', userCols: ['users', 'customers'], adminCols: ['admins'] },
  { nameMatch: /leark partner/i, db: 'leark-partner', userCols: ['memberships'], adminCols: ['admins'] },
];

export class RegisteredUsersService {
  private prodConnection: mongoose.Connection | null = null;
  private cache = new Map<string, ProjectUserCountInfo>();
  private cacheExpiresAt = 0;
  private isRefreshing = false;

  /**
   * Get safe, read-only connection to production MongoDB (147.79.70.177)
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
        maxPoolSize: 3,
        readPreference: 'secondaryPreferred',
      })
      .asPromise();

    logger.info('RegisteredUsersService: Connected read-only to production MongoDB (147.79.70.177)');
    return this.prodConnection;
  }

  /**
   * Refresh real registered user & admin counts across all projects from production DBs
   */
  async refreshUserCounts(): Promise<Map<string, ProjectUserCountInfo>> {
    if (this.isRefreshing) {
      return this.cache;
    }

    this.isRefreshing = true;
    try {
      const conn = await this.getProdConnection();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const m of PROJECT_MAPPINGS) {
        let userCount = 0;
        let adminCount = 0;
        let activeToday = 0;
        let activeWeek = 0;
        const userColsFound: string[] = [];
        const adminColsFound: string[] = [];

        try {
          const db = conn.useDb(m.db);

          for (const col of m.userCols) {
            try {
              const c = await db.collection(col).countDocuments({}, { maxTimeMS: 3000 });
              userCount += c;
              userColsFound.push(col);

              // Safe read-only active count based on user updates/logins
              const at = await db.collection(col).countDocuments(
                {
                  $or: [
                    { updatedAt: { $gte: startOfToday } },
                    { createdAt: { $gte: startOfToday } },
                  ],
                },
                { maxTimeMS: 3000 }
              );
              const aw = await db.collection(col).countDocuments(
                {
                  $or: [
                    { updatedAt: { $gte: sevenDaysAgo } },
                    { createdAt: { $gte: sevenDaysAgo } },
                  ],
                },
                { maxTimeMS: 3000 }
              );
              activeToday += at;
              activeWeek += aw;
            } catch {}
          }

          for (const col of m.adminCols) {
            try {
              const c = await db.collection(col).countDocuments({}, { maxTimeMS: 3000 });
              adminCount += c;
              adminColsFound.push(col);
            } catch {}
          }
        } catch (err: any) {
          logger.warn(`Failed to count docs for ${m.db}: ${err.message}`);
        }

        const totalCount = userCount + adminCount;
        const userSource = userColsFound.length > 0 ? `${m.db}.${userColsFound.join('+')}` : `${m.db}.users`;
        const adminSource = adminColsFound.length > 0 ? `${m.db}.${adminColsFound.join('+')}` : `${m.db}.admins`;
        const colSource = `${m.db} (Users: ${userCount}, Admins: ${adminCount})`;

        const info: ProjectUserCountInfo = {
          totalCount,
          count: totalCount,
          userCount,
          adminCount,
          activeToday,
          activeWeek,
          userSource,
          adminSource,
          dbName: m.db,
          collection: colSource,
          lastUpdated: now,
        };

        this.cache.set(m.db.toLowerCase(), info);
      }

      let ttlSeconds = 120;
      try {
        const cfg = await Settings.getActiveConfig();
        if (cfg.registeredUsersCacheTtlSeconds) ttlSeconds = cfg.registeredUsersCacheTtlSeconds;
      } catch {}
      this.cacheExpiresAt = Date.now() + ttlSeconds * 1000;
      return this.cache;
    } catch (err: any) {
      logger.warn('Failed to refresh real registered user counts:', err.message);
      return this.cache;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get registered user & admin count for a project by name
   */
  async getUserCountForProject(projectName: string): Promise<ProjectUserCountInfo> {
    if (Date.now() > this.cacheExpiresAt || this.cache.size === 0) {
      await this.refreshUserCounts();
    }

    const matchedMapping = PROJECT_MAPPINGS.find((m) => m.nameMatch.test(projectName));
    if (matchedMapping) {
      const info = this.cache.get(matchedMapping.db.toLowerCase());
      if (info) return info;
    }

    return {
      totalCount: 0,
      count: 0,
      userCount: 0,
      adminCount: 0,
      activeToday: 0,
      activeWeek: 0,
      userSource: 'none',
      adminSource: 'none',
      dbName: 'unknown',
      collection: 'none',
      lastUpdated: new Date(),
    };
  }

  /**
   * Get summary across all projects: total users, total admins, total combined
   */
  async getUserCountsSummary(): Promise<UserCountsSummary> {
    if (Date.now() > this.cacheExpiresAt || this.cache.size === 0) {
      await this.refreshUserCounts();
    }

    let totalUsers = 0;
    let totalAdmins = 0;
    for (const info of this.cache.values()) {
      totalUsers += info.userCount;
      totalAdmins += info.adminCount;
    }

    return {
      totalUsers,
      totalAdmins,
      totalCombined: totalUsers + totalAdmins,
    };
  }

  /**
   * Get total registered users across all projects
   */
  async getTotalRegisteredUsers(): Promise<number> {
    const summary = await this.getUserCountsSummary();
    return summary.totalCombined;
  }
}

export const registeredUsersService = new RegisteredUsersService();
