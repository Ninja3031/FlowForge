import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { projects, sprints, SPRINT_STATUSES } from "../db/schema";
import { conflict } from "../lib/http-error";
import { dateString, idSchema } from "../lib/validation";
import { currentOrgId, currentUser, requireAuth, requireRole } from "../middleware/auth";
import { getProjectInOrg } from "../services/access";
import { getActivity, logActivity } from "../services/activity";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,6}$/, "Key must be 2-6 letters, e.g. MOB"),
  description: z.string().trim().max(5000).optional(),
});

const updateProjectSchema = createProjectSchema.omit({ key: true }).partial();

projectsRouter.get("/", async (req, res) => {
  const orgId = currentOrgId(req);
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, orgId))
    .orderBy(desc(projects.createdAt));
  res.json(rows);
});

projectsRouter.post("/", requireRole("ORG_ADMIN"), async (req, res) => {
  const user = currentUser(req);
  const orgId = currentOrgId(req);
  const body = createProjectSchema.parse(req.body);

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.organizationId, orgId), eq(projects.key, body.key)));
  if (existing) throw conflict(`Project key ${body.key} is already used`);

  const [created] = await db
    .insert(projects)
    .values({ ...body, organizationId: orgId, createdById: user.id })
    .$returningId();

  const project = await getProjectInOrg(created.id, orgId);
  logActivity({
    user,
    organizationId: orgId,
    projectId: project.id,
    action: "PROJECT_CREATED",
    metadata: { name: project.name, key: project.key },
  });
  res.status(201).json(project);
});

projectsRouter.get("/:id", async (req, res) => {
  const project = await getProjectInOrg(idSchema.parse(req.params.id), currentOrgId(req));
  res.json(project);
});

projectsRouter.patch("/:id", requireRole("ORG_ADMIN", "PROJECT_MANAGER"), async (req, res) => {
  const orgId = currentOrgId(req);
  const project = await getProjectInOrg(idSchema.parse(req.params.id), orgId);
  const body = updateProjectSchema.parse(req.body);

  if (Object.keys(body).length > 0) {
    await db.update(projects).set(body).where(eq(projects.id, project.id));
  }
  res.json(await getProjectInOrg(project.id, orgId));
});

projectsRouter.delete("/:id", requireRole("ORG_ADMIN"), async (req, res) => {
  const project = await getProjectInOrg(idSchema.parse(req.params.id), currentOrgId(req));
  await db.delete(projects).where(eq(projects.id, project.id));
  res.status(204).end();
});

// ---- Sprints ----

projectsRouter.get("/:id/sprints", async (req, res) => {
  const project = await getProjectInOrg(idSchema.parse(req.params.id), currentOrgId(req));
  const rows = await db
    .select()
    .from(sprints)
    .where(eq(sprints.projectId, project.id))
    .orderBy(asc(sprints.createdAt));
  res.json(rows);
});

const createSprintSchema = z.object({
  name: z.string().trim().min(2).max(120),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  status: z.enum(SPRINT_STATUSES).optional(),
});

projectsRouter.post(
  "/:id/sprints",
  requireRole("ORG_ADMIN", "PROJECT_MANAGER"),
  async (req, res) => {
    const project = await getProjectInOrg(idSchema.parse(req.params.id), currentOrgId(req));
    const body = createSprintSchema.parse(req.body);

    const [created] = await db
      .insert(sprints)
      .values({ ...body, projectId: project.id })
      .$returningId();
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, created.id));
    res.status(201).json(sprint);
  },
);

// ---- Activity (from MongoDB) ----

projectsRouter.get("/:id/activity", async (req, res) => {
  const project = await getProjectInOrg(idSchema.parse(req.params.id), currentOrgId(req));
  res.json(await getActivity({ projectId: project.id }));
});