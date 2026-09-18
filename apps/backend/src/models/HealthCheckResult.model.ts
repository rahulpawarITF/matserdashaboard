import mongoose, { Schema, Document } from 'mongoose';

export interface IHealthCheckResult extends Document {
  targetId: mongoose.Types.ObjectId;
  targetType: 'project' | 'service';
  urlLabel: string;
  status: 'up' | 'down' | 'degraded';
  statusCode: number;
  responseTimeMs: number;
  errorMessage?: string;
  checkedAt: Date;
}

const HealthCheckResultSchema = new Schema<IHealthCheckResult>({
  targetId: { type: Schema.Types.ObjectId, required: true, index: true },
  targetType: { type: String, enum: ['project', 'service'], required: true },
  urlLabel: { type: String },
  status: { type: String, enum: ['up', 'down', 'degraded'], required: true },
  statusCode: { type: Number, required: true },
  responseTimeMs: { type: Number, required: true },
  errorMessage: { type: String },
  checkedAt: { 
    type: Date, 
    default: Date.now, 
    index: true,
    expires: '90d' // TTL index 90 days
  },
});

HealthCheckResultSchema.index({ targetId: 1, checkedAt: -1 });

export const HealthCheckResult = mongoose.model<IHealthCheckResult>(
  'HealthCheckResult',
  HealthCheckResultSchema
);
