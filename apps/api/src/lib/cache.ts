import { redis } from "../db/redis";

export const cacheKeys = {
  projectStats: (projectId: number) => `cache:project:${projectId}:stats`,
};

// Read-through cache: return the cached value, or load it and store it for `ttlSeconds`.
// If Redis is down we still answer from the database, just without caching.
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<{ data: T; hit: boolean }> {
  try {
    const stored = await redis.get(key);
    if (stored) return { data: JSON.parse(stored) as T, hit: true };
  } catch (err) {
    console.error("Cache read failed:", err);
  }

  const data = await load();
  redis.set(key, JSON.stringify(data), "EX", ttlSeconds).catch((err) => {
    console.error("Cache write failed:", err);
  });
  return { data, hit: false };
}

// Call this whenever the underlying data changes
export function invalidate(...keys: string[]): void {
  if (keys.length === 0) return;
  redis.del(...keys).catch((err) => console.error("Cache invalidate failed:", err));
}