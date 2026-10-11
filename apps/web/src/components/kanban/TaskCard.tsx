"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { initials, priorityLabel, priorityStyle } from "@/lib/labels";
import type { Task } from "@/lib/types";

export function TaskCardContent({ task }: { task: Task }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted">{task.key}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${priorityStyle[task.priority]}`}>
          {priorityLabel[task.priority]}
        </span>
      </div>
      <Link href={`/tasks/${task.id}`} className="mt-1.5 block text-sm font-semibold leading-snug hover:text-accent">
        {task.title}
      </Link>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{task.dueDate ? `Due ${task.dueDate}` : ""}</span>
        <span
          title={task.assigneeName ?? "Unassigned"}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-ink"
        >
          {initials(task.assigneeName)}
        </span>
      </div>
    </>
  );
}

export function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`cursor-grab rounded-md border border-line bg-white p-3 active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <TaskCardContent task={task} />
    </div>
  );
}