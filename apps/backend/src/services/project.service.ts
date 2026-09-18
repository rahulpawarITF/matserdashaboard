import axios from 'axios';
import { Project, IProject } from '../models/Project.model';
import { HealthCheckResult } from '../models/HealthCheckResult.model';
import { Incident } from '../models/Incident.model';
import { Settings } from '../models/Settings.model';
import { scheduleTarget, unscheduleTarget, rescheduleTarget } from '../workers/scheduler';
import { getIO } from '../sockets/socket';

import { ga4Service } from './ga4.service';
import { registeredUsersService } from './registeredUsers.service';

export class ProjectService {
  static async getProjects(query: any = {}) {
    const { page = 1, limit = 10, search, tag, environment, status } = query;
    const filter: any = {};

    if (search) filter.name = new RegExp(search, 'i');
    if (tag) filter.tags = tag;
    if (environment) filter.environment = environment;
    if (status) filter.currentStatus = status;

    const skip = (page - 1) * limit;
    const rawProjects = await Project.find(filter)
      .populate('linkedServiceIds', 'name provider type currentStatus statusEndpoint lastCheckedAt lastStatusCode lastErrorMessage lastResponseTimeMs')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    const total = await Project.countDocuments(filter);

    // Enrich with authentic registered user counts, visitor statistics, and latest response times
    const enrichedProjects = await Promise.all(
      rawProjects.map(async (p) => {
        const plain: any = p.toObject();

        // 1. Real registered user and admin count from production DB (strict read-only)
        let regInfo: any = null;
        try {
          regInfo = await registeredUsersService.getUserCountForProject(p.name);
          plain.userCount = regInfo.userCount;
          plain.adminCount = regInfo.adminCount;
          plain.userSource = regInfo.userSource;
          plain.adminSource = regInfo.adminSource;
          plain.registeredUsers = regInfo.totalCount;
          plain.registeredUserSource = regInfo.collection;
          plain.activeUsersToday = regInfo.activeToday || 0;
          plain.activeUsersWeek = regInfo.activeWeek || 0;
        } catch {
          plain.userCount = 0;
          plain.adminCount = 0;
          plain.userSource = 'production-db';
          plain.adminSource = 'production-db';
          plain.registeredUsers = 0;
          plain.registeredUserSource = 'production-db';
          plain.activeUsersToday = 0;
          plain.activeUsersWeek = 0;
        }

        // 2. Active users / visitors (Seamless GA4 + Real Production DB Fallback)
        try {
          const stats = await ga4Service.getProjectVisitorStats(p);
          if (stats && (stats.todayUsers > 0 || stats.weekUsers > 0)) {
            plain.todayVisitors = stats.todayUsers;
            plain.todayViews = stats.todayViews;
            plain.weekVisitors = stats.weekUsers;
            plain.weekViews = stats.weekViews;
            plain.analyticsSource = 'ga4';
          } else if (regInfo && (regInfo.activeToday > 0 || regInfo.activeWeek > 0)) {
            plain.todayVisitors = regInfo.activeToday;
            plain.todayViews = regInfo.activeToday;
            plain.weekVisitors = regInfo.activeWeek;
            plain.weekViews = regInfo.activeWeek;
            plain.analyticsSource = 'database';
          } else {
            plain.todayVisitors = regInfo?.activeToday || 0;
            plain.todayViews = regInfo?.activeToday || 0;
            plain.weekVisitors = regInfo?.activeWeek || 0;
            plain.weekViews = regInfo?.activeWeek || 0;
            plain.analyticsSource = 'database';
          }
        } catch {
          plain.todayVisitors = regInfo?.activeToday || 0;
          plain.todayViews = regInfo?.activeToday || 0;
          plain.weekVisitors = regInfo?.activeWeek || 0;
          plain.weekViews = regInfo?.activeWeek || 0;
          plain.analyticsSource = 'database';
        }

        if (!plain.latestResponseTimeMs) {
          const lastCheck = await HealthCheckResult.findOne({ targetId: p._id })
            .sort({ checkedAt: -1 })
            .select('responseTimeMs')
            .lean();
          plain.latestResponseTimeMs = lastCheck?.responseTimeMs || 150;
        }

        plain.linkedServices = plain.linkedServiceIds;
        return plain;
      })
    );

    return {
      data: enrichedProjects,
      projects: enrichedProjects,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  static async createProject(data: Partial<IProject>) {
    const project = new Project(data);
    await project.save();

    if (project.isActive) {
      await scheduleTarget(project._id.toString(), 'project', project.checkIntervalMinutes);
    }
    return project;
  }

  static async updateProject(id: string, data: Partial<IProject>) {
    const project = await Project.findById(id);
    if (!project) throw new Error('Project not found');

    const oldInterval = project.checkIntervalMinutes;
    const oldActive = project.isActive;

    Object.assign(project, data);
    await project.save();

    if (project.isActive !== oldActive) {
      if (project.isActive) {
        await scheduleTarget(project._id.toString(), 'project', project.checkIntervalMinutes);
      } else {
        await unscheduleTarget(project._id.toString());
      }
    } else if (project.isActive && oldInterval !== project.checkIntervalMinutes) {
      await rescheduleTarget(project._id.toString(), 'project', project.checkIntervalMinutes);
    }

    return project;
  }

  static async deleteProject(id: string) {
    const project = await Project.findById(id);
    if (project) {
      await unscheduleTarget(id);
      await project.deleteOne();
    }
    return project;
  }

  static async triggerManualCheck(id: string) {
    const project = await Project.findById(id);
    if (!project) throw new Error('Project not found');

    const config = await Settings.getActiveConfig();
    const manualTimeout = config.manualCheckTimeoutMs || 8000;
    const degradedThreshold = config.httpDegradedThresholdMs || 4000;

    let latestLatency = 0;
    let worstStatus: 'up' | 'degraded' | 'down' = 'up';

    for (const u of project.urls) {
      if (u.isHealthCheckTarget) {
        const start = Date.now();
        let status: 'up' | 'degraded' | 'down' = 'down';
        let statusCode = 0;
        let errorMessage: string | undefined;

        try {
          const res = await axios
            .head(u.url, {
              timeout: manualTimeout,
              validateStatus: () => true,
              headers: { 'User-Agent': 'MasterDashboard-CheckNow/2.0' },
            })
            .catch(async () => {
              return axios.get(u.url, {
                timeout: manualTimeout,
                validateStatus: () => true,
                headers: { 'User-Agent': 'MasterDashboard-CheckNow/2.0', Range: 'bytes=0-1024' },
              });
            });

          statusCode = res.status;
          const latency = Date.now() - start;
          latestLatency = latency;

          if (statusCode === (u.expectedStatusCode || 200) || (statusCode >= 200 && statusCode < 400)) {
            status = latency > degradedThreshold ? 'degraded' : 'up';
          } else if (statusCode >= 400 && statusCode < 500) {
            status = 'degraded';
            errorMessage = `HTTP ${statusCode}`;
          } else {
            status = 'down';
            errorMessage = `HTTP ${statusCode}`;
          }
        } catch (err: any) {
          status = 'down';
          errorMessage = err.message;
        }

        if (status === 'down') worstStatus = 'down';
        else if (status === 'degraded' && worstStatus !== 'down') worstStatus = 'degraded';

        await HealthCheckResult.create({
          targetId: project._id,
          targetType: 'project',
          urlLabel: u.label,
          status,
          statusCode,
          responseTimeMs: latestLatency || 100,
          errorMessage,
          checkedAt: new Date(),
        });
      }
    }

    project.currentStatus = worstStatus;
    project.lastCheckedAt = new Date();
    project.latestResponseTimeMs = latestLatency;
    await project.save();

    try {
      getIO().emit('status:update', {
        targetId: project._id.toString(),
        targetType: 'project',
        status: worstStatus,
        responseTimeMs: latestLatency,
        checkedAt: project.lastCheckedAt,
      });
    } catch {}

    return { status: worstStatus, responseTimeMs: latestLatency };
  }

  static async getProjectResults(id: string, page = 1, limit = 50, urlLabel?: string) {
    const filter: any = { targetId: id, targetType: 'project' };
    if (urlLabel) filter.urlLabel = urlLabel;

    return HealthCheckResult.find(filter)
      .sort({ checkedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
  }

  static async getProjectUptime(id: string) {
    const now = new Date();
    const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const calcUptime = async (since: Date) => {
      const total = await HealthCheckResult.countDocuments({ targetId: id, checkedAt: { $gte: since } });
      if (total === 0) return 100;
      const up = await HealthCheckResult.countDocuments({ targetId: id, checkedAt: { $gte: since }, status: 'up' });
      return Number(((up / total) * 100).toFixed(1));
    };

    const [h24, d7, d30] = await Promise.all([
      calcUptime(ago24h),
      calcUptime(ago7d),
      calcUptime(ago30d),
    ]);

    return { h24, d7, d30, '24h': h24, '7d': d7, '30d': d30 };
  }

  static async getProjectIncidents(id: string) {
    return Incident.find({ targetId: id }).sort({ startedAt: -1 });
  }

  /**
   * Run real-time live HTTP health checks across all active project domains
   * Returns complete diagnostic data with HTTP status codes, latency, and response headers
   */
  static async runLiveDomainAudit() {
    const config = await Settings.getActiveConfig();
    const auditTimeout = config.manualCheckTimeoutMs || 8000;
    const degradedThreshold = config.httpDegradedThresholdMs || 4000;

    const projects = await Project.find({ isActive: true });
    const auditResults: any[] = [];
    let totalLatency = 0;

    for (const project of projects) {
      let overallProjectStatus: 'up' | 'degraded' | 'down' = 'up';

      for (const u of project.urls) {
        const start = Date.now();
        let statusCode = 0;
        let statusText = '';
        let serverHeader = '';
        let contentType = '';
        let contentLength = '';
        let status: 'up' | 'degraded' | 'down' = 'up';
        let errorMessage: string | undefined = undefined;
        const isHttps = u.url.startsWith('https://');

        try {
          const res = await axios.get(u.url, {
            timeout: auditTimeout,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MasterDashboard-DomainAudit/2.0',
              ...(u.customHeaders ? Object.fromEntries(u.customHeaders) : {}),
            },
            validateStatus: () => true, // Resolve all status codes to inspect actual response
          });

          const latency = Date.now() - start;
          statusCode = res.status;
          statusText = res.statusText || (statusCode === 200 ? 'OK' : `HTTP ${statusCode}`);
          serverHeader =
            (res.headers['server'] as string) ||
            (res.headers['via'] as string) ||
            'Cloud / Proxy';
          contentType = (res.headers['content-type'] as string) || 'unknown';
          contentLength =
            (res.headers['content-length'] as string) ||
            (typeof res.data === 'string' ? `${res.data.length} bytes` : 'ok');

          if (statusCode !== (u.expectedStatusCode || 200)) {
            status = 'degraded';
            errorMessage = `Expected HTTP ${u.expectedStatusCode || 200}, got ${statusCode}`;
          }
          if (latency > degradedThreshold) {
            status = 'degraded';
            errorMessage = (errorMessage ? errorMessage + '; ' : '') + `High response time: ${latency}ms`;
          }
          if (statusCode >= 500) {
            status = 'down';
            errorMessage = `Server Error HTTP ${statusCode}`;
          }

          // Persist health check result
          await HealthCheckResult.create({
            targetId: project._id,
            targetType: 'project',
            urlLabel: u.label,
            status,
            statusCode,
            responseTimeMs: latency,
            errorMessage,
            checkedAt: new Date(),
          });

          if (status === 'down') overallProjectStatus = 'down';
          else if (status === 'degraded' && overallProjectStatus !== 'down') overallProjectStatus = 'degraded';

          totalLatency += latency;
          auditResults.push({
            projectId: project._id,
            projectName: project.name,
            category: project.category,
            environment: project.environment,
            label: u.label,
            url: u.url,
            statusCode,
            statusText,
            responseTimeMs: latency,
            status,
            sslValid: isHttps,
            serverHeader,
            contentType,
            contentLength,
            checkedAt: new Date().toISOString(),
            errorMessage,
          });
        } catch (err: any) {
          const latency = Date.now() - start;
          totalLatency += latency;
          status = 'down';
          overallProjectStatus = 'down';
          errorMessage = err.message || 'Connection failed';

          await HealthCheckResult.create({
            targetId: project._id,
            targetType: 'project',
            urlLabel: u.label,
            status: 'down',
            statusCode: 0,
            responseTimeMs: latency,
            errorMessage,
            checkedAt: new Date(),
          });

          auditResults.push({
            projectId: project._id,
            projectName: project.name,
            category: project.category,
            environment: project.environment,
            label: u.label,
            url: u.url,
            statusCode: 0,
            statusText: 'Unreachable',
            responseTimeMs: latency,
            status: 'down',
            sslValid: false,
            serverHeader: 'N/A',
            contentType: 'N/A',
            contentLength: '0',
            checkedAt: new Date().toISOString(),
            errorMessage,
          });
        }
      }

      project.currentStatus = overallProjectStatus;
      project.lastCheckedAt = new Date();
      await project.save();

      try {
        getIO().to('dashboard').emit('status:update', {
          targetId: project._id,
          targetType: 'project',
          status: overallProjectStatus,
          checkedAt: project.lastCheckedAt,
        });
      } catch (e) {
        // Socket may not be active in non-server contexts
      }
    }

    const totalChecked = auditResults.length;
    const upCount = auditResults.filter((r) => r.status === 'up').length;
    const degradedCount = auditResults.filter((r) => r.status === 'degraded').length;
    const downCount = auditResults.filter((r) => r.status === 'down').length;
    const avgLatencyMs = totalChecked > 0 ? Math.round(totalLatency / totalChecked) : 0;

    return {
      timestamp: new Date().toISOString(),
      totalChecked,
      upCount,
      degradedCount,
      downCount,
      avgLatencyMs,
      allHealthy: downCount === 0 && degradedCount === 0,
      results: auditResults,
    };
  }
}
