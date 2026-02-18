import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecFileSync } = vi.hoisted(() => ({
  mockExecFileSync: vi.fn(),
}));

vi.mock("child_process", () => ({ execFileSync: mockExecFileSync }));

import { cleanupBranch } from "../branch";

describe("cleanupBranch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("checkout → pull → branch -D 순서로 실행한다", () => {
    cleanupBranch("/repo", "main", "feat-1");

    const calls = mockExecFileSync.mock.calls;
    expect(calls).toHaveLength(3);
    expect(calls[0]).toEqual([
      "git",
      ["checkout", "main"],
      expect.objectContaining({ cwd: "/repo" }),
    ]);
    expect(calls[1]).toEqual([
      "git",
      ["pull", "origin", "main"],
      expect.objectContaining({ cwd: "/repo" }),
    ]);
    expect(calls[2]).toEqual([
      "git",
      ["branch", "-D", "feat-1"],
      expect.objectContaining({ cwd: "/repo" }),
    ]);
  });

  it("checkout 실패 시 이후 단계를 실행하지 않는다", () => {
    mockExecFileSync.mockImplementationOnce(() => {
      throw new Error("checkout failed");
    });

    expect(() => cleanupBranch("/repo", "main", "feat-1")).toThrow(
      "checkout failed"
    );
    expect(mockExecFileSync).toHaveBeenCalledTimes(1);
  });

  it("pull 실패 시 branch 삭제를 실행하지 않는다", () => {
    mockExecFileSync
      .mockReturnValueOnce(undefined) // checkout 성공
      .mockImplementationOnce(() => {
        throw new Error("pull failed");
      });

    expect(() => cleanupBranch("/repo", "main", "feat-1")).toThrow(
      "pull failed"
    );
    expect(mockExecFileSync).toHaveBeenCalledTimes(2);
  });

  it("branch -D 실패 시 에러를 전파한다", () => {
    mockExecFileSync
      .mockReturnValueOnce(undefined) // checkout
      .mockReturnValueOnce(undefined) // pull
      .mockImplementationOnce(() => {
        throw new Error("branch delete failed");
      });

    expect(() => cleanupBranch("/repo", "main", "feat-1")).toThrow(
      "branch delete failed"
    );
  });
});
