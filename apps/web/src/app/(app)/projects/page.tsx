"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { Project } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";

const ease = [0.22, 1, 0.36, 1] as const;

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
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h1 className="display mt-3 text-5xl sm:text-7xl">Projects</h1>
        </div>
        {canCreate && !showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>New project</button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={createProject}
            className="panel mb-8 grid gap-4 overflow-hidden p-6 sm:grid-cols-[2fr_1fr]"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <div>
              <label htmlFor="p-name" className="label">Name</label>
              <input id="p-name" className="input" value={form.name} required
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="p-key" className="label">Key</label>
              <input id="p-key" className="input uppercase" value={form.key} required maxLength={6}
                placeholder="MOB" onChange={(e) => setForm({ ...form, key: e.target.value })} />
              <p className="mt-1 text-xs text-faint">2 to 6 letters. Tasks will be named like MOB-1.</p>
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
          </motion.form>
        )}
      </AnimatePresence>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      {!projects && !loadError && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel h-40 animate-pulse bg-surface/60" />
          ))}
        </div>
      )}

      {projects?.length === 0 && (
        <div className="panel p-12 text-center">
          <p className="text-lg font-semibold">No projects yet</p>
          <p className="mt-1 text-sm text-muted">
            {canCreate ? "Create your first project to start adding tasks." : "Ask your org admin to create a project."}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.07, ease }}
          >
            <Link
              href={`/projects/${project.id}`}
              className="panel group relative block h-full overflow-hidden p-6 transition-all duration-500 ease-out-soft hover:-translate-y-1 hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {/* Glow that appears on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: "radial-gradient(circle, rgb(255 138 61 / 0.35), transparent 70%)" }}
              />
              <span className="relative text-xs font-bold tracking-[0.2em] text-accent-soft">{project.key}</span>
              <h2 className="display relative mt-4 text-3xl">{project.name}</h2>
              <p className="relative mt-2 line-clamp-2 text-sm text-muted">{project.description || "No description"}</p>
              <span className="relative mt-6 inline-block text-sm font-semibold text-faint transition-colors group-hover:text-ink">
                Open board &rarr;
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}