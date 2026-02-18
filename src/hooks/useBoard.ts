"use client";

import useSWR from "swr";
import { Task, TaskStatus, TASK_STATUSES } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBoard(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<Task[]>(
    projectId ? `/api/tasks?projectId=${projectId}` : null,
    fetcher,
    {
      refreshInterval: (latestData: Task[] | undefined) =>
        latestData?.some((t) => t.status === "working") ? 5000 : 0,
    }
  );

  const tasks = data || [];

  const columns: Record<TaskStatus, Task[]> = Object.fromEntries(
    TASK_STATUSES.map((status) => [
      status,
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.position - b.position),
    ])
  ) as Record<TaskStatus, Task[]>;

  const createTask = async (title: string) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title, status: "backlog" }),
    });
    const task = await res.json();
    mutate();
    return task;
  };

  const moveTask = async (taskId: string, status: TaskStatus, position: number) => {
    // Optimistic update
    const previousTasks = tasks;
    const optimistic = tasks.map((t) =>
      t.id === taskId ? { ...t, status, position } : t
    );
    mutate(optimistic, false);

    const res = await fetch("/api/board/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status, position }),
    });

    if (!res.ok) {
      // Revert optimistic update on failure
      mutate(previousTasks, false);
    }

    mutate();
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    mutate();
  };

  return {
    tasks,
    columns,
    isLoading,
    error,
    mutate,
    createTask,
    moveTask,
    deleteTask,
  };
}
