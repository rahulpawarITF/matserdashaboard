import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  name: string;
  provider: string;
  type: 'whatsapp' | 'payment' | 'sms' | 'email' | 'custom';
  checkMethod: 'http' | 'custom_api' | 'webhook';
  statusEndpoint: string;
  expectedStatusCode?: number;
  expectedBodyContains?: string;
  customHeaders?: Map<string, string> | Record<string, string>;
  encryptedCredentials?: string;
  linkedProjectIds: mongoose.Types.ObjectId[];
  checkIntervalMinutes: number;
  currentStatus: 'up' | 'down' | 'degraded' | 'unknown';
  lastCheckedAt?: Date;
  lastStatusCode?: number;
  lastErrorMessage?: string;
  lastResponseTimeMs?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    name: { type: String, required: true },
    provider: { type: String, required: true },
    type: {
      type: String,
      enum: ['whatsapp', 'payment', 'sms', 'email', 'custom'],
      required: true,
    },
    checkMethod: {
      type: String,
      enum: ['http', 'custom_api', 'webhook'],
      default: 'http',
    },
    statusEndpoint: { type: String, required: true },
    expectedStatusCode: { type: Number, default: 200 },
    expectedBodyContains: { type: String },
    customHeaders: { type: Map, of: String, default: {} },
    encryptedCredentials: { type: String },
    linkedProjectIds: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    checkIntervalMinutes: { type: Number, default: 5 },
    currentStatus: {
      type: String,
      enum: ['up', 'down', 'degraded', 'unknown'],
      default: 'unknown',
    },
    lastCheckedAt: { type: Date },
    lastStatusCode: { type: Number },
    lastErrorMessage: { type: String },
    lastResponseTimeMs: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Service = mongoose.model<IService>('Service', ServiceSchema);
