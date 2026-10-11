"use client";

import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { STATUSES, statusLabel } from "@/lib/labels";
import type { Task, TaskStatus } from "@/lib/types";
import { useAppDispatch } from "@/store/hooks";
import { toastAdded } from "@/store/toastSlice";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCardContent } from "./TaskCard";

// Pick a position between two neighbours, so only the moved card needs saving
function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return 1000;
  if (before === undefined) return after! - 1000;
  if (after === undefined) return before + 1000;
  return (before + after) / 2;
}

function sortByPosition(list: Task[]) {
  return [...list].sort((a, b) => a.position - b.position || a.id - b.id);
}

interface Props {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
}

export function KanbanBoard({ tasks, setTasks }: Props) {
  const dispatch = useAppDispatch();
  const [activeId, setActiveId] = useState<number | null>(null);
  // Copy of the board before dragging, used to undo if saving fails
  const snapshot = useRef<Task[]>([]);

  const sensors = useSensors(
    // Must move 5px before a drag starts, so clicking a card title still works
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(() => {
    const grouped = {} as Record<TaskStatus, Task[]>;
    for (const status of STATUSES) {
      grouped[status] = sortByPosition(tasks.filter((task) => task.status === status));
    }
    return grouped;
  }, [tasks]);

  const activeTask = tasks.find((task) => task.id === activeId) ?? null;

  function columnOf(id: UniqueIdentifier): TaskStatus | null {
    if (typeof id === "string" && id.startsWith("col:")) return id.slice(4) as TaskStatus;
    return tasks.find((task) => task.id === id)?.status ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    snapshot.current = tasks;
    setActiveId(Number(event.active.id));
  }

  // While dragging over another column, move the card there so the user sees it
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = columnOf(active.id);
    const to = columnOf(over.id);
    if (!from || !to || from === to) return;

    const target = columns[to].filter((task) => task.id !== active.id);
    const overIndex = target.findIndex((task) => task.id === over.id);
    const index = overIndex === -1 ? target.length : overIndex;
    const position = positionBetween(target[index - 1]?.position, target[index]?.position);

    setTasks((prev) =>
      prev.map((task) => (task.id === active.id ? { ...task, status: to, position } : task)),
    );
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    const before = snapshot.current;

    if (!over) {
      setTasks(before);
      return;
    }

    const status = columnOf(over.id);
    if (!status) return;

    // Final order inside the column the card ended up in
    const list = columns[status];
    const oldIndex = list.findIndex((task) => task.id === active.id);
    const overIndex = list.findIndex((task) => task.id === over.id);
    const newIndex = overIndex === -1 ? list.length - 1 : overIndex;
    if (oldIndex === -1) return;

    let position = list[oldIndex].position;
    if (newIndex !== oldIndex) {
      const ordered = arrayMove(list, oldIndex, newIndex);
      position = positionBetween(ordered[newIndex - 1]?.position, ordered[newIndex + 1]?.position);
    }

    const original = before.find((task) => task.id === active.id);
    if (!original || (original.status === status && original.position === position)) return;

    // Optimistic update: show the change now, save in the background
    setTasks((prev) =>
      prev.map((task) => (task.id === active.id ? { ...task, status, position } : task)),
    );

    try {
      await api.patch(`/tasks/${active.id}`, { status, position });
      if (original.status !== status) {
        dispatch(toastAdded(`${original.key} moved to ${statusLabel[status]}`));
      }
    } catch (err) {
      setTasks(before); // undo
      dispatch(toastAdded(`Couldn't move ${original.key}: ${getErrorMessage(err)}`, "error"));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setTasks(snapshot.current);
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} tasks={columns[status]} />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="w-68 rotate-2 rounded-md border border-accent bg-white p-3 shadow-xl">
            <TaskCardContent task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}