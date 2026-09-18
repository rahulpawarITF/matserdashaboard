import mongoose, { Schema, Document } from 'mongoose';

export interface IUrl {
  label: string;
  url: string;
  isHealthCheckTarget: boolean;
  expectedStatusCode: number;
  expectedBodyContains?: string;
  customHeaders: Map<string, string>;
}

export interface IProject extends Document {
  name: string;
  description: string;
  category: string;
  tags: string[];
  urls: IUrl[];
  environment: 'production' | 'staging' | 'development';
  checkIntervalMinutes: number;
  linkedServiceIds: mongoose.Types.ObjectId[];
  ownerNotes: string;
  documentationUrl: string;
  healthCheckUrl?: string;
  ga4PropertyId?: string;
  latestResponseTimeMs?: number;
  isActive: boolean;
  currentStatus: 'up' | 'down' | 'degraded' | 'unknown';
  lastCheckedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UrlSchema = new Schema<IUrl>({
  label: { type: String, required: true },
  url: { type: String, required: true },
  isHealthCheckTarget: { type: Boolean, default: true },
  expectedStatusCode: { type: Number, default: 200 },
  expectedBodyContains: { type: String },
  customHeaders: { type: Map, of: String, default: {} },
});

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: '' },
    tags: { type: [String], default: [] },
    urls: { type: [UrlSchema], default: [] },
    environment: {
      type: String,
      enum: ['production', 'staging', 'development'],
      default: 'production',
    },
    checkIntervalMinutes: {
      type: Number,
      enum: [1, 5, 15, 30, 60],
      default: 5,
    },
    linkedServiceIds: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    ownerNotes: { type: String, default: '' },
    documentationUrl: { type: String, default: '' },
    healthCheckUrl: { type: String, default: '' },
    ga4PropertyId: { type: String, default: '' },
    latestResponseTimeMs: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    currentStatus: {
      type: String,
      enum: ['up', 'down', 'degraded', 'unknown'],
      default: 'unknown',
    },
    lastCheckedAt: { type: Date },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
