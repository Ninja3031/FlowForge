"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { TaskSummary } from "@/lib/types";

export function TaskSummaryCard({ taskId }: { taskId: number }) {
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function summarize() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post<TaskSummary>("/ai/task-summary", { taskId });
      setSummary(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold"><span className="text-accent">✦</span> AI summary</h2>
        <button className="btn-secondary" onClick={summarize} disabled={loading}>
          {loading ? "Reading the thread..." : summary ? "Refresh summary" : "Summarize task"}
        </button>
      </div>

      {!summary && !loading && !error && (
        <p className="mt-2 text-sm text-muted">Get the status, blockers and next steps from the description and comments.</p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {summary && (
        <motion.div
          key={summary.summary}
          className="mt-4 space-y-3 text-sm leading-relaxed"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p>{summary.summary}</p>
          <p className="text-muted">{summary.currentStatus}</p>
          {summary.blockers.length > 0 && (
            <div>
              <h3 className="font-semibold">Blockers</h3>
              <ul className="list-disc pl-4 text-muted">{summary.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          )}
          <div>
            <h3 className="font-semibold">Next steps</h3>
            <ul className="list-disc pl-4 text-muted">{summary.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </motion.div>
      )}
    </section>
  );
}