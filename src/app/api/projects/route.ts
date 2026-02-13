import { NextRequest, NextResponse } from "next/server";
import { getAllProjects, createProject, updateProject } from "@/lib/services/projectService";

/** GET /api/projects — 전체 프로젝트 목록 조회 */
export async function GET() {
  const allProjects = await getAllProjects();
  return NextResponse.json(allProjects);
}

/** POST /api/projects — 새 프로젝트 생성 (name, directoryPath 필수) */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, directoryPath, defaultBranch } = body;

  if (!name || !directoryPath) {
    return NextResponse.json({ error: "name and directoryPath are required" }, { status: 400 });
  }

  const project = await createProject(name, directoryPath, defaultBranch);
  return NextResponse.json(project, { status: 201 });
}

/** PUT /api/projects — 프로젝트 정보 수정 (id 필수) */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await updateProject(id, updates);
  return NextResponse.json(updated);
}
