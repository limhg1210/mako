export type TaskStatus = "backlog" | "plan" | "ready" | "working" | "review" | "done";

export type ExecutionMode = "worktree" | "branch";

export const TASK_STATUSES: TaskStatus[] = ["backlog", "plan", "ready", "working", "review", "done"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  plan: "Plan",
  ready: "Ready",
  working: "Working",
  review: "Review",
  done: "Done",
};

export const STATUS_DESCRIPTIONS: Record<TaskStatus, string> = {
  backlog: "제목만",
  plan: "계획작성",
  ready: "실행대기",
  working: "Claude실행",
  review: "PR검토",
  done: "머지완료",
};

export interface Project {
  id: string;
  name: string;
  directoryPath: string;
  defaultBranch: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  content: string | null;
  status: TaskStatus;
  position: number;
  branchName: string | null;
  worktreePath: string | null;
  executionMode: ExecutionMode | null;
  retryCount: number;
  executionError: string | null;
  executionStartedAt: number | null;
  executionFinishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionLog {
  id: string;
  taskId: string;
  runNumber: number;
  stream: "stdout" | "stderr" | "system";
  content: string;
  timestamp: number;
}
