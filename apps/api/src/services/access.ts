import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { projects, sprints, tasks, users } from "../db/schema";
import { badRequest, notFound } from "../lib/http-error";

// We return 404 (not 403) for other orgs' data, so we don't reveal that it exists

export async function getProjectInOrg(projectId: number, orgId: number) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)))
    .limit(1);
  if (!project) throw notFound("Project not found");
  return project;
}

export async function getTaskInOrg(taskId: number, orgId: number) {
  const [row] = await db
    .select({ task: tasks, project: projects })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.id, taskId), eq(projects.organizationId, orgId)))
    .limit(1);
  if (!row) throw notFound("Task not found");
  return row;
}

export async function ensureUserInOrg(userId: number, orgId: number) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, orgId)))
    .limit(1);
  if (!user) throw badRequest("Assignee is not part of your organization");
}

export async function ensureSprintInProject(sprintId: number, projectId: number) {
  const [sprint] = await db
    .select({ id: sprints.id })
    .from(sprints)
    .where(and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)))
    .limit(1);
  if (!sprint) throw badRequest("Sprint does not belong to this project");
}