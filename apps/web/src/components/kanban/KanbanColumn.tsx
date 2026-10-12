"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { statusColor, statusLabel } from "@/lib/labels";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "./TaskCard";

export function KanbanColumn({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  // The column itself is a drop target, so empty columns can receive cards
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const color = statusColor[status];

  return (
    <section
      className="flex w-72 shrink-0 flex-col rounded-2xl border border-line bg-surface/70 transition-[border-color,background-color] duration-300"
      style={isOver ? { borderColor: `${color}66`, backgroundColor: "var(--color-surface)" } : undefined}
    >
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
          {statusLabel[status]}
        </h2>
        <span className="rounded-full bg-raised px-2 py-0.5 text-xs font-semibold text-faint">{tasks.length}</span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-36 flex-1 flex-col gap-2.5 px-3 pb-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <p className="rounded-xl border border-dashed border-line py-6 text-center text-xs text-faint">
              Drop tasks here
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}