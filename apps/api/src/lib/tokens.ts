import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../db/schema";

export interface AuthUser {
  id: number;
  name: string;
  role: Role;
  orgId: number | null;
}

// Short-lived token sent with every API request
export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ name: user.name, role: user.role, orgId: user.orgId }, env.jwtAccessSecret, {
    subject: String(user.id),
    expiresIn: "15m",
  });
}

export function verifyAccessToken(token: string): AuthUser {
  const payload = jwt.verify(token, env.jwtAccessSecret) as jwt.JwtPayload & {
    name: string;
    role: Role;
    orgId: number | null;
  };
  return { id: Number(payload.sub), name: payload.name, role: payload.role, orgId: payload.orgId };
}

// Long-lived token, kept in an httpOnly cookie, used only to get a new access token
export function signRefreshToken(userId: number, tokenVersion: number): string {
  return jwt.sign({ tv: tokenVersion }, env.jwtRefreshSecret, {
    subject: String(userId),
    expiresIn: "7d",
  });
}

export function verifyRefreshToken(token: string): { userId: number; tokenVersion: number } {
  const payload = jwt.verify(token, env.jwtRefreshSecret) as jwt.JwtPayload & { tv: number };
  return { userId: Number(payload.sub), tokenVersion: payload.tv };
}