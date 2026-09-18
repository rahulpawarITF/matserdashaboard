import mongoose from 'mongoose';
import { PageView } from '../models/PageView.model';
import { IProject } from '../models/Project.model';
import { logger } from '../config/logger';

import fs from 'fs';

export interface ProjectVisitorStats {
  todayUsers: number;
  todayViews: number;
  weekUsers: number;
  weekViews: number;
  source: 'ga4' | 'builtin';
}

export class GA4Service {
  private memoryCache = new Map<string, { stats: ProjectVisitorStats; expiresAt: number }>();
  private gaClient: any = null;

  private getClient() {
    if (this.gaClient) return this.gaClient;
    try {
      const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GA4_CREDENTIALS_PATH;
      if (configuredPath && fs.existsSync(configuredPath)) {
        const { BetaAnalyticsDataClient } = require('@google-analytics/data');
        this.gaClient = new BetaAnalyticsDataClient({ keyFilename: configuredPath });
        return this.gaClient;
      }

      const rawKey = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GA4_SERVICE_ACCOUNT_KEY;
      if (rawKey) {
        const { BetaAnalyticsDataClient } = require('@google-analytics/data');
        this.gaClient = new BetaAnalyticsDataClient({ credentials: JSON.parse(rawKey) });
        return this.gaClient;
      }
    } catch (e: any) {
      logger.warn('Failed to initialize GA4 client:', e.message);
    }
    return null;
  }

  /**
   * Fetch visitor statistics for a project.
   * If GA4 Property ID is provided and GA4 API is configured, fetches from GA4.
   * Otherwise, seamlessly aggregates from authentic MongoDB PageViews.
   */
  async getProjectVisitorStats(project: IProject): Promise<ProjectVisitorStats> {
    const projectIdStr = project._id.toString();
    const cached = this.memoryCache.get(projectIdStr);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.stats;
    }

    let stats: ProjectVisitorStats | null = null;

    // 1. Determine target GA4 Property ID (project-specific or global default)
    const targetPropertyId =
      (project.ga4PropertyId && project.ga4PropertyId.trim()) ||
      process.env.DEFAULT_GA4_PROPERTY_ID ||
      '554293933';

    // Extract primary hostName for dimension filtering
    let primaryHostName: string | undefined;
    if (project.urls && project.urls.length > 0) {
      for (const u of project.urls) {
        if (u.url) {
          try {
            const parsed = new URL(u.url);
            if (parsed.hostname && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
              primaryHostName = parsed.hostname;
              break;
            }
          } catch {}
        }
      }
    }

    // 2. Try GA4 query if property ID is available
    if (targetPropertyId) {
      try {
        stats = await this.queryGA4Property(targetPropertyId, primaryHostName);
      } catch (err: any) {
        logger.warn(
          `GA4 query failed for property ${targetPropertyId} (${primaryHostName || 'all'}): ${err.message}. Falling back to internal tracking.`
        );
      }
    }

    // 3. Fallback to authentic internal MongoDB tracking
    if (!stats) {
      stats = await this.queryInternalVisitorStats(project._id as mongoose.Types.ObjectId);
    }

    // Cache for 60 seconds to prevent API quota drain and DB aggregation spam
    this.memoryCache.set(projectIdStr, {
      stats,
      expiresAt: now + 60000,
    });

    return stats;
  }

  /**
   * Query Google Analytics Data API (free tier) with optional hostName filtering
   */
  private async queryGA4Property(propertyId: string, hostName?: string): Promise<ProjectVisitorStats | null> {
    const client = this.getClient();
    if (!client) {
      return null;
    }

    const formattedProperty = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;

    const dimensionFilter = hostName
      ? {
          filter: {
            fieldName: 'hostName',
            stringFilter: {
              matchType: 'CONTAINS',
              value: hostName.replace(/^www\./, ''),
            },
          },
        }
      : undefined;

    try {
      const [todayReport] = await client.runReport({
        property: formattedProperty,
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        ...(dimensionFilter ? { dimensionFilter } : {}),
      });

      const [weekReport] = await client.runReport({
        property: formattedProperty,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        ...(dimensionFilter ? { dimensionFilter } : {}),
      });

      const todayUsers = Number(todayReport?.rows?.[0]?.metricValues?.[0]?.value || 0);
      const todayViews = Number(todayReport?.rows?.[0]?.metricValues?.[1]?.value || 0);
      const weekUsers = Number(weekReport?.rows?.[0]?.metricValues?.[0]?.value || 0);
      const weekViews = Number(weekReport?.rows?.[0]?.metricValues?.[1]?.value || 0);

      return {
        todayUsers,
        todayViews,
        weekUsers,
        weekViews,
        source: 'ga4',
      };
    } catch (err: any) {
      logger.warn(`Error querying GA4 Data API for property ${propertyId} (host: ${hostName || 'all'}):`, err.message);
      return null;
    }
  }

  /**
   * Query authentic internal database for Today and Week visitor numbers
   */
  private async queryInternalVisitorStats(projectObjectId: mongoose.Types.ObjectId): Promise<ProjectVisitorStats> {
    const now = new Date();
    // Today starting at 00:00:00
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Start of 7 days ago
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      const [todayResult, weekResult] = await Promise.all([
        PageView.aggregate([
          {
            $match: {
              projectId: projectObjectId,
              timestamp: { $gte: startOfToday },
            },
          },
          {
            $facet: {
              views: [{ $count: 'count' }],
              users: [{ $group: { _id: '$visitorId' } }, { $count: 'count' }],
            },
          },
        ]),
        PageView.aggregate([
          {
            $match: {
              projectId: projectObjectId,
              timestamp: { $gte: startOfWeek },
            },
          },
          {
            $facet: {
              views: [{ $count: 'count' }],
              users: [{ $group: { _id: '$visitorId' } }, { $count: 'count' }],
            },
          },
        ]),
      ]);

      const todayViews = todayResult?.[0]?.views?.[0]?.count || 0;
      const todayUsers = todayResult?.[0]?.users?.[0]?.count || 0;
      const weekViews = weekResult?.[0]?.views?.[0]?.count || 0;
      const weekUsers = weekResult?.[0]?.users?.[0]?.count || 0;

      return {
        todayUsers,
        todayViews,
        weekUsers,
        weekViews,
        source: 'builtin',
      };
    } catch (err: any) {
      logger.error('Error in queryInternalVisitorStats:', err);
      return {
        todayUsers: 0,
        todayViews: 0,
        weekUsers: 0,
        weekViews: 0,
        source: 'builtin',
      };
    }
  }

  /**
   * Invalidate cache for a project
   */
  invalidateCache(projectId?: string) {
    if (projectId) {
      this.memoryCache.delete(projectId);
    } else {
      this.memoryCache.clear();
    }
  }
}

export const ga4Service = new GA4Service();
