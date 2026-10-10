import {
  mysqlTable,
  int,
  varchar,
  text,
  mysqlEnum,
  timestamp,
  date,
  double,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "PROJECT_MANAGER", "MEMBER"] as const;
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const SPRINT_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED"] as const;

export type Role = (typeof ROLES)[number];

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: mysqlEnum("role", ROLES).notNull().default("MEMBER"),
    organizationId: int("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    // Bumped on logout so old refresh tokens stop working
    tokenVersion: int("token_version").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("users_org_idx").on(t.organizationId)],
);

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    // Short code used in task keys, e.g. "MOB" -> MOB-12
    key: varchar("key", { length: 10 }).notNull(),
    description: text("description"),
    createdById: int("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("projects_org_key_idx").on(t.organizationId, t.key)],
);

export const sprints = mysqlTable(
  "sprints",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    status: mysqlEnum("status", SPRINT_STATUSES).notNull().default("PLANNED"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("sprints_project_idx").on(t.projectId)],
);

export const tasks = mysqlTable(
  "tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sprintId: int("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
    // Per-project number, e.g. 12 in MOB-12
    number: int("number").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", TASK_STATUSES).notNull().default("TODO"),
    priority: mysqlEnum("priority", TASK_PRIORITIES).notNull().default("MEDIUM"),
    // Order inside a Kanban column (lower = higher up)
    position: double("position").notNull().default(0),
    assigneeId: int("assignee_id").references(() => users.id, { onDelete: "set null" }),
    reporterId: int("reporter_id")
      .notNull()
      .references(() => users.id),
    dueDate: date("due_date", { mode: "string" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    uniqueIndex("tasks_project_number_idx").on(t.projectId, t.number),
    index("tasks_project_status_idx").on(t.projectId, t.status),
  ],
);

export const comments = mysqlTable(
  "comments",
  {
    id: int("id").autoincrement().primaryKey(),
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: int("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("comments_task_idx").on(t.taskId)],
);