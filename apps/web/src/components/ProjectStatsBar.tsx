"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProjectStats, Task } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";

// Stats come from a Redis-cached endpoint. They reload shortly after the board changes.
export function ProjectStatsBar({ projectId, tasks }: { projectId: number; tasks: Task[] }) {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const settledTasks = useDebounce(tasks, 800);

  useEffect(() => {
    api
      .get<ProjectStats>(`/projects/${projectId}/stats`)
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, [projectId, settledTasks]);

  if (!stats) return null;

  const done = stats.byStatus.DONE;
  const percent = stats.total ? Math.round((done / stats.total) * 100) : 0;

  const figures = [
    { label: "Tasks", value: stats.total },
    { label: "Done", value: `${percent}%` },
    { label: "Overdue", value: stats.overdue, alert: stats.overdue > 0 },
    { label: "Unassigned", value: stats.unassignedOpen },
  ];

    return (
    <div className="panel mb-5 animate-fade-up p-5">
      <dl className="flex flex-wrap gap-x-10 gap-y-3">
        {figures.map((f) => (
          <div key={f.label}>
            <dt className="eyebrow">{f.label}</dt>
            <dd className={`display mt-1 text-3xl ${f.alert ? "text-danger" : ""}`}>{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-raised" aria-hidden>
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-glow transition-[width] duration-1000 ease-out-soft"
          style={{ width: `${percent}%`, boxShadow: "0 0 12px var(--color-accent)" }}
        />
      </div>
    </div>
  );
}
