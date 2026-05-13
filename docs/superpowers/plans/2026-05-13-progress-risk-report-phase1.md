# 진도 및 리스크 보고서 — Phase 1 구현 계획 (MVP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/dashboard/progress-risk` 페이지의 MVP — task CRUD + 9단계 입력 + 담당자 다대다 + 평면 리스트 그리드를 동작하는 상태로 구축.

**Architecture:** 평면 `ProgressTask` 모델 + `ProgressTaskAssignee` 다대다 + `ProgressStage` enum(9). 기존 WBS와 독립. Next.js Route Handler API + Prisma 7 (adapter-pg) + React Query 5 + Tailwind 그리드. 알고리즘(forecast/critical-path/충돌)은 Phase 2에서 추가.

**Tech Stack:** Next.js 16.1, React 19.2, Prisma 7.2, @prisma/adapter-pg, @tanstack/react-query 5, Tailwind 4, TypeScript 5, Vitest 2.1

**Reference:** `docs/superpowers/specs/2026-05-13-progress-risk-report-design.md` (디자인 문서 — 모든 결정 사항의 출처)

**Phase 1 미포함 (Phase 2/3로 이월):** Gantt 시각화, Critical Path 알고리즘, forecast 자동 전파, 인력 충돌 감지, 진단 배너, 권장 조치 카드, 인력부하 히트맵, KPI의 "공수 부족/일정 초과" 계산.

---

## 파일 구조 (이 plan에서 생성/수정)

```
prisma/schema.prisma                                  # 수정 (모델 3개 + enum 추가)

src/app/api/progress-tasks/
├── route.ts                                          # GET list / POST create
├── [id]/route.ts                                     # GET / PATCH / DELETE
├── [id]/assignees/route.ts                           # POST (추가)
└── [id]/assignees/[userId]/route.ts                  # PATCH / DELETE

src/lib/api.ts                                        # 수정 (progressTasks namespace 추가)

src/hooks/useProgressTasks.ts                         # 생성

src/app/dashboard/progress-risk/
├── page.tsx                                          # 페이지 라우트 (조합)
├── types.ts                                          # ProgressTask 등 로컬 타입
├── constants.ts                                      # STAGE_ORDER, STAGE_LABEL 등
└── components/
    ├── index.ts
    ├── PageHeader.tsx
    ├── KpiRow.tsx                                    # Phase 1: 기본 4장만
    ├── FilterBar.tsx
    ├── TaskGrid.tsx                                  # 메인 그리드
    ├── TaskRow.tsx                                   # 1행 (인라인 편집)
    ├── StageStepper.tsx                              # 9 dot 진행 바
    ├── PredecessorSelect.tsx                         # 선행 드롭다운
    ├── AssigneeChips.tsx                             # 담당자 칩 + add 버튼
    ├── AssigneeModal.tsx                             # 담당자 관리 모달
    └── AddTaskModal.tsx                              # task 추가 폼

src/app/dashboard/progress-risk/__tests__/            # Vitest 단위 테스트
├── constants.test.ts
└── StageStepper.test.tsx
```

---

## Task 1: Prisma 스키마 추가 + 마이그레이션

**Files:**
- Modify: `prisma/schema.prisma` (Project / User 모델에 관계 추가, 신규 모델 3개)

- [ ] **Step 1: `prisma/schema.prisma`에 enum 추가**

파일 끝에 추가:

```prisma
// ============================================
// 진도 리스크 — 단계 enum (9개 고정 흐름)
// ============================================
enum ProgressStage {
  ANALYSIS          // ① 분석
  DESIGN            // ② 설계
  IMPLEMENTATION    // ③ 구현
  UNIT_TEST         // ④ 단위테스트
  IT_TEST           // ⑤ IT 테스트
  TRAINING          // ⑥ 교육
  INTEGRATION_TEST  // ⑦ 통합테스트
  MIGRATION         // ⑧ 이행
  STABILIZATION     // ⑨ 안정화
}
```

- [ ] **Step 2: `ProgressTask` 모델 추가**

같은 파일에 이어서:

```prisma
// ============================================
// 진도 task — 평면 (task 1개 = 기능 1개)
// 기존 WBS와 독립. predecessor 단일 선행.
// ============================================
model ProgressTask {
  id              String        @id @default(uuid())
  projectId       String
  code            String?       // T-001 자동 부여
  name            String        // "주문등록" 등 기능명
  category        String?       // 대분류 라벨
  description     String?
  order           Int           @default(0)

  // 일정
  startDate       DateTime
  endDate         DateTime
  actualStartDate DateTime?
  actualEndDate   DateTime?

  // 진행
  currentStage    ProgressStage @default(ANALYSIS)
  status          TaskStatus    @default(PENDING)
  progress        Int           @default(0)
  effortMd        Float?

  // 의존성 (단일 선행)
  predecessorId   String?
  isParallel      Boolean       @default(true)

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // 관계
  project         Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  predecessor     ProgressTask? @relation("ProgressTaskDeps", fields: [predecessorId], references: [id], onDelete: SetNull)
  successors      ProgressTask[] @relation("ProgressTaskDeps")
  assignees       ProgressTaskAssignee[]

  @@unique([projectId, code])
  @@index([projectId])
  @@index([predecessorId])
  @@map("progress_tasks")
}

// ============================================
// 진도 task 담당자 (다대다 + 역할 + 참여율)
// ============================================
model ProgressTaskAssignee {
  id            String       @id @default(uuid())
  taskId        String
  userId        String
  role          String?      // "설계자" "개발자" "테스터" 등 자유 텍스트
  allocationPct Int          @default(100)  // 1~100
  assignedAt    DateTime     @default(now())

  task          ProgressTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([taskId, userId])
  @@index([userId])
  @@map("progress_task_assignees")
}
```

- [ ] **Step 3: `Project` 모델에 관계 추가**

`model Project` 안의 관계 목록 끝에 추가 (다른 `xxx XxxX[]` 라인들 옆):

```prisma
  progressTasks ProgressTask[] // 진도 task 목록
```

- [ ] **Step 4: `User` 모델에 관계 추가**

`model User` 안의 관계 목록 끝에 추가:

```prisma
  progressAssignments ProgressTaskAssignee[] // 진도 task 담당자 할당
```

- [ ] **Step 5: 마이그레이션 실행 + Prisma Client 재생성**

Run:
```bash
npx prisma migrate dev --name add_progress_task
npx prisma generate
```

Expected:
- 마이그레이션 파일 생성 (`prisma/migrations/...add_progress_task/migration.sql`)
- "Your database is now in sync with your schema"
- Prisma Client 재생성 완료

확인:
```bash
npx prisma format
```

- [ ] **Step 6: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "$(cat <<'EOF'
feat: 진도 리스크 데이터 모델 추가 (ProgressTask + Assignee + Stage)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 로컬 타입 + 상수 정의

**Files:**
- Create: `src/app/dashboard/progress-risk/types.ts`
- Create: `src/app/dashboard/progress-risk/constants.ts`
- Create: `src/app/dashboard/progress-risk/__tests__/constants.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `__tests__/constants.test.ts`

```typescript
/**
 * @file src/app/dashboard/progress-risk/__tests__/constants.test.ts
 * @description STAGE_ORDER / STAGE_LABEL 상수 검증
 */
import { describe, it, expect } from "vitest";
import { STAGE_ORDER, STAGE_LABEL, STAGE_SHORT } from "../constants";

