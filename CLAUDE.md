# MAKO (Managed Agent Kanban Orchestrator) - 로컬 프로젝트 관리 웹앱

## 프로젝트 개요

로컬에서 동작하는 개인용 JIRA 스타일 프로젝트 관리 도구.
핵심 차별점: **Claude Code CLI 수동 실행** + **git worktree 기반 워크플로우**.
칸반 보드에서 작업 계획이 Ready 상태가 되면, 사용자가 "Execute Now" 버튼을 클릭하여 Claude Code가 작업을 수행하고 PR까지 생성한다.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, TypeScript, Turbopack)
- **DB**: SQLite (Drizzle ORM + better-sqlite3), WAL 모드
- **DnD**: @dnd-kit (core + sortable)
- **스타일**: Tailwind CSS
- **데이터 페칭**: SWR (클라이언트), fetch (서버)
- **마크다운**: react-markdown + remark-gfm

## 실행 방법

```bash
npm run dev        # 개발 서버 (http://localhost:3000)
npm run build      # 프로덕션 빌드
```

DB 파일은 `data/mako.db`에 자동 생성된다. 서버 시작 시 테이블도 자동 초기화.

## 칸반 워크플로우

```
Backlog → Plan → Ready → Working → Review → Done
(제목만)  (계획작성) (실행대기) (Claude실행) (PR검토) (머지완료)
```

- **Ready → Working**: 사용자가 "Execute Now" 클릭으로 수동 실행
- **Working → Review**: Claude 완료 후 자동 이동 (Claude가 push + PR 생성)
- **Review → Done**: 사용자가 머지 후 수동 이동

## 프로젝트 구조

```
src/
├── app/                          # Next.js App Router 페이지 & API
│   ├── api/
│   │   ├── projects/route.ts     # 프로젝트 CRUD
│   │   ├── tasks/route.ts        # 태스크 목록/생성
│   │   ├── tasks/[taskId]/       # 태스크 상세 CRUD + 로그
│   │   ├── board/reorder/        # DnD 위치/상태 업데이트
│   │   └── execute/              # 수동 실행 트리거 + SSE 상태
│   ├── board/[projectId]/        # 칸반 보드 페이지
│   ├── projects/                 # 프로젝트 목록/생성 페이지
│   └── task/[taskId]/            # 태스크 상세 페이지
├── components/
│   ├── board/                    # KanbanBoard, KanbanColumn, TaskCard, ColumnHeader
│   ├── task/                     # TaskDetailPanel, MarkdownEditor, ExecutionLog
│   └── layout/                   # AppShell, Sidebar
├── db/
│   ├── index.ts                  # DB 커넥션 싱글톤 + 테이블 초기화
│   └── schema.ts                 # Drizzle 스키마 (projects, tasks, execution_logs)
├── hooks/                        # useBoard, useTasks (SWR 기반)
├── lib/
│   ├── services/                 # 비즈니스 로직 + DB 접근 (서비스 레이어)
│   ├── claude/
│   │   ├── executor.ts           # claude CLI child_process 실행
│   │   └── promptBuilder.ts      # 태스크 → 프롬프트 변환
│   ├── git/
│   │   └── worktree.ts           # git worktree 생성/삭제
│   └── worker/
│       └── taskRunner.ts         # 전체 파이프라인 오케스트레이션
└── types/index.ts                # 공유 타입 정의
```

## DB 테이블

- **projects**: 프로젝트 (name, directory_path, default_branch)
- **tasks**: 태스크 (title, content, status, position, branch_name, worktree_path 등)
- **execution_logs**: 실행 로그 (task_id, run_number, stream, content, timestamp)

## 핵심 실행 파이프라인

1. 사용자가 Ready 태스크에서 "Execute Now" 클릭
2. `git worktree add .mako-worktrees/<branch> -b <branch> origin/<default>`
3. 태스크 → Working 상태 변경
4. `claude -p "<작업계획>" --output-format stream-json --dangerously-skip-permissions` (cwd: worktree)
5. stdout/stderr → execution_logs 테이블 저장
6. 성공 시: Claude가 push + PR 생성 → Review
7. 실패 시: 에러 저장 → Ready로 복귀 (재시도 가능)

## 코딩 컨벤션

### 레이어 분리 원칙
- **API 라우트** (`src/app/api/`): HTTP 관심사만 — 요청 파싱, 파라미터 검증, 서비스 호출, JSON 응답 포맷팅. DB 직접 접근 금지.
- **서비스** (`src/lib/services/`): 비즈니스 로직 + DB 접근. 새 기능 추가 시 여기에 로직 작성.
- **인프라** (`src/lib/claude/`, `src/lib/git/`, `src/lib/worker/`): 외부 시스템 연동 (CLI, git).
- 테스트는 `src/lib/` 하위에만 작성. API 라우트 테스트는 작성하지 않는다.

- API 라우트: Next.js App Router `route.ts` 형식, `NextRequest`/`NextResponse` 사용
- ID 생성: `nanoid` (v3)
- 타임스탬프: `Date.now()` (milliseconds epoch)
- 정렬: fractional indexing (position은 real 타입)
- 클라이언트 데이터 페칭: SWR with `refreshInterval`
- 컴포넌트: `"use client"` directive, 함수형 컴포넌트
- Next.js 16 params: `params`는 `Promise`로 받아서 `await` 또는 `use()`로 unwrap

## 주의사항

- `better-sqlite3`는 `next.config.ts`의 `serverExternalPackages`에 등록 필요
- SQLite는 `busy_timeout = 5000` 설정으로 멀티 워커 빌드 시 잠금 충돌 방지
- worktree는 대상 프로젝트의 `.mako-worktrees/` 디렉토리에 생성됨
