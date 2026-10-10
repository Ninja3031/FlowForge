import Redis from "ioredis";
import { env } from "../config/env";

export const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null });

export async function checkRedis(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}