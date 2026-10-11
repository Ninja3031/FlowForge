"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { Project } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";

export default function ProjectsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const canCreate = user?.role === "ORG_ADMIN";

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", key: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<Project[]>("/projects")
      .then((res) => setProjects(res.data))
      .catch((err) => setLoadError(getErrorMessage(err)));
  }, []);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post<Project>("/projects", form);
      setProjects((prev) => [data, ...(prev ?? [])]);
      setForm({ name: "", key: "", description: "" });
      setShowForm(false);
      dispatch(toastAdded(`Created ${data.name}`));
    } catch (err) {
      dispatch(toastAdded(getErrorMessage(err), "error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        {canCreate && !showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>New project</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createProject} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="p-name" className="label">Name</label>
            <input id="p-name" className="input" value={form.name} required
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="p-key" className="label">Key</label>
            <input id="p-key" className="input uppercase" value={form.key} required maxLength={6}
              placeholder="MOB" onChange={(e) => setForm({ ...form, key: e.target.value })} />
            <p className="mt-1 text-xs text-muted">2 to 6 letters. Tasks will be named like MOB-1.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="p-desc" className="label">Description</label>
            <textarea id="p-desc" className="input" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary" disabled={saving}>{saving ? "Creating..." : "Create project"}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {!projects && !loadError && <p className="text-sm text-muted">Loading projects...</p>}

      {projects?.length === 0 && (
        <div className="panel p-10 text-center">
          <p className="font-semibold">No projects yet</p>
          <p className="mt-1 text-sm text-muted">
            {canCreate ? "Create your first project to start adding tasks." : "Ask your org admin to create a project."}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="panel block p-5 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">{project.key}</span>
            <h2 className="mt-3 text-lg font-bold">{project.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{project.description || "No description"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}