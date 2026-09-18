import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  urls: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
    isHealthCheckTarget: z.boolean().optional(),
    expectedStatusCode: z.number().optional(),
    expectedBodyContains: z.string().optional(),
    customHeaders: z.record(z.string()).optional()
  })).min(1),
  environment: z.enum(['production','staging','development']).optional(),
  checkIntervalMinutes: z.number().refine(v => [1,5,15,30,60].includes(v)).optional(),
  linkedServiceIds: z.array(z.string()).optional(),
  ownerNotes: z.string().optional(),
  documentationUrl: z.string().optional(),
  healthCheckUrl: z.string().optional(),
  ga4PropertyId: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
