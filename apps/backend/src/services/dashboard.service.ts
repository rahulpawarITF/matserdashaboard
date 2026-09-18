import mongoose from 'mongoose';
import { Project } from '../models/Project.model';
import { Service } from '../models/Service.model';
import { Incident } from '../models/Incident.model';
import { PageView } from '../models/PageView.model';
import { HealthCheckResult } from '../models/HealthCheckResult.model';
import { Settings } from '../models/Settings.model';
import { registeredUsersService } from './registeredUsers.service';

let cachedVisitorStats: {
  todayVisitors: number;
  todayViews: number;
  weekVisitors: number;
  weekViews: number;
  expiresAt: number;
} = {
  todayVisitors: 0,
  todayViews: 0,
  weekVisitors: 0,
  weekViews: 0,
  expiresAt: 0,
};

export class DashboardService {
  static async getSummary() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Refresh visitor stats cache dynamically based on dashboardStatsCacheSeconds
    if (Date.now() > cachedVisitorStats.expiresAt) {
      try {
        let cacheSeconds = 30;
        try {
          const cfg = await Settings.getActiveConfig();
          if (cfg.dashboardStatsCacheSeconds) cacheSeconds = cfg.dashboardStatsCacheSeconds;
        } catch {}

        const [todayResult, weekResult] = await Promise.all([
          PageView.aggregate([
            { $match: { timestamp: { $gte: startOfToday } } },
            {
              $facet: {
                views: [{ $count: 'count' }],
                visitors: [{ $group: { _id: '$visitorId' } }, { $count: 'count' }],
              },
            },
          ]),
          PageView.aggregate([
            { $match: { timestamp: { $gte: startOfWeek } } },
            {
              $facet: {
                views: [{ $count: 'count' }],
                visitors: [{ $group: { _id: '$visitorId' } }, { $count: 'count' }],
              },
            },
          ]),
        ]);

        cachedVisitorStats = {
          todayViews: todayResult?.[0]?.views?.[0]?.count || 0,
          todayVisitors: todayResult?.[0]?.visitors?.[0]?.count || 0,
          weekViews: weekResult?.[0]?.views?.[0]?.count || 0,
          weekVisitors: weekResult?.[0]?.visitors?.[0]?.count || 0,
          expiresAt: Date.now() + cacheSeconds * 1000,
        };
      } catch (err) {
        // preserve existing cache on error
      }
    }

