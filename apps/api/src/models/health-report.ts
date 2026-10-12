import { Schema, model } from "mongoose";

// Saved AI project health reports, so the team can look back at them later
const healthReportSchema = new Schema(
  {
    organizationId: { type: Number, required: true },
    projectId: { type: Number, required: true },
    requestedById: { type: Number, required: true },
    requestedByName: { type: String, required: true },
    health: { type: String, enum: ["ON_TRACK", "AT_RISK", "OFF_TRACK"], required: true },
    score: { type: Number, required: true },
    summary: { type: String, required: true },
    risks: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    mode: { type: String, enum: ["live", "demo"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

healthReportSchema.index({ projectId: 1, createdAt: -1 });

export const HealthReport = model("HealthReport", healthReportSchema);