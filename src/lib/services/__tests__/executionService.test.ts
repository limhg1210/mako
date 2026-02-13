import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Drizzle 체인 모킹 ---
const { mockGet, mockAll, mockDbSelect, mockRunTask } = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.get = vi.fn();
  chain.all = vi.fn(() => []);

  return {
    mockGet: chain.get,
    mockAll: chain.all,
    mockDbSelect: vi.fn(() => chain),
    mockRunTask: vi.fn(),
  };
});

vi.mock("@/db", () => ({ db: { select: mockDbSelect } }));
vi.mock("@/db/schema", () => ({
  tasks: { id: "id", status: "status" },
  executionLogs: { taskId: "taskId", timestamp: "timestamp" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), asc: vi.fn() }));
vi.mock("@/lib/worker/taskRunner", () => ({ runTask: mockRunTask }));

import { triggerExecution, getExecutionStatus } from "../executionService";

describe("executionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunTask.mockResolvedValue(undefined);
  });

  // =====================
  // triggerExecution
  // =====================
  describe("triggerExecution", () => {
    it("태스크가 없으면 not_found 반환", async () => {
      mockGet.mockReturnValueOnce(undefined);

      const result = await triggerExecution("nonexistent");

      expect(result).toEqual({ ok: false, reason: "not_found" });
    });

    it("status가 ready가 아니면 not_ready 반환", async () => {
      mockGet.mockReturnValueOnce({ id: "task-1", status: "backlog" });

      const result = await triggerExecution("task-1");

      expect(result).toEqual({ ok: false, reason: "not_ready" });
    });

    it("ready 태스크 → runTask 백그라운드 실행 + ok: true", async () => {
      mockGet.mockReturnValueOnce({ id: "task-1", status: "ready" });

      const result = await triggerExecution("task-1");

      expect(result).toEqual({ ok: true });
      expect(mockRunTask).toHaveBeenCalledWith("task-1");
    });

    it("runTask 에러는 console.error로 처리 (크래시 안 함)", async () => {
      mockGet.mockReturnValueOnce({ id: "task-1", status: "ready" });
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockRunTask.mockRejectedValue(new Error("execution failed"));

      const result = await triggerExecution("task-1");

      expect(result).toEqual({ ok: true });
      // catch 핸들러가 비동기이므로 잠시 대기
      await new Promise((r) => setTimeout(r, 10));
      expect(spy).toHaveBeenCalledWith(
        "Task execution error:",
        expect.any(Error)
      );
    });
  });

  // =====================
  // getExecutionStatus
  // =====================
  describe("getExecutionStatus", () => {
    it("태스크가 없으면 null 반환", async () => {
      mockGet.mockReturnValueOnce(undefined);

      const result = await getExecutionStatus("nonexistent", 0);

      expect(result).toBeNull();
    });

    it("since 이후의 새 로그만 필터링한다", async () => {
      const task = { id: "task-1", status: "working" };
      const logs = [
        { id: "l1", timestamp: 100, content: "old" },
        { id: "l2", timestamp: 200, content: "new1" },
        { id: "l3", timestamp: 300, content: "new2" },
      ];
      mockGet.mockReturnValueOnce(task);
      mockAll.mockReturnValueOnce(logs);

      const result = await getExecutionStatus("task-1", 150);

      expect(result).not.toBeNull();
      expect(result!.task).toEqual(task);
      expect(result!.newLogs).toEqual([
        { id: "l2", timestamp: 200, content: "new1" },
        { id: "l3", timestamp: 300, content: "new2" },
      ]);
    });

    it("since=0이면 전체 로그를 반환한다", async () => {
      const task = { id: "task-1", status: "working" };
      const logs = [
        { id: "l1", timestamp: 100 },
        { id: "l2", timestamp: 200 },
      ];
      mockGet.mockReturnValueOnce(task);
      mockAll.mockReturnValueOnce(logs);

      const result = await getExecutionStatus("task-1", 0);

      expect(result!.newLogs).toHaveLength(2);
    });
  });
});
