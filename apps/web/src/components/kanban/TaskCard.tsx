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
        <span className="text-[11px] font-bold tracking-[0.15em] text-faint">{task.key}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityStyle[task.priority]}`}>
          {priorityLabel[task.priority]}
        </span>
      </div>
      <Link
        href={`/tasks/${task.id}`}
        className="mt-2 block text-sm font-semibold leading-snug text-ink transition-colors hover:text-accent-soft"
      >
        {task.title}
      </Link>
      <div className="mt-4 flex items-center justify-between text-xs text-faint">
        <span>{task.dueDate ? `Due ${task.dueDate}` : ""}</span>
        <span title={task.assigneeName ?? "Unassigned"} className="avatar h-6 w-6 text-[10px]">
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
      className={`cursor-grab rounded-xl border border-line bg-raised p-3.5 transition-[border-color,box-shadow,opacity] duration-300 hover:border-faint/60 hover:shadow-lg hover:shadow-black/40 active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      {/* Inner wrapper fades in when the card first appears (the outer div is moved by drag-and-drop) */}
      <div className="animate-fade-up">
        <TaskCardContent task={task} />
      </div>
    </div>
  );
}