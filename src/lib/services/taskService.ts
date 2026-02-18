import { db } from "@/db";
import { tasks, executionLogs } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function getTasksByProject(projectId: string) {
  return db.select().from(tasks).where(eq(tasks.projectId, projectId)).all();
}

export async function getTask(taskId: string) {
  return db.select().from(tasks).where(eq(tasks.id, taskId)).get();
}

export async function createTask(
  projectId: string,
  title: string,
  status?: string
) {
  const taskStatus = status || "backlog";

  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, taskStatus)))
    .all();

  const maxPosition = existing.reduce((max, t) => Math.max(max, t.position), 0);

  const now = Date.now();
  const task = {
    id: nanoid(),
    projectId,
    title,
    content: null,
    status: taskStatus,
    position: maxPosition + 1,
    branchName: null,
    worktreePath: null,
    executionMode: null,
    retryCount: 0,
    executionError: null,
    executionStartedAt: null,
    executionFinishedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(tasks).values(task);
  return task;
}

export async function updateTask(
  taskId: string,
  updates: Record<string, unknown>
) {
  const cleanUpdates = { ...updates };
  delete cleanUpdates.id;

  await db
    .update(tasks)
    .set({ ...cleanUpdates, updatedAt: Date.now() })
    .where(eq(tasks.id, taskId));

  return db.select().from(tasks).where(eq(tasks.id, taskId)).get();
}

export async function deleteTask(taskId: string) {
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

export async function getExecutionLogs(taskId: string) {
  return db
    .select()
    .from(executionLogs)
    .where(eq(executionLogs.taskId, taskId))
    .orderBy(asc(executionLogs.timestamp))
    .all();
}
