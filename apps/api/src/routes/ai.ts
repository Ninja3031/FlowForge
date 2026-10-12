import { Router } from "express";
import { z } from "zod";
import { forbidden, notFound } from "../lib/http-error";
import { idSchema } from "../lib/validation";
import { currentOrgId, currentUser, requireAuth } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import { healthQueue } from "../jobs/health-queue";
import { HealthReport } from "../models/health-report";
import { aiMode } from "../services/ai";
import { getProjectInOrg } from "../services/access";
import { draftTaskFromText, summarizeTask } from "../services/ai-features";

export const aiRouter = Router();
aiRouter.use(requireAuth);

// AI calls cost money, so each user gets 10 per minute
const aiLimit = rateLimit({ name: "ai", limit: 10, windowSeconds: 60 });

aiRouter.get("/status", (_req, res) => {
  res.json({ mode: aiMode });
});

// 1. Summarize a task (fast enough to answer directly)
aiRouter.post("/task-summary", aiLimit, async (req, res) => {
  const { taskId } = z.object({ taskId: idSchema }).parse(req.body);
  res.json(await summarizeTask(taskId, currentOrgId(req)));
});

// 2. Turn plain English into a task draft (the user confirms before it is created)
const draftSchema = z.object({
  projectId: idSchema,
  text: z.string().trim().min(5).max(500),
});

aiRouter.post("/task-draft", aiLimit, async (req, res) => {
  const { projectId, text } = draftSchema.parse(req.body);
  res.json(await draftTaskFromText(projectId, currentOrgId(req), text));
});

// 3. Project health report: slow, so it goes to a background queue
aiRouter.post("/project-health", aiLimit, async (req, res) => {
  const user = currentUser(req);
  const orgId = currentOrgId(req);
  const { projectId } = z.object({ projectId: idSchema }).parse(req.body);
  const project = await getProjectInOrg(projectId, orgId);

  const job = await healthQueue.add("generate", {
    projectId: project.id,
    organizationId: orgId,
    requestedBy: { id: user.id, name: user.name },
  });

  // 202 = "accepted, still working on it"
  res.status(202).json({ jobId: job.id });
});

// The browser polls this until the job is finished
aiRouter.get("/jobs/:jobId", async (req, res) => {
  const orgId = currentOrgId(req);
  const job = await healthQueue.getJob(String(req.params.jobId));
  if (!job) throw notFound("Job not found or expired");
  if (job.data.organizationId !== orgId) throw forbidden();

  const state = await job.getState();
  if (state === "completed" && job.returnvalue) {
    const report = await HealthReport.findById(job.returnvalue.reportId).lean();
    res.json({ state, report });
    return;
  }
  res.json({ state, error: state === "failed" ? job.failedReason : undefined });
});

aiRouter.get("/project-health/:projectId/latest", async (req, res) => {
  const project = await getProjectInOrg(idSchema.parse(req.params.projectId), currentOrgId(req));
  const report = await HealthReport.findOne({ projectId: project.id }).sort({ createdAt: -1 }).lean();
  res.json({ report });
});