describe("ProgressStage 상수", () => {
  it("STAGE_ORDER는 9개 항목을 순서대로 가진다", () => {
    expect(STAGE_ORDER).toEqual([
      "ANALYSIS", "DESIGN", "IMPLEMENTATION",
      "UNIT_TEST", "IT_TEST", "TRAINING",
      "INTEGRATION_TEST", "MIGRATION", "STABILIZATION",
    ]);
  });

  it("STAGE_LABEL은 9개 단계 모두에 한글 라벨이 있다", () => {
    for (const stage of STAGE_ORDER) {
      expect(STAGE_LABEL[stage]).toBeTruthy();
      expect(typeof STAGE_LABEL[stage]).toBe("string");
    }
  });

  it("STAGE_SHORT는 9개 단계 모두에 짧은 라벨이 있다", () => {
    for (const stage of STAGE_ORDER) {
      expect(STAGE_SHORT[stage]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `npx vitest run src/app/dashboard/progress-risk/__tests__/constants.test.ts`
Expected: FAIL — "Cannot find module '../constants'"

- [ ] **Step 3: `types.ts` 생성**

```typescript
/**
 * @file src/app/dashboard/progress-risk/types.ts
 * @description
 * 진도 및 리스크 보고서 페이지의 로컬 타입 정의
 *
 * 초보자 가이드:
 * 1. **ProgressStage**: 9단계 enum (분석 ~ 안정화)
 * 2. **ProgressTask**: 페이지에서 사용하는 task 형태 (담당자 포함)
 * 3. **Verdict**: 진단 결과 (Phase 2에서 본격 활용)
 */

export type ProgressStage =
  | "ANALYSIS"
  | "DESIGN"
  | "IMPLEMENTATION"
  | "UNIT_TEST"
  | "IT_TEST"
  | "TRAINING"
  | "INTEGRATION_TEST"
  | "MIGRATION"
  | "STABILIZATION";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "HOLDING" | "DELAYED" | "COMPLETED" | "CANCELLED";

export interface ProgressTaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  role: string | null;
  allocationPct: number;
  assignedAt: string;
  user: { id: string; name: string; email: string; profileImage?: string | null };
}

export interface ProgressTask {
  id: string;
  projectId: string;
  code: string | null;
  name: string;
  category: string | null;
  description: string | null;
  order: number;
  startDate: string;
  endDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  currentStage: ProgressStage;
  status: TaskStatus;
  progress: number;
  effortMd: number | null;
  predecessorId: string | null;
  isParallel: boolean;
  assignees: ProgressTaskAssignee[];
  createdAt: string;
  updatedAt: string;
}

export type Verdict = "NORMAL" | "RESOURCE_SHORTAGE" | "SCHEDULE_OVERRUN" | "BOTH";
```

- [ ] **Step 4: `constants.ts` 생성**

```typescript
/**
 * @file src/app/dashboard/progress-risk/constants.ts
 * @description
 * 진도 및 리스크 보고서 페이지의 상수 정의
 *
 * 초보자 가이드:
 * 1. **STAGE_ORDER**: 9단계 enum의 순서 (forecast/progress 계산용)
 * 2. **STAGE_LABEL**: 각 단계의 한글 풀네임
 * 3. **STAGE_SHORT**: 그리드 표시용 짧은 라벨
 */
import type { ProgressStage } from "./types";

export const STAGE_ORDER: ProgressStage[] = [
  "ANALYSIS", "DESIGN", "IMPLEMENTATION",
  "UNIT_TEST", "IT_TEST", "TRAINING",
  "INTEGRATION_TEST", "MIGRATION", "STABILIZATION",
];

export const STAGE_LABEL: Record<ProgressStage, string> = {
  ANALYSIS: "분석",
  DESIGN: "설계",
  IMPLEMENTATION: "구현",
  UNIT_TEST: "단위테스트",
  IT_TEST: "IT 테스트",
  TRAINING: "교육",
  INTEGRATION_TEST: "통합테스트",
  MIGRATION: "이행",
  STABILIZATION: "안정화",
};

export const STAGE_SHORT: Record<ProgressStage, string> = {
  ANALYSIS: "분석", DESIGN: "설계", IMPLEMENTATION: "구현",
  UNIT_TEST: "단위", IT_TEST: "IT", TRAINING: "교육",
  INTEGRATION_TEST: "통합", MIGRATION: "이행", STABILIZATION: "안정",
};

/** 단계 진행률 자동 계산 (currentStage가 N번째면 N/9) */
export function stageProgressPct(stage: ProgressStage): number {
  return Math.round(((STAGE_ORDER.indexOf(stage) + 1) / STAGE_ORDER.length) * 100);
}

/** 자주 쓰는 역할 옵션 */
export const ROLE_OPTIONS = ["분석자", "설계자", "개발자", "테스터", "교육담당", "운영", "기타"];
```

- [ ] **Step 5: 테스트 실행해 통과 확인**

Run: `npx vitest run src/app/dashboard/progress-risk/__tests__/constants.test.ts`
Expected: PASS — 3 tests passed

- [ ] **Step 6: 커밋**

```bash
git add src/app/dashboard/progress-risk/types.ts \
        src/app/dashboard/progress-risk/constants.ts \
        src/app/dashboard/progress-risk/__tests__/constants.test.ts
git commit -m "$(cat <<'EOF'
feat: 진도 리스크 페이지 타입/상수 정의

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: API 라우트 — list / create

**Files:**
- Create: `src/app/api/progress-tasks/route.ts`

- [ ] **Step 1: 기존 issues 라우트 패턴 참고**

`src/app/api/issues/route.ts`를 읽어 패턴 확인:
- `getAuthenticatedUser()` 인증
- `NextResponse.json()` 응답
- `searchParams`로 필터링

- [ ] **Step 2: `progress-tasks/route.ts` 생성**

```typescript
/**
 * @file src/app/api/progress-tasks/route.ts
 * @description
 * 진도 task API — 목록 조회 / 생성
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

const ASSIGNEE_INCLUDE = {
  assignees: {
    include: {
      user: { select: { id: true, name: true, email: true, profileImage: true } },
    },
  },
} as const;

/** GET /api/progress-tasks?projectId=... */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const tasks = await prisma.progressTask.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    include: ASSIGNEE_INCLUDE,
  });
  return NextResponse.json(tasks);
}

/** POST /api/progress-tasks */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { projectId, name, startDate, endDate, category, description, predecessorId } = body;

  if (!projectId || !name || !startDate || !endDate) {
    return NextResponse.json({ error: "projectId/name/startDate/endDate required" }, { status: 400 });
  }

  // 자동 코드 (T-001, T-002, ...) — 프로젝트 내 max order + 1
  const existingCount = await prisma.progressTask.count({ where: { projectId } });
  const code = `T-${String(existingCount + 1).padStart(3, "0")}`;

  const task = await prisma.progressTask.create({
    data: {
      projectId,
      code,
      name,
      category: category ?? null,
      description: description ?? null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      predecessorId: predecessorId ?? null,
      order: existingCount,
    },
    include: ASSIGNEE_INCLUDE,
  });
  return NextResponse.json(task);
}
```

- [ ] **Step 3: 개발 서버에서 수동 확인**

Run: `npm run dev`
Manual:
1. 브라우저로 로그인된 세션 유지
2. DevTools fetch로 `GET /api/progress-tasks?projectId=<유효_프로젝트ID>` → `[]` (빈 배열) 응답 확인
3. POST로 task 1개 생성 → JSON 응답에 `code: "T-001"` 포함

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/progress-tasks/route.ts
git commit -m "$(cat <<'EOF'
feat: 진도 task API — list/create 라우트 추가

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: API 라우트 — get / update / delete

**Files:**
- Create: `src/app/api/progress-tasks/[id]/route.ts`

- [ ] **Step 1: `[id]/route.ts` 생성**

```typescript
/**
 * @file src/app/api/progress-tasks/[id]/route.ts
 * @description
 * 진도 task — 단건 조회 / 수정(인라인 편집) / 삭제
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

const ASSIGNEE_INCLUDE = {
  assignees: {
    include: { user: { select: { id: true, name: true, email: true, profileImage: true } } },
  },
} as const;

interface Ctx { params: Promise<{ id: string }>; }

/** GET /api/progress-tasks/[id] */
export async function GET(request: NextRequest, { params }: Ctx) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.progressTask.findUnique({ where: { id }, include: ASSIGNEE_INCLUDE });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

/** PATCH /api/progress-tasks/[id] */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.category !== undefined) data.category = body.category;
  if (body.description !== undefined) data.description = body.description;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.actualStartDate !== undefined) data.actualStartDate = body.actualStartDate ? new Date(body.actualStartDate) : null;
  if (body.actualEndDate !== undefined) data.actualEndDate = body.actualEndDate ? new Date(body.actualEndDate) : null;
  if (body.currentStage !== undefined) data.currentStage = body.currentStage;
  if (body.status !== undefined) data.status = body.status;
  if (body.predecessorId !== undefined) data.predecessorId = body.predecessorId;
  if (body.effortMd !== undefined) data.effortMd = body.effortMd;
  if (body.order !== undefined) data.order = body.order;

  // currentStage가 바뀌면 progress 자동 재계산
  if (body.currentStage !== undefined) {
    const STAGE_ORDER = ["ANALYSIS","DESIGN","IMPLEMENTATION","UNIT_TEST","IT_TEST","TRAINING","INTEGRATION_TEST","MIGRATION","STABILIZATION"];
    const idx = STAGE_ORDER.indexOf(body.currentStage);
    if (idx >= 0) data.progress = Math.round(((idx + 1) / 9) * 100);
  }

  const task = await prisma.progressTask.update({ where: { id }, data, include: ASSIGNEE_INCLUDE });
  return NextResponse.json(task);
}

