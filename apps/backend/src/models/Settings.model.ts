import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  // ─── Monitoring & Heartbeat Pulse ──────────────────────────────────────────
  defaultCheckIntervalMinutes: number;
  heartbeatIntervalSeconds: number;
  heartbeatLiveIntervalSeconds: number;
  httpCheckTimeoutMs: number;
  httpDegradedThresholdMs: number;
  manualCheckTimeoutMs: number;

  // ─── Data Lifecycle & Retention ────────────────────────────────────────────
  dataRetentionDays: number;
  auditLogRetentionDays: number;

  // ─── Production DB & Synchronization ───────────────────────────────────────
  productionSyncIntervalSeconds: number;
  prodDbTimeoutMs: number;
  registeredUsersCacheTtlSeconds: number;

  // ─── Realtime Analytics & Polling ──────────────────────────────────────────
  activeVisitorWindowMinutes: number;
  dashboardStatsCacheSeconds: number;
  dashboardPollingIntervalSeconds: number;

  updatedBy?: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    // Monitoring & Heartbeat Pulse
    defaultCheckIntervalMinutes: { type: Number, default: 5 },
    heartbeatIntervalSeconds: { type: Number, default: 60 },
    heartbeatLiveIntervalSeconds: { type: Number, default: 30 },
    httpCheckTimeoutMs: { type: Number, default: 6000 },
    httpDegradedThresholdMs: { type: Number, default: 4000 },
    manualCheckTimeoutMs: { type: Number, default: 8000 },

    // Data Lifecycle & Retention
    dataRetentionDays: { type: Number, default: 90 },
    auditLogRetentionDays: { type: Number, default: 365 },

    // Production DB & Synchronization
    productionSyncIntervalSeconds: { type: Number, default: 60 },
    prodDbTimeoutMs: { type: Number, default: 8000 },
    registeredUsersCacheTtlSeconds: { type: Number, default: 120 },

    // Realtime Analytics & Polling
    activeVisitorWindowMinutes: { type: Number, default: 5 },
    dashboardStatsCacheSeconds: { type: Number, default: 30 },
    dashboardPollingIntervalSeconds: { type: Number, default: 60 },

    updatedBy: { type: String, default: 'system' },
  },
  {
    timestamps: true,
  }
);

// In-memory fast cache (15-second TTL) for zero MongoDB latency during rapid pulse checks
let cachedConfig: ISettings | null = null;
let lastCacheFetch = 0;
const CACHE_TTL_MS = 15000;

export const invalidateSettingsConfigCache = () => {
  cachedConfig = null;
  lastCacheFetch = 0;
};

// Singleton helper: fetches the single settings doc or creates one with defaults
SettingsSchema.statics.getSingleton = async function (): Promise<ISettings> {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

// Fast cached getter for high-frequency operations
SettingsSchema.statics.getActiveConfig = async function (): Promise<ISettings> {
  const now = Date.now();
  if (cachedConfig && now - lastCacheFetch < CACHE_TTL_MS) {
    return cachedConfig;
  }
  try {
    cachedConfig = await (this as any).getSingleton();
    lastCacheFetch = now;
    return cachedConfig!;
  } catch {
    if (cachedConfig) return cachedConfig;
    return new (this as any)();
  }
};

export interface SettingsModel extends mongoose.Model<ISettings> {
  getSingleton(): Promise<ISettings>;
  getActiveConfig(): Promise<ISettings>;
}

export const Settings = mongoose.model<ISettings, SettingsModel>('Settings', SettingsSchema);
