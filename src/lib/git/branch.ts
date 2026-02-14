import { execFileSync } from "child_process";

export function switchBranch(
  repoPath: string,
  branchName: string,
  defaultBranch: string
): string {
  // Fetch latest from remote
  try {
    execFileSync("git", ["fetch", "origin"], { cwd: repoPath, stdio: "pipe" });
  } catch {
    // Continue even if fetch fails (might be offline)
  }

  // Check if origin remote exists
  let base = `origin/${defaultBranch}`;
  try {
    execFileSync("git", ["remote", "get-url", "origin"], { cwd: repoPath, stdio: "pipe" });
  } catch {
    base = defaultBranch;
  }

  // Delete existing branch if exists
  try {
    execFileSync("git", ["branch", "-D", branchName], { cwd: repoPath, stdio: "pipe" });
  } catch {
    // Branch doesn't exist — expected on first run
  }

  // Create and switch to new branch from default branch
  execFileSync(
    "git",
    ["checkout", "-b", branchName, base],
    { cwd: repoPath, stdio: "pipe" }
  );

  return repoPath;
}

export function switchBack(repoPath: string, defaultBranch: string): void {
  try {
    execFileSync("git", ["checkout", defaultBranch], { cwd: repoPath, stdio: "pipe" });
  } catch {
    // Best effort — branch might already be on default
  }
}
