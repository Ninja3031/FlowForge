"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { statusColor, statusLabel } from "@/lib/labels";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "./TaskCard";

export function KanbanColumn({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  // The column itself is a drop target, so empty columns can receive cards
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });

  return (
    <section className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg bg-slate-100">
      <div className={`h-1 ${statusColor[status]}`} />
      <header className="flex items-center justify-between px-3 py-2.5">
        <h2 className="text-sm font-bold">{statusLabel[status]}</h2>
        <span className="text-xs font-semibold text-muted">{tasks.length}</span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-32 flex-1 flex-col gap-2 px-2 pb-3 ${isOver ? "bg-slate-200/60" : ""}`}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}