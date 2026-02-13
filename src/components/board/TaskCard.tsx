"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-3 bg-white rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group ${
        isDragging ? "shadow-lg ring-2 ring-accent" : ""
      }`}
    >
      <div className="text-sm font-medium text-gray-800 leading-snug">
        {task.title}
      </div>

      <div className="flex items-center gap-2 mt-2">
        {task.executionError && (
          <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">
            Error
          </span>
        )}
        {task.branchName && (
          <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
            {task.branchName}
          </span>
        )}
      </div>

      <div className="text-[10px] text-gray-300 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.id.slice(0, 8)}
      </div>
    </div>
  );
}
