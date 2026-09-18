import { AlertRule, IAlertRule } from '../models/AlertRule.model';
import { Project } from '../models/Project.model';
import { Service } from '../models/Service.model';
import { NotificationLog } from '../models/NotificationLog.model';

export class AlertService {
  static async getRules() {
    const rules = await AlertRule.find({}).sort({ _id: -1 }).lean();

    // Dynamically populate target details and last delivery logs
    const populated = await Promise.all(
      rules.map(async (rule) => {
        let targetName = 'Unknown Target';
        let targetStatus = 'unknown';
        let targetEnvironment = '';

        try {
          if (rule.targetType === 'project') {
            const proj = await Project.findById(rule.targetId).select('name currentStatus environment').lean();
            if (proj) {
              targetName = proj.name;
              targetStatus = proj.currentStatus || 'unknown';
              targetEnvironment = proj.environment || 'production';
            }
          } else {
            const svc = await Service.findById(rule.targetId).select('name currentStatus provider').lean();
            if (svc) {
              targetName = svc.name;
              targetStatus = svc.currentStatus || 'unknown';
              targetEnvironment = svc.provider || 'third-party';
            }
          }
        } catch {
          // target lookup fallback
        }

        // Fetch latest delivery log
        const latestLog = await NotificationLog.findOne({ alertRuleId: rule._id })
          .sort({ sentAt: -1 })
          .lean();

        return {
          ...rule,
          targetName,
          targetStatus,
          targetEnvironment,
          lastDelivery: latestLog
            ? {
                channel: latestLog.channel,
                sentAt: latestLog.sentAt,
                success: latestLog.success,
                errorMessage: latestLog.errorMessage,
              }
            : null,
        };
      })
    );

    return populated;
  }

  static async getRuleLogs(id: string) {
    return NotificationLog.find({ alertRuleId: id }).sort({ sentAt: -1 }).limit(20).lean();
  }

  static async createRule(data: Partial<IAlertRule>) {
    const rule = new AlertRule(data);
    await rule.save();
    return rule;
  }

  static async updateRule(id: string, data: Partial<IAlertRule>) {
    const rule = await AlertRule.findByIdAndUpdate(id, data, { new: true });
    if (!rule) throw new Error('Rule not found');
    return rule;
  }

  static async deleteRule(id: string) {
    await AlertRule.findByIdAndDelete(id);
    await NotificationLog.deleteMany({ alertRuleId: id });
  }

  static async muteRule(id: string, muteUntil?: Date) {
    const rule = await AlertRule.findById(id);
    if (!rule) throw new Error('Rule not found');
    
    rule.isMuted = !!muteUntil;
    rule.muteUntil = muteUntil;
    await rule.save();
    return rule;
  }
}
