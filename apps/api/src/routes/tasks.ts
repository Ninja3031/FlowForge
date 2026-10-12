import { cacheKeys, invalidate } from "../lib/cache";
import { Router } from "express";
import { and, asc, eq, getTableColumns, like, max, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { z } from "zod";
import { db } from "../db/client";
import { comments, tasks, TASK_PRIORITIES, TASK_STATUSES, users } from "../db/schema";
import { dateString, idSchema } from "../lib/validation";
import { currentOrgId, currentUser, requireAuth, requireRole } from "../middleware/auth";
import {
  ensureSprintInProject,
  ensureUserInOrg,
  getProjectInOrg,
  getTaskInOrg,
} from "../services/access";
import { getActivity, logActivity } from "../services/activity";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const assignee = alias(users, "assignee");
const reporter = alias(users, "reporter");

// Task row + assignee/reporter names, in one query
function taskQuery() {
  return db
    .select({
      ...getTableColumns(tasks),
      assigneeName: assignee.name,
      reporterName: reporter.name,
    })
    .from(tasks)
    .leftJoin(assignee, eq(tasks.assigneeId, assignee.id))
    .leftJoin(reporter, eq(tasks.reporterId, reporter.id));
}

type TaskView = Awaited<ReturnType<typeof taskQuery>>[number];

// Adds the human-friendly key, e.g. MOB-12
function withKey(task: TaskView, projectKey: string) {
  return { ...task, key: `${projectKey}-${task.number}` };
}

async function loadTask(taskId: number, projectKey: string) {
  const [task] = await taskQuery().where(eq(tasks.id, taskId));
  return withKey(task, projectKey);
}

// ---- List ----

const listSchema = z.object({
  projectId: idSchema,
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: idSchema.optional(),
  sprintId: idSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

tasksRouter.get("/", async (req, res) => {
  const query = listSchema.parse(req.query);
  const project = await getProjectInOrg(query.projectId, currentOrgId(req));

  const filters: SQL[] = [eq(tasks.projectId, project.id)];
  if (query.status) filters.push(eq(tasks.status, query.status));
  if (query.priority) filters.push(eq(tasks.priority, query.priority));
  if (query.assigneeId) filters.push(eq(tasks.assigneeId, query.assigneeId));
  if (query.sprintId) filters.push(eq(tasks.sprintId, query.sprintId));
  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(or(like(tasks.title, term), like(tasks.description, term))!);
  }

  const rows = await taskQuery()
    .where(and(...filters))
    .orderBy(asc(tasks.position), asc(tasks.id));
  res.json(rows.map((task) => withKey(task, project.key)));
});

// ---- Create ----

const taskFields = {
  title: z.string().trim().min(2).max(255),
  description: z.string().trim().max(10000).nullable(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assigneeId: idSchema.nullable(),
  sprintId: idSchema.nullable(),
  dueDate: dateString.nullable(),
};

const createTaskSchema = z.object({
  projectId: idSchema,
  title: taskFields.title,
  description: taskFields.description.optional(),
  status: taskFields.status.optional(),
  priority: taskFields.priority.optional(),
  assigneeId: taskFields.assigneeId.optional(),
  sprintId: taskFields.sprintId.optional(),
  dueDate: taskFields.dueDate.optional(),
});

tasksRouter.post("/", async (req, res) => {
  const user = currentUser(req);
  const orgId = currentOrgId(req);
  const body = createTaskSchema.parse(req.body);
  const project = await getProjectInOrg(body.projectId, orgId);

  if (body.assigneeId) await ensureUserInOrg(body.assigneeId, orgId);
  if (body.sprintId) await ensureSprintInProject(body.sprintId, project.id);

  const status = body.status ?? "TODO";

  const taskId = await db.transaction(async (tx) => {
    // Next task number in this project (MOB-1, MOB-2, ...)
    const [{ maxNumber }] = await tx
      .select({ maxNumber: max(tasks.number) })
      .from(tasks)
      .where(eq(tasks.projectId, project.id));

    // New tasks go to the bottom of their column
    const [{ maxPosition }] = await tx
      .select({ maxPosition: max(tasks.position) })
      .from(tasks)
      .where(and(eq(tasks.projectId, project.id), eq(tasks.status, status)));

    const [created] = await tx
      .insert(tasks)
      .values({
        ...body,
        status,
        projectId: project.id,
        number: (maxNumber ?? 0) + 1,
        position: (maxPosition ?? 0) + 1000,
        reporterId: user.id,
      })
      .$returningId();
    return created.id;
  });

  const task = await loadTask(taskId, project.key);
  invalidate(cacheKeys.projectStats(project.id));
  logActivity({
    user,
    organizationId: orgId,
    projectId: project.id,
    taskId: task.id,
    action: "TASK_CREATED",
    metadata: { taskKey: task.key, title: task.title },
  });
  res.status(201).json(task);
});

// ---- Read ----

tasksRouter.get("/:id", async (req, res) => {
  const { task, project } = await getTaskInOrg(idSchema.parse(req.params.id), currentOrgId(req));
  res.json(await loadTask(task.id, project.key));
});

// ---- Update (also used for drag-and-drop: status + position) ----

const updateTaskSchema = z.object({ ...taskFields, position: z.number() }).partial();

tasksRouter.patch("/:id", async (req, res) => {
  const user = currentUser(req);
  const orgId = currentOrgId(req);
  const { task, project } = await getTaskInOrg(idSchema.parse(req.params.id), orgId);
  const body = updateTaskSchema.parse(req.body);

  if (body.assigneeId) await ensureUserInOrg(body.assigneeId, orgId);
  if (body.sprintId) await ensureSprintInProject(body.sprintId, project.id);

  // Work out what actually changed, for the activity log
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [field, value] of Object.entries(body)) {
    const oldValue = task[field as keyof typeof task];
    if (field !== "position" && oldValue !== value) {
      changes[field] = { from: oldValue, to: value };
    }
  }

  if (Object.keys(body).length > 0) {
    await db.update(tasks).set(body).where(eq(tasks.id, task.id));
  }

  const updated = await loadTask(task.id, project.key);
  invalidate(cacheKeys.projectStats(project.id));
  if (Object.keys(changes).length > 0) {
    logActivity({
      user,
      organizationId: orgId,
      projectId: project.id,
      taskId: task.id,
      action: "TASK_UPDATED",
      metadata: { taskKey: updated.key, changes },
    });
  }
  res.json(updated);
});

// ---- Delete ----

tasksRouter.delete("/:id", requireRole("ORG_ADMIN", "PROJECT_MANAGER"), async (req, res) => {
  const user = currentUser(req);
  const orgId = currentOrgId(req);
  const { task, project } = await getTaskInOrg(idSchema.parse(req.params.id), orgId);

  await db.delete(tasks).where(eq(tasks.id, task.id));
  invalidate(cacheKeys.projectStats(project.id));
  logActivity({
    user,
    organizationId: orgId,
    projectId: project.id,
    taskId: task.id,
    action: "TASK_DELETED",
    metadata: { taskKey: `${project.key}-${task.number}`, title: task.title },
  });
  res.status(204).end();
});

// ---- Comments ----

tasksRouter.get("/:id/comments", async (req, res) => {
  const { task } = await getTaskInOrg(idSchema.parse(req.params.id), currentOrgId(req));
  const rows = await db
    .select({ ...getTableColumns(comments), authorName: users.name })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.taskId, task.id))
    .orderBy(asc(comments.createdAt), asc(comments.id));
  res.json(rows);
});

const commentSchema = z.object({ body: z.string().trim().min(1).max(5000) });

tasksRouter.post("/:id/comments", async (req, res) => {
  const user = currentUser(req);
  const orgId = currentOrgId(req);
  const { task, project } = await getTaskInOrg(idSchema.parse(req.params.id), orgId);
  const { body } = commentSchema.parse(req.body);

  const [created] = await db
    .insert(comments)
    .values({ taskId: task.id, authorId: user.id, body })
    .$returningId();

  logActivity({
    user,
    organizationId: orgId,
    projectId: project.id,
    taskId: task.id,
    action: "COMMENT_ADDED",
    metadata: { taskKey: `${project.key}-${task.number}`, preview: body.slice(0, 100) },
  });

  const [comment] = await db
    .select({ ...getTableColumns(comments), authorName: users.name })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.id, created.id));
  res.status(201).json(comment);
});

// ---- Activity (from MongoDB) ----

tasksRouter.get("/:id/activity", async (req, res) => {
  const { task } = await getTaskInOrg(idSchema.parse(req.params.id), currentOrgId(req));
  res.json(await getActivity({ taskId: task.id }));
});