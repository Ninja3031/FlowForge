"use client";

import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { AnimatePresence, motion } from "motion/react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/activity";
import type { HealthJobStatus, HealthReport } from "@/lib/types";
import { useAppDispatch } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";

const healthStyle: Record<HealthReport["health"], { label: string; className: string }> = {
  ON_TRACK: { label: "On track", className: "bg-success/15 text-success" },
  AT_RISK: { label: "At risk", className: "bg-accent/15 text-accent-soft" },
  OFF_TRACK: { label: "Off track", className: "bg-danger/15 text-danger" },
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function HealthReportPanel({ projectId }: { projectId: number }) {
  const dispatch = useAppDispatch();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    api
      .get<{ report: HealthReport | null }>(`/ai/project-health/${projectId}/latest`)
      .then((res) => setReport(res.data.report))
      .catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, [projectId]);

  // Start the background job, then check its status every 1.5 seconds
  async function generate() {
    setGenerating(true);
    setOpen(true);
    try {
      const { data } = await api.post<{ jobId: string }>("/ai/project-health", { projectId });
      for (let i = 0; i < 40 && mounted.current; i++) {
        await wait(1500);
        const { data: job } = await api.get<HealthJobStatus>(`/ai/jobs/${data.jobId}`);
        if (job.state === "completed" && job.report) {
          setReport(job.report);
          dispatch(toastAdded("Health report ready"));
          return;
        }
        if (job.state === "failed") throw new Error(job.error ?? "Report failed");
      }
    } catch (err) {
      const message = isAxiosError(err) ? getErrorMessage(err) : (err as Error).message;
      dispatch(toastAdded(message, "error"));
    } finally {
      if (mounted.current) setGenerating(false);
    }
  }

  const style = report ? healthStyle[report.health] : null;

  return (
    <section className="panel mb-5 animate-fade-up p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-bold"><span className="text-accent">✦</span> Project health</h2>
          {report && style && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${style.className}`}>
              {style.label}, {report.score}/100
            </span>
          )}
          {report && (
            <button className="link text-sm" onClick={() => setOpen(!open)}>
              {open ? "Hide details" : "Show details"}
            </button>
          )}
        </div>
        <button className="btn-secondary" onClick={generate} disabled={generating}>
          {generating ? "Generating report..." : report ? "Generate new report" : "Generate report"}
        </button>
      </div>

      {!report && !generating && (
        <p className="mt-2 text-sm text-muted">
          AI reviews overdue work, open priorities and recent activity, then suggests what to do next.
        </p>
      )}

      <AnimatePresence initial={false}>
      {report && open && (
        <motion.div
          key="details"
          className="overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
        <div className="grid gap-6 pt-5 text-sm leading-relaxed md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p>{report.summary}</p>
            <p className="mt-2 text-xs text-faint">
              Requested by {report.requestedByName}, {timeAgo(report.createdAt)}
              {report.mode === "demo" && " (demo mode)"}
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-semibold">Risks</h3>
            {report.risks.length === 0 ? (
              <p className="text-faint">None found</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-muted">{report.risks.map((r) => <li key={r}>{r}</li>)}</ul>
            )}
          </div>
          <div>
            <h3 className="mb-1 font-semibold">Recommendations</h3>
            <ul className="list-disc space-y-1 pl-4 text-muted">{report.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </section>
  );
}