    const [
      totalProjects,
      upProjects,
      downProjects,
      degradedProjects,
      unknownProjects,
      totalServices,
      upServices,
      downServices,
      recentIncidents,
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ currentStatus: 'up' }),
      Project.countDocuments({ currentStatus: 'down' }),
      Project.countDocuments({ currentStatus: 'degraded' }),
      Project.countDocuments({ currentStatus: 'unknown' }),
      Service.countDocuments(),
      Service.countDocuments({ currentStatus: 'up' }),
      Service.countDocuments({ currentStatus: 'down' }),
      Incident.find({ isResolved: false }).sort({ startedAt: -1 }).limit(5),
    ]);

    const healthyProjects = upProjects;
    const issuesProjects = downProjects + degradedProjects;
    const servicesIssues = downServices + (totalServices - upServices - downServices);
    const userCounts = await registeredUsersService.getUserCountsSummary();

    return {
      // 6 Top Summary Cards for the Owner
      totalProjects,
      healthyProjects,
      issuesProjects,
      servicesStatus: {
        total: totalServices,
        healthy: upServices,
        issues: servicesIssues,
      },
      totalUsers: userCounts.totalUsers,
      totalAdmins: userCounts.totalAdmins,
      totalRegisteredUsers: userCounts.totalCombined,
      todayTotalVisitors: cachedVisitorStats.todayVisitors,
      todayTotalViews: cachedVisitorStats.todayViews,
      weekTotalVisitors: cachedVisitorStats.weekVisitors,
      weekTotalViews: cachedVisitorStats.weekViews,

      // Detail fields for backward compatibility
      upProjects,
      downProjects,
      degradedProjects,
      unknownProjects,
      totalServices,
      upServices,
      downServices,
      recentIncidents,
      projects: { total: totalProjects, up: upProjects, down: downProjects, degraded: degradedProjects },
      services: { total: totalServices, up: upServices, down: downServices },
    };
  }

  static async getRecentIncidents() {
    const unresolved = await Incident.find({ isResolved: false }).sort({ startedAt: -1 }).limit(10);
    const resolved = await Incident.find({ isResolved: true }).sort({ resolvedAt: -1 }).limit(10);
    return { unresolved, resolved };
  }

  static async getRecentChecks(params: {
    timeframe?: 'today' | 'yesterday' | '7d' | '15d' | '30d';
    projectId?: string;
    status?: 'all' | 'up' | 'down' | 'degraded';
    page?: number;
    limit?: number;
  }) {
    const { timeframe = 'today', projectId, status, page = 1, limit = 50 } = params;
    const now = new Date();
    let startDate: Date;
    let endDate: Date | undefined;

    switch (timeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '15d':
        startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const query: Record<string, any> = {
      checkedAt: { $gte: startDate, ...(endDate ? { $lte: endDate } : {}) },
    };

    if (projectId && projectId !== 'all') {
      try {
        query.targetId = new mongoose.Types.ObjectId(projectId);
      } catch (e) {
        query.targetId = projectId;
      }
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const [results, total, projects, services] = await Promise.all([
      HealthCheckResult.find(query)
        .sort({ checkedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      HealthCheckResult.countDocuments(query),
      Project.find({}, { name: 1, environment: 1, urls: 1 }).lean(),
      Service.find({}, { name: 1, provider: 1, type: 1, statusEndpoint: 1 }).lean(),
    ]);

    const targetMap = new Map<string, { name: string; type: string; url?: string; environment?: string }>();
    projects.forEach((p: any) => {
      targetMap.set(p._id.toString(), {
        name: p.name,
        type: 'project',
        environment: p.environment,
      });
    });
    services.forEach((s: any) => {
      targetMap.set(s._id.toString(), {
        name: s.name,
        type: 'service',
        url: s.statusEndpoint,
      });
    });

    const enrichedResults = results.map((r: any) => {
      const target = targetMap.get(r.targetId?.toString()) || {
        name: r.urlLabel || 'Unknown Target',
        type: r.targetType,
        environment: undefined,
      };
      return {
        ...r,
        targetName: target.name,
        environment: target.environment,
      };
    });

    return {
      results: enrichedResults,
      total,
      page,
      limit,
      timeframe,
      dateRange: { start: startDate, end: endDate || now },
    };
  }

  static async getOutageCorrelation(params: {
    timeframe?: 'today' | 'yesterday' | '7d' | '15d' | '30d';
    windowMinutes?: number;
  }) {
    const { timeframe = '30d', windowMinutes = 5 } = params;
    const now = new Date();
    let startDate: Date;
    let endDate: Date | undefined;

    switch (timeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '15d':
        startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const incidentQuery: Record<string, any> = {
      targetType: 'project',
      startedAt: { $gte: startDate, ...(endDate ? { $lte: endDate } : {}) },
    };

    const [incidents, projects] = await Promise.all([
      Incident.find(incidentQuery).sort({ startedAt: -1 }).lean(),
      Project.find({}, { name: 1 }).lean(),
    ]);

    const projectMap = new Map<string, string>();
    projects.forEach((p: any) => projectMap.set(p._id.toString(), p.name));

    const windowMs = windowMinutes * 60 * 1000;

    const parseProjectOutageError = (inc: any, projName: string) => {
      const firstMsg = inc.timeline?.[0]?.message || '';
      let statusCode = 0;
      const httpMatch = firstMsg.match(/HTTP\s+(\d+)/i) || inc.summary?.match(/HTTP\s+(\d+)/i);
      if (httpMatch) {
        statusCode = parseInt(httpMatch[1], 10);
      }

      let rawError = '';
      if (inc.summary && inc.summary.includes('went DOWN:')) {
        rawError = inc.summary.split('went DOWN:')[1].trim();
      } else if (firstMsg) {
        rawError = firstMsg;
      } else {
        rawError = inc.summary || 'App Unreachable';
      }

      let causeType: 'timeout' | '502_bad_gateway' | '500_error' | 'dns_error' | 'other' = 'other';
      let friendlyExplanation = 'Application did not respond with expected HTTP 200.';

      const lowerErr = rawError.toLowerCase();
      if (lowerErr.includes('timeout') || statusCode === 0) {
        causeType = 'timeout';
        friendlyExplanation = 'Host 147.79.70.177 CPU/network surge; probe timed out (>2.5s) before server replied.';
      } else if (lowerErr.includes('502') || statusCode === 502) {
        causeType = '502_bad_gateway';
        friendlyExplanation = 'Node.js/PM2 application process crashed and restarted behind Nginx.';
      } else if (lowerErr.includes('500') || statusCode === 500) {
        causeType = '500_error';
        friendlyExplanation = 'Internal application error, database socket pool timeout, or unhandled exception.';
      } else if (lowerErr.includes('enotfound') || lowerErr.includes('404') || statusCode === 404) {
        causeType = 'dns_error';
        friendlyExplanation = 'Domain DNS resolution failure or endpoint not found on server routing.';
      }

      return {
        projectName: projName,
        projectId: inc.targetId?.toString() || '',
        urlLabel: inc.urlLabel || 'Primary App',
        statusCode,
        errorMessage: rawError,
        causeType,
        friendlyExplanation,
      };
    };

    const clusters: Array<{
      id: string;
      timestamp: number;
      startTime: string;
      resolvedTime: string | null;
      durationSeconds: number;
      projects: string[];
      totalProjects: number;
      isServerWide: boolean;
      severity: 'server_down' | 'multi_service' | 'isolated';
      sampleSummary: string;
      projectErrors: Array<{
        projectName: string;
        projectId: string;
        urlLabel: string;
        statusCode: number;
        errorMessage: string;
        causeType: 'timeout' | '502_bad_gateway' | '500_error' | 'dns_error' | 'other';
        friendlyExplanation: string;
      }>;
      hour: number;
      dateKey: string;
    }> = [];

    for (const inc of incidents) {
      const incTime = new Date(inc.startedAt).getTime();
      const projName = projectMap.get(inc.targetId?.toString()) || inc.urlLabel || 'Unknown';
      const projError = parseProjectOutageError(inc, projName);

      // Find existing cluster within windowMs
      const existing = clusters.find(c => Math.abs(c.timestamp - incTime) <= windowMs);
      if (existing) {
        if (!existing.projects.includes(projName)) {
          existing.projects.push(projName);
          existing.totalProjects = existing.projects.length;
          if (existing.totalProjects >= 3) {
            existing.isServerWide = true;
            existing.severity = 'server_down';
          } else if (existing.totalProjects === 2) {
            existing.severity = 'multi_service';
          }
        }
        // Avoid duplicate entries for the exact same project & urlLabel in this cluster
        const alreadyHasError = existing.projectErrors.some(
          e => e.projectName === projName && e.urlLabel === projError.urlLabel
        );
        if (!alreadyHasError) {
          existing.projectErrors.push(projError);
        }

        if (inc.resolvedAt) {
          const resTime = new Date(inc.resolvedAt).getTime();
          const currRes = existing.resolvedTime ? new Date(existing.resolvedTime).getTime() : 0;
          if (resTime > currRes) {
            existing.resolvedTime = inc.resolvedAt.toISOString();
            existing.durationSeconds = Math.max(existing.durationSeconds, Math.round((resTime - existing.timestamp) / 1000));
          }
        }
      } else {
        const resTime = inc.resolvedAt ? new Date(inc.resolvedAt).getTime() : null;
        const durSec = resTime ? Math.max(1, Math.round((resTime - incTime) / 1000)) : 0;
        const incDate = new Date(inc.startedAt);

        clusters.push({
          id: inc._id.toString(),
          timestamp: incTime,
          startTime: inc.startedAt.toISOString(),
          resolvedTime: inc.resolvedAt ? inc.resolvedAt.toISOString() : null,
          durationSeconds: durSec,
          projects: [projName],
          totalProjects: 1,
          isServerWide: false,
          severity: 'isolated',
          sampleSummary: inc.summary || 'App Unreachable',
          projectErrors: [projError],
          hour: incDate.getHours(),
          dateKey: incDate.toISOString().split('T')[0],
        });
      }
    }

    clusters.forEach(c => {
      c.projectErrors.sort((a, b) => a.projectName.localeCompare(b.projectName));
    });

    clusters.sort((a, b) => b.timestamp - a.timestamp);

    const totalOutageEvents = clusters.length;
    const serverWideOutages = clusters.filter(c => c.isServerWide || c.totalProjects >= 2).length;
    const singleAppGlitches = totalOutageEvents - serverWideOutages;

    const hourlyDistribution: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyDistribution[i] = 0;
    clusters.forEach(c => {
      hourlyDistribution[c.hour] = (hourlyDistribution[c.hour] || 0) + 1;
    });

    let peakHour = 0;
    let peakCount = 0;
    Object.entries(hourlyDistribution).forEach(([h, count]) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = Number(h);
      }
    });

    const formatHour = (h: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      return `${displayHour}:00 ${period}`;
    };

    const peakHourFormatted = peakCount > 0 ? `${formatHour(peakHour)} - ${formatHour((peakHour + 1) % 24)}` : 'None (Stable)';
    const peakPercentage = totalOutageEvents > 0 ? Math.round((peakCount / totalOutageEvents) * 100) : 0;

    let recurringPatternDescription = 'No dominant recurring pattern detected.';
    if (totalOutageEvents >= 3 && peakPercentage >= 25 && peakCount > 0) {
      recurringPatternDescription = `Pattern Detected: ${peakPercentage}% of outages occur between ${peakHourFormatted}, indicating recurring daily peak load at that hour.`;
    }

    // Dynamic Average Recovery Duration
    const clustersWithDuration = clusters.filter(c => c.durationSeconds > 0);
    const avgDurationSeconds = clustersWithDuration.length > 0
      ? Math.round(clustersWithDuration.reduce((acc, c) => acc + c.durationSeconds, 0) / clustersWithDuration.length)
      : 0;

    // Dynamic Root Cause Breakdown across all failure entries in this timeframe
    let totalErrorEntries = 0;
    let timeoutErrors = 0;
    let badGatewayErrors = 0;
    let otherErrors = 0;
    const projectFailureCounts: Record<string, number> = {};

    clusters.forEach(c => {
      (c.projectErrors || []).forEach(err => {
        totalErrorEntries++;
        if (err.causeType === 'timeout' || err.statusCode === 0) {
          timeoutErrors++;
        } else if (err.causeType === '502_bad_gateway' || err.statusCode === 502) {
          badGatewayErrors++;
        } else {
          otherErrors++;
        }
        projectFailureCounts[err.projectName] = (projectFailureCounts[err.projectName] || 0) + 1;
      });
    });

    const timeoutPercentage = totalErrorEntries > 0 ? Math.round((timeoutErrors / totalErrorEntries) * 100) : 0;
    const badGatewayPercentage = totalErrorEntries > 0 ? Math.round((badGatewayErrors / totalErrorEntries) * 100) : 0;
    const otherPercentage = totalErrorEntries > 0 ? Math.max(0, 100 - timeoutPercentage - badGatewayPercentage) : 0;

    let dominantReason = 'All systems stable in this period.';
    if (totalErrorEntries > 0) {
      if (timeoutPercentage >= badGatewayPercentage && timeoutPercentage >= otherPercentage) {
        dominantReason = `Host Server Timeout & Latency Surge (${timeoutPercentage}% of drops)`;
      } else if (badGatewayPercentage >= timeoutPercentage && badGatewayPercentage >= otherPercentage) {
        dominantReason = `Node.js App Process Restart / 502 (${badGatewayPercentage}% of drops)`;
      } else {
        dominantReason = `Various Connection Errors (${otherPercentage}% of drops)`;
      }
    }

    const topAffectedProjects = Object.entries(projectFailureCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      summary: {
        totalOutageEvents,
        serverWideOutages,
        singleAppGlitches,
        serverWidePercentage: totalOutageEvents > 0 ? Math.round((serverWideOutages / totalOutageEvents) * 100) : 0,
        peakHour: peakHourFormatted,
        peakHourCount: peakCount,
        recurringPatternDetected: totalOutageEvents >= 3 && peakPercentage >= 25 && peakCount > 0,
        recurringPatternDescription,
        hostServer: '147.79.70.177',
        avgDurationSeconds,
        latestOutageTime: clusters[0]?.startTime || null,
        latestOutageDuration: clusters[0]?.durationSeconds || 0,
        latestAffectedProjects: clusters[0]?.projects || [],
        dominantReason,
        rootCauseBreakdown: {
          timeoutPercentage,
          badGatewayPercentage,
          otherPercentage,
          timeoutErrors,
          badGatewayErrors,
          otherErrors,
          totalErrors: totalErrorEntries,
        },
        topAffectedProjects,
      },
      clusters,
      hourlyDistribution,
      timeframe,
      dateRange: { start: startDate, end: endDate || now },
    };
  }
}
