"use client";

import { TaskSummaryCard } from "@/components/ai/TaskSummaryCard";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { describeActivity, timeAgo } from "@/lib/activity";
import { PRIORITIES, STATUSES, initials, priorityLabel, statusLabel } from "@/lib/labels";
import type { ActivityEntry, Comment, Sprint, Task, Teammate } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const canDelete = user?.role === "ORG_ADMIN" || user?.role === "PROJECT_MANAGER";

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const loadActivity = useCallback(() => {
    api.get<ActivityEntry[]>(`/tasks/${id}/activity`).then((res) => setActivity(res.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    Promise.all([
      api.get<Task>(`/tasks/${id}`),
      api.get<Comment[]>(`/tasks/${id}/comments`),
      api.get<Teammate[]>("/users"),
    ])
      .then(async ([t, c, u]) => {
        setTask(t.data);
        setTitle(t.data.title);
        setDescription(t.data.description ?? "");
        setComments(c.data);
        setTeammates(u.data);
        const s = await api.get<Sprint[]>(`/projects/${t.data.projectId}/sprints`);
        setSprints(s.data);
      })
      .catch((err) => setError(getErrorMessage(err)));
    loadActivity();
  }, [id, loadActivity]);

  async function update(changes: Partial<Task>, message?: string) {
    try {
      const { data } = await api.patch<Task>(`/tasks/${id}`, changes);
      setTask(data);
      if (message) dispatch(toastAdded(message));
      loadActivity();
    } catch (err) {
      dispatch(toastAdded(getErrorMessage(err), "error"));
    }
  }

  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    await update({ title, description: description || null }, "Saved changes");
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!commentBody.trim()) return;
    setPostingComment(true);
    try {
      const { data } = await api.post<Comment>(`/tasks/${id}/comments`, { body: commentBody });
      setComments((prev) => [...prev, data]);
      setCommentBody("");
      loadActivity();
    } catch (err) {
      dispatch(toastAdded(getErrorMessage(err), "error"));
    } finally {
      setPostingComment(false);
    }
  }

  async function deleteTask() {
    if (!task || !confirm(`Delete ${task.key}? This can't be undone.`)) return;
    try {
      await api.delete(`/tasks/${id}`);
      dispatch(toastAdded(`Deleted ${task.key}`));
      router.push(`/projects/${task.projectId}`);
    } catch (err) {
      dispatch(toastAdded(getErrorMessage(err), "error"));
    }
  }

  if (error) {
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <Link href="/projects" className="mt-2 inline-block text-sm font-semibold text-accent">Back to projects</Link>
      </div>
    );
  }
  if (!task) return <p className="text-sm text-muted">Loading task...</p>;

  const detailsChanged = title !== task.title || description !== (task.description ?? "");

  return (
    <div>
      <Link href={`/projects/${task.projectId}`} className="text-sm font-medium text-muted hover:text-ink">
        Back to board
      </Link>

      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column: details and comments */}
        <div className="space-y-6">
          <form onSubmit={saveDetails} className="panel space-y-4 p-5">
            <span className="text-sm font-bold text-muted">{task.key}</span>
            <input aria-label="Title" className="input text-lg font-bold" value={title}
              onChange={(e) => setTitle(e.target.value)} required />
            <div>
              <label htmlFor="desc" className="label">Description</label>
              <textarea id="desc" className="input" rows={6} value={description}
                placeholder="Add more detail, links or acceptance criteria"
                onChange={(e) => setDescription(e.target.value)} />
            </div>
            {detailsChanged && <button className="btn-primary">Save changes</button>}
            <TaskSummaryCard taskId={task.id} />
          </form>

          <section className="panel p-5">
            <h2 className="mb-4 font-bold">Comments</h2>
            {comments.length === 0 && <p className="mb-4 text-sm text-muted">No comments yet. Start the discussion.</p>}
            <ul className="mb-4 space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">
                    {initials(comment.authorName)}
                  </span>
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">{comment.authorName}</span>{" "}
                      <span className="text-muted">{timeAgo(comment.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 text-sm whitespace-pre-wrap">{comment.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <form onSubmit={addComment} className="space-y-2">
              <textarea aria-label="Write a comment" className="input" rows={3} value={commentBody}
                placeholder="Write a comment" onChange={(e) => setCommentBody(e.target.value)} />
              <button className="btn-primary" disabled={postingComment || !commentBody.trim()}>
                {postingComment ? "Posting..." : "Post comment"}
              </button>
            </form>
          </section>
        </div>

        {/* Side column: fields and activity */}
        <aside className="space-y-6">
          <div className="panel space-y-4 p-5">
            <div>
              <label htmlFor="status" className="label">Status</label>
              <select id="status" className="input" value={task.status}
                onChange={(e) => update({ status: e.target.value as Task["status"] })}>
                {STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="label">Priority</label>
              <select id="priority" className="input" value={task.priority}
                onChange={(e) => update({ priority: e.target.value as Task["priority"] })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel[p]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="assignee" className="label">Assignee</label>
              <select id="assignee" className="input" value={task.assigneeId ?? ""}
                onChange={(e) => update({ assigneeId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Unassigned</option>
                {teammates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sprint" className="label">Sprint</label>
              <select id="sprint" className="input" value={task.sprintId ?? ""}
                onChange={(e) => update({ sprintId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">No sprint</option>
                {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="due" className="label">Due date</label>
              <input id="due" type="date" className="input" value={task.dueDate ?? ""}
                onChange={(e) => update({ dueDate: e.target.value || null })} />
            </div>
            <p className="text-xs text-muted">Reported by {task.reporterName ?? "unknown"}</p>
            {canDelete && (
              <button onClick={deleteTask} className="text-sm font-semibold text-red-600 hover:underline">
                Delete task
              </button>
            )}
          </div>

          <div className="panel p-5">
            <h2 className="mb-3 font-bold">Activity</h2>
            {activity.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
            <ol className="space-y-3">
              {activity.map((entry) => (
                <li key={entry._id} className="border-l-2 border-line pl-3 text-sm">
                  <span className="font-semibold">{entry.userName}</span> {describeActivity(entry)}
                  <p className="text-xs text-muted">{timeAgo(entry.createdAt)}</p>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}