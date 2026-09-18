import mongoose, { Schema, Document } from 'mongoose';

export interface IPageView extends Document {
  projectId: mongoose.Types.ObjectId;
  visitorId: string;
  path: string;
  referrer: string;
  browser: string;
  os: string;
  device: 'desktop' | 'mobile' | 'tablet';
  country: string;
  screenWidth?: number;
  screenHeight?: number;
  source?: string;
  timestamp: Date;
}

const PageViewSchema = new Schema<IPageView>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    path: { type: String, required: true, default: '/' },
    referrer: { type: String, default: 'direct' },
    browser: { type: String, default: 'Other' },
    os: { type: String, default: 'Other' },
    device: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
    country: { type: String, default: 'Unknown' },
    screenWidth: { type: Number },
    screenHeight: { type: Number },
    source: { type: String, default: 'live' },
    timestamp: { 
      type: Date, 
      default: Date.now, 
      index: true,
      expires: '90d' // Automatic 90-day TTL cleanup to prevent database storage overflow
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound index for timeseries lookups by project
PageViewSchema.index({ projectId: 1, timestamp: -1 });
// Compound index for top pages aggregation
PageViewSchema.index({ projectId: 1, path: 1 });
// Compound index for unique visitors aggregation
PageViewSchema.index({ projectId: 1, visitorId: 1, timestamp: -1 });

export const PageView = mongoose.model<IPageView>('PageView', PageViewSchema);
