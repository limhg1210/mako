"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { useBoard } from "@/hooks/useBoard";
import { Task, TaskStatus, TASK_STATUSES } from "@/types";
import KanbanColumn from "./KanbanColumn";
import TaskDetailPanel from "../task/TaskDetailPanel";

interface KanbanBoardProps {
  projectId: string;
}

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { columns, createTask, moveTask, deleteTask, mutate } = useBoard(projectId);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const findTaskColumn = useCallback(
    (taskId: string): TaskStatus | null => {
      for (const status of TASK_STATUSES) {
        if (columns[status].some((t) => t.id === taskId)) {
          return status;
        }
      }
      return null;
    },
    [columns]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    for (const status of TASK_STATUSES) {
      const task = columns[status].find((t) => t.id === taskId);
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findTaskColumn(activeId);

    // Determine target column
    let targetColumn: TaskStatus;
    if (TASK_STATUSES.includes(overId as TaskStatus)) {
      targetColumn = overId as TaskStatus;
    } else {
      const col = findTaskColumn(overId);
      if (!col) return;
      targetColumn = col;
    }

    if (!activeColumn) return;

    // Only allow reordering within the same column
    if (activeColumn !== targetColumn) return;

    // Calculate new position
    const targetTasks = columns[targetColumn].filter((t) => t.id !== activeId);
    let newPosition: number;

    if (targetTasks.length === 0) {
      newPosition = 1;
    } else if (overId === targetColumn as string) {
      // Dropped on the column itself - put at end
      newPosition = targetTasks[targetTasks.length - 1].position + 1;
    } else {
      // Dropped on a specific task
      const overIndex = targetTasks.findIndex((t) => t.id === overId);
      if (overIndex === 0) {
        newPosition = targetTasks[0].position / 2;
      } else if (overIndex === -1) {
        newPosition = targetTasks[targetTasks.length - 1].position + 1;
      } else {
        newPosition =
          (targetTasks[overIndex - 1].position + targetTasks[overIndex].position) / 2;
      }
    }

    await moveTask(activeId, targetColumn, newPosition);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {TASK_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={columns[status]}
                onTaskClick={setSelectedTaskId}
                onCreateTask={status === "backlog" ? createTask : undefined}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="p-3 bg-white rounded-lg border-2 border-accent shadow-xl w-60">
                <div className="text-sm font-medium">{activeTask.title}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onDelete={() => {
            deleteTask(selectedTaskId);
            setSelectedTaskId(null);
          }}
          onUpdate={() => mutate()}
        />
      )}
    </div>
  );
}
