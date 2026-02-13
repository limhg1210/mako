import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Drizzle 체인 모킹 ---
const {
  mockGet,
  mockDbSelect,
  mockDbUpdate,
  mockChainSet,
  mockExecuteClaude,
  mockBuildPrompt,
  mockCreateWorktree,
} = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.get = vi.fn();

  return {
    mockGet: chain.get,
    mockDbSelect: vi.fn(() => chain),
    mockDbUpdate: vi.fn(() => chain),
    mockChainSet: chain.set,
    mockExecuteClaude: vi.fn(),
    mockBuildPrompt: vi.fn(() => "generated prompt"),
    mockCreateWorktree: vi.fn(() => "/worktree/path"),
  };
});

vi.mock("@/db", () => ({ db: { select: mockDbSelect, update: mockDbUpdate } }));
vi.mock("@/db/schema", () => ({
  tasks: { id: "id", projectId: "projectId", status: "status" },
  projects: { id: "id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/lib/claude/executor", () => ({ executeClaude: mockExecuteClaude }));
vi.mock("@/lib/claude/promptBuilder", () => ({ buildPrompt: mockBuildPrompt }));
vi.mock("@/lib/git/worktree", () => ({ createWorktree: mockCreateWorktree }));

import { runTask } from "../taskRunner";

// --- 헬퍼 ---
function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    projectId: "proj-1",
    title: "Test Task",
    content: "Plan content",
    status: "ready",
    retryCount: 0,
    ...overrides,
  };
}

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "proj-1",
    directoryPath: "/repo",
    defaultBranch: "main",
    ...overrides,
  };
}

describe("taskRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteClaude.mockResolvedValue({ success: true });
  });

  it("태스크가 없으면 에러를 던진다", async () => {
    mockGet.mockReturnValue(undefined);

    await expect(runTask("nonexistent")).rejects.toThrow("not in ready status");
  });

  it("태스크가 ready 상태가 아니면 에러를 던진다", async () => {
    mockGet.mockReturnValue(makeTask({ status: "working" }));

    await expect(runTask("task-1")).rejects.toThrow("not in ready status");
  });

  it("프로젝트가 없으면 에러를 던진다", async () => {
    mockGet
      .mockReturnValueOnce(makeTask()) // task lookup
      .mockReturnValueOnce(undefined); // project lookup

    await expect(runTask("task-1")).rejects.toThrow("not found");
  });

  it("성공 플로우: worktree → working → claude → review", async () => {
    const task = makeTask();
    const project = makeProject();
    mockGet
      .mockReturnValueOnce(task) // initial task lookup
      .mockReturnValueOnce(project) // project lookup
      .mockReturnValueOnce({ ...task, retryCount: 0 }); // currentTask for runNumber

    await runTask("task-1");

    // 1. worktree 생성
    expect(mockCreateWorktree).toHaveBeenCalledWith("/repo", expect.any(String), "main");

    // 2. status → working 업데이트
    expect(mockChainSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "working" })
    );

    // 3. Claude 실행
    expect(mockExecuteClaude).toHaveBeenCalledWith(
      "generated prompt",
      "/worktree/path",
      "task-1",
      1
    );

    // 4. status → review 업데이트
    expect(mockChainSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "review",
      })
    );
  });

  it("Claude 실행 실패 → ready로 복귀 + retryCount 증가", async () => {
    const task = makeTask();
    const project = makeProject();
    mockGet
      .mockReturnValueOnce(task)
      .mockReturnValueOnce(project)
      .mockReturnValueOnce({ ...task, retryCount: 0 });
    mockExecuteClaude.mockResolvedValue({
      success: false,
      error: "compilation failed",
    });

    await runTask("task-1");

    expect(mockChainSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ready",
        retryCount: 1,
        executionError: "compilation failed",
      })
    );
  });

  it("worktree 생성 실패 → ready로 복귀", async () => {
    const task = makeTask();
    const project = makeProject();
    mockGet
      .mockReturnValueOnce(task)
      .mockReturnValueOnce(project);
    mockCreateWorktree.mockImplementation(() => {
      throw new Error("branch already exists");
    });

    await runTask("task-1");

    expect(mockChainSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ready",
        executionError: "branch already exists",
      })
    );
  });

});
