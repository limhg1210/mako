"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Task, TaskStatus } from "@/types";
import ColumnHeader from "./ColumnHeader";
import TaskCard from "./TaskCard";
import { useState } from "react";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onCreateTask?: (title: string) => void;
}

export default function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onCreateTask,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleAddTask = () => {
    if (newTitle.trim() && onCreateTask) {
      onCreateTask(newTitle.trim());
      setNewTitle("");
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTask();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTitle("");
    }
  };

  return (
    <div
      className="flex flex-col w-64 shrink-0 rounded-lg bg-gray-50"
    >
      <div className="p-2">
        <ColumnHeader status={status} count={tasks.length} />
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 p-2 pt-0 space-y-2 kanban-scroll overflow-y-auto kanban-column"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </SortableContext>

        {status === "backlog" && (
          <>
            {isAdding ? (
              <div className="p-2 bg-white rounded-lg border border-accent shadow-sm">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    if (!newTitle.trim()) setIsAdding(false);
                  }}
                  className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Task title..."
                  autoFocus
                />
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={handleAddTask}
                    className="text-xs px-2 py-1 bg-accent text-white rounded hover:bg-accent-hover"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewTitle("");
                    }}
                    className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full p-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg border border-dashed border-gray-300 transition-colors"
              >
                + Add task
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
