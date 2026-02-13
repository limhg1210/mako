import { describe, it, expect, vi, beforeEach } from "vitest";

// --- 모킹 ---
const { mockExecFileSync, mockExistsSync, mockMkdirSync, mockRmSync } =
  vi.hoisted(() => ({
    mockExecFileSync: vi.fn(),
    mockExistsSync: vi.fn(),
    mockMkdirSync: vi.fn(),
    mockRmSync: vi.fn(),
  }));

vi.mock("child_process", () => ({ execFileSync: mockExecFileSync }));
vi.mock("fs", () => ({
  default: {
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    rmSync: mockRmSync,
  },
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  rmSync: mockRmSync,
}));

import { createWorktree, removeWorktree, getWorktreePath } from "../worktree";

describe("worktree", () => {
  beforeEach(() => vi.clearAllMocks());

  // =====================
  // createWorktree
  // =====================
  describe("createWorktree", () => {
    /** existsSync is called twice: (1) base dir check, (2) worktree path check */
    function mockNoPriorWorktree() {
      // base dir exists, worktree path does not
      mockExistsSync
        .mockReturnValueOnce(true)   // base dir
        .mockReturnValueOnce(false); // worktree path
    }

    it("worktree 베이스 디렉토리가 없으면 생성한다", () => {
      mockExistsSync
        .mockReturnValueOnce(false)  // base dir
        .mockReturnValueOnce(false); // worktree path

      createWorktree("/repo", "feature-branch", "main");

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(".mako-worktrees"),
        { recursive: true }
      );
    });

    it("worktree 베이스 디렉토리가 있으면 생성하지 않는다", () => {
      mockNoPriorWorktree();

      createWorktree("/repo", "feature-branch", "main");

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it("git fetch origin을 먼저 실행한다", () => {
      mockNoPriorWorktree();

      createWorktree("/repo", "feature-branch", "main");

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        ["fetch", "origin"],
        expect.objectContaining({ cwd: "/repo" })
      );
    });

    it("fetch 실패해도 계속 진행한다 (오프라인 대응)", () => {
      mockNoPriorWorktree();
      mockExecFileSync
        .mockImplementationOnce(() => {
          throw new Error("network error");
        }) // fetch 실패
        .mockReturnValue(undefined);

      expect(() =>
        createWorktree("/repo", "feature-branch", "main")
      ).not.toThrow();
    });

    it("git worktree add 명령을 올바른 인자로 실행한다", () => {
      mockNoPriorWorktree();

      createWorktree("/repo", "my-branch", "develop");

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        [
          "worktree",
          "add",
          expect.stringContaining("my-branch"),
          "-b",
          "my-branch",
          "origin/develop",
        ],
        expect.objectContaining({ cwd: "/repo" })
      );
    });

    it("리모트가 없으면 로컬 브랜치에서 분기한다", () => {
      mockNoPriorWorktree();
      mockExecFileSync
        .mockImplementationOnce(() => { throw new Error("network error"); }) // fetch 실패
        .mockImplementationOnce(() => { throw new Error("No such remote 'origin'"); }) // remote get-url 실패
        .mockReturnValue(undefined);

      createWorktree("/repo", "my-branch", "main");

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        [
          "worktree",
          "add",
          expect.stringContaining("my-branch"),
          "-b",
          "my-branch",
          "main",
        ],
        expect.objectContaining({ cwd: "/repo" })
      );
    });

    it("worktree 경로를 반환한다", () => {
      mockNoPriorWorktree();

      const result = createWorktree("/repo", "feature-x", "main");

      expect(result).toContain(".mako-worktrees");
      expect(result).toContain("feature-x");
    });

    it("기존 worktree 디렉토리가 있으면 제거 후 재생성한다", () => {
      mockExistsSync
        .mockReturnValueOnce(true)  // base dir
        .mockReturnValueOnce(true); // worktree path exists

      createWorktree("/repo", "my-branch", "main");

      // Should attempt worktree remove
      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        ["worktree", "remove", expect.stringContaining("my-branch"), "--force"],
        expect.objectContaining({ cwd: "/repo" })
      );
      // Should still create the worktree
      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        ["worktree", "add", expect.stringContaining("my-branch"), "-b", "my-branch", "origin/main"],
        expect.objectContaining({ cwd: "/repo" })
      );
    });

    it("worktree remove 실패 시 수동 정리 후 계속 진행한다", () => {
      mockExistsSync
        .mockReturnValueOnce(true)  // base dir
        .mockReturnValueOnce(true); // worktree path exists
      mockExecFileSync
        .mockReturnValueOnce(undefined)  // fetch
        .mockReturnValueOnce(undefined)  // remote get-url
        .mockImplementationOnce(() => { throw new Error("worktree remove failed"); }) // worktree remove fails
        .mockReturnValueOnce(undefined)  // prune
        .mockReturnValueOnce(undefined)  // branch -D
        .mockReturnValueOnce(undefined); // worktree add

      createWorktree("/repo", "my-branch", "main");

      expect(mockRmSync).toHaveBeenCalledWith(
        expect.stringContaining("my-branch"),
        { recursive: true, force: true }
      );
      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        ["worktree", "prune"],
        expect.objectContaining({ cwd: "/repo" })
      );
    });

    it("기존 브랜치가 있으면 삭제 후 재생성한다", () => {
      mockNoPriorWorktree();

      createWorktree("/repo", "my-branch", "main");

      // Should attempt branch deletion (even if it doesn't exist, it's called)
      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        ["branch", "-D", "my-branch"],
        expect.objectContaining({ cwd: "/repo" })
      );
    });
  });

  // =====================
  // removeWorktree
  // =====================
  describe("removeWorktree", () => {
    it("git worktree remove --force를 실행한다", () => {
      removeWorktree("/repo", "/repo/.mako-worktrees/branch");

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        ["worktree", "remove", "/repo/.mako-worktrees/branch", "--force"],
        expect.objectContaining({ cwd: "/repo" })
      );
    });

    it("git worktree remove 실패 시 수동 정리 후 prune 실행", () => {
      mockExecFileSync
        .mockImplementationOnce(() => {
          throw new Error("worktree remove failed");
        }) // remove 실패
        .mockReturnValueOnce(undefined); // prune 성공
      mockExistsSync.mockReturnValue(true);

      removeWorktree("/repo", "/tmp/wt");

      expect(mockRmSync).toHaveBeenCalledWith("/tmp/wt", {
        recursive: true,
        force: true,
      });
      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        ["worktree", "prune"],
        expect.objectContaining({ cwd: "/repo" })
      );
    });

    it("수동 정리 시 디렉토리가 없으면 rmSync을 생략한다", () => {
      mockExecFileSync.mockImplementationOnce(() => {
        throw new Error("failed");
      });
      mockExistsSync.mockReturnValue(false);

      removeWorktree("/repo", "/tmp/wt");

      expect(mockRmSync).not.toHaveBeenCalled();
    });
  });

  // =====================
  // getWorktreePath
  // =====================
  describe("getWorktreePath", () => {
    it("올바른 경로를 반환한다", () => {
      const result = getWorktreePath("/repo", "feature-branch");

      expect(result).toBe("/repo/.mako-worktrees/feature-branch");
    });
  });
});
