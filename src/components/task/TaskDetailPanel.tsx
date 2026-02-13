"use client";

import { useTask } from "@/hooks/useTasks";
import { TaskStatus, STATUS_LABELS } from "@/types";
import MarkdownEditor from "./MarkdownEditor";
import ExecutionLog from "./ExecutionLog";
import { useCallback, useState } from "react";

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

const STATUS_TRANSITIONS: Partial<Record<TaskStatus, TaskStatus[]>> = {
  backlog: ["plan"],
  plan: ["ready", "backlog"],
  ready: ["plan", "working"],
  working: [],
  review: ["done", "ready"],
  done: ["review"],
};

export default function TaskDetailPanel({
  taskId,
  onClose,
  onDelete,
  onUpdate,
}: TaskDetailPanelProps) {
  const { task, updateTask } = useTask(taskId);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [executing, setExecuting] = useState(false);

  const handleContentChange = useCallback(
    async (content: string) => {
      await updateTask({ content });
      onUpdate();
    },
    [updateTask, onUpdate]
  );

  const handleStatusChange = async (newStatus: TaskStatus) => {
    await updateTask({ status: newStatus });
    onUpdate();
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      onUpdate();
    } finally {
      setExecuting(false);
    }
  };

  const handleTitleEdit = async () => {
    if (editTitle.trim() && editTitle !== task?.title) {
      await updateTask({ title: editTitle.trim() });
      onUpdate();
    }
    setIsEditing(false);
  };

  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/30" onClick={onClose} />
        <div className="w-[600px] bg-white shadow-2xl p-6">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  const status = task.status as TaskStatus;
  const transitions = STATUS_TRANSITIONS[status] || [];
  const canEdit = status === "plan" || status === "backlog";
  const showLogs = status === "working" || status === "review" || status === "done";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[600px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-start justify-between shrink-0">
          <div className="flex-1 mr-4">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleEdit();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                className="w-full text-lg font-semibold px-2 py-1 border border-accent rounded focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
            ) : (
              <h2
                className="text-lg font-semibold cursor-pointer hover:text-accent transition-colors"
                onClick={() => {
                  setEditTitle(task.title);
                  setIsEditing(true);
                }}
              >
                {task.title}
              </h2>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-medium">
                {STATUS_LABELS[status]}
              </span>
              <span className="text-xs text-gray-400">
                {task.id.slice(0, 8)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap shrink-0">
          {transitions.map((targetStatus) => (
            <button
              key={targetStatus}
              onClick={() => handleStatusChange(targetStatus)}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Move to {STATUS_LABELS[targetStatus]}
            </button>
          ))}
          {status === "ready" && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="text-xs px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
            >
              {executing ? "Starting..." : "Execute Now"}
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors ml-auto"
          >
            Delete
          </button>
        </div>

        {/* Error banner */}
        {task.executionError && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm text-red-600 shrink-0">
            <span className="font-medium">Error: </span>
            {task.executionError}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Markdown editor for plan/backlog */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Implementation Plan
            </h3>
            <MarkdownEditor
              content={task.content || ""}
              onChange={handleContentChange}
              readOnly={!canEdit}
            />
          </div>

          {/* Execution logs */}
          {showLogs && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Execution Logs
              </h3>
              <ExecutionLog taskId={taskId} isActive={status === "working"} />
            </div>
          )}

          {/* Metadata */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Details</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              {task.branchName && (
                <>
                  <span>Branch:</span>
                  <span className="font-mono">{task.branchName}</span>
                </>
              )}
              {task.executionStartedAt && (
                <>
                  <span>Started:</span>
                  <span>{new Date(task.executionStartedAt).toLocaleString()}</span>
                </>
              )}
              {task.executionFinishedAt && (
                <>
                  <span>Finished:</span>
                  <span>{new Date(task.executionFinishedAt).toLocaleString()}</span>
                </>
              )}
              <span>Created:</span>
              <span>{new Date(task.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