/** DELETE /api/progress-tasks/[id] */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.progressTask.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
```

- [ ] **Step 2: 수동 확인**

Run: `npm run dev`
- DevTools fetch로 PATCH 호출 → 부분 업데이트 정상 동작
- DELETE → 200 + `assignees`도 cascade 삭제됨

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/progress-tasks/[id]/route.ts
git commit -m "$(cat <<'EOF'
feat: 진도 task API — get/update/delete + 단계 변경 시 progress 자동 계산

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: API 라우트 — 담당자 관리

**Files:**
- Create: `src/app/api/progress-tasks/[id]/assignees/route.ts`
- Create: `src/app/api/progress-tasks/[id]/assignees/[userId]/route.ts`

- [ ] **Step 1: 담당자 추가 라우트 생성** — `[id]/assignees/route.ts`

```typescript
/**
 * @file src/app/api/progress-tasks/[id]/assignees/route.ts
 * @description 진도 task에 담당자 추가
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

interface Ctx { params: Promise<{ id: string }>; }

/** POST /api/progress-tasks/[id]/assignees */
export async function POST(request: NextRequest, { params }: Ctx) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;
  const { userId, role, allocationPct } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const pct = Math.max(1, Math.min(100, Number(allocationPct ?? 100)));

  const assignee = await prisma.progressTaskAssignee.create({
    data: { taskId, userId, role: role ?? null, allocationPct: pct },
    include: { user: { select: { id: true, name: true, email: true, profileImage: true } } },
  });
  return NextResponse.json(assignee);
}
```

- [ ] **Step 2: 담당자 수정/삭제 라우트 생성** — `[id]/assignees/[userId]/route.ts`

```typescript
/**
 * @file src/app/api/progress-tasks/[id]/assignees/[userId]/route.ts
 * @description 진도 task 담당자 수정 / 삭제
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

interface Ctx { params: Promise<{ id: string; userId: string }>; }

/** PATCH /api/progress-tasks/[id]/assignees/[userId] */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId, userId } = await params;
  const { role, allocationPct } = await request.json();

  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (allocationPct !== undefined) data.allocationPct = Math.max(1, Math.min(100, Number(allocationPct)));

  const updated = await prisma.progressTaskAssignee.update({
    where: { taskId_userId: { taskId, userId } },
    data,
    include: { user: { select: { id: true, name: true, email: true, profileImage: true } } },
  });
  return NextResponse.json(updated);
}

/** DELETE /api/progress-tasks/[id]/assignees/[userId] */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId, userId } = await params;
  await prisma.progressTaskAssignee.delete({ where: { taskId_userId: { taskId, userId } } });
  return NextResponse.json({ message: "Deleted" });
}
```

- [ ] **Step 3: 수동 확인 + 커밋**

Run: `npm run dev`
- DevTools에서 담당자 추가/수정/삭제 fetch 호출 → 정상 동작

```bash
git add src/app/api/progress-tasks/[id]/assignees/
git commit -m "$(cat <<'EOF'
feat: 진도 task 담당자 다대다 API (add/update/remove)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: api.ts에 progressTasks namespace 추가

**Files:**
- Modify: `src/lib/api.ts` (issues namespace 옆에 추가)

- [ ] **Step 1: api.ts 끝부분 namespace 추가**

`api.ts`에서 마지막 namespace 다음(파일 끝의 `};` 직전)에 추가:

```typescript
  /** 진도 리스크 task API */
  progressTasks: {
    list: (params: { projectId: string }) =>
      get<ProgressTask[]>("/api/progress-tasks", params),
    get: (id: string) => get<ProgressTask>(`/api/progress-tasks/${id}`),
    create: (data: {
      projectId: string;
      name: string;
      startDate: string;
      endDate: string;
      category?: string;
      description?: string;
      predecessorId?: string;
    }) => post<ProgressTask>("/api/progress-tasks", data),
    update: (id: string, data: Partial<ProgressTask>) =>
      patch<ProgressTask>(`/api/progress-tasks/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/progress-tasks/${id}`),

    addAssignee: (taskId: string, data: { userId: string; role?: string; allocationPct?: number }) =>
      post<ProgressTaskAssignee>(`/api/progress-tasks/${taskId}/assignees`, data),
    updateAssignee: (taskId: string, userId: string, data: { role?: string; allocationPct?: number }) =>
      patch<ProgressTaskAssignee>(`/api/progress-tasks/${taskId}/assignees/${userId}`, data),
    removeAssignee: (taskId: string, userId: string) =>
      del<{ message: string }>(`/api/progress-tasks/${taskId}/assignees/${userId}`),
  },
```

- [ ] **Step 2: api.ts 상단 import 또는 type re-export 추가**

`api.ts` 파일 상단의 type re-export 구역에 추가 (기존 `export type { Issue }` 같은 라인들 옆):

```typescript
export type {
  ProgressTask,
  ProgressTaskAssignee,
  ProgressStage,
} from "@/app/dashboard/progress-risk/types";
```

- [ ] **Step 3: TypeScript 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: 커밋**

