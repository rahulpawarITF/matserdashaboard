import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationLog extends Document {
  alertRuleId: mongoose.Types.ObjectId;
  channel: string;
  sentAt: Date;
  success: boolean;
  errorMessage?: string;
}

const NotificationLogSchema = new Schema<INotificationLog>({
  alertRuleId: { type: Schema.Types.ObjectId, required: true },
  channel: { type: String, required: true },
  sentAt: { type: Date, required: true, default: Date.now },
  success: { type: Boolean, required: true },
  errorMessage: { type: String },
});

export const NotificationLog = mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);
