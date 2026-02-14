import { db } from "@/db";
import { tasks, executionLogs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { runTask } from "@/lib/worker/taskRunner";
import { ExecutionMode } from "@/types";

export async function triggerExecution(
  taskId: string,
  mode: ExecutionMode
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "not_ready" }> {
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task) {
    return { ok: false, reason: "not_found" };
  }

  if (task.status !== "ready") {
    return { ok: false, reason: "not_ready" };
  }

  runTask(taskId, mode).catch((err) => {
    console.error("Task execution error:", err);
  });

  return { ok: true };
}

export async function getExecutionStatus(taskId: string, since: number) {
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task) return null;

  const allLogs = await db
    .select()
    .from(executionLogs)
    .where(eq(executionLogs.taskId, taskId))
    .orderBy(asc(executionLogs.timestamp))
    .all();

  const newLogs = allLogs.filter((l) => l.timestamp > since);

  return { task, newLogs };
}
