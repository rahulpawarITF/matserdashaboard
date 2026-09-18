import { Service, IService } from '../models/Service.model';
import { Project } from '../models/Project.model';
import { encrypt, decrypt } from '../utils/encryption';
import { scheduleTarget, unscheduleTarget, rescheduleTarget } from '../workers/scheduler';
import { HealthCheckResult } from '../models/HealthCheckResult.model';
import { Settings } from '../models/Settings.model';
import { performHttpCheck } from '../utils/httpCheck';
import { IncidentService } from './incident.service';
import { getIO } from '../sockets/socket';

export class ServiceService {
  static async getServices() {
    return Service.find({})
      .populate('linkedProjectIds', 'name environment currentStatus')
      .sort({ createdAt: -1 });
  }

  static async createService(data: Partial<IService> & { credentials?: string }) {
    if (data.credentials) {
      data.encryptedCredentials = encrypt(data.credentials);
      delete data.credentials;
    }

    const service = new Service(data);
    await service.save();

    // Two-way sync: Add service to linked projects
    if (service.linkedProjectIds && service.linkedProjectIds.length > 0) {
      await Project.updateMany(
        { _id: { $in: service.linkedProjectIds } },
        { $addToSet: { linkedServiceIds: service._id } }
      );
    }

    if (service.isActive) {
      await scheduleTarget(service._id.toString(), 'service', service.checkIntervalMinutes);
    }
    return service;
  }

  static async getServiceById(id: string) {
    const service = await Service.findById(id)
      .populate('linkedProjectIds', 'name environment currentStatus')
      .lean();
    if (!service) throw new Error('Service not found');

    if (service.encryptedCredentials) {
      try {
        const decryptedStr = decrypt(service.encryptedCredentials);
        try {
          (service as any).credentials = JSON.parse(decryptedStr);
        } catch {
          (service as any).credentials = { key: decryptedStr };
        }
      } catch {
        (service as any).credentials = { error: 'Failed to decrypt credentials' };
      }
      delete service.encryptedCredentials;
    }
    return service;
  }

  static async updateService(id: string, data: Partial<IService> & { credentials?: string }) {
    const service = await Service.findById(id);
    if (!service) throw new Error('Service not found');

    if (data.credentials) {
      data.encryptedCredentials = encrypt(data.credentials);
      delete data.credentials;
    }

    const oldInterval = service.checkIntervalMinutes;
    const oldActive = service.isActive;

    Object.assign(service, data);
    await service.save();

    // Two-way sync: Add service to linked projects
    if (service.linkedProjectIds && service.linkedProjectIds.length > 0) {
      await Project.updateMany(
        { _id: { $in: service.linkedProjectIds } },
        { $addToSet: { linkedServiceIds: service._id } }
      );
    }

    if (service.isActive !== oldActive) {
      if (service.isActive) await scheduleTarget(id, 'service', service.checkIntervalMinutes);
      else await unscheduleTarget(id);
    } else if (service.isActive && oldInterval !== service.checkIntervalMinutes) {
      await rescheduleTarget(id, 'service', service.checkIntervalMinutes);
    }

    return service;
  }

  static async deleteService(id: string) {
    const service = await Service.findById(id);
    if (service) {
      await unscheduleTarget(id);
      // Remove from any projects
      await Project.updateMany(
        { linkedServiceIds: service._id },
        { $pull: { linkedServiceIds: service._id } }
      );
      await service.deleteOne();
    }
  }

  static async triggerManualCheck(id: string) {
    const service = await Service.findById(id);
    if (!service) throw new Error('Service not found');

    let headers: Record<string, string> = {};
    if (service.customHeaders) {
      if (service.customHeaders instanceof Map) {
        headers = Object.fromEntries(service.customHeaders);
      } else if (typeof service.customHeaders === 'object') {
        headers = service.customHeaders as Record<string, string>;
      }
    }

    const config = await Settings.getActiveConfig();
    const manualTimeout = config.manualCheckTimeoutMs || 8000;
    const degradedThreshold = config.httpDegradedThresholdMs || 4000;

    // Direct HTTP check execution for immediate diagnostic feedback
    const result = await performHttpCheck({
      url: service.statusEndpoint,
      expectedStatusCode: service.expectedStatusCode ?? 200,
      expectedBodyContains: service.expectedBodyContains,
      customHeaders: headers,
      timeoutMs: manualTimeout,
      degradedThresholdMs: degradedThreshold,
    });

    await HealthCheckResult.create({
      targetId: service._id,
      targetType: 'service',
      urlLabel: service.name,
      status: result.status,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      errorMessage: result.errorMessage,
      checkedAt: new Date(),
    });

    // Persist diagnostic fields directly on Service document
    service.currentStatus = result.status;
    service.lastCheckedAt = new Date();
    service.lastStatusCode = result.statusCode;
    service.lastErrorMessage = result.errorMessage;
    service.lastResponseTimeMs = result.responseTimeMs;
    await service.save();

    // Handle incidents
    if (result.status === 'down') {
      await IncidentService.handleDown(
        service._id.toString(),
        'service',
        service.name,
        result.errorMessage || 'Service unreachable'
      );
    } else if (result.status === 'up') {
      await IncidentService.handleUp(service._id.toString(), 'service', service.name);
    }

    // Emit live Socket.io event with diagnostic payload
    try {
      getIO().emit('status:update', {
        targetId: service._id.toString(),
        targetType: 'service',
        urlLabel: service.name,
        status: result.status,
        responseTimeMs: result.responseTimeMs,
        statusCode: result.statusCode,
        errorMessage: result.errorMessage,
        checkedAt: service.lastCheckedAt,
        linkedProjectIds: service.linkedProjectIds ? service.linkedProjectIds.map((id: any) => id.toString()) : [],
      });
    } catch {}

    return {
      status: result.status,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      errorMessage: result.errorMessage,
      checkedAt: service.lastCheckedAt,
    };
  }

  static async getServiceResults(id: string) {
    return HealthCheckResult.find({ targetId: id, targetType: 'service' })
      .sort({ checkedAt: -1 })
      .limit(50);
  }
}
