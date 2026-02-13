import { spawn, ChildProcess } from "child_process";
import { db } from "@/db";
import { executionLogs } from "@/db/schema";
import { nanoid } from "nanoid";

export interface ExecutionResult {
  success: boolean;
  error?: string;
}

export async function executeClaude(
  prompt: string,
  cwd: string,
  taskId: string,
  runNumber: number,
  onLog?: (stream: string, content: string) => void
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const args = [
      "-p",
      prompt,
      "--output-format",
      "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
    ];

    const child: ChildProcess = spawn("claude", args, {
      cwd,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const saveLog = (stream: string, content: string) => {
      db.insert(executionLogs)
        .values({
          id: nanoid(),
          taskId,
          runNumber,
          stream,
          content,
          timestamp: Date.now(),
        })
        .run();
      onLog?.(stream, content);
    };

    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      saveLog("stdout", text);
    });

    child.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      saveLog("stderr", text);
    });

    child.on("error", (err) => {
      saveLog("system", `Process error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    child.on("close", (code) => {
      if (code === 0) {
        saveLog("system", "Process completed successfully");
        resolve({ success: true });
      } else {
        const errorMsg = stderr || `Process exited with code ${code}`;
        saveLog("system", `Process failed: ${errorMsg}`);
        resolve({ success: false, error: errorMsg });
      }
    });
  });
}
