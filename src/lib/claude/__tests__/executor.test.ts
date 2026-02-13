import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

// --- child_process.spawn 모킹 ---
const { mockSpawn, mockDbInsert } = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.values = vi.fn(() => chain);
  chain.run = vi.fn();

  return {
    mockSpawn: vi.fn(),
    mockDbInsert: vi.fn(() => chain),
  };
});

vi.mock("child_process", () => ({ spawn: mockSpawn }));
vi.mock("@/db", () => ({ db: { insert: mockDbInsert } }));
vi.mock("@/db/schema", () => ({ executionLogs: "executionLogs" }));
vi.mock("nanoid", () => ({ nanoid: () => "log-id" }));

import { executeClaude } from "../executor";

// --- 헬퍼: 가짜 ChildProcess ---
function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

describe("executor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("성공 시 { success: true } 반환", async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = executeClaude("prompt", "/cwd", "task-1", 1);

    proc.stdout.emit("data", Buffer.from("output line"));
    proc.emit("close", 0);

    const result = await promise;
    expect(result).toEqual({ success: true });
  });

  it("실패 시 (exit code != 0) { success: false, error } 반환", async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = executeClaude("prompt", "/cwd", "task-1", 1);

    proc.stderr.emit("data", Buffer.from("something went wrong"));
    proc.emit("close", 1);

    const result = await promise;
    expect(result).toEqual({
      success: false,
      error: "something went wrong",
    });
  });

  it("프로세스 에러 시 { success: false, error } 반환", async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = executeClaude("prompt", "/cwd", "task-1", 1);

    proc.emit("error", new Error("spawn ENOENT"));

    const result = await promise;
    expect(result).toEqual({ success: false, error: "spawn ENOENT" });
  });

  it("stdout/stderr 로그를 DB에 저장한다", async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = executeClaude("prompt", "/cwd", "task-1", 1);

    proc.stdout.emit("data", Buffer.from("out1"));
    proc.stderr.emit("data", Buffer.from("err1"));
    proc.emit("close", 0);

    await promise;

    // stdout(out1) + stderr(err1) + system(completed) = 3번 insert
    expect(mockDbInsert).toHaveBeenCalledTimes(3);
  });

  it("onLog 콜백이 있으면 호출한다", async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);
    const onLog = vi.fn();

    const promise = executeClaude("prompt", "/cwd", "task-1", 1, onLog);

    proc.stdout.emit("data", Buffer.from("output"));
    proc.emit("close", 0);

    await promise;

    expect(onLog).toHaveBeenCalledWith("stdout", "output");
    expect(onLog).toHaveBeenCalledWith("system", "Process completed successfully");
  });

  it("올바른 인자로 spawn을 호출한다", async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = executeClaude("my prompt", "/work/dir", "task-1", 1);
    proc.emit("close", 0);
    await promise;

    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      ["-p", "my prompt", "--output-format", "stream-json", "--verbose", "--dangerously-skip-permissions"],
      expect.objectContaining({ cwd: "/work/dir" })
    );
  });
});
