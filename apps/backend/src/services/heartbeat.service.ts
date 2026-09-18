import axios from 'axios';
import { Project, IProject } from '../models/Project.model';
import { Service, IService } from '../models/Service.model';
import { HealthCheckResult } from '../models/HealthCheckResult.model';
import { Incident } from '../models/Incident.model';
import { Settings } from '../models/Settings.model';
import { getIO } from '../sockets/socket';
import { logger } from '../config/logger';
import { performHttpCheck } from '../utils/httpCheck';

interface UrlCheckState {
  lastStatus: 'up' | 'down' | 'degraded' | 'unknown';
  lastResponseTime: number;
  lastCheckedAt: number;
  consecutiveFailures: number;
  lastError?: string;
}

export const HEARTBEAT_MODES = {
  SAFE: { id: 'safe', intervalMs: 60000, label: 'Safe Production Mode (60s)' },
  LIVE: { id: 'live', intervalMs: 30000, label: 'Diagnostic Pulse (30s)' },
} as const;

export class HeartbeatService {
  private isRunning = false;
  public currentMode: 'safe' | 'live' = 'safe';
  private safeIntervalMs = 60000;
  private liveIntervalMs = 30000;
  private httpTimeoutMs = 6000;
  private degradedThresholdMs = 4000;
  private checkIntervalMs = 60000;
  private timer: NodeJS.Timeout | null = null;
  private isChecking = false;
  private activeViewersCount = 0;
  private urlStates = new Map<string, UrlCheckState>(); // key: `${projectId}:${url}`
  private serviceStates = new Map<string, UrlCheckState>(); // key: `${serviceId}`
  private projectsCache: IProject[] = [];
  private servicesCache: IService[] = [];
  private lastProjectsFetch = 0;
  private lastServicesFetch = 0;

  /**
   * Reload settings dynamically from Settings model or passed payload
   */
  async reloadSettings(settingsDoc?: any) {
    try {
      const cfg = settingsDoc || (await Settings.getActiveConfig());
      this.safeIntervalMs = (cfg.heartbeatIntervalSeconds || 60) * 1000;
      this.liveIntervalMs = (cfg.heartbeatLiveIntervalSeconds || 30) * 1000;
      this.httpTimeoutMs = cfg.httpCheckTimeoutMs || 6000;
      this.degradedThresholdMs = cfg.httpDegradedThresholdMs || 4000;

      const targetInterval = this.currentMode === 'live' ? this.liveIntervalMs : this.safeIntervalMs;
      if (this.checkIntervalMs !== targetInterval) {
        this.checkIntervalMs = targetInterval;
        this.restartTimer();
        logger.info(`HeartbeatService: Dynamically applied new interval (${this.checkIntervalMs}ms pulse)`);
      }
    } catch (err: any) {
      logger.warn('HeartbeatService: Failed to reload dynamic settings:', err.message);
    }
  }

  /**
   * Start the continuous tiered heartbeat monitor
   */
  async start(mode: 'safe' | 'live' = 'safe') {
    if (this.isRunning) return;
    this.currentMode = mode;

    try {
      const cfg = await Settings.getActiveConfig();
      this.safeIntervalMs = (cfg.heartbeatIntervalSeconds || 60) * 1000;
      this.liveIntervalMs = (cfg.heartbeatLiveIntervalSeconds || 30) * 1000;
      this.httpTimeoutMs = cfg.httpCheckTimeoutMs || 6000;
      this.degradedThresholdMs = cfg.httpDegradedThresholdMs || 4000;
    } catch (err) {
      // fallback to defaults
    }

    this.checkIntervalMs = mode === 'live' ? this.liveIntervalMs : this.safeIntervalMs;
    this.isRunning = true;
    logger.info(
      `Starting Gentle Heartbeat Monitor (Mode: ${this.currentMode.toUpperCase()}, ${this.checkIntervalMs}ms pulse)...`
    );

    // Immediate initial check
    this.tick();

    this.timer = setInterval(() => {
      this.tick();
    }, this.checkIntervalMs);
  }

  /**
   * Dynamically switch heartbeat mode (safe production vs diagnostic)
   */
  setMode(mode: 'safe' | 'live') {
    if (this.currentMode === mode && this.timer) return;
    this.currentMode = mode;
    this.checkIntervalMs = mode === 'live' ? this.liveIntervalMs : this.safeIntervalMs;
    this.restartTimer();
    logger.info(`Heartbeat mode set to: ${mode.toUpperCase()} (${this.checkIntervalMs}ms pulse)`);

    try {
      getIO().emit('heartbeat:mode-changed', {
        mode: this.currentMode,
        intervalMs: this.checkIntervalMs,
      });
    } catch (e) {}
  }

