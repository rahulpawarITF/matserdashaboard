import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { redis } from '../config/redis';
import { Settings, invalidateSettingsConfigCache } from '../models/Settings.model';
import { heartbeatService } from '../services/heartbeat.service';
import { productionSyncService } from '../services/productionSync.service';
import { getIO } from '../sockets/socket';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';

export class SystemController {
  static getHealth = asyncHandler(async (_req: Request, res: Response) => {
    const dbStatus    = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const redisStatus = redis.status === 'ready' ? 'connected' : 'in-memory (100% free fallback)';

    res.status(200).json({
      success: true,
      data: {
        status:  dbStatus === 'connected' ? 'ok' : 'degraded',
        db:      dbStatus,
        redis:   redisStatus,
        uptime:  process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      },
    });
  });

  static getSettings = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await Settings.getSingleton();

    res.status(200).json({
      success: true,
      data: {
        // Monitoring & Pulse
        defaultCheckIntervalMinutes: settings.defaultCheckIntervalMinutes || env.DEFAULT_CHECK_INTERVAL_MINUTES || 5,
        heartbeatIntervalSeconds: settings.heartbeatIntervalSeconds || 60,
        heartbeatLiveIntervalSeconds: settings.heartbeatLiveIntervalSeconds || 30,
        httpCheckTimeoutMs: settings.httpCheckTimeoutMs || 6000,
        httpDegradedThresholdMs: settings.httpDegradedThresholdMs || 4000,
        manualCheckTimeoutMs: settings.manualCheckTimeoutMs || 8000,

        // Data Retention
        dataRetentionDays: settings.dataRetentionDays || env.DATA_RETENTION_DAYS || 90,
        auditLogRetentionDays: settings.auditLogRetentionDays || 365,

        // Production DB & Sync
        productionSyncIntervalSeconds: settings.productionSyncIntervalSeconds || 60,
        prodDbTimeoutMs: settings.prodDbTimeoutMs || 8000,
        registeredUsersCacheTtlSeconds: settings.registeredUsersCacheTtlSeconds || 120,

        // Analytics & Polling
        activeVisitorWindowMinutes: settings.activeVisitorWindowMinutes || 5,
        dashboardStatsCacheSeconds: settings.dashboardStatsCacheSeconds || 30,
        dashboardPollingIntervalSeconds: settings.dashboardPollingIntervalSeconds || 60,

        enableSwagger: env.ENABLE_SWAGGER,
      },
    });
  });

  static updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await Settings.getSingleton();

    const {
      defaultCheckIntervalMinutes,
      heartbeatIntervalSeconds,
      heartbeatLiveIntervalSeconds,
      httpCheckTimeoutMs,
      httpDegradedThresholdMs,
      manualCheckTimeoutMs,
      dataRetentionDays,
      auditLogRetentionDays,
      productionSyncIntervalSeconds,
      prodDbTimeoutMs,
      registeredUsersCacheTtlSeconds,
      activeVisitorWindowMinutes,
      dashboardStatsCacheSeconds,
      dashboardPollingIntervalSeconds,
    } = req.body;

    // Sanitize and apply bounded configurations
    if (defaultCheckIntervalMinutes !== undefined) {
      settings.defaultCheckIntervalMinutes = Math.max(1, Math.min(1440, Number(defaultCheckIntervalMinutes)));
    }
    if (heartbeatIntervalSeconds !== undefined) {
      settings.heartbeatIntervalSeconds = Math.max(10, Math.min(300, Number(heartbeatIntervalSeconds)));
    }
    if (heartbeatLiveIntervalSeconds !== undefined) {
      settings.heartbeatLiveIntervalSeconds = Math.max(5, Math.min(60, Number(heartbeatLiveIntervalSeconds)));
    }
    if (httpCheckTimeoutMs !== undefined) {
      settings.httpCheckTimeoutMs = Math.max(1000, Math.min(30000, Number(httpCheckTimeoutMs)));
    }
    if (httpDegradedThresholdMs !== undefined) {
      settings.httpDegradedThresholdMs = Math.max(500, Math.min(10000, Number(httpDegradedThresholdMs)));
    }
    if (manualCheckTimeoutMs !== undefined) {
      settings.manualCheckTimeoutMs = Math.max(1000, Math.min(30000, Number(manualCheckTimeoutMs)));
    }

    if (dataRetentionDays !== undefined) {
      settings.dataRetentionDays = Math.max(1, Math.min(3650, Number(dataRetentionDays)));
    }
    if (auditLogRetentionDays !== undefined) {
      settings.auditLogRetentionDays = Math.max(1, Math.min(3650, Number(auditLogRetentionDays)));
    }

    if (productionSyncIntervalSeconds !== undefined) {
      settings.productionSyncIntervalSeconds = Math.max(10, Math.min(600, Number(productionSyncIntervalSeconds)));
    }
    if (prodDbTimeoutMs !== undefined) {
      settings.prodDbTimeoutMs = Math.max(2000, Math.min(30000, Number(prodDbTimeoutMs)));
    }
    if (registeredUsersCacheTtlSeconds !== undefined) {
      settings.registeredUsersCacheTtlSeconds = Math.max(15, Math.min(600, Number(registeredUsersCacheTtlSeconds)));
    }

    if (activeVisitorWindowMinutes !== undefined) {
      settings.activeVisitorWindowMinutes = Math.max(1, Math.min(30, Number(activeVisitorWindowMinutes)));
    }
    if (dashboardStatsCacheSeconds !== undefined) {
      settings.dashboardStatsCacheSeconds = Math.max(5, Math.min(300, Number(dashboardStatsCacheSeconds)));
    }
    if (dashboardPollingIntervalSeconds !== undefined) {
      settings.dashboardPollingIntervalSeconds = Math.max(10, Math.min(300, Number(dashboardPollingIntervalSeconds)));
    }

    settings.updatedBy = (req as any).user?.email || 'admin';
    settings.updatedAt = new Date();

    await settings.save();

    // 1. Invalidate backend fast config caches
    invalidateSettingsConfigCache();

    // 2. Hot-reload runtime services without restarting process
    try {
      if (typeof (heartbeatService as any).reloadSettings === 'function') {
        (heartbeatService as any).reloadSettings(settings);
      }
    } catch (err: any) {
      // ignore
    }

    try {
      if (typeof (productionSyncService as any).reloadSettings === 'function') {
        (productionSyncService as any).reloadSettings(settings);
      }
    } catch (err: any) {
      // ignore
    }

    const responsePayload = {
      defaultCheckIntervalMinutes: settings.defaultCheckIntervalMinutes,
      heartbeatIntervalSeconds: settings.heartbeatIntervalSeconds,
      heartbeatLiveIntervalSeconds: settings.heartbeatLiveIntervalSeconds,
      httpCheckTimeoutMs: settings.httpCheckTimeoutMs,
      httpDegradedThresholdMs: settings.httpDegradedThresholdMs,
      manualCheckTimeoutMs: settings.manualCheckTimeoutMs,
      dataRetentionDays: settings.dataRetentionDays,
      auditLogRetentionDays: settings.auditLogRetentionDays,
      productionSyncIntervalSeconds: settings.productionSyncIntervalSeconds,
      prodDbTimeoutMs: settings.prodDbTimeoutMs,
      registeredUsersCacheTtlSeconds: settings.registeredUsersCacheTtlSeconds,
      activeVisitorWindowMinutes: settings.activeVisitorWindowMinutes,
      dashboardStatsCacheSeconds: settings.dashboardStatsCacheSeconds,
      dashboardPollingIntervalSeconds: settings.dashboardPollingIntervalSeconds,
    };

    // 3. Broadcast real-time update to all connected browser tabs
    try {
      getIO().emit('settings:update', responsePayload);
    } catch (err) {
      // ignore if socket server not ready
    }

    res.status(200).json({
      success: true,
      data: responsePayload,
      message: 'System settings updated and applied dynamically at runtime',
    });
  });

  // GET /api/system/export-report
  static exportReport = asyncHandler(async (_req: Request, res: Response) => {
    const { Project } = await import('../models/Project.model');
    const { ga4Service } = await import('../services/ga4.service');
    const { HealthCheckResult } = await import('../models/HealthCheckResult.model');

    const projects = await Project.find({ isActive: true })
      .populate('linkedServiceIds', 'name provider type currentStatus')
      .sort({ name: 1 });

    const rows: string[] = [
      'Project Name,Environment,Status,Response Time (ms),Last Checked,Live URL,Admin URL,Linked Services,Today Visitors,Week Visitors,GA4 Property ID',
    ];

    for (const p of projects) {
      const stats = await ga4Service.getProjectVisitorStats(p);
      let latency = p.latestResponseTimeMs;
      if (!latency) {
        const lastCheck = await HealthCheckResult.findOne({ targetId: p._id }).sort({ checkedAt: -1 }).lean();
        latency = lastCheck?.responseTimeMs || 0;
      }

      const mainUrl = p.urls?.find((u) => u.label.toLowerCase().includes('front') || u.label.toLowerCase().includes('main'))?.url || p.urls?.[0]?.url || '';
      const adminUrl = p.urls?.find((u) => u.label.toLowerCase().includes('admin'))?.url || '';
      const linkedServicesStr = (p.linkedServiceIds || [])
        .map((s: any) => `${s.name} (${s.currentStatus || 'up'})`)
        .join('; ');

      const row = [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.environment}"`,
        `"${p.currentStatus.toUpperCase()}"`,
        latency || 'N/A',
        p.lastCheckedAt ? `"${new Date(p.lastCheckedAt).toISOString()}"` : '"Never"',
        `"${mainUrl}"`,
        `"${adminUrl}"`,
        `"${linkedServicesStr.replace(/"/g, '""')}"`,
        stats.todayUsers,
        stats.weekUsers,
        `"${p.ga4PropertyId || ''}"`,
      ].join(',');

      rows.push(row);
    }

    const csvContent = rows.join('\r\n');
    const filename = `master-dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  });
}
