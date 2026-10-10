import { Router } from "express";
import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { users } from "../db/schema";
import { conflict } from "../lib/http-error";
import { currentOrgId, requireAuth, requireRole } from "../middleware/auth";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const userColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
};

// Teammates in my organization (used for the assignee dropdown)
usersRouter.get("/", async (req, res) => {
  const orgId = currentOrgId(req);
  const rows = await db
    .select(userColumns)
    .from(users)
    .where(eq(users.organizationId, orgId))
    .orderBy(asc(users.name));
  res.json(rows);
});

const addMemberSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["ORG_ADMIN", "PROJECT_MANAGER", "MEMBER"]).default("MEMBER"),
});

// Org admin adds a teammate directly (simple version of "invite")
usersRouter.post("/", requireRole("ORG_ADMIN"), async (req, res) => {
  const orgId = currentOrgId(req);
  const body = addMemberSchema.parse(req.body);

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email));
  if (existing) throw conflict("Email is already registered");

  const [created] = await db
    .insert(users)
    .values({
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 10),
      role: body.role,
      organizationId: orgId,
    })
    .$returningId();

  res.status(201).json({ id: created.id, name: body.name, email: body.email, role: body.role });
});