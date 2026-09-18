import { redis } from '../config/redis';
import { healthCheckQueue } from './healthCheck.worker';
import { Project } from '../models/Project.model';
import { Service } from '../models/Service.model';
import { logger } from '../config/logger';

export const scheduleTarget = async (id: string, type: 'project' | 'service', intervalMinutes: number) => {
  if (redis.status !== 'ready') {
    return;
  }

  try {
    if (type === 'project') {
      const target = await Project.findById(id).lean();
      if (!target || !target.isActive) return;

      for (const u of target.urls) {
        if (u.isHealthCheckTarget) {
          await healthCheckQueue.add(`check-${id}-${u.label}`, {
            targetId: id,
            targetType: type,
            urlLabel: u.label,
            url: u.url,
            expectedStatusCode: u.expectedStatusCode ?? 200,
            expectedBodyContains: u.expectedBodyContains,
            customHeaders: u.customHeaders as Record<string, string> | undefined,
          }, {
            repeat: { every: intervalMinutes * 60000 },
            jobId: `repeat-${id}-${u.label}`,
          });
        }
      }
    } else {
      const target = await Service.findById(id).lean();
      if (!target || !target.isActive) return;

      let headers: Record<string, string> = {};
      if (target.customHeaders) {
        if (target.customHeaders instanceof Map) {
          headers = Object.fromEntries(target.customHeaders);
        } else if (typeof target.customHeaders === 'object') {
          headers = target.customHeaders as Record<string, string>;
        }
      }

      await healthCheckQueue.add(`check-${id}`, {
        targetId: id,
        targetType: type,
        urlLabel: target.name,
        url: target.statusEndpoint,
        expectedStatusCode: target.expectedStatusCode ?? 200,
        expectedBodyContains: target.expectedBodyContains,
        customHeaders: headers,
      }, {
        repeat: { every: intervalMinutes * 60000 },
        jobId: `repeat-${id}`,
      });
    }
  } catch (err: any) {
    logger.warn(`Could not register BullMQ job for ${id}: ${err.message}`);
  }
};

export const unscheduleTarget = async (id: string) => {
  if (redis.status !== 'ready') {
    return;
  }

  try {
    const jobs = await healthCheckQueue.getRepeatableJobs();
    for (const job of jobs) {
      if (job.id && job.id.includes(`repeat-${id}`)) {
        await healthCheckQueue.removeRepeatableByKey(job.key);
      }
    }
  } catch (err: any) {
    logger.warn(`Could not unregister BullMQ job for ${id}: ${err.message}`);
  }
};

export const rescheduleTarget = async (id: string, type: 'project' | 'service', newInterval: number) => {
  await unscheduleTarget(id);
  await scheduleTarget(id, type, newInterval);
};

export const startScheduler = async () => {
  // 1. Try BullMQ if Redis is actively connected
  if (redis.status === 'ready') {
    try {
      const projects = await Project.find({ isActive: true });
      for (const p of projects) {
        await scheduleTarget(p._id.toString(), 'project', p.checkIntervalMinutes);
      }

      const services = await Service.find({ isActive: true });
      for (const s of services) {
        await scheduleTarget(s._id.toString(), 'service', s.checkIntervalMinutes);
      }

      logger.info('BullMQ Scheduler started and active jobs registered');
    } catch (err: any) {
      logger.warn('BullMQ Redis queue notice:', err.message);
    }
  } else {
    logger.info('Scheduler: Heartbeat service is active as primary health monitor.');
  }
};
