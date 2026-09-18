import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  action: string;
  targetType: string;
  targetId?: mongoose.Types.ObjectId;
  changes: Record<string, any>;
  ip: string;
  userAgent: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.Mixed, default: null },
  userEmail: { type: String, required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: Schema.Types.Mixed, default: null },
  changes: { type: Schema.Types.Mixed, default: {} },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: true,
    expires: '365d' // TTL index 1 year
  },
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