```bash
git add src/lib/api.ts
git commit -m "$(cat <<'EOF'
feat: api.ts에 progressTasks namespace 추가 (CRUD + 담당자)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: React Query 훅

**Files:**
- Create: `src/hooks/useProgressTasks.ts`
- Modify: `src/hooks/index.ts` (export 추가)

- [ ] **Step 1: `useProgressTasks.ts` 생성**

기존 `useIssues.ts` 패턴 따름:

```typescript
/**
 * @file src/hooks/useProgressTasks.ts
 * @description
 * 진도 task React Query 훅 모음
 *
 * 초보자 가이드:
 * 1. **useProgressTasks**: task 목록 (담당자 포함)
 * 2. **useCreateProgressTask**: task 생성
 * 3. **useUpdateProgressTask**: 인라인 편집용 부분 수정
 * 4. **useDeleteProgressTask**: 삭제
 * 5. **useAddAssignee / useUpdateAssignee / useRemoveAssignee**: 담당자 관리
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ProgressTask } from "@/lib/api";

export const progressTaskKeys = {
  all: ["progress-tasks"] as const,
  lists: () => [...progressTaskKeys.all, "list"] as const,
  list: (projectId: string) => [...progressTaskKeys.lists(), projectId] as const,
};

export function useProgressTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: progressTaskKeys.list(projectId ?? ""),
    queryFn: () => api.progressTasks.list({ projectId: projectId! }),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
}

export function useCreateProgressTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string; name: string; startDate: string; endDate: string;
      category?: string; description?: string; predecessorId?: string;
    }) => api.progressTasks.create(data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: progressTaskKeys.list(vars.projectId) }),
  });
}

export function useUpdateProgressTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProgressTask> }) =>
      api.progressTasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) }),
  });
}

export function useDeleteProgressTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.progressTasks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) }),
  });
}

export function useAddAssignee(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { userId: string; role?: string; allocationPct?: number } }) =>
      api.progressTasks.addAssignee(taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) }),
  });
}

export function useUpdateAssignee(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, userId, data }: { taskId: string; userId: string; data: { role?: string; allocationPct?: number } }) =>
      api.progressTasks.updateAssignee(taskId, userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) }),
  });
}

export function useRemoveAssignee(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      api.progressTasks.removeAssignee(taskId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressTaskKeys.list(projectId) }),
  });
}
```

- [ ] **Step 2: `hooks/index.ts`에 export 추가**

`src/hooks/index.ts`에 한 줄 추가:

```typescript
export * from "./useProgressTasks";
```

- [ ] **Step 3: TypeScript 확인 + 커밋**

```bash
npx tsc --noEmit
git add src/hooks/useProgressTasks.ts src/hooks/index.ts
git commit -m "$(cat <<'EOF'
feat: 진도 task React Query 훅 7개 추가

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 페이지 라우트 + PageHeader 컴포넌트

**Files:**
- Create: `src/app/dashboard/progress-risk/page.tsx`
- Create: `src/app/dashboard/progress-risk/components/index.ts`
- Create: `src/app/dashboard/progress-risk/components/PageHeader.tsx`

- [ ] **Step 1: `page.tsx` 생성 (빈 화면 + 헤더만)**

```tsx
/**
 * @file src/app/dashboard/progress-risk/page.tsx
 * @description
 * 진도 및 리스크 보고서 메인 페이지 (Phase 1: 리스트 탭만)
 *
 * 초보자 가이드:
 * 1. **헤더**: 페이지 타이틀 + 액션 버튼
 * 2. **본문**: 빈 상태 또는 task 그리드 (Task 9에서 추가)
 */
"use client";

import { useProject } from "@/contexts";
import { useProgressTasks } from "@/hooks";
import { PageHeader } from "./components";
import { Icon } from "@/components/ui";

export default function ProgressRiskPage() {
  const { selectedProject } = useProject();
  const { data: tasks = [], isLoading } = useProgressTasks(selectedProject?.id);

  return (
    <div className="p-6 space-y-6">
      <PageHeader project={selectedProject} taskCount={tasks.length} />

      {!selectedProject && (
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
          <Icon name="folder_off" size="xl" className="text-text-secondary mb-4" />
          <p className="text-text-secondary">먼저 프로젝트를 선택해주세요.</p>
        </div>
      )}

      {selectedProject && isLoading && (
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
          <p className="text-text-secondary">불러오는 중...</p>
        </div>
      )}

      {selectedProject && !isLoading && tasks.length === 0 && (
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-12 text-center">
          <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
          <p className="text-text-secondary mb-2">등록된 task가 없습니다.</p>
          <p className="text-xs text-text-secondary opacity-60">우측 상단의 "+ task 추가"로 시작하세요.</p>
        </div>
      )}

      {/* TaskGrid는 Task 9에서 추가 */}
    </div>
  );
}
```

- [ ] **Step 2: `components/PageHeader.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/PageHeader.tsx
 * @description 진도 리스크 페이지 헤더 (타이틀 + 프로젝트 배지 + 액션 버튼)
 */
import { Icon, Button } from "@/components/ui";
import type { Project } from "@/lib/api";

interface PageHeaderProps {
  project: Project | null;
  taskCount: number;
  onAddTask?: () => void;        // Task 9에서 연결
  onImportExcel?: () => void;
  onExportExcel?: () => void;
}

export function PageHeader({ project, taskCount, onAddTask, onImportExcel, onExportExcel }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Icon name="trending_up" className="text-[#00f3ff]" />
          <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
            PROGRESS RISK
          </span>
          <span className="text-slate-400 text-sm font-normal ml-1">/ 진도 및 리스크 보고서</span>
        </h1>
        <p className="text-text-secondary mt-1">실시간 일정·공수 리스크 진단 ({taskCount}개 task)</p>
      </div>
      <div className="flex items-center gap-3">
        {project && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Icon name="folder" size="sm" className="text-primary" />
            <span className="text-sm font-medium text-primary">{project.name}</span>
          </div>
        )}
        <Button variant="outline" leftIcon="download" onClick={onExportExcel}>엑셀 다운로드</Button>
        <Button variant="outline" leftIcon="upload" onClick={onImportExcel}>엑셀 가져오기</Button>
        <Button variant="primary" leftIcon="add" onClick={onAddTask}>task 추가</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `components/index.ts` 생성**

```typescript
/**
 * @file src/app/dashboard/progress-risk/components/index.ts
 * @description 컴포넌트 배럴 export
 */
export { PageHeader } from "./PageHeader";
```

- [ ] **Step 4: 빌드/페이지 확인**

Run: `npm run dev`
브라우저: `http://localhost:3000/dashboard/progress-risk`
- 프로젝트 미선택 → "먼저 프로젝트를 선택" 메시지
- 프로젝트 선택 → "등록된 task가 없습니다" 빈 상태
- 헤더 그라데이션 타이틀 + 3개 버튼 (현재 동작 안 함 — 다음 task에서 연결)

- [ ] **Step 5: 커밋**

```bash
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: 진도 리스크 페이지 라우트 + PageHeader 컴포넌트

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: AddTaskModal — task 추가 폼

**Files:**
- Create: `src/app/dashboard/progress-risk/components/AddTaskModal.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: `AddTaskModal.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/AddTaskModal.tsx
 * @description task 추가 모달 — 필수 5필드 입력
 */
"use client";
import { useState } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { useCreateProgressTask } from "@/hooks";
import type { ProgressTask } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  existingTasks: ProgressTask[];  // 선행 task 드롭다운용
}

export function AddTaskModal({ open, onClose, projectId, existingTasks }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [predecessorId, setPredecessorId] = useState("");

  const create = useCreateProgressTask();

  const handleSubmit = async () => {
    if (!name || !startDate || !endDate) return;
    await create.mutateAsync({
      projectId, name, startDate, endDate,
      category: category || undefined,
      predecessorId: predecessorId || undefined,
    });
    setName(""); setCategory(""); setStartDate(""); setEndDate(""); setPredecessorId("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="새 task 추가">
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-text-secondary mb-1">기능명 *</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="예: 주문등록" />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">카테고리</label>
          <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="예: 기준관리" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">시작일 *</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">종료일 *</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">선행 task (선택)</label>
          <select
            value={predecessorId}
            onChange={e => setPredecessorId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm"
          >
            <option value="">(없음)</option>
            {existingTasks.map(t => (
              <option key={t.id} value={t.id}>{t.code} {t.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" onClick={onClose}>취소</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!name || !startDate || !endDate || create.isPending}>
          {create.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: `index.ts`에 export 추가**

```typescript
export { PageHeader } from "./PageHeader";
export { AddTaskModal } from "./AddTaskModal";
```

- [ ] **Step 3: `page.tsx`에서 모달 연결**

`page.tsx`의 useState/모달 추가:

```tsx
// page.tsx 안에 추가
import { useState } from "react";
import { PageHeader, AddTaskModal } from "./components";

