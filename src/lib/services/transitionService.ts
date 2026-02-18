import { db } from "@/db";
import { tasks, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Task, TaskStatus, ExecutionMode } from "@/types";
import { removeWorktree } from "@/lib/git/worktree";
import { switchBack } from "@/lib/git/branch";
import { runTask } from "@/lib/worker/taskRunner";

export type TransitionErrorCode =
  | "NOT_FOUND"
  | "INVALID_STATUS"
  | "VALIDATION_FAILED";

export type TransitionResult =
  | { ok: true; task: Task }
  | { ok: false; error: string; code: TransitionErrorCode };

type TransitionAction =
  | "start-plan"
  | "move-to-backlog"
  | "mark-ready"
  | "unmark-ready"
  | "execute"
  | "mark-done";

async function validateAndTransition(
  taskId: string,
  expectedFrom: TaskStatus,
  toStatus: TaskStatus,
  options?: {
    validate?: (task: Task) => string | null;
    extraUpdates?: (task: Task) => Record<string, unknown>;
    afterUpdate?: (task: Task) => void | Promise<void>;
  }
): Promise<TransitionResult> {
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task) {
    return { ok: false, error: "Task not found", code: "NOT_FOUND" };
  }

  if (task.status !== expectedFrom) {
    return {
      ok: false,
      error: `Task must be in '${expectedFrom}' status, currently '${task.status}'`,
      code: "INVALID_STATUS",
    };
  }

  if (options?.validate) {
    const validationError = options.validate(task as Task);
    if (validationError) {
      return {
        ok: false,
        error: validationError,
        code: "VALIDATION_FAILED",
      };
    }
  }

  const extra = options?.extraUpdates?.(task as Task) ?? {};

  await db
    .update(tasks)
    .set({ status: toStatus, ...extra, updatedAt: Date.now() })
    .where(eq(tasks.id, taskId));

  if (options?.afterUpdate) {
    await options.afterUpdate(task as Task);
  }

  const updated = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  return { ok: true, task: updated as Task };
}

// --- Public transitions ---

export async function startPlan(taskId: string): Promise<TransitionResult> {
  return validateAndTransition(taskId, "backlog", "plan");
}

export async function moveToBacklog(taskId: string): Promise<TransitionResult> {
  return validateAndTransition(taskId, "plan", "backlog");
}

export async function markReady(taskId: string): Promise<TransitionResult> {
  return validateAndTransition(taskId, "plan", "ready", {
    validate: (task) => {
      if (!task.content?.trim()) {
        return "Implementation Plan을 작성해야 Ready로 이동할 수 있습니다.";
      }
      return null;
    },
  });
}

export async function unmarkReady(taskId: string): Promise<TransitionResult> {
  return validateAndTransition(taskId, "ready", "plan", {
    extraUpdates: () => ({ executionError: null }),
  });
}

export async function execute(
  taskId: string,
  mode: ExecutionMode
): Promise<TransitionResult> {
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task) {
    return { ok: false, error: "Task not found", code: "NOT_FOUND" };
  }

  if (task.status !== "ready") {
    return {
      ok: false,
      error: `Task must be in 'ready' status, currently '${task.status}'`,
      code: "INVALID_STATUS",
    };
  }

  // Fire and forget — taskRunner handles status transitions internally
  runTask(taskId, mode).catch((err) => {
    console.error("Task execution error:", err);
  });

  return { ok: true, task: task as Task };
}

export async function markDone(taskId: string): Promise<TransitionResult> {
  return validateAndTransition(taskId, "review", "done", {
    afterUpdate: async (task) => {
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId))
        .get();

      if (!project) return;

      try {
        if (task.executionMode === "branch") {
          switchBack(project.directoryPath, project.defaultBranch);
        } else if (task.worktreePath) {
          removeWorktree(project.directoryPath, task.worktreePath);
        }
      } catch (err) {
        console.error("[TransitionService] Cleanup failed:", err);
      }
    },
  });
}

// --- Internal transitions (called by taskRunner) ---

export async function moveToReview(taskId: string): Promise<TransitionResult> {
  return validateAndTransition(taskId, "working", "review", {
    extraUpdates: () => ({ executionFinishedAt: Date.now() }),
  });
}

export async function failToReady(
  taskId: string,
  error: string,
  retryCount: number
): Promise<TransitionResult> {
  return validateAndTransition(taskId, "working", "ready", {
    extraUpdates: () => ({
      retryCount,
      executionError: error,
      executionFinishedAt: Date.now(),
    }),
  });
}

// --- DnD dispatcher ---

const TRANSITION_MAP: Record<string, TransitionAction | null> = {
  "backlog→plan": "start-plan",
  "plan→backlog": "move-to-backlog",
  "plan→ready": "mark-ready",
  "ready→plan": "unmark-ready",
  "ready→working": null, // execute requires mode — not available via DnD
  "review→done": "mark-done",
};

export function resolveTransition(
  from: TaskStatus,
  to: TaskStatus
): TransitionAction | null {
  const key = `${from}→${to}`;
  if (key in TRANSITION_MAP) {
    return TRANSITION_MAP[key];
  }
  return null;
}

const ACTION_HANDLERS: Record<
  TransitionAction,
  (taskId: string, body?: Record<string, unknown>) => Promise<TransitionResult>
> = {
  "start-plan": (id) => startPlan(id),
  "move-to-backlog": (id) => moveToBacklog(id),
  "mark-ready": (id) => markReady(id),
  "unmark-ready": (id) => unmarkReady(id),
  execute: (id, body) => execute(id, body?.mode as ExecutionMode),
  "mark-done": (id) => markDone(id),
};

export function dispatchAction(
  action: string,
  taskId: string,
  body?: Record<string, unknown>
): Promise<TransitionResult> | null {
  const handler = ACTION_HANDLERS[action as TransitionAction];
  if (!handler) return null;
  return handler(taskId, body);
}
