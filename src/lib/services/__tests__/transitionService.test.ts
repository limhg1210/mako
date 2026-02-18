import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Drizzle 체인 모킹 ---
const {
  mockGet,
  mockChainSet,
  mockDbSelect,
  mockDbUpdate,
  mockRemoveWorktree,
  mockCleanupBranch,
  mockRunTask,
} = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.get = vi.fn();

  return {
    mockGet: chain.get,
    mockChainSet: chain.set,
    mockDbSelect: vi.fn(() => chain),
    mockDbUpdate: vi.fn(() => chain),
    mockRemoveWorktree: vi.fn(),
    mockCleanupBranch: vi.fn(),
    mockRunTask: vi.fn(),
  };
});

vi.mock("@/db", () => ({
  db: {
    select: mockDbSelect,
    update: mockDbUpdate,
  },
}));
vi.mock("@/db/schema", () => ({
  tasks: { id: "id", status: "status" },
  projects: { id: "id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/lib/git/worktree", () => ({
  removeWorktree: mockRemoveWorktree,
}));
vi.mock("@/lib/git/branch", () => ({
  cleanupBranch: mockCleanupBranch,
}));
vi.mock("@/lib/worker/taskRunner", () => ({
  runTask: mockRunTask,
}));

import {
  startPlan,
  moveToBacklog,
  markReady,
  unmarkReady,
  execute,
  markDone,
  moveToReview,
  failToReady,
  resolveTransition,
} from "../transitionService";

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    projectId: "proj-1",
    title: "Test Task",
    content: "some plan",
    status: "backlog",
    position: 1,
    branchName: null,
    worktreePath: null,
    executionMode: null,
    retryCount: 0,
    executionError: null,
    executionStartedAt: null,
    executionFinishedAt: null,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe("transitionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunTask.mockResolvedValue(undefined);
  });

  // =====================
  // Common validation
  // =====================
  describe("common validation", () => {
    it("태스크가 없으면 NOT_FOUND 반환", async () => {
      mockGet.mockReturnValueOnce(undefined);

      const result = await startPlan("nonexistent");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("NOT_FOUND");
      }
    });

    it("현재 상태가 expectedFrom과 다르면 INVALID_STATUS 반환", async () => {
      mockGet.mockReturnValueOnce(makeTask({ status: "plan" }));

      const result = await startPlan("task-1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_STATUS");
      }
    });
  });

  // =====================
  // startPlan
  // =====================
  describe("startPlan", () => {
    it("backlog → plan 전환 성공", async () => {
      const task = makeTask({ status: "backlog" });
      mockGet
        .mockReturnValueOnce(task) // lookup
        .mockReturnValueOnce({ ...task, status: "plan" }); // after update

      const result = await startPlan("task-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.task.status).toBe("plan");
      }
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it("plan 태스크에서 호출 → INVALID_STATUS", async () => {
      mockGet.mockReturnValueOnce(makeTask({ status: "plan" }));

      const result = await startPlan("task-1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_STATUS");
      }
    });
  });

  // =====================
  // moveToBacklog
  // =====================
  describe("moveToBacklog", () => {
    it("plan → backlog 성공", async () => {
      const task = makeTask({ status: "plan" });
      mockGet
        .mockReturnValueOnce(task)
        .mockReturnValueOnce({ ...task, status: "backlog" });

      const result = await moveToBacklog("task-1");

      expect(result.ok).toBe(true);
    });

    it("backlog에서 호출 → INVALID_STATUS", async () => {
      mockGet.mockReturnValueOnce(makeTask({ status: "backlog" }));

      const result = await moveToBacklog("task-1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_STATUS");
      }
    });
  });

  // =====================
  // markReady
  // =====================
  describe("markReady", () => {
    it("plan + content 있음 → ready 성공", async () => {
      const task = makeTask({ status: "plan", content: "implementation plan" });
      mockGet
        .mockReturnValueOnce(task)
        .mockReturnValueOnce({ ...task, status: "ready" });

      const result = await markReady("task-1");

      expect(result.ok).toBe(true);
    });

    it("plan + content 없음 → VALIDATION_FAILED", async () => {
      mockGet.mockReturnValueOnce(makeTask({ status: "plan", content: null }));

      const result = await markReady("task-1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_FAILED");
      }
    });

    it("plan + content 공백만 → VALIDATION_FAILED", async () => {
      mockGet.mockReturnValueOnce(makeTask({ status: "plan", content: "   " }));

      const result = await markReady("task-1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_FAILED");
      }
    });

    it("backlog에서 호출 → INVALID_STATUS", async () => {
      mockGet.mockReturnValueOnce(makeTask({ status: "backlog", content: "has content" }));

      const result = await markReady("task-1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_STATUS");
      }
    });
  });

  // =====================
  // unmarkReady
  // =====================
  describe("unmarkReady", () => {
    it("ready → plan 성공, executionError null로 초기화", async () => {
      const task = makeTask({ status: "ready", executionError: "prev error" });
      mockGet
        .mockReturnValueOnce(task)
        .mockReturnValueOnce({ ...task, status: "plan", executionError: null });

      const result = await unmarkReady("task-1");

      expect(result.ok).toBe(true);
      expect(mockChainSet).toHaveBeenCalledWith(
        expect.objectContaining({ executionError: null, status: "plan" })
      );
    });

    it("plan에서 호출 → INVALID_STATUS", async () => {
      mockGet.mockReturnValueOnce(makeTask({ status: "plan" }));

      const result = await unmarkReady("task-1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_STATUS");
      }
    });
  });

  // =====================
  // execute
  // =====================
  describe("execute", () => {
    it("ready + mode: worktree → runTask 백그라운드 실행 + ok 반환", async () => {
      const task = makeTask({ status: "ready" });
      mockGet.mockReturnValueOnce(task);

      const result = await execute("task-1", "worktree");

      expect(result.ok).toBe(true);
      expect(mockRunTask).toHaveBeenCalledWith("task-1", "worktree");
    });

    it("ready + mode: branch → 성공", async () => {
      const task = makeTask({ status: "ready" });
      mockGet.mockReturnValueOnce(task);

      const result = await execute("task-1", "branch");

      expect(result.ok).toBe(true);
      expect(mockRunTask).toHaveBeenCalledWith("task-1", "branch");
    });

    it("plan에서 호출 → INVALID_STATUS", async () => {
      mockGet.mockReturnValueOnce(makeTask({ status: "plan" }));

      const result = await execute("task-1", "worktree");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_STATUS");
      }
    });

    it("태스크 없음 → NOT_FOUND", async () => {
      mockGet.mockReturnValueOnce(undefined);

      const result = await execute("nonexistent", "worktree");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("NOT_FOUND");
      }
    });

    it("runTask 에러는 console.error로 처리 (크래시 안 함)", async () => {
      const task = makeTask({ status: "ready" });
      mockGet.mockReturnValueOnce(task);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockRunTask.mockRejectedValue(new Error("execution failed"));

      const result = await execute("task-1", "worktree");

      expect(result.ok).toBe(true);
      await new Promise((r) => setTimeout(r, 10));
      expect(spy).toHaveBeenCalledWith(
        "Task execution error:",
        expect.any(Error)
      );
    });
  });

  // =====================
  // markDone
  // =====================
  describe("markDone", () => {
    it("review + worktree 모드 → done + removeWorktree + cleanupBranch 호출", async () => {
      const task = makeTask({
        status: "review",
        worktreePath: "/tmp/wt",
        branchName: "feat-1",
        executionMode: "worktree",
      });
      const project = { id: "proj-1", directoryPath: "/repo", defaultBranch: "main" };
      mockGet
        .mockReturnValueOnce(task) // lookup
        .mockReturnValueOnce(project) // project lookup in afterUpdate
        .mockReturnValueOnce({ ...task, status: "done" }); // after update

      const result = await markDone("task-1");

      expect(result.ok).toBe(true);
      expect(mockRemoveWorktree).toHaveBeenCalledWith("/repo", "/tmp/wt");
      expect(mockCleanupBranch).toHaveBeenCalledWith("/repo", "main", "feat-1");
    });

    it("review + branch 모드 → done + cleanupBranch 호출 (removeWorktree 안 함)", async () => {
      const task = makeTask({
        status: "review",
        executionMode: "branch",
        branchName: "feat-2",
        worktreePath: null,
      });
      const project = { id: "proj-1", directoryPath: "/repo", defaultBranch: "main" };
      mockGet
        .mockReturnValueOnce(task)
        .mockReturnValueOnce(project)
        .mockReturnValueOnce({ ...task, status: "done" });

      const result = await markDone("task-1");

      expect(result.ok).toBe(true);
      expect(mockRemoveWorktree).not.toHaveBeenCalled();
      expect(mockCleanupBranch).toHaveBeenCalledWith("/repo", "main", "feat-2");
    });

    it("review + branchName 없음 → done 전환만 (cleanup 안 함)", async () => {
      const task = makeTask({
        status: "review",
        executionMode: null,
        branchName: null,
        worktreePath: null,
      });
      mockGet
        .mockReturnValueOnce(task)
        .mockReturnValueOnce(undefined) // project not found — edge case
        .mockReturnValueOnce({ ...task, status: "done" });

      const result = await markDone("task-1");

      expect(result.ok).toBe(true);
      expect(mockRemoveWorktree).not.toHaveBeenCalled();
      expect(mockCleanupBranch).not.toHaveBeenCalled();
    });

    it("working에서 호출 → INVALID_STATUS", async () => {
      mockGet.mockReturnValueOnce(makeTask({ status: "working" }));

      const result = await markDone("task-1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_STATUS");
      }
    });
  });

  // =====================
  // moveToReview (internal)
  // =====================
  describe("moveToReview", () => {
    it("working → review 성공, executionFinishedAt 설정", async () => {
      const task = makeTask({ status: "working" });
      mockGet
        .mockReturnValueOnce(task)
        .mockReturnValueOnce({ ...task, status: "review" });

      const result = await moveToReview("task-1");

      expect(result.ok).toBe(true);
      expect(mockChainSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "review",
          executionFinishedAt: expect.any(Number),
        })
      );
    });
  });

  // =====================
  // failToReady (internal)
  // =====================
  describe("failToReady", () => {
    it("working → ready + retryCount/executionError 설정", async () => {
      const task = makeTask({ status: "working" });
      mockGet
        .mockReturnValueOnce(task)
        .mockReturnValueOnce({ ...task, status: "ready", retryCount: 1 });

      const result = await failToReady("task-1", "Some error", 1);

      expect(result.ok).toBe(true);
      expect(mockChainSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ready",
          retryCount: 1,
          executionError: "Some error",
          executionFinishedAt: expect.any(Number),
        })
      );
    });
  });

  // =====================
  // resolveTransition
  // =====================
  describe("resolveTransition", () => {
    it("유효한 (from, to) 쌍 → 올바른 action 반환", () => {
      expect(resolveTransition("backlog", "plan")).toBe("start-plan");
      expect(resolveTransition("plan", "backlog")).toBe("move-to-backlog");
      expect(resolveTransition("plan", "ready")).toBe("mark-ready");
      expect(resolveTransition("ready", "plan")).toBe("unmark-ready");
      expect(resolveTransition("review", "done")).toBe("mark-done");
    });

    it("ready → working → null 반환 (execute는 mode 필요)", () => {
      expect(resolveTransition("ready", "working")).toBeNull();
    });

    it("유효하지 않은 쌍 → null 반환", () => {
      expect(resolveTransition("backlog", "ready")).toBeNull();
      expect(resolveTransition("done", "backlog")).toBeNull();
      expect(resolveTransition("working", "done")).toBeNull();
      expect(resolveTransition("review", "ready")).toBeNull();
    });
  });
});
