import { Queue } from "bullmq";
import { createQueueConnection } from "../db/redis";

export const HEALTH_QUEUE = "project-health";

export interface HealthJobData {
  projectId: number;
  organizationId: number;
  requestedBy: { id: number; name: string };
}

export interface HealthJobResult {
  reportId: string;
}

// Jobs are stored in Redis until a worker picks them up
export const healthQueue = new Queue<HealthJobData, HealthJobResult>(HEALTH_QUEUE, {
  connection: createQueueConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { age: 60 * 60 }, // keep finished jobs for 1 hour
    removeOnFail: { age: 24 * 60 * 60 },
  },
});