import { z } from 'zod';

export const createAlertRuleSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['project', 'service']),
  condition: z.enum(['down', 'degraded', 'response_time_gt']),
  thresholdMs: z.number().optional(),
  forMinutes: z.number().optional(),
  channels: z.array(z.enum(['email', 'slack'])).min(1, 'Select at least one notification channel'),
  webhookUrl: z.string().url().optional(),
});

export const updateAlertRuleSchema = createAlertRuleSchema.partial();

export const muteAlertRuleSchema = z.object({
  muteUntil: z.string().datetime().optional()
});
