export type Role = "SUPER_ADMIN" | "ORG_ADMIN" | "PROJECT_MANAGER" | "MEMBER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  organizationId: number | null;
}

export interface SessionResponse {
  accessToken: string;
  user: User;
}

export interface Teammate {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Project {
  id: number;
  organizationId: number;
  name: string;
  key: string;
  description: string | null;
  createdAt: string;
}

export interface Sprint {
  id: number;
  projectId: number;
  name: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  startDate: string | null;
  endDate: string | null;
}

export interface Task {
  id: number;
  key: string;
  projectId: number;
  sprintId: number | null;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  assigneeId: number | null;
  assigneeName: string | null;
  reporterId: number;
  reporterName: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  taskId: number;
  authorId: number;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface ActivityEntry {
  _id: string;
  userName: string;
  action: "PROJECT_CREATED" | "TASK_CREATED" | "TASK_UPDATED" | "TASK_DELETED" | "COMMENT_ADDED";
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProjectStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  openByPriority: Record<TaskPriority, number>;
  overdue: number;
  unassignedOpen: number;
  openByAssignee: { name: string; count: number }[];
}

export interface TaskDraft {
  title: string;
  description: string | null;
  priority: TaskPriority;
  assigneeId: number | null;
  sprintId: number | null;
  dueDate: string | null;
}

export interface TaskSummary {
  summary: string;
  currentStatus: string;
  blockers: string[];
  nextSteps: string[];
}

export interface HealthReport {
  _id: string;
  health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
  score: number;
  summary: string;
  risks: string[];
  recommendations: string[];
  requestedByName: string;
  mode: "live" | "demo";
  createdAt: string;
}

export interface HealthJobStatus {
  state: "waiting" | "active" | "completed" | "failed" | "delayed" | "prioritized" | "unknown";
  report?: HealthReport;
  error?: string;
}