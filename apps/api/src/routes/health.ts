import { Router } from "express";
import { checkMysql } from "../db/mysql";
import { checkMongo } from "../db/mongo";
import { checkRedis } from "../db/redis";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const [mysql, redis] = await Promise.all([checkMysql(), checkRedis()]);
  const mongo = checkMongo();
  const ok = mysql && mongo && redis;

  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    services: { mysql, mongo, redis },
  });
});