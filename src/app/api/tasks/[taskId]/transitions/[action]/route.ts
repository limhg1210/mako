import { NextRequest, NextResponse } from "next/server";
import { dispatchAction } from "@/lib/services/transitionService";

/** POST /api/tasks/:taskId/transitions/:action — 태스크 상태 전환 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; action: string }> }
) {
  const { taskId, action } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // No body — acceptable for most actions
  }

  if (action === "execute") {
    const mode = body?.mode;
    if (mode !== "worktree" && mode !== "branch") {
      return NextResponse.json(
        { error: "mode must be 'worktree' or 'branch'" },
        { status: 400 }
      );
    }
  }

  const promise = dispatchAction(action, taskId, body);

  if (!promise) {
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  }

  const result = await promise;

  if (!result.ok) {
    const statusCode =
      result.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status: statusCode });
  }

  if (action === "execute") {
    return NextResponse.json({ ok: true, message: "Execution started" });
  }

  return NextResponse.json({ ok: true, task: result.task });
}