  /**
   * Coordinate with WebSocket connection lifecycle (Safe production mode preserved)
   */
  onViewerConnected() {
    this.activeViewersCount++;
    // Preserve safe 60s interval to prevent overloading client servers
  }

  onViewerDisconnected() {
    this.activeViewersCount = Math.max(0, this.activeViewersCount - 1);
  }

  private restartTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.isRunning) {
      this.timer = setInterval(() => {
        this.tick();
      }, this.checkIntervalMs);
    }
  }

  /**
   * Stop the heartbeat monitor
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('Stopped Heartbeat Service.');
  }

  /**
   * Core heartbeat pulse tick
   */
  private async tick() {
    if (this.isChecking) return; // Prevent tick overlap
    this.isChecking = true;

    try {
      const now = Date.now();

      // Refresh projects from DB every 30 seconds
      if (now - this.lastProjectsFetch > 30000 || this.projectsCache.length === 0) {
        this.projectsCache = await Project.find({ isActive: true });
        this.lastProjectsFetch = now;
      }

      // Refresh services from DB every 30 seconds
      if (now - this.lastServicesFetch > 30000 || this.servicesCache.length === 0) {
        this.servicesCache = await Service.find({ isActive: true });
        this.lastServicesFetch = now;
      }

      if (this.projectsCache.length === 0 && this.servicesCache.length === 0) {
        return;
      }

      // Collect checkable URLs
      const tasks: Array<{
        project: IProject;
        urlObj: any;
      }> = [];

      for (const project of this.projectsCache) {
        for (const urlObj of project.urls || []) {
          if (urlObj.isHealthCheckTarget !== false && urlObj.url) {
            tasks.push({ project, urlObj });
          }
        }
      }

      const pulseResults: Array<{
        targetId: string;
        targetType: 'project' | 'service';
        projectId?: string;
        projectName: string;
        url: string;
        label: string;
        status: 'up' | 'down' | 'degraded';
        latencyMs: number;
        statusCode: number;
        errorMessage?: string;
      }> = [];

      // Staggered lightweight checks (batches of 2 with 200ms pause) to protect remote servers and prevent burst traffic
      const batchSize = 2;
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async ({ project, urlObj }) => {
            const key = `${project._id}:${urlObj.url}`;
            const state = this.urlStates.get(key) || {
              lastStatus: 'unknown',
              lastResponseTime: 0,
              lastCheckedAt: 0,
              consecutiveFailures: 0,
            };

            const t0 = Date.now();
            let status: 'up' | 'down' | 'degraded' = 'down';
            let statusCode = 0;
            let errorMessage: string | undefined;

            try {
              // Optimization: Try HTTP HEAD first (transfers 0 body bytes, saving remote bandwidth & CPU)
              let resp;
              try {
                resp = await axios.head(urlObj.url, {
                  timeout: this.httpTimeoutMs,
                  maxRedirects: 5,
                  validateStatus: () => true,
                  headers: {
                    'User-Agent': 'MasterDashboard-Heartbeat/2.0 (Smart-Pulse)',
                  },
                });
                statusCode = resp.status;
              } catch (headErr: any) {
                // If server disallows HEAD (405), fallback to lightweight GET with Range header
                resp = await axios.get(urlObj.url, {
                  timeout: this.httpTimeoutMs,
                  maxRedirects: 5,
                  validateStatus: () => true,
                  headers: {
                    'User-Agent': 'MasterDashboard-Heartbeat/2.0 (Smart-Pulse)',
                    Range: 'bytes=0-1024',
                  },
                });
                statusCode = resp.status;
              }

              const latency = Date.now() - t0;
              state.lastResponseTime = latency;

              const expectedStatus = urlObj.expectedStatusCode || 200;

              if (statusCode === expectedStatus || (statusCode >= 200 && statusCode < 400)) {
                status = latency > this.degradedThresholdMs ? 'degraded' : 'up';
                state.consecutiveFailures = 0;
              } else if (statusCode >= 400 && statusCode < 500) {
                status = 'degraded';
                errorMessage = `HTTP ${statusCode}`;
              } else {
                status = 'down';
                errorMessage = `Server Error HTTP ${statusCode}`;
                state.consecutiveFailures++;
              }
            } catch (err: any) {
              statusCode = err.response?.status || 0;
              status = 'down';
              errorMessage =
                err.code === 'ECONNABORTED'
                  ? `Server Connection Timeout (> ${(this.httpTimeoutMs / 1000).toFixed(1)}s)`
                  : err.message || 'Connection failed';
              state.lastResponseTime = Date.now() - t0;
              state.consecutiveFailures++;
            }

            state.lastCheckedAt = Date.now();
            state.lastError = errorMessage;

            pulseResults.push({
              targetId: project._id.toString(),
              targetType: 'project',
              projectId: project._id.toString(),
              projectName: project.name,
              url: urlObj.url,
              label: urlObj.label || 'Portal',
              status,
              latencyMs: state.lastResponseTime,
              statusCode,
              errorMessage,
            });

            // Persist live latency into Project document
            Project.updateOne(
              { _id: project._id },
              { $set: { latestResponseTimeMs: state.lastResponseTime, lastCheckedAt: new Date() } }
            ).catch(() => {});

            // Check if status transitioned (e.g. up -> down or down -> up)
            const previousStatus = state.lastStatus;
            state.lastStatus = status;
            this.urlStates.set(key, state);

            if (previousStatus !== status && previousStatus !== 'unknown') {
              await this.handleStatusTransition(
                project,
                urlObj,
                status,
                previousStatus,
                state.lastResponseTime,
                statusCode,
                errorMessage
              );
            }
          })
        );

        if (i + batchSize < tasks.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      // Staggered lightweight checks for Services using the exact same logic & criteria as Projects
      const serviceTasks: Array<{ service: IService }> = [];
      for (const service of this.servicesCache) {
        if (service.statusEndpoint) {
          serviceTasks.push({ service });
        }
      }

      for (let i = 0; i < serviceTasks.length; i += batchSize) {
        const batch = serviceTasks.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async ({ service }) => {
            const key = service._id.toString();
            const state: UrlCheckState = this.serviceStates.get(key) || {
              lastStatus: (service.currentStatus as any) || 'unknown',
              lastResponseTime: service.lastResponseTimeMs || 0,
              lastCheckedAt: service.lastCheckedAt ? new Date(service.lastCheckedAt).getTime() : 0,
              consecutiveFailures: 0,
              lastError: service.lastErrorMessage,
            };

            let customHeaders: Record<string, string> = {};
            if (service.customHeaders) {
              if (service.customHeaders instanceof Map) {
                customHeaders = Object.fromEntries(service.customHeaders);
              } else if (typeof service.customHeaders === 'object') {
                customHeaders = service.customHeaders as Record<string, string>;
              }
            }

            const checkResult = await performHttpCheck({
              url: service.statusEndpoint,
              expectedStatusCode: service.expectedStatusCode ?? 200,
              expectedBodyContains: service.expectedBodyContains,
              customHeaders,
              timeoutMs: this.httpTimeoutMs,
              degradedThresholdMs: this.degradedThresholdMs,
            });

            state.lastResponseTime = checkResult.responseTimeMs;
            state.lastCheckedAt = Date.now();
            state.lastError = checkResult.errorMessage;

            if (checkResult.status === 'down') {
              state.consecutiveFailures++;
            } else {
              state.consecutiveFailures = 0;
            }

            pulseResults.push({
              targetId: service._id.toString(),
              targetType: 'service',
              projectId: service._id.toString(),
              projectName: service.name,
              url: service.statusEndpoint,
              label: service.name,
              status: checkResult.status,
              latencyMs: checkResult.responseTimeMs,
              statusCode: checkResult.statusCode,
              errorMessage: checkResult.errorMessage,
            });

            // Persist diagnostic fields directly on Service document
            Service.updateOne(
              { _id: service._id },
              {
                $set: {
                  currentStatus: checkResult.status,
                  lastCheckedAt: new Date(),
                  lastStatusCode: checkResult.statusCode,
                  lastErrorMessage: checkResult.errorMessage,
                  lastResponseTimeMs: checkResult.responseTimeMs,
                },
              }
            ).catch(() => {});

            // Check if status transitioned (e.g. up -> down, down -> up, degraded)
            const previousStatus = state.lastStatus;
            state.lastStatus = checkResult.status;
            this.serviceStates.set(key, state);

            if (previousStatus !== checkResult.status && previousStatus !== 'unknown') {
              await this.handleServiceStatusTransition(
                service,
                checkResult.status,
                previousStatus,
                checkResult.responseTimeMs,
                checkResult.statusCode,
                checkResult.errorMessage
              );
            }
          })
        );

        if (i + batchSize < serviceTasks.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      // Emit high-frequency real-time pulse over Socket.io
      try {
        const io = getIO();
        io.emit('heartbeat:pulse', {
          timestamp: Date.now(),
          pulseRateMs: this.checkIntervalMs,
          mode: this.currentMode,
          activeViewers: this.activeViewersCount,
          totalTargets: pulseResults.length,
          results: pulseResults,
        });
      } catch (e) {
        // socket may not be initialized yet
      }
    } catch (err: any) {
      logger.warn('Error during heartbeat tick:', err.message);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Immediate handling of state changes (DOWN alert or UP recovery)
   */
  private async handleStatusTransition(
    project: IProject,
    urlObj: any,
    newStatus: 'up' | 'down' | 'degraded',
    previousStatus: string,
    responseTimeMs: number,
    statusCode: number,
    errorMessage?: string
  ) {
    const now = new Date();
    logger.warn(
      `[HEARTBEAT ALERT] ${project.name} (${urlObj.label || urlObj.url}) changed from ${previousStatus.toUpperCase()} to ${newStatus.toUpperCase()} (${responseTimeMs}ms, HTTP ${statusCode})`
    );

    try {
      // 1. Persist HealthCheckResult ONLY on state change
      await HealthCheckResult.create({
        targetId: project._id,
        targetType: 'project',
        urlLabel: urlObj.label,
        status: newStatus,
        statusCode,
        responseTimeMs,
        errorMessage,
        checkedAt: now,
      });

      // 2. Update Project currentStatus
      project.currentStatus = newStatus;
      project.lastCheckedAt = now;
      await Project.updateOne(
        { _id: project._id },
        { currentStatus: newStatus, lastCheckedAt: now }
      );

      const io = getIO();

      // 3. Emit immediate status update
      io.emit('status:update', {
        targetId: project._id,
        targetType: 'project',
        urlLabel: urlObj.label,
        status: newStatus,
        responseTimeMs,
        statusCode,
        checkedAt: now,
      });

      // 4. Manage Incident & Urgent Alerts
      if (newStatus === 'down') {
        const incident = await Incident.create({
          targetId: project._id,
          targetType: 'project',
          urlLabel: urlObj.label,
          startedAt: now,
          severity: 'critical',
          summary: `${project.name} (${urlObj.label || urlObj.url}) went DOWN: ${errorMessage || 'No response'}`,
          isResolved: false,
          timeline: [
            {
              at: now,
              status: 'down',
              message: `Service became unreachable. HTTP ${statusCode || '0'} - ${errorMessage || 'Connection timeout'}`,
            },
          ],
        });

        io.emit('incident:new', incident);
        io.emit('heartbeat:alert', {
          type: 'outage',
          severity: 'critical',
          projectId: project._id,
          projectName: project.name,
          urlLabel: urlObj.label,
          url: urlObj.url,
          statusCode,
          error: errorMessage,
          timestamp: now,
        });
      } else if (newStatus === 'up' && previousStatus === 'down') {
        const activeIncident = await Incident.findOne({
          targetId: project._id,
          isResolved: false,
        }).sort({ startedAt: -1 });

        if (activeIncident) {
          activeIncident.isResolved = true;
          activeIncident.resolvedAt = now;
          activeIncident.timeline.push({
            at: now,
            status: 'up',
            message: `Service automatically recovered. Response time: ${responseTimeMs}ms.`,
          });
          await activeIncident.save();

          io.emit('incident:resolved', {
            incidentId: activeIncident._id,
            targetId: project._id,
            resolvedAt: now,
          });
        }

        io.emit('heartbeat:alert', {
          type: 'recovery',
          severity: 'info',
          projectId: project._id,
          projectName: project.name,
          urlLabel: urlObj.label,
          url: urlObj.url,
          statusCode,
          responseTimeMs,
          timestamp: now,
        });
      }
    } catch (err: any) {
      logger.error('Error handling status transition in heartbeat:', err);
    }
  }

  /**
   * Immediate handling of Service state changes (DOWN alert or UP recovery)
   */
  private async handleServiceStatusTransition(
    service: IService,
    newStatus: 'up' | 'down' | 'degraded',
    previousStatus: string,
    responseTimeMs: number,
    statusCode: number,
    errorMessage?: string
  ) {
    const now = new Date();
    logger.warn(
      `[HEARTBEAT SERVICE ALERT] ${service.name} (${service.provider}) changed from ${previousStatus.toUpperCase()} to ${newStatus.toUpperCase()} (${responseTimeMs}ms, HTTP ${statusCode})`
    );

    try {
      // 1. Persist HealthCheckResult ONLY on state change
      await HealthCheckResult.create({
        targetId: service._id,
        targetType: 'service',
        urlLabel: service.name,
        status: newStatus,
        statusCode,
        responseTimeMs,
        errorMessage,
        checkedAt: now,
      });

      // 2. Update Service currentStatus
      service.currentStatus = newStatus;
      service.lastCheckedAt = now;
      await Service.updateOne(
        { _id: service._id },
        {
          currentStatus: newStatus,
          lastCheckedAt: now,
          lastStatusCode: statusCode,
          lastErrorMessage: errorMessage,
          lastResponseTimeMs: responseTimeMs,
        }
      );

      const io = getIO();

      // 3. Emit immediate status update to all connected clients
      io.emit('status:update', {
        targetId: service._id.toString(),
        targetType: 'service',
        urlLabel: service.name,
        status: newStatus,
        responseTimeMs,
        statusCode,
        errorMessage,
        checkedAt: now,
        linkedProjectIds: service.linkedProjectIds ? service.linkedProjectIds.map((id: any) => id.toString()) : [],
      });

      // 4. Manage Incident & Urgent Alerts
      if (newStatus === 'down') {
        const incident = await Incident.create({
          targetId: service._id,
          targetType: 'service',
          urlLabel: service.name,
          startedAt: now,
          severity: 'critical',
          summary: `${service.name} (${service.provider}) went DOWN: ${errorMessage || 'No response'}`,
          isResolved: false,
          timeline: [
            {
              at: now,
              status: 'down',
              message: `Service became unreachable. HTTP ${statusCode || '0'} - ${errorMessage || 'Connection timeout'}`,
            },
          ],
        });

        io.emit('incident:new', incident);
        io.emit('heartbeat:alert', {
          type: 'outage',
          severity: 'critical',
          targetId: service._id,
          targetType: 'service',
          projectId: service._id,
          projectName: service.name,
          urlLabel: service.name,
          url: service.statusEndpoint,
          statusCode,
          error: errorMessage,
          timestamp: now,
        });
      } else if (newStatus === 'up' && previousStatus === 'down') {
        const activeIncident = await Incident.findOne({
          targetId: service._id,
          targetType: 'service',
          isResolved: false,
        }).sort({ startedAt: -1 });

        if (activeIncident) {
          activeIncident.isResolved = true;
          activeIncident.resolvedAt = now;
          activeIncident.timeline.push({
            at: now,
            status: 'up',
            message: `Service automatically recovered. Response time: ${responseTimeMs}ms.`,
          });
          await activeIncident.save();

          io.emit('incident:resolved', {
            incidentId: activeIncident._id,
            targetId: service._id,
            resolvedAt: now,
          });
        }

        io.emit('heartbeat:alert', {
          type: 'recovery',
          severity: 'info',
          targetId: service._id,
          targetType: 'service',
          projectId: service._id,
          projectName: service.name,
          urlLabel: service.name,
          url: service.statusEndpoint,
          statusCode,
          responseTimeMs,
          timestamp: now,
        });
      }
    } catch (err: any) {
      logger.error('Error handling service status transition in heartbeat:', err);
    }
  }

  /**
   * Get latest live snapshot of all URL and Service states
   */
  getSnapshot() {
    const results = [];
    for (const [key, state] of this.urlStates.entries()) {
      const [projectId, url] = key.split(':');
      results.push({
        type: 'project',
        projectId,
        url,
        ...state,
      });
    }
    for (const [key, state] of this.serviceStates.entries()) {
      results.push({
        type: 'service',
        serviceId: key,
        ...state,
      });
    }
    return {
      isRunning: this.isRunning,
      mode: this.currentMode,
      pulseRateMs: this.checkIntervalMs,
      activeViewers: this.activeViewersCount,
      totalMonitored: this.urlStates.size + this.serviceStates.size,
      results,
    };
  }
}

export const heartbeatService = new HeartbeatService();
