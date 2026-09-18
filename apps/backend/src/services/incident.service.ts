import { Incident } from '../models/Incident.model';
import { getIO } from '../sockets/socket';

export class IncidentService {
  static async handleDown(targetId: string, targetType: 'project'|'service', urlLabel: string, message: string) {
    let incident = await Incident.findOne({ targetId, isResolved: false, urlLabel });
    
    if (!incident) {
      incident = new Incident({
        targetId,
        targetType,
        urlLabel,
        severity: 'critical',
        summary: `Target went down: ${message}`,
        timeline: [{ at: new Date(), status: 'down', message }]
      });
      await incident.save();
      getIO().emit('incident:new', incident);
    } else {
      incident.timeline.push({ at: new Date(), status: 'down', message: 'Still down' });
      await incident.save();
    }
  }

  static async handleUp(targetId: string, _targetType: 'project'|'service', urlLabel: string) {
    const incident = await Incident.findOne({ targetId, isResolved: false, urlLabel });
    if (incident) {
      incident.isResolved = true;
      incident.resolvedAt = new Date();
      incident.timeline.push({ at: new Date(), status: 'up', message: 'Service recovered' });
      await incident.save();
      
      getIO().emit('incident:resolved', {
        incidentId: incident._id,
        targetId,
        resolvedAt: incident.resolvedAt
      });
    }
  }
}
