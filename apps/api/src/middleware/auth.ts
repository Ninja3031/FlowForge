import type { Request, RequestHandler } from "express";
import { verifyAccessToken, type AuthUser } from "../lib/tokens";
import { forbidden, unauthorized } from "../lib/http-error";
import type { Role } from "../db/schema";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized();

  try {
    req.user = verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    throw unauthorized("Session expired, please log in again");
  }
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

// Most routes only make sense for a user inside an organization
export function currentOrgId(req: Request): number {
  const user = currentUser(req);
  if (user.orgId === null) throw forbidden("You are not part of an organization");
  return user.orgId;
}