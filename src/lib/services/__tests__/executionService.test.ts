import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Drizzle 체인 모킹 ---
const { mockGet, mockAll, mockDbSelect } = vi.hoisted(() => {
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
  };
});

vi.mock("@/db", () => ({ db: { select: mockDbSelect } }));
vi.mock("@/db/schema", () => ({
  tasks: { id: "id", status: "status" },
  executionLogs: { taskId: "taskId", timestamp: "timestamp" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), asc: vi.fn() }));

import { getExecutionStatus } from "../executionService";

describe("executionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
