import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { organizations, users } from "../db/schema";
import { env } from "../config/env";
import { conflict, unauthorized } from "../lib/http-error";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/tokens";
import { currentUser, requireAuth } from "../middleware/auth";

export const authRouter = Router();

const REFRESH_COOKIE = "ff_refresh";

type UserRow = typeof users.$inferSelect;

function publicUser(user: UserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };
}

// Creates both tokens: access token goes in the response body, refresh token in a cookie
function sendSession(res: Response, user: UserRow, status = 200) {
  const accessToken = signAccessToken({
    id: user.id,
    name: user.name,
    role: user.role,
    orgId: user.organizationId,
  });
  const refreshToken = signRefreshToken(user.id, user.tokenVersion);

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(status).json({ accessToken, user: publicUser(user) });
}

async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

async function findUserById(id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  organizationName: z.string().trim().min(2).max(120),
});

// Sign up = create a new organization and become its admin
authRouter.post("/register", async (req, res) => {
  const body = registerSchema.parse(req.body);

  if (await findUserByEmail(body.email)) throw conflict("Email is already registered");

  const passwordHash = await bcrypt.hash(body.password, 10);

  const userId = await db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({ name: body.organizationName }).$returningId();
    const [user] = await tx
      .insert(users)
      .values({
        name: body.name,
        email: body.email,
        passwordHash,
        role: "ORG_ADMIN",
        organizationId: org.id,
      })
      .$returningId();
    return user.id;
  });

  const user = await findUserById(userId);
  sendSession(res, user, 201);
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await findUserByEmail(body.email);

  // Same message for "no user" and "wrong password" so attackers can't guess emails
  if (!user || !user.isActive || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw unauthorized("Invalid email or password");
  }

  sendSession(res, user);
});

authRouter.post("/refresh", async (req, res) => {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized("No refresh token");

  let payload: { userId: number; tokenVersion: number };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw unauthorized("Refresh token expired, please log in again");
  }

  const user = await findUserById(payload.userId);
  if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
    throw unauthorized("Session is no longer valid");
  }

  sendSession(res, user);
});

authRouter.post("/logout", async (req, res) => {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const { userId } = verifyRefreshToken(token);
      // Invalidates every refresh token this user has
      await db
        .update(users)
        .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
        .where(eq(users.id, userId));
    } catch {
      // Token already invalid, nothing to do
    }
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await findUserById(currentUser(req).id);
  if (!user) throw unauthorized();
  res.json({ user: publicUser(user) });
});