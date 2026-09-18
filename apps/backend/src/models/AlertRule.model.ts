import mongoose, { Schema, Document } from 'mongoose';

export interface IAlertRule extends Document {
  targetId: mongoose.Types.ObjectId;
  targetType: 'project' | 'service';
  condition: 'down' | 'degraded' | 'response_time_gt';
  thresholdMs?: number;
  forMinutes: number;
  channels: ('email' | 'slack')[];
  webhookUrl?: string;
  isMuted: boolean;
  muteUntil?: Date;
  isActive: boolean;
  lastFiredAt?: Date;
}

const AlertRuleSchema = new Schema<IAlertRule>({
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: ['project', 'service'], required: true },
  condition: { type: String, enum: ['down', 'degraded', 'response_time_gt'], required: true },
  thresholdMs: { type: Number },
  forMinutes: { type: Number, default: 5 },
  channels: [{ type: String, enum: ['email', 'slack'] }],
  webhookUrl: { type: String },
  isMuted: { type: Boolean, default: false },
  muteUntil: { type: Date },
  isActive: { type: Boolean, default: true },
  lastFiredAt: { type: Date },
});

export const AlertRule = mongoose.model<IAlertRule>('AlertRule', AlertRuleSchema);
