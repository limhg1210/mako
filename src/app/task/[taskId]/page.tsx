"use client";

import { use } from "react";
import { useTask } from "@/hooks/useTasks";
import { TaskStatus, STATUS_LABELS } from "@/types";
import AppShell from "@/components/layout/AppShell";
import MarkdownEditor from "@/components/task/MarkdownEditor";
import ExecutionLog from "@/components/task/ExecutionLog";
import { useRouter } from "next/navigation";

export default function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const { task, updateTask } = useTask(taskId);
  const router = useRouter();

  if (!task) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full text-gray-400">
          Loading...
        </div>
      </AppShell>
    );
  }

  const status = task.status as TaskStatus;
  const canEdit = status === "plan" || status === "backlog";
  const showLogs = status === "working" || status === "review" || status === "done";

  return (
    <AppShell projectName={task.title}>
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          &larr; Back
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-medium">
                {STATUS_LABELS[status]}
              </span>
              <span className="text-xs text-gray-400">{task.id}</span>
            </div>
          </div>
        </div>

        {task.executionError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            <span className="font-medium">Error: </span>
            {task.executionError}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Implementation Plan</h2>
          <MarkdownEditor
            content={task.content || ""}
            onChange={(content) => updateTask({ content })}
            readOnly={!canEdit}
          />
        </div>

        {showLogs && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Execution Logs</h2>
            <ExecutionLog taskId={taskId} isActive={status === "working"} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
