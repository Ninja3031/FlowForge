import { and, count, eq, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "../db/client";
import { tasks, users } from "../db/schema";

export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
  openByPriority: Record<string, number>;
  overdue: number;
  unassignedOpen: number;
  openByAssignee: { name: string; count: number }[];
}

export async function getProjectStats(projectId: number): Promise<ProjectStats> {
  const today = new Date().toISOString().slice(0, 10);
  const inProject = eq(tasks.projectId, projectId);
  const open = and(inProject, ne(tasks.status, "DONE"));

  const [statusRows, priorityRows, [overdueRow], [unassignedRow], assigneeRows] = await Promise.all([
    db.select({ key: tasks.status, n: count() }).from(tasks).where(inProject).groupBy(tasks.status),
    db.select({ key: tasks.priority, n: count() }).from(tasks).where(open).groupBy(tasks.priority),
    db.select({ n: count() }).from(tasks).where(and(open, lt(tasks.dueDate, today))),
    db.select({ n: count() }).from(tasks).where(and(open, isNull(tasks.assigneeId))),
    db
      .select({ name: users.name, n: count() })
      .from(tasks)
      .innerJoin(users, eq(tasks.assigneeId, users.id))
      .where(open)
      .groupBy(users.id, users.name)
      .orderBy(sql`count(*) desc`),
  ]);

  const byStatus: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
  for (const row of statusRows) byStatus[row.key] = row.n;

  const openByPriority: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  for (const row of priorityRows) openByPriority[row.key] = row.n;

  return {
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    byStatus,
    openByPriority,
    overdue: overdueRow.n,
    unassignedOpen: unassignedRow.n,
    openByAssignee: assigneeRows.map((row) => ({ name: row.name, count: row.n })),
  };
}