// component 본문에:
const [addModalOpen, setAddModalOpen] = useState(false);

// JSX에 PageHeader 옆에 onAddTask 추가:
<PageHeader project={selectedProject} taskCount={tasks.length} onAddTask={() => setAddModalOpen(true)} />

// JSX 끝에 모달:
{selectedProject && (
  <AddTaskModal
    open={addModalOpen}
    onClose={() => setAddModalOpen(false)}
    projectId={selectedProject.id}
    existingTasks={tasks}
  />
)}
```

- [ ] **Step 4: 브라우저 수동 확인**

Run: `npm run dev`
- "task 추가" 클릭 → 모달 열림
- 기능명/시작일/종료일 입력 → 저장 → 모달 닫힘 → 빈 상태가 "1개 task" 표시로 갱신

- [ ] **Step 5: 커밋**

```bash
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: AddTaskModal — task 추가 폼 (필수 5필드)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: TaskGrid + TaskRow — 기본 read-only 그리드

**Files:**
- Create: `src/app/dashboard/progress-risk/components/TaskGrid.tsx`
- Create: `src/app/dashboard/progress-risk/components/TaskRow.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: `TaskGrid.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/TaskGrid.tsx
 * @description task 그리드 — 헤더 + 행 목록
 */
import type { ProgressTask } from "../types";
import { TaskRow } from "./TaskRow";

interface Props {
  tasks: ProgressTask[];
  projectId: string;
}

const COLS = "46px 70px 1fr 80px 80px 200px 90px 1fr 80px 30px";

