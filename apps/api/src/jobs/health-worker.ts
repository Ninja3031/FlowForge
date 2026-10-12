import { Worker } from "bullmq";
import Redis from "ioredis";
import { env } from "../config/env";
import { HealthReport } from "../models/health-report";
import { aiMode } from "../services/ai";
import { generateProjectHealth } from "../services/ai-features";
import { HEALTH_QUEUE, type HealthJobData, type HealthJobResult } from "./health-queue";

// Picks jobs off the queue and runs the slow AI call outside the HTTP request
export function startHealthWorker() {
  const worker = new Worker<HealthJobData, HealthJobResult>(
    HEALTH_QUEUE,
    async (job) => {
      const result = await generateProjectHealth(job.data.projectId);
      const report = await HealthReport.create({
        ...result,
        organizationId: job.data.organizationId,
        projectId: job.data.projectId,
        requestedById: job.data.requestedBy.id,
        requestedByName: job.data.requestedBy.name,
        mode: aiMode,
      });
      return { reportId: String(report._id) };
    },
    {
      // Workers need their own Redis connection because they wait on it
      connection: new Redis(env.redisUrl, { maxRetriesPerRequest: null }),
      concurrency: 2,
    },
  );

  worker.on("completed", (job) => console.log(`Health report job ${job.id} done`));
  worker.on("failed", (job, err) => console.error(`Health report job ${job?.id} failed:`, err.message));

  return worker;
}