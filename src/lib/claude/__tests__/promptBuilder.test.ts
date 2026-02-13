import { describe, it, expect } from "vitest";
import { buildPrompt } from "../promptBuilder";
import { Task } from "@/types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    projectId: "proj-1",
    title: "테스트 태스크",
    content: null,
    status: "ready",
    position: 1,
    branchName: null,
    worktreePath: null,
    retryCount: 0,
    executionError: null,
    executionStartedAt: null,
    executionFinishedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("promptBuilder", () => {
  it("제목을 포함한 프롬프트를 생성한다", () => {
    const result = buildPrompt(makeTask({ title: "로그인 기능 구현" }));

    expect(result).toContain("# Task: 로그인 기능 구현");
  });

  it("content가 있으면 Implementation Plan 섹션을 포함한다", () => {
    const result = buildPrompt(
      makeTask({ content: "1. API 엔드포인트 추가\n2. 인증 미들웨어 작성" })
    );

    expect(result).toContain("## Implementation Plan");
    expect(result).toContain("1. API 엔드포인트 추가");
    expect(result).toContain("2. 인증 미들웨어 작성");
  });

  it("content가 null이면 Implementation Plan 섹션을 생략한다", () => {
    const result = buildPrompt(makeTask({ content: null }));

    expect(result).not.toContain("## Implementation Plan");
  });

  it("Instructions 섹션을 항상 포함한다", () => {
    const result = buildPrompt(makeTask());

    expect(result).toContain("## Instructions");
    expect(result).toContain("Follow the implementation plan above carefully");
    expect(result).toContain("Push the branch and create a PR");
  });
});
