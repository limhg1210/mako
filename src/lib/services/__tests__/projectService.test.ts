import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Drizzle 체인 모킹 ---
const { mockGet, mockAll, mockChainSet, mockDbSelect, mockDbInsert, mockDbUpdate } =
  vi.hoisted(() => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
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
    };
  });

vi.mock("@/db", () => ({
  db: { select: mockDbSelect, insert: mockDbInsert, update: mockDbUpdate },
}));
vi.mock("@/db/schema", () => ({
  projects: { id: "id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("nanoid", () => ({ nanoid: () => "proj-new" }));

import { getAllProjects, createProject, updateProject } from "../projectService";

describe("projectService", () => {
  beforeEach(() => vi.clearAllMocks());

  // =====================
  // getAllProjects
  // =====================
  describe("getAllProjects", () => {
    it("전체 프로젝트 목록을 반환한다", async () => {
      const projects = [{ id: "1", name: "P1" }, { id: "2", name: "P2" }];
      mockAll.mockReturnValueOnce(projects);

      const result = await getAllProjects();

      expect(result).toEqual(projects);
    });
  });

  // =====================
  // createProject
  // =====================
  describe("createProject", () => {
    it("프로젝트를 생성하고 반환한다", async () => {
      const result = await createProject("My Project", "/path/to/repo");

      expect(result.id).toBe("proj-new");
      expect(result.name).toBe("My Project");
      expect(result.directoryPath).toBe("/path/to/repo");
      expect(result.defaultBranch).toBe("main");
      expect(mockDbInsert).toHaveBeenCalled();
    });

    it("defaultBranch를 지정할 수 있다", async () => {
      const result = await createProject("Project", "/repo", "develop");

      expect(result.defaultBranch).toBe("develop");
    });

    it("defaultBranch 미지정 시 main 기본값", async () => {
      const result = await createProject("Project", "/repo");

      expect(result.defaultBranch).toBe("main");
    });

    it("createdAt, updatedAt 타임스탬프를 설정한다", async () => {
      const before = Date.now();
      const result = await createProject("Project", "/repo");

      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.updatedAt).toBeGreaterThanOrEqual(before);
    });
  });

  // =====================
  // updateProject
  // =====================
  describe("updateProject", () => {
    it("프로젝트를 업데이트하고 결과를 반환한다", async () => {
      const updated = { id: "proj-1", name: "Updated Name" };
      mockGet.mockReturnValueOnce(updated);

      const result = await updateProject("proj-1", { name: "Updated Name" });

      expect(result).toEqual(updated);
      expect(mockChainSet).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Updated Name", updatedAt: expect.any(Number) })
      );
    });
  });
});
