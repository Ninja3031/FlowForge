import type { RequestHandler } from "express";
import { redis } from "../db/redis";
import { tooManyRequests } from "../lib/http-error";
import { currentUser } from "./auth";

interface Options {
  name: string;
  limit: number;
  windowSeconds: number;
}

// Fixed-window limiter: each user gets `limit` requests per window, counted in Redis
export function rateLimit({ name, limit, windowSeconds }: Options): RequestHandler {
  return async (req, res, next) => {
    const user = currentUser(req);
    const window = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `ratelimit:${name}:${user.id}:${window}`;

    let count: number;
    try {
      count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
    } catch (err) {
      // If Redis is down, let the request through rather than blocking everyone
      console.error("Rate limiter unavailable:", err);
      return next();
    }

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - count));

    if (count > limit) {
      const secondsLeft = windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);
      res.setHeader("Retry-After", secondsLeft);
      throw tooManyRequests(`Too many AI requests. Try again in ${secondsLeft} seconds.`);
    }
    next();
  };
}