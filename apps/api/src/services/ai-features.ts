import { and, asc, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { comments, projects, sprints, tasks, users, TASK_PRIORITIES } from "../db/schema";
import { Activity } from "../models/activity";
import { notFound } from "../lib/http-error";
import { askJson } from "./ai";
import { getTaskInOrg, getProjectInOrg } from "./access";
import { getProjectStats } from "./stats";

// ---------- 1. Task summary ----------

const taskSummarySchema = z.object({
  summary: z.string().min(1),
  currentStatus: z.string().min(1),
  blockers: z.array(z.string()),
  nextSteps: z.array(z.string()),
});
export type TaskSummary = z.infer<typeof taskSummarySchema>;

export async function summarizeTask(taskId: number, orgId: number): Promise<TaskSummary> {
  const { task, project } = await getTaskInOrg(taskId, orgId);

  const [taskComments, history] = await Promise.all([
    db
      .select({ author: users.name, body: comments.body, createdAt: comments.createdAt })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.taskId, task.id))
      .orderBy(asc(comments.createdAt))
      .limit(30),
    Activity.find({ taskId: task.id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  const prompt = [
    `Task ${project.key}-${task.number}: ${task.title}`,
    `Status: ${task.status}, priority: ${task.priority}, due: ${task.dueDate ?? "none"}`,
    `Description: ${task.description ?? "(none)"}`,
    "",
    "Comments (oldest first):",
    ...(taskComments.length ? taskComments.map((c) => `- ${c.author}: ${c.body}`) : ["(none)"]),
    "",
    "Recent activity (newest first):",
    ...(history.length
      ? history.map((a) => `- ${a.userName} ${a.action} ${JSON.stringify(a.metadata)}`)
      : ["(none)"]),
  ].join("\n");

  return askJson({
    system:
      "You help software teams understand a task quickly. Summarize it for a teammate who has not seen it. " +
      'Return {"summary": string (2-3 sentences), "currentStatus": string (1 sentence), ' +
      '"blockers": string[] (empty if none), "nextSteps": string[] (1-3 concrete actions)}.',
    prompt,
    schema: taskSummarySchema,
    demo: () => ({
      summary: `${task.title}. This is a ${task.priority.toLowerCase()} priority task with ${taskComments.length} comment(s). (Demo mode: add ANTHROPIC_API_KEY for real AI summaries.)`,
      currentStatus: `Currently ${task.status.replace("_", " ").toLowerCase()}.`,
      blockers: [],
      nextSteps: ["Review the latest comments", "Update the status when work moves forward"],
    }),
  });
}

// ---------- 2. Task draft from plain English ----------

const taskDraftSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  priority: z.enum(TASK_PRIORITIES),
  assigneeName: z.string().nullable(),
  sprintName: z.string().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export interface TaskDraft {
  title: string;
  description: string | null;
  priority: (typeof TASK_PRIORITIES)[number];
  assigneeId: number | null;
  sprintId: number | null;
  dueDate: string | null;
}

function findByName<T extends { name: string }>(items: T[], name: string | null): T | undefined {
  if (!name) return undefined;
  const wanted = name.trim().toLowerCase();
  return (
    items.find((item) => item.name.toLowerCase() === wanted) ??
    items.find((item) => item.name.toLowerCase().split(" ")[0] === wanted.split(" ")[0]) ??
    items.find((item) => item.name.toLowerCase().includes(wanted))
  );
}

// Turns "high priority task for Google OAuth, assign to Rahul" into task fields.
// Nothing is saved here: the user confirms the draft first.
export async function draftTaskFromText(projectId: number, orgId: number, text: string): Promise<TaskDraft> {
  const project = await getProjectInOrg(projectId, orgId);
  const [teammates, projectSprints] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.organizationId, orgId)),
    db.select({ id: sprints.id, name: sprints.name }).from(sprints).where(eq(sprints.projectId, project.id)),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const parsed = await askJson({
    system:
      "You turn a short request into a task for a project management tool. " +
      'Return {"title": string (short, starts with a verb), "description": string or null, ' +
      '"priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT", "assigneeName": string or null (must be one of the teammates), ' +
      '"sprintName": string or null (must be one of the sprints), "dueDate": "YYYY-MM-DD" or null}. ' +
      "Use MEDIUM priority if none is mentioned. Never invent teammates or sprints.",
    prompt: [
      `Today is ${today}.`,
      `Teammates: ${teammates.map((u) => u.name).join(", ") || "(none)"}`,
      `Sprints: ${projectSprints.map((s) => s.name).join(", ") || "(none)"}`,
      "",
      `Request: ${text}`,
    ].join("\n"),
    schema: taskDraftSchema,
    maxTokens: 600,
    demo: () => {
      const lower = text.toLowerCase();
      const priority = TASK_PRIORITIES.find((p) => lower.includes(p.toLowerCase())) ?? "MEDIUM";
      const assignee = teammates.find((u) => lower.includes(u.name.toLowerCase().split(" ")[0]));
      const sprint = projectSprints.find((s) => lower.includes(s.name.toLowerCase()));
      return {
        title: text.trim().slice(0, 120),
        description: "Created in demo mode. Add ANTHROPIC_API_KEY for real AI parsing.",
        priority,
        assigneeName: assignee?.name ?? null,
        sprintName: sprint?.name ?? null,
        dueDate: null,
      };
    },
  });

  // Map names the AI picked back to real ids. Unknown names are dropped, never guessed.
  return {
    title: parsed.title,
    description: parsed.description,
    priority: parsed.priority,
    assigneeId: findByName(teammates, parsed.assigneeName)?.id ?? null,
    sprintId: findByName(projectSprints, parsed.sprintName)?.id ?? null,
    dueDate: parsed.dueDate,
  };
}

// ---------- 3. Project health report (runs in the background worker) ----------

const healthSchema = z.object({
  health: z.enum(["ON_TRACK", "AT_RISK", "OFF_TRACK"]),
  score: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  risks: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type HealthResult = z.infer<typeof healthSchema>;

export async function generateProjectHealth(projectId: number): Promise<HealthResult> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw notFound("Project not found");

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [stats, openTasks, activityLastWeek] = await Promise.all([
    getProjectStats(projectId),
    db
      .select({
        number: tasks.number,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        assignee: users.name,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(eq(tasks.projectId, projectId), ne(tasks.status, "DONE")))
      .orderBy(desc(tasks.priority))
      .limit(40),
    Activity.countDocuments({ projectId, createdAt: { $gte: weekAgo } }),
  ]);

  const prompt = [
    `Project: ${project.name} (${project.key})`,
    `Today: ${new Date().toISOString().slice(0, 10)}`,
    `Stats: ${JSON.stringify(stats)}`,
    `Activity events in the last 7 days: ${activityLastWeek}`,
    "",
    "Open tasks:",
    ...openTasks.map(
      (t) =>
        `- ${project.key}-${t.number} [${t.status}, ${t.priority}] ${t.title} ` +
        `(assignee: ${t.assignee ?? "none"}, due: ${t.dueDate ?? "none"})`,
    ),
  ].join("\n");

  return askJson({
    system:
      "You are a calm, practical delivery lead. Judge the health of a software project from its data. " +
      'Return {"health": "ON_TRACK" | "AT_RISK" | "OFF_TRACK", "score": integer 0-100, ' +
      '"summary": string (2-3 sentences), "risks": string[] (max 4), "recommendations": string[] (max 4, specific)}.',
    prompt,
    schema: healthSchema,
    demo: () => {
      const urgent = stats.openByPriority.URGENT ?? 0;
      const score = Math.max(0, Math.min(100, 100 - stats.overdue * 10 - urgent * 8 - stats.unassignedOpen * 3));
      const health = score >= 75 ? "ON_TRACK" : score >= 50 ? "AT_RISK" : "OFF_TRACK";
      return {
        health,
        score,
        summary: `${stats.total} tasks, ${stats.byStatus.DONE} done, ${stats.overdue} overdue. (Demo mode: add ANTHROPIC_API_KEY for a real AI report.)`,
        risks: [
          ...(stats.overdue ? [`${stats.overdue} task(s) are past their due date`] : []),
          ...(urgent ? [`${urgent} urgent task(s) are still open`] : []),
          ...(stats.unassignedOpen ? [`${stats.unassignedOpen} open task(s) have no assignee`] : []),
        ],
        recommendations: ["Assign every open task", "Review overdue tasks in the next stand-up"],
      };
    },
  });
}