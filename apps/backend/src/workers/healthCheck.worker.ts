import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { performHttpCheck } from '../utils/httpCheck';
import { HealthCheckResult } from '../models/HealthCheckResult.model';
import { Project } from '../models/Project.model';
import { Service } from '../models/Service.model';
import { IncidentService } from '../services/incident.service';
import { getIO } from '../sockets/socket';
import { logger } from '../config/logger';

export const healthCheckQueue = new Queue('health-checks', { connection: redis });

export const healthCheckWorker = new Worker('health-checks', async (job: Job) => {
  const { targetId, targetType, urlLabel, url, expectedStatusCode, expectedBodyContains, customHeaders } = job.data;
  
  const result = await performHttpCheck({ url, expectedStatusCode, expectedBodyContains, customHeaders });
  
  const doc = await HealthCheckResult.create({
    targetId,
    targetType,
    urlLabel,
    status: result.status,
    statusCode: result.statusCode,
    responseTimeMs: result.responseTimeMs,
    errorMessage: result.errorMessage
  });

  // Update Project/Service status
  let model: any = targetType === 'project' ? Project : Service;
  const target = await model.findById(targetId);
  
  if (target) {
    if (target.currentStatus !== result.status) {
      target.currentStatus = result.status;
    }
    target.lastCheckedAt = new Date();
    if (targetType === 'service') {
      target.lastStatusCode = result.statusCode;
      target.lastErrorMessage = result.errorMessage;
      target.lastResponseTimeMs = result.responseTimeMs;
    }
    await target.save();
  }

  // Handle incidents
  if (result.status === 'down') {
    await IncidentService.handleDown(targetId, targetType, urlLabel || '', result.errorMessage || 'Unknown error');
  } else if (result.status === 'up') {
    await IncidentService.handleUp(targetId, targetType, urlLabel || '');
  }

  // Emit Event to all connected dashboard clients
  try {
    getIO().emit('status:update', {
      targetId: targetId.toString(),
      targetType,
      urlLabel,
      status: result.status,
      responseTimeMs: result.responseTimeMs,
      statusCode: result.statusCode,
      errorMessage: result.errorMessage,
      checkedAt: doc.checkedAt
    });
  } catch(e) {
    // ignore if socket is not initialized (e.g. in tests)
  }

}, { connection: redis });

healthCheckWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed with error ${err.message}`);
});
