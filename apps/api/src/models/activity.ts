import { Schema, model } from "mongoose";

export const ACTIVITY_ACTIONS = [
  "PROJECT_CREATED",
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_DELETED",
  "COMMENT_ADDED",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

const activitySchema = new Schema(
  {
    organizationId: { type: Number, required: true },
    projectId: { type: Number, required: true },
    taskId: { type: Number },
    userId: { type: Number, required: true },
    userName: { type: String, required: true },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    // Different for every action, which is why this lives in MongoDB
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ projectId: 1, createdAt: -1 });
activitySchema.index({ taskId: 1, createdAt: -1 });

export const Activity = model("Activity", activitySchema);