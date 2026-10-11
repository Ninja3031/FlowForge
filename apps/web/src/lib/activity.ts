import { priorityLabel, statusLabel } from "./labels";
import type { ActivityEntry, TaskPriority, TaskStatus } from "./types";

const fieldNames: Record<string, string> = {
  status: "status",
  priority: "priority",
  assigneeId: "assignee",
  sprintId: "sprint",
  dueDate: "due date",
  title: "title",
  description: "description",
};

function show(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "none";
  if (field === "status") return statusLabel[value as TaskStatus] ?? String(value);
  if (field === "priority") return priorityLabel[value as TaskPriority] ?? String(value);
  return String(value);
}

// Turns a raw activity log entry into a readable sentence
export function describeActivity(entry: ActivityEntry): string {
  const meta = entry.metadata as Record<string, unknown>;
  const taskKey = (meta.taskKey as string) ?? "a task";

  switch (entry.action) {
    case "PROJECT_CREATED":
      return `created the project`;
    case "TASK_CREATED":
      return `created ${taskKey}`;
    case "TASK_DELETED":
      return `deleted ${taskKey}`;
    case "COMMENT_ADDED":
      return `commented on ${taskKey}`;
    case "TASK_UPDATED": {
      const changes = (meta.changes ?? {}) as Record<string, { from: unknown; to: unknown }>;
      const parts = Object.entries(changes).map(([field, change]) => {
        const name = fieldNames[field] ?? field;
        // Long text and id fields read better without the values
        if (field === "description" || field === "assigneeId" || field === "sprintId") {
          return `changed the ${name}`;
        }
        return `changed ${name} from ${show(field, change.from)} to ${show(field, change.to)}`;
      });
      return parts.length > 0 ? `${parts.join(", ")} on ${taskKey}` : `updated ${taskKey}`;
    }
    default:
      return "did something";
  }
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}