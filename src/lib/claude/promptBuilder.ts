import { Task } from "@/types";

export function buildPrompt(task: Task): string {
  const parts: string[] = [];

  parts.push(`# Task: ${task.title}`);
  parts.push("");

  if (task.content) {
    parts.push("## Implementation Plan");
    parts.push("");
    parts.push(task.content);
    parts.push("");
  }

  parts.push("## Instructions");
  parts.push("");
  parts.push("- Follow the implementation plan above carefully.");
  parts.push("- Write clean, well-structured code.");
  parts.push("- Make sure the code compiles and passes any existing tests.");
  parts.push("- Commit your changes with a descriptive commit message.");
  parts.push("- Push the branch and create a PR using gh CLI.");

  return parts.join("\n");
}
