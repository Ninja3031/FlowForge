"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { PRIORITIES, priorityLabel } from "@/lib/labels";
import type { Project, Sprint, Task, TaskDraft, Teammate } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CreateTaskForm } from "@/components/CreateTaskForm";
import { ProjectStatsBar } from "@/components/ProjectStatsBar";
import { AiTaskInput } from "@/components/ai/AiTaskInput";
import { HealthReportPanel } from "@/components/ai/HealthReportPanel";

export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<TaskDraft | undefined>();

  // Filters
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Project, teammates and sprints only need loading once
  useEffect(() => {
    Promise.all([
      api.get<Project>(`/projects/${id}`),
      api.get<Teammate[]>("/users"),
      api.get<Sprint[]>(`/projects/${id}/sprints`),
    ])
      .then(([p, u, s]) => {
        setProject(p.data);
        setTeammates(u.data);
        setSprints(s.data);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  // Tasks reload whenever a filter changes (search waits 300ms after typing stops)
  useEffect(() => {
    let cancelled = false;
    api
      .get<Task[]>("/tasks", {
        params: {
          projectId: id,
          search: debouncedSearch || undefined,
          priority: priority || undefined,
          assigneeId: assigneeId || undefined,
        },
      })
      .then((res) => {
        // Ignore old responses if the filters changed in the meantime
        if (!cancelled) setTasks(res.data);
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id, debouncedSearch, priority, assigneeId]);

    if (error) {
    return (
      <div>
        <p className="text-danger">{error}</p>
        <Link href="/projects" className="link mt-2 inline-block text-sm">Back to projects</Link>
      </div>
    );
  }
  if (!project) return <p className="animate-pulse text-sm text-faint">Loading board...</p>;

  const hasFilters = Boolean(search || priority || assigneeId);

  return (
    <div>
      <Link href="/projects" className="eyebrow transition-colors hover:text-ink">&larr; Projects</Link>
      <div className="mt-3 mb-8">
        <h1 className="display text-5xl sm:text-6xl">{project.name}</h1>
        {project.description && <p className="mt-3 max-w-2xl text-muted">{project.description}</p>}
      </div>

      <ProjectStatsBar projectId={project.id} tasks={tasks} />
      <HealthReportPanel projectId={project.id} />

      {showForm ? (
        <CreateTaskForm
          // A new key resets the form when a new AI draft arrives
          key={draft ? JSON.stringify(draft) : "manual"}
          projectId={project.id}
          teammates={teammates}
          sprints={sprints}
          initial={draft}
          onCreated={(task) => {
            setTasks((prev) => [...prev, task]);
            setShowForm(false);
            setDraft(undefined);
          }}
          onCancel={() => {
            setShowForm(false);
            setDraft(undefined);
          }}
        />
      ) : (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <AiTaskInput
            projectId={project.id}
            onDraft={(d) => {
              setDraft(d);
              setShowForm(true);
            }}
          />
          <button className="btn-primary" onClick={() => setShowForm(true)}>New task</button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search tasks"
          placeholder="Search tasks"
          className="input max-w-xs rounded-full px-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filter by priority" className="input w-auto" value={priority}
          onChange={(e) => setPriority(e.target.value)}>
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel[p]}</option>)}
        </select>
        <select aria-label="Filter by assignee" className="input w-auto" value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}>
          <option value="">Anyone</option>
          {teammates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {hasFilters && (
          <button
            className="link text-sm"
            onClick={() => {
              setSearch("");
              setPriority("");
              setAssigneeId("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <KanbanBoard tasks={tasks} setTasks={setTasks} />
    </div>
  );
}