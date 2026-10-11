"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { PRIORITIES, priorityLabel } from "@/lib/labels";
import type { Project, Sprint, Task, Teammate } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CreateTaskForm } from "@/components/CreateTaskForm";

export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

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
        <p className="text-red-600">{error}</p>
        <Link href="/projects" className="mt-2 inline-block text-sm font-semibold text-accent">Back to projects</Link>
      </div>
    );
  }
  if (!project) return <p className="text-sm text-muted">Loading board...</p>;

  const hasFilters = Boolean(search || priority || assigneeId);

  return (
    <div>
      <Link href="/projects" className="text-sm font-medium text-muted hover:text-ink">Projects</Link>
      <div className="mt-1 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          {project.description && <p className="text-sm text-muted">{project.description}</p>}
        </div>
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>New task</button>}
      </div>

      {showForm && (
        <CreateTaskForm
          projectId={project.id}
          teammates={teammates}
          sprints={sprints}
          onCreated={(task) => {
            setTasks((prev) => [...prev, task]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search tasks"
          placeholder="Search tasks"
          className="input max-w-xs"
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
            className="text-sm font-semibold text-accent hover:underline"
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