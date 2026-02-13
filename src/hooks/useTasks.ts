"use client";

import useSWR from "swr";
import { Task, ExecutionLog } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTask(taskId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Task>(
    taskId ? `/api/tasks/${taskId}` : null,
    fetcher,
    {
      refreshInterval: (latestData: Task | undefined) =>
        latestData?.status === "working" ? 3000 : 0,
    }
  );

  const updateTask = async (updates: Partial<Task>) => {
    if (!taskId) return;

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const updated = await res.json();
    mutate(updated, false);
    return updated;
  };

  return { task: data, error, isLoading, mutate, updateTask };
}

export function useExecutionLogs(taskId: string | null, isActive: boolean = false) {
  const { data, error, isLoading, mutate } = useSWR<ExecutionLog[]>(
    taskId ? `/api/tasks/${taskId}/logs` : null,
    fetcher,
    { refreshInterval: isActive ? 2000 : 0 }
  );

  return { logs: data || [], error, isLoading, mutate };
}
