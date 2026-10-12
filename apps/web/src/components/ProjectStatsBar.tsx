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
    <div className="panel mb-5 p-4">
      <dl className="flex flex-wrap gap-x-10 gap-y-3">
        {figures.map((f) => (
          <div key={f.label}>
            <dt className="text-xs text-muted">{f.label}</dt>
            <dd className={`text-xl font-bold ${f.alert ? "text-red-600" : ""}`}>{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}