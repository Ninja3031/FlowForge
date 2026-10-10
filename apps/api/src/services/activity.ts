import { Activity, type ActivityAction } from "../models/activity";
import type { AuthUser } from "../lib/tokens";

interface LogInput {
  user: AuthUser;
  organizationId: number;
  projectId: number;
  taskId?: number;
  action: ActivityAction;
  metadata?: Record<string, unknown>;
}

// Fire-and-forget: a failed log should never break the user's request
export function logActivity(input: LogInput): void {
  Activity.create({
    organizationId: input.organizationId,
    projectId: input.projectId,
    taskId: input.taskId,
    userId: input.user.id,
    userName: input.user.name,
    action: input.action,
    metadata: input.metadata ?? {},
  }).catch((err) => console.error("Failed to log activity:", err));
}

export function getActivity(filter: { projectId?: number; taskId?: number }, limit = 50) {
  return Activity.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
}