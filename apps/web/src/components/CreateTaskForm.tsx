"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { PRIORITIES, priorityLabel } from "@/lib/labels";
import type { Sprint, Task, TaskDraft, TaskPriority, Teammate } from "@/lib/types";
import { useAppDispatch } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";

interface Props {
  projectId: number;
  teammates: Teammate[];
  sprints: Sprint[];
  // Filled in when the AI drafted this task, so the user can check it before saving
  initial?: TaskDraft;
  onCreated: (task: Task) => void;
  onCancel: () => void;
}

export function CreateTaskForm({ projectId, teammates, sprints, initial, onCreated, onCancel }: Props) {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "MEDIUM");
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId ? String(initial.assigneeId) : "");
  const [sprintId, setSprintId] = useState(initial?.sprintId ? String(initial.sprintId) : "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post<Task>("/tasks", {
        projectId,
        title,
        description: description || null,
        priority,
        assigneeId: assigneeId ? Number(assigneeId) : null,
        sprintId: sprintId ? Number(sprintId) : null,
        dueDate: dueDate || null,
      });
      onCreated(data);
      dispatch(toastAdded(`Created ${data.key}`));
    } catch (err) {
      dispatch(toastAdded(getErrorMessage(err), "error"));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel mb-5 grid gap-4 p-5 md:grid-cols-4">
      {initial && (
        <p className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-dark md:col-span-4">
          AI filled in these details. Check them, then create the task.
        </p>
      )}
      <div className="md:col-span-4">
        <label htmlFor="t-title" className="label">Title</label>
        <input id="t-title" className="input" value={title} required autoFocus
          placeholder="What needs to be done?" onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="md:col-span-4">
        <label htmlFor="t-desc" className="label">Description</label>
        <textarea id="t-desc" className="input" rows={2} value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label htmlFor="t-priority" className="label">Priority</label>
        <select id="t-priority" className="input" value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel[p]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="t-assignee" className="label">Assignee</label>
        <select id="t-assignee" className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
          <option value="">Unassigned</option>
          {teammates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="t-sprint" className="label">Sprint</label>
        <select id="t-sprint" className="input" value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
          <option value="">No sprint</option>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="t-due" className="label">Due date</label>
        <input id="t-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="flex gap-2 md:col-span-4">
        <button className="btn-primary" disabled={saving}>{saving ? "Creating..." : "Create task"}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}