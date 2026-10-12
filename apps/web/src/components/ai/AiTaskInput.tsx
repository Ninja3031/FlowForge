"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { TaskDraft } from "@/lib/types";
import { useAppDispatch } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";

// The user describes a task in plain English. AI fills in the form, the user confirms.
export function AiTaskInput({ projectId, onDraft }: { projectId: number; onDraft: (draft: TaskDraft) => void }) {
  const dispatch = useAppDispatch();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post<TaskDraft>("/ai/task-draft", { projectId, text });
      onDraft(data);
      setText("");
    } catch (err) {
      dispatch(toastAdded(getErrorMessage(err), "error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 gap-2">
      <input
        aria-label="Describe a task for AI"
        className="input"
        placeholder='Try: "Urgent task to fix login crash, assign to Vikram, due Friday"'
        value={text}
        onChange={(e) => setText(e.target.value)}
        minLength={5}
        required
      />
      <button className="btn-secondary shrink-0" disabled={loading}>
        {loading ? "Drafting..." : "Draft with AI"}
      </button>
    </form>
  );
}