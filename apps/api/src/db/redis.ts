import Redis from "ioredis";
import { env } from "../config/env";

// For cache, rate limiting and health checks.
// enableOfflineQueue: false = if Redis is down, commands fail right away
// instead of waiting forever, so the app can fall back to the database.
export const redis = new Redis(env.redisUrl, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});

// Stops ioredis from printing a big error every time it tries to reconnect
redis.on("error", () => {});

// BullMQ needs its own connections with different settings (it waits on Redis on purpose)
export function createQueueConnection() {
  return new Redis(env.redisUrl, { maxRetriesPerRequest: null });
}

export async function checkRedis(): Promise<boolean> {
  if (redis.status !== "ready") return false;
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}