import mongoose, { Schema, Document } from 'mongoose';

export interface ITimelineEntry {
  at: Date;
  status: string;
  message: string;
}

export interface IIncident extends Document {
  targetId: mongoose.Types.ObjectId;
  targetType: 'project' | 'service';
  urlLabel?: string;
  startedAt: Date;
  resolvedAt?: Date;
  severity: 'warning' | 'critical';
  summary: string;
  isResolved: boolean;
  timeline: ITimelineEntry[];
}

const TimelineEntrySchema = new Schema<ITimelineEntry>({
  at: { type: Date, required: true, default: Date.now },
  status: { type: String, required: true },
  message: { type: String, required: true },
});

const IncidentSchema = new Schema<IIncident>({
  targetId: { type: Schema.Types.ObjectId, required: true, index: true },
  targetType: { type: String, enum: ['project', 'service'], required: true },
  urlLabel: { type: String },
  startedAt: { type: Date, required: true, default: Date.now },
  resolvedAt: { type: Date },
  severity: { type: String, enum: ['warning', 'critical'], required: true },
  summary: { type: String, required: true },
  isResolved: { type: Boolean, default: false },
  timeline: { type: [TimelineEntrySchema], default: [] },
});

export const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);
