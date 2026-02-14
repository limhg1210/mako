"use client";

import { TaskStatus, STATUS_LABELS, STATUS_DESCRIPTIONS, STATUS_COLORS } from "@/types";

interface ColumnHeaderProps {
  status: TaskStatus;
  count: number;
}

export default function ColumnHeader({ status, count }: ColumnHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status]}`}
      >
        {STATUS_LABELS[status]}
      </span>
      <span className="text-xs text-gray-400">{STATUS_DESCRIPTIONS[status]}</span>
      <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );
}