export function TaskGrid({ tasks, projectId }: Props) {
  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
      <div
        className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1200px]"
        style={{ gridTemplateColumns: COLS }}
      >
        <div>#</div>
        <div>코드</div>
        <div>기능명</div>
        <div>시작</div>
        <div>종료</div>
        <div>단계</div>
        <div>선행</div>
        <div>담당자</div>
        <div>상태</div>
        <div></div>
      </div>

      {tasks.map((task, idx) => (
        <TaskRow
          key={task.id}
          index={idx + 1}
          task={task}
          projectId={projectId}
          allTasks={tasks}
          gridCols={COLS}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `TaskRow.tsx` 생성 (read-only 먼저)**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/TaskRow.tsx
 * @description task 그리드 1행 (read-only 표시 — Task 11에서 인라인 편집 추가)
 */
"use client";
import type { ProgressTask } from "../types";
import { STAGE_LABEL } from "../constants";

interface Props {
  index: number;
  task: ProgressTask;
  projectId: string;
  allTasks: ProgressTask[];
  gridCols: string;
}

export function TaskRow({ index, task, allTasks, gridCols }: Props) {
  const predecessor = allTasks.find(t => t.id === task.predecessorId);

  return (
    <div
      className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1200px] text-sm"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="text-text-secondary">{index}</div>
      <div className="text-text-secondary">{task.code}</div>
      <div className="font-medium">{task.name}</div>
      <div className="text-text-secondary">{task.startDate.slice(0, 10)}</div>
      <div className="text-text-secondary">{task.endDate.slice(0, 10)}</div>
      <div>
        <span className="px-2 py-1 rounded text-xs bg-primary/10 text-primary">
          {STAGE_LABEL[task.currentStage]}
        </span>
      </div>
      <div className="text-xs text-text-secondary">{predecessor?.code ?? "-"}</div>
      <div className="text-xs">
        {task.assignees.map(a => a.user.name).join(", ") || "-"}
      </div>
      <div className="text-xs text-text-secondary">{task.status}</div>
      <div className="text-text-secondary cursor-pointer">⋮</div>
    </div>
  );
}
```

- [ ] **Step 3: `index.ts` 업데이트**

```typescript
export { PageHeader } from "./PageHeader";
export { AddTaskModal } from "./AddTaskModal";
export { TaskGrid } from "./TaskGrid";
export { TaskRow } from "./TaskRow";
```

- [ ] **Step 4: `page.tsx`에서 그리드 렌더**

`page.tsx`의 빈 상태 분기 다음에 추가:

```tsx
{selectedProject && !isLoading && tasks.length > 0 && (
  <TaskGrid tasks={tasks} projectId={selectedProject.id} />
)}
```

import에 `TaskGrid` 추가.

- [ ] **Step 5: 브라우저 수동 확인**

Run: `npm run dev`
- Task 9에서 추가했던 task가 그리드에 1행으로 표시됨
- 컬럼 정렬, hover 효과, 다크모드 확인

- [ ] **Step 6: 커밋**

```bash
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: TaskGrid + TaskRow — task 평면 그리드 (read-only)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: StageStepper — 9 dot 진행 바 (클릭 변경)

**Files:**
- Create: `src/app/dashboard/progress-risk/components/StageStepper.tsx`
- Create: `src/app/dashboard/progress-risk/__tests__/StageStepper.test.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/components/TaskRow.tsx` (단계 컬럼 교체)

- [ ] **Step 1: 실패 테스트 작성** — `__tests__/StageStepper.test.tsx`

```typescript
/**
 * @file src/app/dashboard/progress-risk/__tests__/StageStepper.test.tsx
 * @description StageStepper 컴포넌트 단위 테스트 — stageProgressPct 검증 위주
 */
import { describe, it, expect } from "vitest";
import { stageProgressPct } from "../constants";

describe("stageProgressPct", () => {
  it("ANALYSIS는 11%", () => expect(stageProgressPct("ANALYSIS")).toBe(11));
  it("IMPLEMENTATION은 33%", () => expect(stageProgressPct("IMPLEMENTATION")).toBe(33));
  it("STABILIZATION은 100%", () => expect(stageProgressPct("STABILIZATION")).toBe(100));
});
```

- [ ] **Step 2: 테스트 실행 (이미 PASS 가능성 있음 — `constants.ts`에 함수 추가했으므로)**

Run: `npx vitest run src/app/dashboard/progress-risk/__tests__/StageStepper.test.tsx`
Expected: PASS — 3 tests

- [ ] **Step 3: `StageStepper.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/StageStepper.tsx
 * @description 9 dot 단계 진행 바 — 클릭으로 currentStage 변경
 */
"use client";
import type { ProgressStage } from "../types";
import { STAGE_ORDER, STAGE_LABEL, STAGE_SHORT } from "../constants";

interface Props {
  currentStage: ProgressStage;
  onChange: (stage: ProgressStage) => void;
  compact?: boolean;  // 그리드용 (점만), 모달용 (라벨 포함)
  disabled?: boolean;
}

export function StageStepper({ currentStage, onChange, compact = true, disabled = false }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="단계 진행 바">
      {STAGE_ORDER.map((stage, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const bg = isCurrent
          ? "bg-[#00f3ff] shadow-[0_0_4px_rgba(0,243,255,0.6)]"
          : isDone
            ? "bg-green-500"
            : "bg-white/10 dark:bg-white/5";

        return (
          <button
            key={stage}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(stage)}
            title={`${STAGE_LABEL[stage]} (${idx + 1}/${STAGE_ORDER.length})`}
            className={`${bg} rounded-sm transition-all hover:scale-110 ${
              compact ? "w-3 h-3" : "px-2 py-1 text-[10px] text-white"
            } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            aria-label={STAGE_LABEL[stage]}
            aria-current={isCurrent ? "step" : undefined}
          >
            {!compact && STAGE_SHORT[stage]}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: `TaskRow.tsx`에서 단계 컬럼 교체**

기존 `<span ... STAGE_LABEL[task.currentStage] ...>` 부분을 교체:

```tsx
import { StageStepper } from "./StageStepper";
import { useUpdateProgressTask } from "@/hooks";

// 컴포넌트 내부:
const update = useUpdateProgressTask(/* projectId — prop으로 받음 */ task.projectId);

// 기존 단계 컬럼을 다음으로 교체:
<div>
  <StageStepper
    currentStage={task.currentStage}
    onChange={(stage) => update.mutate({ id: task.id, data: { currentStage: stage } })}
  />
</div>
```

- [ ] **Step 5: `index.ts` 추가 + 수동 확인**

```typescript
export { StageStepper } from "./StageStepper";
```

브라우저:
- 그리드 행의 단계 컬럼에 9개 dot 표시
- dot 클릭 시 즉시 색상 변화 + DB 반영 (새로고침해도 유지)
- hover시 단계명 툴팁

- [ ] **Step 6: 커밋**

```bash
npx vitest run
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: StageStepper — 9 dot 단계 진행 바 (클릭으로 변경)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: 인라인 편집 — 이름 / 시작·종료일 / 카테고리

**Files:**
- Modify: `src/app/dashboard/progress-risk/components/TaskRow.tsx`

- [ ] **Step 1: TaskRow의 read-only 셀들을 input/contentEditable로 교체**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/TaskRow.tsx
 * @description task 그리드 1행 (인라인 편집 + 단계 stepper)
 */
"use client";
import { useState, useEffect } from "react";
import type { ProgressTask } from "../types";
import { useUpdateProgressTask, useDeleteProgressTask } from "@/hooks";
import { StageStepper } from "./StageStepper";

interface Props {
  index: number;
  task: ProgressTask;
  projectId: string;
  allTasks: ProgressTask[];
  gridCols: string;
}

function useDebouncedUpdate<T>(value: T, onSave: (v: T) => void, delay = 500) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onSave(local), delay);
    return () => clearTimeout(t);
  }, [local]);  // eslint-disable-line react-hooks/exhaustive-deps
  return [local, setLocal] as const;
}

export function TaskRow({ index, task, projectId, allTasks, gridCols }: Props) {
  const update = useUpdateProgressTask(projectId);
  const remove = useDeleteProgressTask(projectId);

  const [name, setName] = useDebouncedUpdate(task.name, v => update.mutate({ id: task.id, data: { name: v } }));
  const [startDate, setStartDate] = useDebouncedUpdate(task.startDate.slice(0, 10), v => update.mutate({ id: task.id, data: { startDate: v } }));
  const [endDate, setEndDate] = useDebouncedUpdate(task.endDate.slice(0, 10), v => update.mutate({ id: task.id, data: { endDate: v } }));

  const predecessor = allTasks.find(t => t.id === task.predecessorId);

  return (
    <div
      className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1200px] text-sm"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="text-text-secondary">{index}</div>
      <div className="text-text-secondary text-xs">{task.code}</div>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        className="bg-transparent border-0 focus:outline-none focus:bg-white/5 px-1 py-0.5 rounded font-medium"
      />
      <input
        type="date"
        value={startDate}
        onChange={e => setStartDate(e.target.value)}
        className="bg-transparent border-0 focus:outline-none focus:bg-white/5 px-1 py-0.5 rounded text-text-secondary text-xs"
      />
      <input
        type="date"
        value={endDate}
        onChange={e => setEndDate(e.target.value)}
        className="bg-transparent border-0 focus:outline-none focus:bg-white/5 px-1 py-0.5 rounded text-text-secondary text-xs"
      />
      <div>
        <StageStepper
          currentStage={task.currentStage}
          onChange={stage => update.mutate({ id: task.id, data: { currentStage: stage } })}
        />
      </div>
      <div className="text-xs text-text-secondary">{predecessor?.code ?? "-"}</div>
      <div className="text-xs">{task.assignees.map(a => a.user.name).join(", ") || "-"}</div>
      <div className="text-xs text-text-secondary">{task.status}</div>
      <button
        onClick={() => confirm(`${task.code} ${task.name}을(를) 삭제하시겠습니까?`) && remove.mutate(task.id)}
        className="text-text-secondary hover:text-error"
        aria-label="삭제"
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 브라우저 확인**

- 이름/날짜 셀 클릭 후 변경 → 500ms 후 자동 저장
- 새로고침해도 변경 유지
- ✕ 버튼 → 확인 후 삭제

- [ ] **Step 3: 커밋**

```bash
git add src/app/dashboard/progress-risk/components/TaskRow.tsx
git commit -m "$(cat <<'EOF'
feat: TaskRow 인라인 편집 (이름/일정 debounce 저장) + 삭제

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: PredecessorSelect — 선행 task 드롭다운

**Files:**
- Create: `src/app/dashboard/progress-risk/components/PredecessorSelect.tsx`
- Modify: `src/app/dashboard/progress-risk/components/TaskRow.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`

- [ ] **Step 1: `PredecessorSelect.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/PredecessorSelect.tsx
 * @description 선행 task 드롭다운 — 자기 자신과 순환 의존성 task는 제외
 */
"use client";
import type { ProgressTask } from "../types";

interface Props {
  value: string | null;
  taskId: string;
  allTasks: ProgressTask[];
  onChange: (predecessorId: string | null) => void;
}

/** 순환 의존성 방지: 자기 자신과 자신을 선행으로 둔 task들 제외 */
function getInvalidPredecessors(taskId: string, allTasks: ProgressTask[]): Set<string> {
  const invalid = new Set<string>([taskId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of allTasks) {
      if (!invalid.has(t.id) && t.predecessorId && invalid.has(t.predecessorId)) {
        invalid.add(t.id);
        changed = true;
      }
    }
  }
  return invalid;
}

export function PredecessorSelect({ value, taskId, allTasks, onChange }: Props) {
  const invalid = getInvalidPredecessors(taskId, allTasks);
  const candidates = allTasks.filter(t => !invalid.has(t.id));

  return (
    <select
      value={value ?? ""}
      onChange={e => onChange(e.target.value || null)}
      className="bg-transparent border-0 focus:outline-none focus:bg-white/5 text-xs text-text-secondary cursor-pointer rounded px-1"
    >
      <option value="">-</option>
      {candidates.map(t => (
        <option key={t.id} value={t.id}>{t.code}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: `TaskRow.tsx`의 선행 컬럼 교체**

기존 `<div className="text-xs ...">{predecessor?.code ?? "-"}</div>` 를 다음으로 교체:

```tsx
<PredecessorSelect
  value={task.predecessorId}
  taskId={task.id}
  allTasks={allTasks}
  onChange={pid => update.mutate({ id: task.id, data: { predecessorId: pid } })}
/>
```

import 추가.

- [ ] **Step 3: `index.ts` 추가 + 브라우저 확인**

```typescript
export { PredecessorSelect } from "./PredecessorSelect";
```

- 드롭다운에 자기 자신 안 보임
- A → B로 설정 후, B의 드롭다운에 A 안 보임 (순환 방지)

- [ ] **Step 4: 커밋**

```bash
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: PredecessorSelect — 선행 task 드롭다운 (순환 방지)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: AssigneeChips + AssigneeModal — 담당자 관리

**Files:**
- Create: `src/app/dashboard/progress-risk/components/AssigneeChips.tsx`
- Create: `src/app/dashboard/progress-risk/components/AssigneeModal.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/components/TaskRow.tsx`

- [ ] **Step 1: `AssigneeChips.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/AssigneeChips.tsx
 * @description task 담당자 칩 + add 버튼. 클릭 시 모달 오픈.
 */
"use client";
import { useState } from "react";
import type { ProgressTask } from "../types";
import { AssigneeModal } from "./AssigneeModal";

interface Props {
  task: ProgressTask;
  projectId: string;
}

export function AssigneeChips({ task, projectId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-wrap gap-1 items-center text-left hover:bg-white/5 rounded px-1 py-0.5 w-full"
      >
        {task.assignees.length === 0 ? (
          <span className="text-xs text-text-secondary">+ 담당자 추가</span>
        ) : (
          task.assignees.map(a => (
            <span
              key={a.id}
              className="px-2 py-0.5 bg-purple-500/15 border border-purple-500/30 rounded-full text-[10px] text-purple-300"
              title={`${a.role ?? "역할 미지정"} · ${a.allocationPct}%`}
            >
              {a.user.name}
            </span>
          ))
        )}
      </button>

      <AssigneeModal
        open={open}
        onClose={() => setOpen(false)}
        task={task}
        projectId={projectId}
      />
    </>
  );
}
```

- [ ] **Step 2: `AssigneeModal.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/AssigneeModal.tsx
 * @description 담당자 관리 모달 — 추가/수정/삭제 + 역할/참여율
 */
"use client";
import { useState } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { useUsers, useAddAssignee, useUpdateAssignee, useRemoveAssignee } from "@/hooks";
import type { ProgressTask } from "../types";
import { ROLE_OPTIONS } from "../constants";

interface Props {
  open: boolean;
  onClose: () => void;
  task: ProgressTask;
  projectId: string;
}

export function AssigneeModal({ open, onClose, task, projectId }: Props) {
  const { data: users = [] } = useUsers();
  const add = useAddAssignee(projectId);
  const updateA = useUpdateAssignee(projectId);
  const remove = useRemoveAssignee(projectId);

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPct, setNewPct] = useState(100);

  const availableUsers = users.filter(u => !task.assignees.some(a => a.userId === u.id));

  const handleAdd = async () => {
    if (!newUserId) return;
    await add.mutateAsync({ taskId: task.id, data: { userId: newUserId, role: newRole || undefined, allocationPct: newPct } });
    setNewUserId(""); setNewRole(""); setNewPct(100);
  };

  return (
    <Modal open={open} onClose={onClose} title={`담당자 — ${task.code} ${task.name}`}>
      <div className="space-y-2">
        {task.assignees.map(a => (
          <div key={a.id} className="grid grid-cols-[1.4fr_0.9fr_60px_30px] gap-2 items-center p-2 bg-surface dark:bg-background-dark rounded">
            <div className="text-sm">{a.user.name}</div>
            <select
              defaultValue={a.role ?? ""}
              onChange={e => updateA.mutate({ taskId: task.id, userId: a.userId, data: { role: e.target.value } })}
              className="text-xs bg-transparent border border-border rounded px-2 py-1"
            >
              <option value="">역할 선택</option>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <Input
              type="number"
              min={1}
              max={100}
              defaultValue={a.allocationPct}
              onBlur={e => updateA.mutate({ taskId: task.id, userId: a.userId, data: { allocationPct: Number(e.target.value) } })}
              className="text-xs text-center"
            />
            <button
              onClick={() => remove.mutate({ taskId: task.id, userId: a.userId })}
              className="text-text-secondary hover:text-error"
            >✕</button>
          </div>
        ))}

        <div className="grid grid-cols-[1.4fr_0.9fr_60px_30px] gap-2 items-center p-2 bg-white/5 rounded border border-dashed border-white/10">
          <select value={newUserId} onChange={e => setNewUserId(e.target.value)} className="text-xs bg-transparent border border-border rounded px-2 py-1">
            <option value="">+ 담당자 선택</option>
            {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={newRole} onChange={e => setNewRole(e.target.value)} className="text-xs bg-transparent border border-border rounded px-2 py-1">
            <option value="">역할</option>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <Input type="number" min={1} max={100} value={newPct} onChange={e => setNewPct(Number(e.target.value))} className="text-xs text-center" />
          <button onClick={handleAdd} disabled={!newUserId} className="text-primary disabled:opacity-30">+</button>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button variant="primary" onClick={onClose}>닫기</Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: `index.ts`에 export 추가**

```typescript
export { AssigneeChips } from "./AssigneeChips";
export { AssigneeModal } from "./AssigneeModal";
```

- [ ] **Step 4: `TaskRow.tsx`의 담당자 컬럼 교체**

기존 `<div className="text-xs">{task.assignees.map(...).join(", ") || "-"}</div>` 를:

```tsx
<AssigneeChips task={task} projectId={projectId} />
```

import 추가.

- [ ] **Step 5: 브라우저 확인**

- 담당자 칩 클릭 → 모달 오픈
- 사용자 선택 + 역할 + 참여율 입력 + `+` → 칩에 추가됨
- 역할/참여율 변경 → blur 시 저장
- ✕ → 삭제

- [ ] **Step 6: 커밋**

```bash
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: AssigneeChips + AssigneeModal — 담당자 다대다 + 역할/참여율 관리

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: FilterBar — 검색 / 필터 핀 / 카테고리·담당자 드롭다운

**Files:**
- Create: `src/app/dashboard/progress-risk/components/FilterBar.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: `FilterBar.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/FilterBar.tsx
 * @description task 그리드 상단 필터 바 (검색 + 필터 핀 + 카테고리/담당자 드롭다운)
 */
"use client";
import type { ProgressTask } from "../types";
import { Icon, Input } from "@/components/ui";

export interface Filters {
  search: string;
  status: "all" | "delayed" | "in_progress" | "completed";
  category: string;
  userId: string;
}

interface Props {
  tasks: ProgressTask[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function FilterBar({ tasks, filters, onChange }: Props) {
  const categories = [...new Set(tasks.map(t => t.category).filter((c): c is string => !!c))];
  const users = [...new Map(tasks.flatMap(t => t.assignees).map(a => [a.userId, a.user])).values()];

  const counts = {
    all: tasks.length,
    delayed: tasks.filter(t => t.status === "DELAYED").length,
    in_progress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    completed: tasks.filter(t => t.status === "COMPLETED").length,
  };

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const pillClass = (key: Filters["status"]) =>
    `px-2.5 py-1 rounded-full border text-xs cursor-pointer ${
      filters.status === key
        ? "bg-primary/15 border-primary/40 text-primary"
        : "bg-white/5 border-white/10 text-text-secondary"
    }`;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="w-64">
        <Input leftIcon="search" placeholder="task 검색..." value={filters.search} onChange={e => set({ search: e.target.value })} />
      </div>

      <button className={pillClass("all")} onClick={() => set({ status: "all" })}>전체 {counts.all}</button>
      <button className={pillClass("delayed")} onClick={() => set({ status: "delayed" })}>지연 {counts.delayed}</button>
      <button className={pillClass("in_progress")} onClick={() => set({ status: "in_progress" })}>진행중 {counts.in_progress}</button>
      <button className={pillClass("completed")} onClick={() => set({ status: "completed" })}>완료 {counts.completed}</button>

      <select value={filters.category} onChange={e => set({ category: e.target.value })} className="text-xs px-2 py-1.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark">
        <option value="">카테고리 ▾</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <select value={filters.userId} onChange={e => set({ userId: e.target.value })} className="text-xs px-2 py-1.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark">
        <option value="">담당자 ▾</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    </div>
  );
}

export function applyFilters(tasks: ProgressTask[], f: Filters): ProgressTask[] {
  return tasks.filter(t => {
    if (f.search && !t.name.toLowerCase().includes(f.search.toLowerCase()) && !t.code?.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.status === "delayed" && t.status !== "DELAYED") return false;
    if (f.status === "in_progress" && t.status !== "IN_PROGRESS") return false;
    if (f.status === "completed" && t.status !== "COMPLETED") return false;
    if (f.category && t.category !== f.category) return false;
    if (f.userId && !t.assignees.some(a => a.userId === f.userId)) return false;
    return true;
  });
}
```

- [ ] **Step 2: `index.ts`에 export**

```typescript
export { FilterBar, applyFilters, type Filters } from "./FilterBar";
```

- [ ] **Step 3: `page.tsx`에서 필터 연결**

```tsx
import { FilterBar, applyFilters, type Filters } from "./components";

// 컴포넌트 내부:
const [filters, setFilters] = useState<Filters>({ search: "", status: "all", category: "", userId: "" });
const filteredTasks = applyFilters(tasks, filters);

// JSX 그리드 위에 추가:
{selectedProject && tasks.length > 0 && (
  <FilterBar tasks={tasks} filters={filters} onChange={setFilters} />
)}

// 그리드에 filteredTasks 전달:
<TaskGrid tasks={filteredTasks} projectId={selectedProject.id} />
```

- [ ] **Step 4: 브라우저 확인**

- 검색어 입력 → 즉시 필터링
- 필터 핀 클릭 → 활성화 + 그리드 갱신
- 카테고리/담당자 드롭다운 → 동작
- 필터 모두 초기화 시 전체 표시

- [ ] **Step 5: 커밋**

```bash
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: FilterBar — 검색 + 상태 핀 + 카테고리/담당자 드롭다운

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: KpiRow — Phase 1 기본 카운트 4장

**Files:**
- Create: `src/app/dashboard/progress-risk/components/KpiRow.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: `KpiRow.tsx` 생성 (Phase 1: 단순 카운트만)**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/KpiRow.tsx
 * @description KPI 카드 — Phase 1: 기본 카운트 4장 (공수부족/일정초과는 Phase 2)
 */
import type { ProgressTask } from "../types";
import { Icon } from "@/components/ui";
import { STAGE_LABEL } from "../constants";

interface Props {
  tasks: ProgressTask[];
}

export function KpiRow({ tasks }: Props) {
  const total = tasks.length;
  const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const completed = tasks.filter(t => t.status === "COMPLETED").length;
  const delayed = tasks.filter(t => t.status === "DELAYED").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard icon="list_alt" iconClass="text-primary" label="총 task" value={total} />
      <KpiCard icon="play_circle" iconClass="text-success" label="진행 중" value={inProgress} />
      <KpiCard icon="check_circle" iconClass="text-primary" label="완료" value={completed} />
      <KpiCard icon="error" iconClass="text-error" label="지연" value={delayed} alert={delayed > 0} />
    </div>
  );
}

function KpiCard({ icon, iconClass, label, value, alert }: { icon: string; iconClass: string; label: string; value: number; alert?: boolean }) {
  return (
    <div className={`border rounded-xl p-3 ${alert ? "bg-error/5 border-error/30" : "bg-background-white dark:bg-surface-dark border-border dark:border-border-dark"}`}>
      <div className="flex items-center gap-2">
        <div className={`size-8 rounded-lg ${alert ? "bg-error/10" : "bg-primary/10"} flex items-center justify-center`}>
          <Icon name={icon} size="xs" className={iconClass} />
        </div>
        <div>
          <p className={`text-xl font-bold ${alert ? "text-error" : "text-text dark:text-white"}`}>{value}</p>
          <p className="text-[10px] text-text-secondary">{label}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `index.ts`에 export 추가**

```typescript
export { KpiRow } from "./KpiRow";
```

- [ ] **Step 3: `page.tsx`에 KpiRow 추가**

```tsx
import { KpiRow } from "./components";

// JSX의 PageHeader 아래, FilterBar 위에:
{selectedProject && tasks.length > 0 && <KpiRow tasks={tasks} />}
```

- [ ] **Step 4: 브라우저 확인**

- 4개 KPI 카드 표시 (총/진행중/완료/지연)
- 지연 카드만 alert 색상

- [ ] **Step 5: 최종 통합 확인**

Run: `npm run dev`
브라우저로 다음 시나리오를 끝까지 확인:

1. 프로젝트 선택 → "task가 없습니다" 빈 상태
2. `+ task 추가` → 모달 → "주문등록" / 5/1 / 5/30 입력 → 저장 → 그리드 1행 생성
3. 두 번째 task 추가 → "재고관리" / 5/15 / 6/10 / 선행 = T-001 주문등록
4. 그리드의 단계 dot 클릭 → 단계 변경 즉시 반영
5. 담당자 칩 클릭 → 모달 → 사용자 추가 + 역할 + 80%
6. 검색 "주문" → 1개만 필터링
7. 필터 핀 "지연" → 0개 (DELAYED 상태인 task 없음)
8. 새로고침 → 모든 데이터 유지
9. 다크모드 토글 → 색상/대비 정상

- [ ] **Step 6: 빌드 확인 + 최종 커밋**

```bash
npm run build
```
Expected: "Compiled successfully"

```bash
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: KpiRow Phase 1 (기본 카운트 4장) — MVP 완성

Phase 1 완료: 모델 + CRUD API + 평면 그리드 + 9단계 stepper +
담당자 다대다 + 필터 + 기본 KPI. Gantt/알고리즘은 Phase 2로.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 완료 체크리스트

- [ ] 신규 모델 3개 (`ProgressTask`, `ProgressTaskAssignee`, `ProgressStage` enum) 마이그레이션 완료
- [ ] API 라우트 5개 (list, create, get/update/delete, assignees +/-)
- [ ] React Query 훅 7개
- [ ] 페이지 라우트 `/dashboard/progress-risk` 동작
- [ ] task 추가 모달 (필수 5필드)
- [ ] 평면 그리드 + 인라인 편집 (이름/일정 debounce 저장)
- [ ] 9-dot StageStepper (클릭으로 currentStage 변경)
- [ ] 선행 task 드롭다운 (순환 의존성 방지)
- [ ] 담당자 칩 + 모달 (다대다, 역할, 참여율)
- [ ] FilterBar (검색, 상태 핀, 카테고리/담당자)
- [ ] KpiRow 기본 4장
- [ ] `npm run build` 성공

**다음 단계:** Phase 2 plan 작성 (Gantt 차트 + forecast/critical path/conflict 알고리즘 + 진단 배너)

---

## 자체 점검 (Plan 작성자용)

| 확인 항목 | 결과 |
|----------|------|
| 모든 task에 정확한 파일 경로 명시 | ✅ |
| 모든 코드 블록 완전 (TBD/TODO 없음) | ✅ |
| 모든 step에 실행 명령 또는 코드 | ✅ |
| 함수/타입명 일관성 (Task 1~16 전체) | ✅ |
| Phase 1 범위 명확 (Phase 2/3 이월 명시) | ✅ |
| 커밋 단위가 task당 1회 | ✅ |
| 기존 코드 패턴 준수 (useIssues, api.ts namespace, /api/[resource]/route.ts) | ✅ |
