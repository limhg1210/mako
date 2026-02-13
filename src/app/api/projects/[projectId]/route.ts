import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/services/projectService";

/** GET /api/projects/:projectId — 프로젝트 상세 조회 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

/** PUT /api/projects/:projectId — 프로젝트 수정 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();

  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const updated = await updateProject(projectId, body);
  return NextResponse.json(updated);
}
