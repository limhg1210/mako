import { execFileSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

const WORKTREE_BASE = path.join(os.homedir(), ".mako-worktrees");

export function createWorktree(
  repoPath: string,
  branchName: string,
  defaultBranch: string,
  projectName: string
): string {
  const worktreeBase = path.join(WORKTREE_BASE, projectName);
  const worktreePath = path.join(worktreeBase, branchName);

  // Ensure worktree base directory exists
  if (!fs.existsSync(worktreeBase)) {
    fs.mkdirSync(worktreeBase, { recursive: true });
  }

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

  // Clean up stale worktree if exists
  if (fs.existsSync(worktreePath)) {
    try {
      execFileSync("git", ["worktree", "remove", worktreePath, "--force"], { cwd: repoPath, stdio: "pipe" });
    } catch {
      fs.rmSync(worktreePath, { recursive: true, force: true });
      try { execFileSync("git", ["worktree", "prune"], { cwd: repoPath, stdio: "pipe" }); } catch {}
    }
  }

  // Delete existing branch if exists
  try {
    execFileSync("git", ["branch", "-D", branchName], { cwd: repoPath, stdio: "pipe" });
  } catch {
    // Branch doesn't exist — expected on first run
  }

  // Create worktree with new branch from default branch
  execFileSync(
    "git",
    ["worktree", "add", worktreePath, "-b", branchName, base],
    { cwd: repoPath, stdio: "pipe" }
  );

  return worktreePath;
}

export function removeWorktree(repoPath: string, worktreePath: string): void {
  try {
    execFileSync("git", ["worktree", "remove", worktreePath, "--force"], {
      cwd: repoPath,
      stdio: "pipe",
    });
  } catch {
    // If worktree remove fails, try manual cleanup
    if (fs.existsSync(worktreePath)) {
      fs.rmSync(worktreePath, { recursive: true, force: true });
    }
    try {
      execFileSync("git", ["worktree", "prune"], { cwd: repoPath, stdio: "pipe" });
    } catch {
      // Ignore prune errors
    }
  }
}

export function getWorktreePath(projectName: string, branchName: string): string {
  return path.join(WORKTREE_BASE, projectName, branchName);
}

