import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.string().min(1),
  type: z.enum(['whatsapp', 'payment', 'sms', 'email', 'custom']),
  checkMethod: z.enum(['http', 'custom_api', 'webhook']).optional(),
  statusEndpoint: z.string().url(),
  expectedStatusCode: z.number().optional(),
  expectedBodyContains: z.string().optional(),
  customHeaders: z.record(z.string()).optional(),
  credentials: z.string().optional(), // Will be encrypted before saving
  linkedProjectIds: z.array(z.string()).optional(),
  checkIntervalMinutes: z.number().refine(v => [1,5,15,30,60].includes(v)).optional()
});

export const updateServiceSchema = createServiceSchema.partial();
