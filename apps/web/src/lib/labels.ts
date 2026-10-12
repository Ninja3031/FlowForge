import type { Role, TaskPriority, TaskStatus } from "./types";

export const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
export const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const statusLabel: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};

// Colour bar on top of each Kanban column
// Colour of the small dot and glow for each Kanban column
export const statusColor: Record<TaskStatus, string> = {
  TODO: "#8a7e74",
  IN_PROGRESS: "#ff8a3d",
  IN_REVIEW: "#e9c27a",
  DONE: "#9cc79a",
};

export const priorityLabel: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const priorityStyle: Record<TaskPriority, string> = {
  LOW: "bg-ink/5 text-faint",
  MEDIUM: "bg-ink/8 text-muted",
  HIGH: "bg-accent/12 text-accent-soft",
  URGENT: "bg-danger/15 text-danger",
};

export const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  ORG_ADMIN: "Org admin",
  PROJECT_MANAGER: "Project manager",
  MEMBER: "Member",
};

export function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}