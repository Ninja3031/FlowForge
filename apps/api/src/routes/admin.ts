import { Router } from "express";
import { and, count, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { organizations, projects, ROLES, tasks, users } from "../db/schema";
import { badRequest, notFound } from "../lib/http-error";
import { idSchema } from "../lib/validation";
import { currentUser, requireAuth, requireRole } from "../middleware/auth";
import { Activity } from "../models/activity";
import { HealthReport } from "../models/health-report";

// Everything here is for the platform owner only (used by the Angular admin console)
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("SUPER_ADMIN"));

const userView = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  organizationId: users.organizationId,
  organizationName: organizations.name,
  createdAt: users.createdAt,
};

function toCounts(rows: { key: string; n: number }[]) {
  return Object.fromEntries(rows.map((row) => [row.key, row.n]));
}

// ---- Platform overview ----

adminRouter.get("/stats", async (_req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[orgCount], [userCount], [projectCount], [taskCount], tasksByStatus, usersByRole, activity, aiReports] =
    await Promise.all([
      db.select({ n: count() }).from(organizations),
      db.select({ n: count() }).from(users),
      db.select({ n: count() }).from(projects),
      db.select({ n: count() }).from(tasks),
      db.select({ key: tasks.status, n: count() }).from(tasks).groupBy(tasks.status),
      db.select({ key: users.role, n: count() }).from(users).groupBy(users.role),
      Activity.countDocuments({ createdAt: { $gte: weekAgo } }),
      HealthReport.countDocuments(),
    ]);

  res.json({
    organizations: orgCount.n,
    users: userCount.n,
    projects: projectCount.n,
    tasks: taskCount.n,
    tasksByStatus: toCounts(tasksByStatus),
    usersByRole: toCounts(usersByRole),
    activityLast7Days: activity,
    aiHealthReports: aiReports,
  });
});

// ---- Users ----

const listUsersSchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

adminRouter.get("/users", async (req, res) => {
  const query = listUsersSchema.parse(req.query);

  const filters: SQL[] = [];
  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(or(like(users.name, term), like(users.email, term))!);
  }
  if (query.role) filters.push(eq(users.role, query.role));

  const rows = await db
    .select(userView)
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(query.limit);
  res.json(rows);
});

async function findUser(id: number) {
  const [user] = await db
    .select(userView)
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.id, id));
  if (!user) throw notFound("User not found");
  return user;
}

adminRouter.get("/users/:id", async (req, res) => {
  res.json(await findUser(idSchema.parse(req.params.id)));
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    // Super admin is not handed out from the UI
    role: z.enum(["ORG_ADMIN", "PROJECT_MANAGER", "MEMBER"]),
    isActive: z.boolean(),
  })
  .partial();

adminRouter.patch("/users/:id", async (req, res) => {
  const me = currentUser(req);
  const id = idSchema.parse(req.params.id);
  const body = updateUserSchema.parse(req.body);
  const existing = await findUser(id);

  if (id === me.id && (body.role !== undefined || body.isActive !== undefined)) {
    throw badRequest("You can't change your own role or disable your own account");
  }
  if (body.role && existing.organizationId === null) {
    throw badRequest("This user is not in an organization, so they can't get an organization role");
  }

  // Role change or disabling = log them out everywhere
  const forceLogout =
    (body.role !== undefined && body.role !== existing.role) || body.isActive === false;

  await db
    .update(users)
    .set({ ...body, ...(forceLogout ? { tokenVersion: sql`${users.tokenVersion} + 1` } : {}) })
    .where(eq(users.id, id));

  res.json(await findUser(id));
});

// ---- Organizations and projects ----

adminRouter.get("/organizations", async (_req, res) => {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      createdAt: organizations.createdAt,
      // Subqueries use full table names so MySQL knows which "id" we mean
      memberCount: sql<number>`(select count(*) from users u where u.organization_id = organizations.id)`.mapWith(Number),
      projectCount: sql<number>`(select count(*) from projects p where p.organization_id = organizations.id)`.mapWith(Number),
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));
  res.json(rows);
});

adminRouter.get("/projects", async (_req, res) => {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      key: projects.key,
      organizationName: organizations.name,
      createdAt: projects.createdAt,
      taskCount: sql<number>`(select count(*) from tasks t where t.project_id = projects.id)`.mapWith(Number),
      doneCount: sql<number>`(select count(*) from tasks t where t.project_id = projects.id and t.status = 'DONE')`.mapWith(Number),
    })
    .from(projects)
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .orderBy(desc(projects.createdAt));
  res.json(rows);
});