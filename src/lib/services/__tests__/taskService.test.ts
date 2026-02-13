import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Drizzle 체인 모킹 ---
const {
  mockGet,
  mockAll,
  mockChainSet,
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockDbDelete,
  mockRemoveWorktree,
} = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.get = vi.fn();
  chain.all = vi.fn(() => []);

  return {
    mockGet: chain.get,
    mockAll: chain.all,
    mockChainSet: chain.set,
    mockDbSelect: vi.fn(() => chain),
    mockDbInsert: vi.fn(() => chain),
    mockDbUpdate: vi.fn(() => chain),
    mockDbDelete: vi.fn(() => chain),
    mockRemoveWorktree: vi.fn(),
  };
});

vi.mock("@/db", () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    delete: mockDbDelete,
  },
}));
vi.mock("@/db/schema", () => ({
  tasks: { id: "id", projectId: "projectId", status: "status" },
  projects: { id: "id" },
  executionLogs: { taskId: "taskId", timestamp: "timestamp" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), asc: vi.fn() }));
vi.mock("nanoid", () => ({ nanoid: () => "new-id" }));
vi.mock("@/lib/git/worktree", () => ({
  removeWorktree: mockRemoveWorktree,
}));

import {
  getTasksByProject,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  reorderTask,
  getExecutionLogs,
} from "../taskService";

describe("taskService", () => {
  beforeEach(() => vi.clearAllMocks());

  // =====================
  // getTasksByProject
  // =====================
  describe("getTasksByProject", () => {
    it("프로젝트 ID로 태스크 목록을 조회한다", async () => {
      const tasks = [{ id: "1" }, { id: "2" }];
      mockAll.mockReturnValueOnce(tasks);

      const result = await getTasksByProject("proj-1");

      expect(result).toEqual(tasks);
      expect(mockDbSelect).toHaveBeenCalled();
    });
  });

  // =====================
  // getTask
  // =====================
  describe("getTask", () => {
    it("ID로 태스크를 조회한다", async () => {
      const task = { id: "task-1", title: "Test" };
      mockGet.mockReturnValueOnce(task);

      const result = await getTask("task-1");

      expect(result).toEqual(task);
    });

    it("존재하지 않으면 undefined 반환", async () => {
      mockGet.mockReturnValueOnce(undefined);

      const result = await getTask("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  // =====================
  // createTask
  // =====================
  describe("createTask", () => {
    it("position을 기존 최대값 + 1로 계산한다", async () => {
      mockAll.mockReturnValueOnce([{ position: 3 }, { position: 7 }]);

      const result = await createTask("proj-1", "New Task");

      expect(result.position).toBe(8); // max(3, 7) + 1
      expect(result.id).toBe("new-id");
      expect(result.status).toBe("backlog");
      expect(mockDbInsert).toHaveBeenCalled();
    });

    it("기존 태스크가 없으면 position 1로 시작", async () => {
      mockAll.mockReturnValueOnce([]);

      const result = await createTask("proj-1", "First Task");

      expect(result.position).toBe(1);
    });

    it("status를 지정할 수 있다", async () => {
      mockAll.mockReturnValueOnce([]);

      const result = await createTask("proj-1", "Plan Task", "plan");

      expect(result.status).toBe("plan");
    });

    it("status 미지정 시 backlog 기본값", async () => {
      mockAll.mockReturnValueOnce([]);

      const result = await createTask("proj-1", "Task");

      expect(result.status).toBe("backlog");
    });
  });

  // =====================
  // updateTask
  // =====================
  describe("updateTask", () => {
    it("updates에서 id 필드를 제거한다", async () => {
      mockGet
        .mockReturnValueOnce({ id: "task-1", worktreePath: null }) // before
        .mockReturnValueOnce({ id: "task-1", title: "Updated" }); // after

      await updateTask("task-1", { id: "hacked", title: "Updated" });

      const setArg = mockChainSet.mock.calls[0][0];
      expect(setArg).not.toHaveProperty("id");
      expect(setArg).toHaveProperty("title", "Updated");
      expect(setArg).toHaveProperty("updatedAt");
    });

    it("status=done + worktreePath → worktree 정리", async () => {
      const task = { id: "task-1", projectId: "proj-1", worktreePath: "/tmp/wt" };
      const project = { id: "proj-1", directoryPath: "/repo" };
      mockGet
        .mockReturnValueOnce(task) // before update
        .mockReturnValueOnce(project) // project lookup
        .mockReturnValueOnce({ ...task, status: "done" }); // after update

      await updateTask("task-1", { status: "done" });

      expect(mockRemoveWorktree).toHaveBeenCalledWith("/repo", "/tmp/wt");
    });

    it("status=done + worktreePath 없음 → worktree 정리 안 함", async () => {
      mockGet
        .mockReturnValueOnce({ id: "task-1", worktreePath: null }) // before
        .mockReturnValueOnce({ id: "task-1", status: "done" }); // after

      await updateTask("task-1", { status: "done" });

      expect(mockRemoveWorktree).not.toHaveBeenCalled();
    });

    it("status가 done이 아니면 worktree 정리 안 함", async () => {
      mockGet
        .mockReturnValueOnce({ id: "task-1", worktreePath: "/tmp/wt" })
        .mockReturnValueOnce({ id: "task-1", status: "review" });

      await updateTask("task-1", { status: "review" });

      expect(mockRemoveWorktree).not.toHaveBeenCalled();
    });
  });

  // =====================
  // deleteTask
  // =====================
  describe("deleteTask", () => {
    it("태스크를 삭제한다", async () => {
      await deleteTask("task-1");

      expect(mockDbDelete).toHaveBeenCalled();
    });
  });

  // =====================
  // reorderTask
  // =====================
  describe("reorderTask", () => {
    it("updateTask에 status와 position을 위임한다", async () => {
      mockGet
        .mockReturnValueOnce({ id: "task-1", worktreePath: null })
        .mockReturnValueOnce({ id: "task-1", status: "plan", position: 2.5 });

      await reorderTask("task-1", "plan", 2.5);

      expect(mockChainSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: "plan", position: 2.5 })
      );
    });
  });

  // =====================
  // getExecutionLogs
  // =====================
  describe("getExecutionLogs", () => {
    it("태스크의 실행 로그를 시간순으로 조회한다", async () => {
      const logs = [
        { id: "log-1", content: "start" },
        { id: "log-2", content: "done" },
      ];
      mockAll.mockReturnValueOnce(logs);

      const result = await getExecutionLogs("task-1");

      expect(result).toEqual(logs);
      expect(mockDbSelect).toHaveBeenCalled();
    });
  });
});
