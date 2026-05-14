# 카테고리별 가변 단계 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ProgressStage enum(10단계 고정)을 카테고리별·프로젝트별 가변 단계 모델로 전환하고, 단계 추가/수정/삭제/합치기 UI를 제공한다.

**Architecture:** 새 `StageCategory` enum(10종)을 도입하고 `ProgressStageDef` 테이블로 프로젝트·카테고리별 단계를 저장한다. `ProgressTask.currentStage` enum을 `stageCategory` + `currentStageId` FK로 교체한다. 마이그레이션은 schema 1차 push → 데이터 스크립트 → schema 2차 drop의 2단계로 안전하게 진행한다.

**Tech Stack:** Prisma 7, Next.js 16, React 19, TanStack Query 5, Vitest

**관련 디자인 문서:** `docs/superpowers/specs/2026-05-14-progress-task-category-variable-stages-design.md`

---

## 파일 구조

### 신규 파일
```
prisma/schema.prisma                              # StageCategory enum, ProgressStageDef 테이블 (수정)
src/lib/stage-categories.ts                       # STAGE_CATEGORY_LABEL, ORDER, DEFAULT_ETC_STAGES
src/app/api/projects/[id]/stage-defs/route.ts     # GET / POST
src/app/api/stage-defs/[id]/route.ts              # PATCH / DELETE
src/app/api/stage-defs/[id]/merge-into/route.ts   # POST
src/hooks/useStageDefs.ts                          # 5개 훅 + stageDefKeys
src/app/dashboard/progress-risk/components/StageManagerModal/
  ├── index.tsx
  ├── CategoryTabs.tsx
  ├── StageList.tsx
  ├── StageListRow.tsx
  └── MergePanel.tsx
scripts/migrate-stage-defs.ts                      # 데이터 마이그레이션
```

### 수정 파일
```
prisma/schema.prisma                                              # ProgressTask 필드 추가/제거
src/lib/api.ts                                                    # ProgressStageDef 타입 + stageDefs API
src/lib/progress-stages.ts                                        # ProgressStage 관련 정리
src/lib/progress-calc/forecast.ts                                 # 동적 단계 진척률
src/lib/progress-calc/__tests__/forecast.test.ts                  # 갱신
src/app/dashboard/progress-risk/types.ts                          # ProgressStage 제거, StageCategory 추가
src/app/dashboard/progress-risk/constants.ts                      # STAGE_LABEL/STAGE_SHORT 제거
src/app/dashboard/progress-risk/__tests__/constants.test.ts       # 갱신
src/app/dashboard/progress-risk/components/StageStepper.tsx       # props 변경
src/app/dashboard/progress-risk/components/TaskGrid.tsx           # 카테고리 컬럼 + 단계 관리 버튼
src/app/dashboard/progress-risk/components/TaskRow.tsx            # 카테고리 select + 단계 props
src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx  # mini-stepper 동적
src/app/dashboard/progress-risk/components/PageHeader.tsx         # [단계 관리] 버튼
src/app/api/progress-tasks/route.ts                               # POST stageCategory
src/app/api/progress-tasks/[id]/route.ts                          # PATCH currentStageId + progress 산식
src/app/api/progress-tasks/export/route.ts                        # 카테고리/단계명 출력
src/app/api/progress-tasks/import/route.ts                        # 카테고리/단계명 매핑
src/app/api/projects/route.ts                                     # 프로젝트 생성 시 ETC 단계 시드
src/hooks/index.ts                                                # useStageDefs export
```

---

## Phase A — 데이터 모델 + 마이그레이션

## Task 1: Prisma schema 1차 — 새 필드 추가 (기존 enum 보존)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: StageCategory enum 추가**

`prisma/schema.prisma`에서 `enum ProgressStage` 정의 근처에 추가:

```prisma
// ============================================
// 진도 카테고리 — task의 단계 그룹 식별
// ============================================
enum StageCategory {
  MES_SYSTEM
  EQUIPMENT
  TERMINAL
  MASTER_DATA
  ERP_IF
  SLMS_IF
  CUT_OFF
  OPERATION
  INFRA
  ETC
}
```

- [ ] **Step 2: ProgressStageDef 모델 추가**

같은 파일에서 `model ProgressTask` 정의 바로 위에 추가:

```prisma
// ============================================
// 진도 단계 정의 — 프로젝트별 + 카테고리별
// ============================================
model ProgressStageDef {
  id        String        @id @default(uuid())
  projectId String
  category  StageCategory
  name      String
  order     Int

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks   ProgressTask[] @relation("CurrentStageDef")

  @@unique([projectId, category, name])
  @@unique([projectId, category, order])
  @@index([projectId, category])
  @@map("progress_stage_defs")
}
```

- [ ] **Step 3: ProgressTask에 새 필드 추가 (기존 currentStage 유지)**

`model ProgressTask` 안 `currentStage ProgressStage @default(ANALYSIS)` 줄 바로 아래 추가:

```prisma
  // 새 단계 시스템 (마이그레이션 후 currentStage 폐기)
  stageCategory   StageCategory     @default(ETC)
  currentStageId  String?
  currentStageDef ProgressStageDef? @relation("CurrentStageDef", fields: [currentStageId], references: [id], onDelete: SetNull)
```

`Project` 모델의 관계 블록에 추가:

```prisma
  stageDefs ProgressStageDef[]
```

- [ ] **Step 4: DB push + Prisma generate**

Run:
```
npx prisma db push
npx prisma generate
```
Expected: 두 명령 모두 성공. `progress_stage_defs` 테이블 생성됨. `ProgressTask`에 `stageCategory`, `currentStageId` 컬럼 추가됨.

- [ ] **Step 5: 커밋**

```bash
git add prisma/schema.prisma
git commit -m "feat(prisma): StageCategory enum + ProgressStageDef 테이블 + ProgressTask 새 필드"
```

---

## Task 2: stage-categories 상수 + 라벨

**Files:**
- Create: `src/lib/stage-categories.ts`

- [ ] **Step 1: 상수 파일 작성**

`src/lib/stage-categories.ts`:

```typescript
/**
 * @file src/lib/stage-categories.ts
 * @description StageCategory 라벨 매핑과 기본 단계 정의 — 서버/클라이언트 공통
 *
 * 초보자 가이드:
 * 1. **STAGE_CATEGORY_ORDER**: UI 탭 순서
 * 2. **STAGE_CATEGORY_LABEL**: enum → 한글 라벨
 * 3. **STAGE_CATEGORY_REVERSE**: 한글 → enum (Excel import용)
 * 4. **DEFAULT_ETC_STAGES**: ETC 카테고리에 기본 시드되는 10단계
 */

export type StageCategory =
  | "MES_SYSTEM"
  | "EQUIPMENT"
  | "TERMINAL"
  | "MASTER_DATA"
  | "ERP_IF"
  | "SLMS_IF"
  | "CUT_OFF"
  | "OPERATION"
  | "INFRA"
  | "ETC";

export const STAGE_CATEGORY_ORDER: StageCategory[] = [
  "MES_SYSTEM",
  "EQUIPMENT",
  "TERMINAL",
  "MASTER_DATA",
  "ERP_IF",
  "SLMS_IF",
  "CUT_OFF",
  "OPERATION",
  "INFRA",
  "ETC",
];

export const STAGE_CATEGORY_LABEL: Record<StageCategory, string> = {
  MES_SYSTEM: "MES시스템",
  EQUIPMENT: "설비연동",
  TERMINAL: "단말기",
  MASTER_DATA: "기준정보",
  ERP_IF: "ERP I/F",
  SLMS_IF: "SLMS I/F",
  CUT_OFF: "CUT OFF",
  OPERATION: "운영",
  INFRA: "인프라",
  ETC: "기타",
};

export const STAGE_CATEGORY_REVERSE: Record<string, StageCategory> = {
  "MES시스템": "MES_SYSTEM",
  "설비연동": "EQUIPMENT",
  "단말기": "TERMINAL",
  "기준정보": "MASTER_DATA",
  "ERP I/F": "ERP_IF",
  "SLMS I/F": "SLMS_IF",
  "CUT OFF": "CUT_OFF",
  "운영": "OPERATION",
  "인프라": "INFRA",
  "기타": "ETC",
};

/** ETC 카테고리의 기본 시드 단계 — 기존 ProgressStage enum과 1:1 매핑 */
export const DEFAULT_ETC_STAGES: readonly string[] = [
  "분석",
  "설계",
  "구현",
  "단위테스트",
  "IT 테스트",
  "교육",
  "통합테스트",
  "오픈",
  "이행",
  "안정화",
];

/**
 * 단계 진척률 — 카테고리 단계 목록과 현재 단계 ID로 계산
 * @returns 0~100 (정수)
 */
export function computeStageProgress(
  stages: { id: string; order: number }[],
  currentStageId: string | null
): number {
  if (stages.length === 0 || !currentStageId) return 0;
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((s) => s.id === currentStageId);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / sorted.length) * 100);
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/stage-categories.ts
git commit -m "feat(lib): stage-categories 상수 + computeStageProgress 헬퍼"
```

---

## Task 3: 데이터 마이그레이션 스크립트

**Files:**
- Create: `scripts/migrate-stage-defs.ts`

- [ ] **Step 1: 스크립트 작성**

`scripts/migrate-stage-defs.ts`:

```typescript
/**
 * @file scripts/migrate-stage-defs.ts
 * @description ProgressStage enum → ProgressStageDef 마이그레이션
 *
 * 동작:
 * 1. 모든 프로젝트의 ETC 카테고리에 기본 10단계 시드 (중복 방지: 이미 있으면 skip)
 * 2. 모든 ProgressTask에 stageCategory=ETC + currentStageId 매핑 설정
 *
 * 실행: npx tsx scripts/migrate-stage-defs.ts [--dry-run]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { DEFAULT_ETC_STAGES } from "../src/lib/stage-categories";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const dryRun = process.argv.includes("--dry-run");

// 기존 ProgressStage enum 값 → DEFAULT_ETC_STAGES 인덱스 매핑
const ENUM_TO_STAGE_NAME: Record<string, string> = {
  ANALYSIS: "분석",
  DESIGN: "설계",
  IMPLEMENTATION: "구현",
  UNIT_TEST: "단위테스트",
  IT_TEST: "IT 테스트",
  TRAINING: "교육",
  INTEGRATION_TEST: "통합테스트",
  OPEN: "오픈",
  MIGRATION: "이행",
  STABILIZATION: "안정화",
};

async function main() {
  console.log(`🚀 마이그레이션 시작 ${dryRun ? "(dry-run)" : ""}\n`);

  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  console.log(`📊 프로젝트 ${projects.length}개\n`);

  let seededStages = 0;
  let updatedTasks = 0;

  for (const project of projects) {
    console.log(`▶ 프로젝트: ${project.name} (${project.id})`);

    // 1. ETC 카테고리에 기본 10단계 시드
    const existing = await prisma.progressStageDef.findMany({
      where: { projectId: project.id, category: "ETC" },
      select: { name: true, order: true, id: true },
    });

    const existingNames = new Set(existing.map((s) => s.name));
    const toCreate = DEFAULT_ETC_STAGES.filter((n) => !existingNames.has(n));

    if (toCreate.length > 0 && !dryRun) {
      for (let i = 0; i < toCreate.length; i++) {
        const name = toCreate[i];
        const order = DEFAULT_ETC_STAGES.indexOf(name);
        await prisma.progressStageDef.create({
          data: { projectId: project.id, category: "ETC", name, order },
        });
        seededStages++;
      }
    } else if (toCreate.length > 0) {
      seededStages += toCreate.length;
    }
    console.log(`   단계 시드: ${toCreate.length}개`);

    // 2. ProgressStageDef 다시 조회 (방금 시드한 것 포함)
    const stageDefs = dryRun
      ? existing.concat(
          toCreate.map((name) => ({
            id: `dry-${name}`,
            name,
            order: DEFAULT_ETC_STAGES.indexOf(name),
          }))
        )
      : await prisma.progressStageDef.findMany({
          where: { projectId: project.id, category: "ETC" },
          select: { id: true, name: true, order: true },
        });

    const nameToId = new Map(stageDefs.map((s) => [s.name, s.id]));

    // 3. 이 프로젝트의 모든 task에 stageCategory + currentStageId 설정
    //    이미 stageCategory가 설정된(ETC가 아니거나 currentStageId 보유) task는 skip
    const tasks = await prisma.progressTask.findMany({
      where: {
        projectId: project.id,
        currentStageId: null, // 아직 마이그레이션 안 됐고
      },
      select: { id: true, currentStage: true },
    });

    for (const task of tasks) {
      const stageName = ENUM_TO_STAGE_NAME[task.currentStage as unknown as string];
      const stageId = nameToId.get(stageName);
      if (!stageId) {
        console.warn(`   ⚠ task ${task.id}: 매핑 실패 (currentStage=${task.currentStage})`);
        continue;
      }
      if (!dryRun) {
        await prisma.progressTask.update({
          where: { id: task.id },
          data: { stageCategory: "ETC", currentStageId: stageId },
        });
      }
      updatedTasks++;
    }
    console.log(`   task 마이그레이션: ${tasks.length}개\n`);
  }

  console.log(`\n✅ 완료:`);
  console.log(`   시드된 단계: ${seededStages}개`);
  console.log(`   마이그레이션된 task: ${updatedTasks}개`);
  if (dryRun) console.log(`   (dry-run이므로 DB 변경 없음)`);
}

main()
  .catch((e) => {
    console.error("❌ 오류:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
```

- [ ] **Step 2: dry-run 실행**

Run: `npx tsx scripts/migrate-stage-defs.ts --dry-run`
Expected: 프로젝트 목록 + 시드/마이그레이션 카운트 출력, DB 변경 없음.

- [ ] **Step 3: 실제 실행**

Run: `npx tsx scripts/migrate-stage-defs.ts`
Expected: 모든 프로젝트의 ETC 카테고리에 10개 단계 시드, 모든 task의 stageCategory=ETC + currentStageId 설정.

- [ ] **Step 4: 검증 쿼리**

Run: `npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.progressTask.findFirst({ include: { currentStageDef: true } }).then(t => { console.log(t); p.\\$disconnect(); });"`
Expected: 첫 task가 `stageCategory: "ETC"`, `currentStageDef: { name: ... }` 으로 출력.

- [ ] **Step 5: 커밋**

```bash
git add scripts/migrate-stage-defs.ts
git commit -m "feat(scripts): 진도 단계 마이그레이션 스크립트"
```

---

## Task 4: Prisma schema 2차 — 기존 enum/컬럼 drop

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: ProgressTask에서 currentStage 제거**

`prisma/schema.prisma`에서 다음 줄을 삭제:

```prisma
  currentStage ProgressStage @default(ANALYSIS)
```

- [ ] **Step 2: ProgressStage enum 정의 전체 삭제**

`enum ProgressStage { ... }` 블록 전체 삭제.

- [ ] **Step 3: DB push**

Run: `npx prisma db push`
Expected: `currentStage` 컬럼 drop + `ProgressStage` 타입 drop. 데이터 손실 경고가 뜨면 `y`로 진행.

- [ ] **Step 4: Prisma generate**

Run: `npx prisma generate`
Expected: 에러 없음.

- [ ] **Step 5: 빌드 점검 (예상 에러 다수)**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: `ProgressStage` 참조로 인한 에러가 다수 발생. 이 에러들은 Task 5 이후 차례로 해결됨.

- [ ] **Step 6: 커밋**

```bash
git add prisma/schema.prisma
git commit -m "feat(prisma): ProgressStage enum + currentStage 컬럼 제거 (마이그레이션 후)"
```

---

## Phase B — stage-defs API

## Task 5: stage-defs GET + POST 라우트

**Files:**
- Create: `src/app/api/projects/[id]/stage-defs/route.ts`

- [ ] **Step 1: 디렉토리 생성 + 라우트 작성**

`src/app/api/projects/[id]/stage-defs/route.ts`:

```typescript
/**
 * @file src/app/api/projects/[id]/stage-defs/route.ts
 * @description 프로젝트의 진도 단계 정의 목록 조회/추가
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import type { StageCategory } from "@/lib/stage-categories";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** GET /api/projects/[id]/stage-defs?category=... */
export async function GET(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: projectId } = await params;
  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as StageCategory | null;

  const where: { projectId: string; category?: StageCategory } = { projectId };
  if (category) where.category = category;

  const stageDefs = await prisma.progressStageDef.findMany({
    where,
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  return NextResponse.json(stageDefs);
}

/** POST /api/projects/[id]/stage-defs body: { category, name, order? } */
export async function POST(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: projectId } = await params;

  // 단계 변경은 ADMIN 또는 OWNER/MANAGER만 가능
  if (user!.role !== "ADMIN") {
    const myMembership = await prisma.teamMember.findUnique({
      where: { projectId_userId: { projectId, userId: user!.id } },
      select: { role: true },
    });
    if (!myMembership || (myMembership.role !== "OWNER" && myMembership.role !== "MANAGER")) {
      return NextResponse.json({ error: "단계를 추가할 권한이 없습니다." }, { status: 403 });
    }
  }

  const body = await request.json();
  const { category, name, order } = body as { category: StageCategory; name: string; order?: number };

  if (!category || !name?.trim()) {
    return NextResponse.json({ error: "category와 name은 필수입니다." }, { status: 400 });
  }

  // 같은 카테고리 내 중복 이름 체크
  const existing = await prisma.progressStageDef.findUnique({
    where: { projectId_category_name: { projectId, category, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 단계명입니다." }, { status: 400 });
  }

  // order 결정: 미지정 시 마지막 + 1
  let finalOrder = order;
  if (finalOrder === undefined || finalOrder === null) {
    const last = await prisma.progressStageDef.findFirst({
      where: { projectId, category },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    finalOrder = last ? last.order + 1 : 0;
  } else {
    // 지정 시: 같은 order 이상의 항목은 +1 shift
    await prisma.progressStageDef.updateMany({
      where: { projectId, category, order: { gte: finalOrder } },
      data: { order: { increment: 1 } },
    });
  }

  const created = await prisma.progressStageDef.create({
    data: { projectId, category, name: name.trim(), order: finalOrder },
  });

  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit src/app/api/projects/[id]/stage-defs/route.ts 2>&1 | head -20`
Expected: 다른 파일 에러는 무시, 이 파일 자체 에러는 없어야 함.

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/projects/[id]/stage-defs/route.ts
git commit -m "feat(api): stage-defs GET + POST 라우트"
```

---

## Task 6: stage-defs PATCH + DELETE 라우트

**Files:**
- Create: `src/app/api/stage-defs/[id]/route.ts`

- [ ] **Step 1: 라우트 작성**

`src/app/api/stage-defs/[id]/route.ts`:

```typescript
/**
 * @file src/app/api/stage-defs/[id]/route.ts
 * @description 단계 정의 수정/삭제
 *
 * 초보자 가이드:
 * 1. **PATCH**: 이름/순서 변경. 순서 변경 시 같은 카테고리 내 다른 단계들 자동 shift
 * 2. **DELETE**: 해당 단계 삭제. 사용 중인 task의 currentStageId는 SetNull (Prisma onDelete)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function requireStageManageAccess(stageId: string, user: { id: string; role: string }) {
  const stage = await prisma.progressStageDef.findUnique({
    where: { id: stageId },
    select: { projectId: true },
  });
  if (!stage) {
    return { stage: null, error: NextResponse.json({ error: "단계를 찾을 수 없습니다." }, { status: 404 }) };
  }
  if (user.role !== "ADMIN") {
    const myMembership = await prisma.teamMember.findUnique({
      where: { projectId_userId: { projectId: stage.projectId, userId: user.id } },
      select: { role: true },
    });
    if (!myMembership || (myMembership.role !== "OWNER" && myMembership.role !== "MANAGER")) {
      return { stage, error: NextResponse.json({ error: "단계를 수정할 권한이 없습니다." }, { status: 403 }) };
    }
  }
  return { stage, error: null };
}

/** PATCH /api/stage-defs/[id] body: { name?, order? } */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const { stage, error: accessError } = await requireStageManageAccess(id, user!);
  if (accessError) return accessError;

  const body = await request.json();
  const { name, order } = body as { name?: string; order?: number };

  // order 변경 시 같은 카테고리 내 다른 항목 재정렬
  if (order !== undefined) {
    const current = await prisma.progressStageDef.findUnique({
      where: { id },
      select: { projectId: true, category: true, order: true },
    });
    if (current && current.order !== order) {
      // 트랜잭션: 기존 위치 → 새 위치로 이동, 다른 항목 shift
      await prisma.$transaction(async (tx) => {
        // 임시로 매우 큰 order로 옮겨 unique 제약 회피
        await tx.progressStageDef.update({ where: { id }, data: { order: -1 } });

        if (order > current.order) {
          // 위로 이동: current.order+1 ~ order 범위의 항목을 -1
          await tx.progressStageDef.updateMany({
            where: {
              projectId: current.projectId,
              category: current.category,
              order: { gt: current.order, lte: order },
            },
            data: { order: { decrement: 1 } },
          });
        } else {
          // 아래로 이동: order ~ current.order-1 범위의 항목을 +1
          await tx.progressStageDef.updateMany({
            where: {
              projectId: current.projectId,
              category: current.category,
              order: { gte: order, lt: current.order },
            },
            data: { order: { increment: 1 } },
          });
        }

        await tx.progressStageDef.update({ where: { id }, data: { order } });
      });
    }
  }

  // 이름 변경
  const dataToUpdate: { name?: string } = {};
  if (name !== undefined && name.trim() !== "") {
    dataToUpdate.name = name.trim();
  }

  const updated = Object.keys(dataToUpdate).length > 0
    ? await prisma.progressStageDef.update({ where: { id }, data: dataToUpdate })
    : await prisma.progressStageDef.findUnique({ where: { id } });

  return NextResponse.json(updated);
}

/** DELETE /api/stage-defs/[id] */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const { stage, error: accessError } = await requireStageManageAccess(id, user!);
  if (accessError) return accessError;

  // 삭제 후 같은 카테고리의 뒤 항목들 order를 -1 (gap 메우기)
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.progressStageDef.delete({ where: { id } });
    await tx.progressStageDef.updateMany({
      where: {
        projectId: deleted.projectId,
        category: deleted.category,
        order: { gt: deleted.order },
      },
      data: { order: { decrement: 1 } },
    });
  });

  return NextResponse.json({ message: "삭제됨" });
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep stage-defs | head -20`
Expected: stage-defs 관련 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/stage-defs/[id]/route.ts
git commit -m "feat(api): stage-defs PATCH + DELETE 라우트 (순서 자동 정렬)"
```

---

## Task 7: stage-defs merge-into 라우트

**Files:**
- Create: `src/app/api/stage-defs/[id]/merge-into/route.ts`

- [ ] **Step 1: 라우트 작성**

`src/app/api/stage-defs/[id]/merge-into/route.ts`:

```typescript
/**
 * @file src/app/api/stage-defs/[id]/merge-into/route.ts
 * @description 단계 합치기 — source를 target으로 흡수
 *
 * 동작 (트랜잭션):
 * 1. source와 target이 같은 projectId+category인지 검증
 * 2. source를 currentStageId로 가진 모든 task를 target으로 update
 * 3. source 삭제
 * 4. 같은 카테고리의 뒤 항목들 order -1
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: sourceId } = await params;
  const body = await request.json();
  const { targetStageId } = body as { targetStageId: string };

  if (!targetStageId) {
    return NextResponse.json({ error: "targetStageId가 필요합니다." }, { status: 400 });
  }
  if (sourceId === targetStageId) {
    return NextResponse.json({ error: "자기 자신과 합칠 수 없습니다." }, { status: 400 });
  }

  const source = await prisma.progressStageDef.findUnique({
    where: { id: sourceId },
    select: { id: true, projectId: true, category: true, order: true },
  });
  const target = await prisma.progressStageDef.findUnique({
    where: { id: targetStageId },
    select: { id: true, projectId: true, category: true },
  });
  if (!source || !target) {
    return NextResponse.json({ error: "단계를 찾을 수 없습니다." }, { status: 404 });
  }
  if (source.projectId !== target.projectId || source.category !== target.category) {
    return NextResponse.json(
      { error: "같은 프로젝트의 같은 카테고리 내 단계만 합칠 수 있습니다." },
      { status: 400 }
    );
  }

  // 권한: ADMIN 또는 OWNER/MANAGER
  if (user!.role !== "ADMIN") {
    const myMembership = await prisma.teamMember.findUnique({
      where: { projectId_userId: { projectId: source.projectId, userId: user!.id } },
      select: { role: true },
    });
    if (!myMembership || (myMembership.role !== "OWNER" && myMembership.role !== "MANAGER")) {
      return NextResponse.json({ error: "단계를 합칠 권한이 없습니다." }, { status: 403 });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. source를 쓰는 task들 target으로 이동
    const updated = await tx.progressTask.updateMany({
      where: { currentStageId: sourceId },
      data: { currentStageId: targetStageId },
    });

    // 2. source 삭제
    await tx.progressStageDef.delete({ where: { id: sourceId } });

    // 3. 뒤 항목 order -1
    await tx.progressStageDef.updateMany({
      where: {
        projectId: source.projectId,
        category: source.category,
        order: { gt: source.order },
      },
      data: { order: { decrement: 1 } },
    });

    return { movedTaskCount: updated.count };
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep merge-into | head -10`
Expected: merge-into 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/stage-defs/[id]/merge-into/route.ts
git commit -m "feat(api): 단계 합치기 라우트 (트랜잭션)"
```

---

## Task 8: 프로젝트 생성 시 ETC 단계 자동 시드

**Files:**
- Modify: `src/app/api/projects/route.ts`

- [ ] **Step 1: POST 핸들러에 시드 로직 추가**

`src/app/api/projects/route.ts`의 POST 함수에서 `prisma.teamMember.create` 호출 다음에 추가:

```typescript
import { DEFAULT_ETC_STAGES } from "@/lib/stage-categories";

// ... 기존 POST 함수 내 ...

// 프로젝트 생성자를 팀 멤버로 자동 추가 (OWNER 역할)
await prisma.teamMember.create({
  data: { projectId: project.id, userId: ownerId, role: "OWNER" },
});

// ETC 카테고리에 기본 10단계 자동 시드
await prisma.progressStageDef.createMany({
  data: DEFAULT_ETC_STAGES.map((name, idx) => ({
    projectId: project.id,
    category: "ETC" as const,
    name,
    order: idx,
  })),
});
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit src/app/api/projects/route.ts 2>&1 | head -10`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/projects/route.ts
git commit -m "feat(api): 신규 프로젝트 생성 시 ETC 카테고리 기본 10단계 시드"
```

---

## Phase C — 클라이언트 API + 훅

## Task 9: api.ts 타입 + stageDefs 클라이언트

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: ProgressStageDef 타입 + StageCategory re-export**

`src/lib/api.ts`에 추가 (적절한 위치 — 다른 export interface 근처):

```typescript
import type { StageCategory } from "@/lib/stage-categories";
export type { StageCategory };

export interface ProgressStageDef {
  id: string;
  projectId: string;
  category: StageCategory;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: ProgressTask 타입 변경**

`src/lib/api.ts`에서 `ProgressTask` 인터페이스의 `currentStage` 필드 제거 (만약 있다면), 다음 추가:

```typescript
export interface ProgressTask {
  // ... 기존 필드
  // 변경 전: currentStage: ProgressStage;
  stageCategory: StageCategory;
  currentStageId: string | null;
  currentStageDef?: ProgressStageDef | null;
  // ...
}
```

`ProgressStage` 타입을 참조하던 부분 모두 제거. 페이지 types.ts는 Task 18에서 처리.

- [ ] **Step 3: api.stageDefs 추가**

`api` 객체에 추가:

```typescript
stageDefs: {
  list: (projectId: string, category?: StageCategory) =>
    get<ProgressStageDef[]>(
      `/api/projects/${projectId}/stage-defs`,
      category ? { category } : undefined
    ),
  create: (projectId: string, data: { category: StageCategory; name: string; order?: number }) =>
    post<ProgressStageDef>(`/api/projects/${projectId}/stage-defs`, data),
  update: (id: string, data: { name?: string; order?: number }) =>
    patch<ProgressStageDef>(`/api/stage-defs/${id}`, data),
  delete: (id: string) => del<{ message: string }>(`/api/stage-defs/${id}`),
  mergeInto: (sourceId: string, targetStageId: string) =>
    post<{ movedTaskCount: number }>(`/api/stage-defs/${sourceId}/merge-into`, { targetStageId }),
},
```

- [ ] **Step 4: 타입 체크 (다수의 에러 예상)**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 기존 코드에서 ProgressStage를 참조하는 부분 에러. 후속 task에서 해결됨.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api.ts
git commit -m "feat(api): ProgressStageDef 타입 + stageDefs 클라이언트"
```

---

## Task 10: useStageDefs 훅

**Files:**
- Create: `src/hooks/useStageDefs.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: 훅 파일 작성**

`src/hooks/useStageDefs.ts`:

```typescript
/**
 * @file src/hooks/useStageDefs.ts
 * @description 진도 단계 정의 React Query 훅
 *
 * 초보자 가이드:
 * 1. **useStageDefs(projectId, category?)**: 단계 목록 조회
 * 2. **useCreateStageDef / useUpdateStageDef / useDeleteStageDef / useMergeStageDef**: 변경
 * 3. **invalidate**: 변경 시 stageDefs 캐시 + progressTask 캐시(진척률 영향) 무효화
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ProgressStageDef, type StageCategory } from "@/lib/api";

export const stageDefKeys = {
  all: ["stageDefs"] as const,
  list: (projectId: string, category?: StageCategory) =>
    [...stageDefKeys.all, "list", projectId, category ?? "all"] as const,
};

export function useStageDefs(projectId: string | undefined, category?: StageCategory) {
  return useQuery({
    queryKey: stageDefKeys.list(projectId ?? "", category),
    queryFn: () => api.stageDefs.list(projectId!, category),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });
}

function invalidateStageAndTaskCaches(qc: ReturnType<typeof useQueryClient>, projectId: string) {
  qc.invalidateQueries({ queryKey: stageDefKeys.all });
  qc.invalidateQueries({ queryKey: ["progressTasks", projectId] });
  qc.invalidateQueries({ queryKey: ["progressTasks", "compute", projectId] });
}

export function useCreateStageDef(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: StageCategory; name: string; order?: number }) =>
      api.stageDefs.create(projectId, data),
    onSuccess: () => invalidateStageAndTaskCaches(qc, projectId),
  });
}

export function useUpdateStageDef(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; order?: number } }) =>
      api.stageDefs.update(id, data),
    onSuccess: () => invalidateStageAndTaskCaches(qc, projectId),
  });
}

export function useDeleteStageDef(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.stageDefs.delete(id),
    onSuccess: () => invalidateStageAndTaskCaches(qc, projectId),
  });
}

export function useMergeStageDef(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, targetStageId }: { sourceId: string; targetStageId: string }) =>
      api.stageDefs.mergeInto(sourceId, targetStageId),
    onSuccess: () => invalidateStageAndTaskCaches(qc, projectId),
  });
}
```

- [ ] **Step 2: barrel export 추가**

`src/hooks/index.ts`에 추가:

```typescript
export {
  useStageDefs,
  useCreateStageDef,
  useUpdateStageDef,
  useDeleteStageDef,
  useMergeStageDef,
  stageDefKeys,
} from "./useStageDefs";
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit src/hooks/useStageDefs.ts 2>&1 | head -10`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/useStageDefs.ts src/hooks/index.ts
git commit -m "feat(hooks): useStageDefs 훅 묶음"
```

---

## Phase D — progress-tasks API + 진척률

## Task 11: PATCH /api/progress-tasks/[id] 새 모델 대응

**Files:**
- Modify: `src/app/api/progress-tasks/[id]/route.ts`

- [ ] **Step 1: import 정리**

상단 import에서 `STAGE_ORDER` 임포트 제거 (또는 보존하고 미사용 처리 — 어차피 Task 4 이후 빌드 안 됨), 다음 추가:

```typescript
import { computeStageProgress } from "@/lib/stage-categories";
```

- [ ] **Step 2: PATCH 핸들러의 currentStage/progress 로직 교체**

기존:
```typescript
if (body.currentStage !== undefined) data.currentStage = body.currentStage;
...
if (body.currentStage !== undefined) {
  const idx = STAGE_ORDER.indexOf(body.currentStage);
  if (idx >= 0) {
    data.progress = Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
  }
}
```

위 두 블록을 모두 제거하고 다음으로 교체:

```typescript
if (body.stageCategory !== undefined) data.stageCategory = body.stageCategory;
if (body.currentStageId !== undefined) data.currentStageId = body.currentStageId;

// stageCategory 또는 currentStageId 변경 시 progress 재계산
if (body.stageCategory !== undefined || body.currentStageId !== undefined) {
  // 변경될 최종 카테고리/단계 결정
  const finalCategory = body.stageCategory ?? existing.stageCategory;
  const finalStageId = body.currentStageId !== undefined ? body.currentStageId : existing.currentStageId;

  // 카테고리가 바뀌었는데 currentStageId가 새 카테고리에 속하지 않으면 null로 리셋
  if (body.stageCategory !== undefined && finalStageId) {
    const stage = await prisma.progressStageDef.findUnique({
      where: { id: finalStageId },
      select: { category: true },
    });
    if (!stage || stage.category !== finalCategory) {
      data.currentStageId = null;
    }
  }

  // 해당 카테고리의 단계 목록으로 progress 계산
  const stages = await prisma.progressStageDef.findMany({
    where: { projectId: existing.projectId, category: finalCategory },
    select: { id: true, order: true },
    orderBy: { order: "asc" },
  });
  data.progress = computeStageProgress(stages, (data.currentStageId as string | null | undefined) ?? finalStageId);
}
```

이 코드는 `existing`이 이미 `projectId`, `stageCategory`, `currentStageId`를 갖고 있다고 가정. 기존 코드에서 `existing` 조회 시 select에 다음 필드를 포함시켜야 함:

```typescript
const existing = await prisma.progressTask.findUnique({
  where: { id },
  select: { projectId: true, stageCategory: true, currentStageId: true },
});
```

(가드용 조회 부분에서 select 확장)

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "progress-tasks/\\[id\\]" | head -10`
Expected: 이 라우트 자체 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/progress-tasks/[id]/route.ts
git commit -m "feat(api): progress-tasks PATCH에 currentStageId + 동적 progress 계산"
```

---

## Task 12: POST /api/progress-tasks 새 모델 대응

**Files:**
- Modify: `src/app/api/progress-tasks/route.ts`

- [ ] **Step 1: POST 핸들러 변경**

`src/app/api/progress-tasks/route.ts`의 POST 핸들러에서 `currentStage` 관련 코드를 모두 제거하고, body에서 `stageCategory`와 `currentStageId`를 받도록 변경:

```typescript
const {
  projectId, name, /* ... 기존 필드 */,
  stageCategory,
  currentStageId,
} = body;

// ... 기존 검증 + 가드 ...

// progress 초기값 계산
let progress = 0;
if (currentStageId && stageCategory) {
  const stages = await prisma.progressStageDef.findMany({
    where: { projectId, category: stageCategory },
    select: { id: true, order: true },
    orderBy: { order: "asc" },
  });
  progress = computeStageProgress(stages, currentStageId);
}

const created = await prisma.progressTask.create({
  data: {
    projectId,
    name,
    /* 기존 필드 */
    stageCategory: stageCategory ?? "ETC",
    currentStageId: currentStageId ?? null,
    progress,
  },
  include: { /* 기존 include */ },
});
```

`computeStageProgress` import 추가.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "progress-tasks/route" | head -10`
Expected: 이 파일 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/progress-tasks/route.ts
git commit -m "feat(api): progress-tasks POST에 stageCategory + currentStageId"
```

---

## Task 13: forecast 진척률 동적 적용

**Files:**
- Modify: `src/lib/progress-calc/forecast.ts`
- Modify: `src/lib/progress-calc/types.ts`
- Modify: `src/lib/progress-calc/__tests__/forecast.test.ts`

- [ ] **Step 1: types.ts 변경**

`src/lib/progress-calc/types.ts`에서 `currentStage: ProgressStage`를 다음으로 교체:

```typescript
import type { StageCategory } from "@/lib/stage-categories";

export interface ForecastInput {
  // ... 기존 필드
  stageCategory: StageCategory;
  currentStageId: string | null;
  // 변경 전: currentStage: ProgressStage;
}
```

- [ ] **Step 2: forecast.ts 진척률 산식 교체**

`src/lib/progress-calc/forecast.ts`에서 task의 진척률을 계산하는 부분 (기존에 `stageProgressPct(currentStage)` 호출하던 부분):

```typescript
import { computeStageProgress, type StageCategory } from "@/lib/stage-categories";

interface ComputeForecastOptions {
  stagesByCategory: Map<StageCategory, { id: string; order: number }[]>;
}

export function computeForecast(
  tasks: ForecastInput[],
  today: Date,
  options: ComputeForecastOptions
): Forecast {
  // ...
  for (const task of tasks) {
    const stages = options.stagesByCategory.get(task.stageCategory) ?? [];
    const progressPct = computeStageProgress(stages, task.currentStageId);
    // ... 기존 로직에서 stageProgressPct 호출을 progressPct 사용으로 교체
  }
}
```

기존에 `stageProgressPct` 또는 `STAGE_ORDER.indexOf(...)` 사용하는 모든 부분을 위 패턴으로 교체.

- [ ] **Step 3: forecast.test.ts 갱신**

`src/lib/progress-calc/__tests__/forecast.test.ts`에서 모든 테스트 케이스의 task 생성 헬퍼를 변경:

```typescript
// 기존: currentStage: "DESIGN"
// 변경: stageCategory: "ETC", currentStageId: "s-design"

const stagesByCategory = new Map<StageCategory, { id: string; order: number }[]>([
  ["ETC", [
    { id: "s-analysis", order: 0 },
    { id: "s-design", order: 1 },
    { id: "s-impl", order: 2 },
    { id: "s-unit", order: 3 },
    { id: "s-it", order: 4 },
    { id: "s-train", order: 5 },
    { id: "s-integ", order: 6 },
    { id: "s-open", order: 7 },
    { id: "s-migr", order: 8 },
    { id: "s-stab", order: 9 },
  ]],
]);

// 각 task 생성:
function task(id, start, end, opts = {}) {
  return {
    id, startDate: start, endDate: end,
    stageCategory: "ETC" as const,
    currentStageId: null,
    actualStartDate: null,
    actualEndDate: null,
    predecessorId: null,
    ...opts,
  };
}

// 테스트 내에서:
const result = computeForecast([t], today(0), { stagesByCategory });
```

기존 `currentStage: "DESIGN"` (2/10 = 20%) 케이스는 `currentStageId: "s-design"`로 변경 — 동일하게 20% 결과.

- [ ] **Step 4: 테스트 실행**

Run: `npx vitest run src/lib/progress-calc`
Expected: 모든 테스트 통과 (5+ tests).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/progress-calc/
git commit -m "feat(forecast): 카테고리별 동적 단계 진척률 계산"
```

---

## Task 14: useComputeForecast 훅 갱신 + page.tsx 호출처

**Files:**
- Modify: `src/hooks/useProgressTasks.ts` (또는 useComputeForecast가 정의된 파일)
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: useComputeForecast 위치 확인**

Run: `grep -rn "useComputeForecast\|computeForecast" src/hooks/`
useComputeForecast가 있는 파일 확인 후 진행.

- [ ] **Step 2: 훅에서 stageDefs 로드 + 옵션 전달**

`useComputeForecast` 안에 `useStageDefs(projectId)`로 전체 단계 조회 후 `stagesByCategory` Map 구축, `computeForecast` 호출 시 옵션으로 전달.

```typescript
import { useStageDefs } from "./useStageDefs";
import type { StageCategory } from "@/lib/api";

export function useComputeForecast(projectId: string | undefined, projectEnd: Date | null) {
  const tasksQuery = useProgressTasks(projectId);
  const stagesQuery = useStageDefs(projectId);

  return useQuery({
    queryKey: ["progressTasks", "compute", projectId, projectEnd?.toISOString()],
    queryFn: () => {
      const tasks = tasksQuery.data ?? [];
      const allStages = stagesQuery.data ?? [];
      const stagesByCategory = new Map<StageCategory, { id: string; order: number }[]>();
      for (const s of allStages) {
        const list = stagesByCategory.get(s.category) ?? [];
        list.push({ id: s.id, order: s.order });
        stagesByCategory.set(s.category, list);
      }
      // 각 list 정렬
      for (const list of stagesByCategory.values()) {
        list.sort((a, b) => a.order - b.order);
      }
      const forecast = computeForecast(tasks as never, new Date(), { stagesByCategory });
      // ... 기존 conflicts, diagnosis 계산
      return { tasks, forecast, conflicts, diagnosis };
    },
    enabled: !!projectId && tasksQuery.isSuccess && stagesQuery.isSuccess,
  });
}
```

기존 구조에 맞게 정확한 위치/이름 조정.

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -E "useProgressTasks|useComputeForecast" | head -10`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/
git commit -m "feat(hooks): useComputeForecast가 stageDefs 활용해 동적 진척률 적용"
```

---

## Phase E — UI 컴포넌트 변경

## Task 15: StageStepper 동적 props

**Files:**
- Modify: `src/app/dashboard/progress-risk/components/StageStepper.tsx`

- [ ] **Step 1: 전체 교체**

`src/app/dashboard/progress-risk/components/StageStepper.tsx`:

```typescript
/**
 * @file src/app/dashboard/progress-risk/components/StageStepper.tsx
 * @description 카테고리별 동적 단계 진행 바
 *
 * 초보자 가이드:
 * 1. **stages**: 그 task가 속한 카테고리의 단계 목록 (order asc)
 * 2. **currentStageId**: 현재 단계 ID
 * 3. **variant**: "dot" / "full"
 * 4. **empty 처리**: stages.length === 0이면 "단계 미정의" 안내
 */
"use client";

import type { ProgressStageDef } from "@/lib/api";

interface Props {
  stages: ProgressStageDef[];
  currentStageId: string | null;
  onChange: (stageId: string | null) => void;
  variant?: "dot" | "full";
  disabled?: boolean;
}

export function StageStepper({ stages, currentStageId, onChange, variant = "full", disabled = false }: Props) {
  const isDot = variant === "dot";

  if (stages.length === 0) {
    return (
      <span className="text-[10px] text-text-secondary italic">단계 미정의</span>
    );
  }

  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const currentIdx = sorted.findIndex((s) => s.id === currentStageId);

  return (
    <div className="flex items-center gap-1 flex-nowrap" role="group" aria-label="단계 진행 바">
      {sorted.map((stage, idx) => {
        const isDone = currentIdx >= 0 && idx < currentIdx;
        const isCurrent = idx === currentIdx;

        const bg = isDot
          ? isCurrent
            ? "bg-[#00f3ff] shadow-[0_0_4px_rgba(0,243,255,0.6)]"
            : isDone
              ? "bg-green-500"
              : "bg-white/10 dark:bg-white/5"
          : isCurrent
            ? "bg-[#00f3ff] text-black font-bold shadow-[0_0_6px_rgba(0,243,255,0.5)] border border-[#00f3ff]"
            : isDone
              ? "bg-green-500/20 text-green-600 dark:text-green-300 border border-green-500/40"
              : "bg-white/5 text-text-secondary border border-border dark:border-border-dark";

        return (
          <button
            key={stage.id}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(stage.id)}
            title={`${stage.name} (${idx + 1}/${sorted.length})`}
            className={`${bg} rounded transition-all hover:scale-105 whitespace-nowrap ${
              isDot ? "w-3 h-3" : "px-2 py-1 text-[11px]"
            } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            aria-label={stage.name}
            aria-current={isCurrent ? "step" : undefined}
          >
            {!isDot && stage.name}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit src/app/dashboard/progress-risk/components/StageStepper.tsx 2>&1 | head -10`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/dashboard/progress-risk/components/StageStepper.tsx
git commit -m "feat(stage-stepper): 동적 stages 배열 + currentStageId props"
```

---

## Task 16: TaskRow 카테고리 select + StageStepper 새 props

**Files:**
- Modify: `src/app/dashboard/progress-risk/components/TaskRow.tsx`

- [ ] **Step 1: 카테고리 select 셀 추가 + StageStepper 전달**

`TaskRow.tsx`에서 `task.businessUnit` 표시 셀 다음, 기존 `<input list="...대분류...">` 위치 직전에 카테고리 select 셀을 추가:

```typescript
import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";
import { useStageDefs } from "@/hooks";

// ... 컴포넌트 안에서:
const { data: allStages = [] } = useStageDefs(projectId);
const stagesOfCategory = allStages.filter((s) => s.category === task.stageCategory);
```

JSX에서 사업부 셀 다음에 다음 셀 추가:

```typescript
<select
  value={task.stageCategory}
  onChange={(e) => update.mutate({ id: task.id, data: { stageCategory: e.target.value as StageCategory } })}
  className="bg-transparent border-0 focus:outline-none focus:bg-white/5 px-1 py-0.5 rounded text-xs text-text dark:text-white"
  aria-label="카테고리"
>
  {STAGE_CATEGORY_ORDER.map((c) => (
    <option key={c} value={c}>{STAGE_CATEGORY_LABEL[c]}</option>
  ))}
</select>
```

기존 단계 stepper 호출 부분:
```typescript
<StageStepper
  currentStage={task.currentStage}
  onChange={(stage) => update.mutate({ id: task.id, data: { currentStage: stage } })}
/>
```

다음으로 교체:
```typescript
<StageStepper
  stages={stagesOfCategory}
  currentStageId={task.currentStageId}
  onChange={(stageId) => update.mutate({ id: task.id, data: { currentStageId: stageId } })}
/>
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit src/app/dashboard/progress-risk/components/TaskRow.tsx 2>&1 | head -15`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/dashboard/progress-risk/components/TaskRow.tsx
git commit -m "feat(task-row): 카테고리 select + 동적 StageStepper 연결"
```

---

## Task 17: TaskGrid에 카테고리 컬럼 + 단계 관리 버튼 호출처

**Files:**
- Modify: `src/app/dashboard/progress-risk/components/TaskGrid.tsx`

- [ ] **Step 1: 컬럼 정의 + 헤더 변경**

`TaskGrid.tsx`의 `COLS` 변경 (사업부 다음에 카테고리 110px 추가):

```typescript
const COLS = "46px 70px 70px 110px 110px 1fr 80px 80px 460px 90px 1fr 80px 30px";
//           # 코드 사업부 카테고리 대분류 기능명 시작 종료 단계 선행 담당자 상태 X
```

`min-w-[1700px]` → `min-w-[1810px]`로 증가.

헤더 div에 `<div>카테고리</div>`를 사업부 다음에 추가:

```jsx
<div>#</div>
<div>코드</div>
<div>사업부</div>
<div>카테고리</div>
<div>대분류</div>
<div>기능명</div>
...
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit src/app/dashboard/progress-risk/components/TaskGrid.tsx 2>&1 | head -10`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/dashboard/progress-risk/components/TaskGrid.tsx
git commit -m "feat(task-grid): 카테고리 컬럼 추가"
```

---

## Task 18: types.ts + constants.ts 정리

**Files:**
- Modify: `src/app/dashboard/progress-risk/types.ts`
- Modify: `src/app/dashboard/progress-risk/constants.ts`
- Modify: `src/app/dashboard/progress-risk/__tests__/constants.test.ts`

- [ ] **Step 1: types.ts에서 ProgressStage 제거**

`src/app/dashboard/progress-risk/types.ts`:

```typescript
/**
 * @file src/app/dashboard/progress-risk/types.ts
 * @description 진도 리스크 페이지 로컬 타입
 *
 * 초보자 가이드:
 * 1. **TaskStatus**: 칸반 상태 (PENDING ~ CANCELLED)
 * 2. **ProgressTaskAssignee, ProgressTask**: api.ts의 타입 재정의 또는 import
 * 3. **StageCategory**: lib/stage-categories에서 re-export
 */
import type { StageCategory } from "@/lib/stage-categories";
export type { StageCategory };

// 기존 ProgressStage 타입 export 줄 제거
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "HOLDING" | "DELAYED" | "COMPLETED" | "CANCELLED";

// 나머지 ProgressTaskAssignee, ProgressTask, Verdict, TabKey 등 기존 그대로
// 단 ProgressTask에서 currentStage 제거하고 stageCategory + currentStageId + currentStageDef 추가
```

- [ ] **Step 2: constants.ts 정리**

`src/app/dashboard/progress-risk/constants.ts`에서 다음 export 제거:

```typescript
// 제거:
export { STAGE_ORDER, stageProgressPct } from "@/lib/progress-stages";
export const STAGE_LABEL: Record<ProgressStage, string> = { ... };
export const STAGE_SHORT: Record<ProgressStage, string> = { ... };
```

`ROLE_OPTIONS` 같은 다른 export는 유지.

- [ ] **Step 3: constants.test.ts 갱신**

`src/app/dashboard/progress-risk/__tests__/constants.test.ts`의 기존 테스트(`STAGE_ORDER`/`STAGE_LABEL` 검증)를 모두 제거하고, 다음으로 교체:

```typescript
import { describe, it, expect } from "vitest";
import { ROLE_OPTIONS } from "../constants";
import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER, computeStageProgress } from "@/lib/stage-categories";

describe("ROLE_OPTIONS", () => {
  it("기본 역할이 포함된다", () => {
    expect(ROLE_OPTIONS).toContain("분석자");
    expect(ROLE_OPTIONS).toContain("개발자");
  });
});

describe("STAGE_CATEGORY", () => {
  it("10개 카테고리 모두 라벨이 있다", () => {
    expect(STAGE_CATEGORY_ORDER.length).toBe(10);
    for (const c of STAGE_CATEGORY_ORDER) {
      expect(STAGE_CATEGORY_LABEL[c]).toBeTruthy();
    }
  });
});

describe("computeStageProgress", () => {
  const stages = [
    { id: "s1", order: 0 },
    { id: "s2", order: 1 },
    { id: "s3", order: 2 },
    { id: "s4", order: 3 },
  ];

  it("currentStageId null이면 0%", () => {
    expect(computeStageProgress(stages, null)).toBe(0);
  });

  it("첫 단계면 25%", () => {
    expect(computeStageProgress(stages, "s1")).toBe(25);
  });

  it("마지막 단계면 100%", () => {
    expect(computeStageProgress(stages, "s4")).toBe(100);
  });

  it("단계 0개면 0%", () => {
    expect(computeStageProgress([], "s1")).toBe(0);
  });

  it("매칭 안 되는 stageId면 0%", () => {
    expect(computeStageProgress(stages, "unknown")).toBe(0);
  });
});
```

- [ ] **Step 4: 테스트 실행**

Run: `npx vitest run src/app/dashboard/progress-risk/__tests__/`
Expected: 모든 테스트 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/app/dashboard/progress-risk/types.ts src/app/dashboard/progress-risk/constants.ts src/app/dashboard/progress-risk/__tests__/
git commit -m "refactor(progress-risk): ProgressStage 관련 타입/상수/테스트 정리"
```

---

## Task 19: progress-stages.ts 정리

**Files:**
- Modify (또는 Delete): `src/lib/progress-stages.ts`

- [ ] **Step 1: 파일 내용 점검**

기존 `src/lib/progress-stages.ts`는 STAGE_ORDER, stageProgressPct만 제공. 둘 다 폐기됐으므로 파일 자체를 삭제하거나 빈 deprecation 주석으로 남길지 결정.

다른 곳에서 import하는 경우가 있는지 확인:

Run: `grep -rn "from \"@/lib/progress-stages\"\|from '@/lib/progress-stages'" src/`

만약 결과가 없거나 이미 모두 마이그레이션 됐으면 파일 삭제. 있으면 그 파일들도 함께 정리 필요.

- [ ] **Step 2: 파일 삭제 (잔존 import 없을 경우)**

Run: `rm src/lib/progress-stages.ts`
또는 잔존 참조가 있으면 그것들을 먼저 stage-categories로 교체.

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: progress-stages 관련 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add -u src/lib/progress-stages.ts
git commit -m "refactor(lib): progress-stages 파일 제거 (stage-categories로 대체)"
```

---

## Task 20: GanttRow mini-stepper 동적

**Files:**
- Modify: `src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx`

- [ ] **Step 1: 동적 dots로 변경**

기존 코드 (STAGE_ORDER 9개 dot 렌더):
```typescript
const currentIdx = STAGE_ORDER.indexOf(task.currentStage);
// ...
{STAGE_ORDER.map((_, i) => {
  const bg = i === currentIdx ? "bg-[#00f3ff]" : i < currentIdx ? "bg-green-500" : "bg-white/10 dark:bg-white/5";
  return <div key={i} className={`w-1.5 h-1.5 rounded-sm ${bg}`} />;
})}
```

다음으로 교체:
```typescript
import { useStageDefs } from "@/hooks";

// props에서 projectId를 받거나 task.projectId 사용:
const { data: allStages = [] } = useStageDefs(task.projectId);
const stagesOfCategory = allStages
  .filter((s) => s.category === task.stageCategory)
  .sort((a, b) => a.order - b.order);
const currentIdx = stagesOfCategory.findIndex((s) => s.id === task.currentStageId);

// ...
<div className="flex items-center gap-0.5">
  {stagesOfCategory.length === 0 ? (
    <span className="text-[8px] text-text-secondary italic">미정의</span>
  ) : (
    stagesOfCategory.map((s, i) => {
      const bg = i === currentIdx ? "bg-[#00f3ff]" : i < currentIdx ? "bg-green-500" : "bg-white/10 dark:bg-white/5";
      return <div key={s.id} className={`w-1.5 h-1.5 rounded-sm ${bg}`} title={s.name} />;
    })
  )}
</div>
```

JSDoc 헤더도 "10개 dot" 표현 제거.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx 2>&1 | head -10`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx
git commit -m "feat(gantt-row): mini-stepper를 동적 단계로 전환"
```

---

## Phase F — StageManagerModal

## Task 21: StageManagerModal 골격 + CategoryTabs

**Files:**
- Create: `src/app/dashboard/progress-risk/components/StageManagerModal/index.tsx`
- Create: `src/app/dashboard/progress-risk/components/StageManagerModal/CategoryTabs.tsx`

- [ ] **Step 1: CategoryTabs 작성**

`src/app/dashboard/progress-risk/components/StageManagerModal/CategoryTabs.tsx`:

```typescript
/**
 * @file CategoryTabs.tsx
 * @description 좌측 카테고리 탭 — 각 옆에 단계 개수 표시
 */
"use client";

import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";
import type { ProgressStageDef } from "@/lib/api";

interface Props {
  selected: StageCategory;
  onSelect: (c: StageCategory) => void;
  allStages: ProgressStageDef[];
}

export function CategoryTabs({ selected, onSelect, allStages }: Props) {
  const counts = new Map<StageCategory, number>();
  for (const s of allStages) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }

  return (
    <div className="w-40 border-r border-border dark:border-border-dark overflow-y-auto">
      {STAGE_CATEGORY_ORDER.map((c) => {
        const isSel = selected === c;
        const count = counts.get(c) ?? 0;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onSelect(c)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm border-b border-border dark:border-border-dark transition-colors ${
              isSel
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-surface/50 dark:hover:bg-surface-dark/50 text-text dark:text-white"
            }`}
          >
            <span>{STAGE_CATEGORY_LABEL[c]}</span>
            <span className="text-xs text-text-secondary">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 모달 골격 작성**

`src/app/dashboard/progress-risk/components/StageManagerModal/index.tsx`:

```typescript
/**
 * @file StageManagerModal/index.tsx
 * @description 단계 관리 모달 — 좌측 카테고리 탭 + 우측 단계 리스트
 */
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useStageDefs } from "@/hooks";
import type { StageCategory } from "@/lib/stage-categories";
import { CategoryTabs } from "./CategoryTabs";
import { StageList } from "./StageList";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function StageManagerModal({ isOpen, onClose, projectId }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<StageCategory>("MES_SYSTEM");
  const { data: allStages = [], isLoading } = useStageDefs(projectId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="단계 관리" size="full">
      <div className="flex h-[60vh]">
        <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} allStages={allStages} />
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-text-secondary">로딩 중...</div>
          ) : (
            <StageList
              projectId={projectId}
              category={selectedCategory}
              stages={allStages.filter((s) => s.category === selectedCategory).sort((a, b) => a.order - b.order)}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit src/app/dashboard/progress-risk/components/StageManagerModal/ 2>&1 | head -10`
Expected: StageList 참조 에러 (Task 22에서 작성). 그 외 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/app/dashboard/progress-risk/components/StageManagerModal/
git commit -m "feat(stage-manager): 모달 골격 + CategoryTabs"
```

---

## Task 22: StageList + StageListRow + 추가/수정/삭제

**Files:**
- Create: `src/app/dashboard/progress-risk/components/StageManagerModal/StageList.tsx`
- Create: `src/app/dashboard/progress-risk/components/StageManagerModal/StageListRow.tsx`

- [ ] **Step 1: StageListRow 작성**

`src/app/dashboard/progress-risk/components/StageManagerModal/StageListRow.tsx`:

```typescript
/**
 * @file StageListRow.tsx
 * @description 단계 1행 — 이름 인라인 편집, 합치기 토글, 삭제
 */
"use client";

import { useState, useEffect } from "react";
import { Icon, useToast, ConfirmModal } from "@/components/ui";
import { useUpdateStageDef, useDeleteStageDef } from "@/hooks";
import type { ProgressStageDef } from "@/lib/api";

interface Props {
  projectId: string;
  stage: ProgressStageDef;
  onRequestMerge: (sourceId: string) => void;
}

export function StageListRow({ projectId, stage, onRequestMerge }: Props) {
  const toast = useToast();
  const update = useUpdateStageDef(projectId);
  const remove = useDeleteStageDef(projectId);
  const [name, setName] = useState(stage.name);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => setName(stage.name), [stage.name]);

  const handleSaveName = () => {
    if (name.trim() === stage.name || name.trim() === "") return;
    update.mutate(
      { id: stage.id, data: { name: name.trim() } },
      { onError: (err) => toast.error(err instanceof Error ? err.message : "이름 변경 실패") }
    );
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(stage.id);
      toast.success("단계가 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setShowConfirm(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border dark:border-border-dark hover:bg-surface/30 dark:hover:bg-surface-dark/30">
        <span className="text-text-secondary text-xs w-6 text-right">{stage.order + 1}.</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="flex-1 bg-transparent border-0 focus:outline-none focus:bg-white/5 px-2 py-1 rounded text-sm text-text dark:text-white"
        />
        <button
          type="button"
          onClick={() => onRequestMerge(stage.id)}
          className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
          title="합치기"
        >
          합치기→
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="p-1 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
          title="삭제"
        >
          <Icon name="delete" size="xs" />
        </button>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="단계 삭제"
        message={`"${stage.name}" 단계를 삭제하시겠습니까?\n이 단계를 쓰는 task의 진도가 초기화됩니다.`}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={remove.isPending}
      />
    </>
  );
}
```

- [ ] **Step 2: StageList 작성**

`src/app/dashboard/progress-risk/components/StageManagerModal/StageList.tsx`:

```typescript
/**
 * @file StageList.tsx
 * @description 카테고리의 단계 리스트 + 추가 폼 + 합치기 패널
 */
"use client";

import { useState } from "react";
import { Icon, Button, Input, useToast } from "@/components/ui";
import { useCreateStageDef } from "@/hooks";
import type { ProgressStageDef } from "@/lib/api";
import type { StageCategory } from "@/lib/stage-categories";
import { STAGE_CATEGORY_LABEL } from "@/lib/stage-categories";
import { StageListRow } from "./StageListRow";
import { MergePanel } from "./MergePanel";

interface Props {
  projectId: string;
  category: StageCategory;
  stages: ProgressStageDef[];
}

export function StageList({ projectId, category, stages }: Props) {
  const toast = useToast();
  const create = useCreateStageDef(projectId);
  const [newName, setNewName] = useState("");
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await create.mutateAsync({ category, name: newName.trim() });
      setNewName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가 실패");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border dark:border-border-dark flex items-center justify-between">
        <h3 className="font-bold text-text dark:text-white">
          {STAGE_CATEGORY_LABEL[category]} 단계{" "}
          <span className="text-text-secondary text-sm font-normal">({stages.length})</span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {stages.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            <Icon name="layers_clear" size="xl" className="mb-3" />
            <p>이 카테고리에 등록된 단계가 없습니다.</p>
          </div>
        ) : (
          stages.map((s) => (
            <StageListRow
              key={s.id}
              projectId={projectId}
              stage={s}
              onRequestMerge={(sourceId) => setMergeSourceId(sourceId)}
            />
          ))
        )}
      </div>

      {/* 합치기 패널 */}
      {mergeSourceId && (
        <MergePanel
          projectId={projectId}
          sourceStage={stages.find((s) => s.id === mergeSourceId)!}
          candidates={stages.filter((s) => s.id !== mergeSourceId)}
          onClose={() => setMergeSourceId(null)}
        />
      )}

      {/* 추가 폼 */}
      <div className="p-3 border-t border-border dark:border-border-dark flex gap-2">
        <Input
          placeholder="새 단계 이름"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button variant="primary" onClick={handleAdd} disabled={!newName.trim() || create.isPending}>
          {create.isPending ? "추가 중..." : "+ 추가"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep StageManagerModal | head -10`
Expected: MergePanel 참조 에러 (Task 23에서 작성). 그 외 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/app/dashboard/progress-risk/components/StageManagerModal/StageList.tsx src/app/dashboard/progress-risk/components/StageManagerModal/StageListRow.tsx
git commit -m "feat(stage-manager): StageList + StageListRow + 추가/삭제"
```

---

## Task 23: MergePanel + 합치기 실행

**Files:**
- Create: `src/app/dashboard/progress-risk/components/StageManagerModal/MergePanel.tsx`

- [ ] **Step 1: MergePanel 작성**

`src/app/dashboard/progress-risk/components/StageManagerModal/MergePanel.tsx`:

```typescript
/**
 * @file MergePanel.tsx
 * @description 단계 합치기 패널 — source의 task가 target으로 이동
 */
"use client";

import { useState } from "react";
import { Button, useToast } from "@/components/ui";
import { useMergeStageDef } from "@/hooks";
import type { ProgressStageDef } from "@/lib/api";

interface Props {
  projectId: string;
  sourceStage: ProgressStageDef;
  candidates: ProgressStageDef[];
  onClose: () => void;
}

export function MergePanel({ projectId, sourceStage, candidates, onClose }: Props) {
  const toast = useToast();
  const merge = useMergeStageDef(projectId);
  const [targetId, setTargetId] = useState<string>("");

  const handleMerge = async () => {
    if (!targetId) return;
    try {
      const result = await merge.mutateAsync({ sourceId: sourceStage.id, targetStageId: targetId });
      toast.success(`'${sourceStage.name}' 단계를 합쳤습니다. ${result.movedTaskCount}개 task 이동.`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "합치기 실패");
    }
  };

  return (
    <div className="border-t border-border dark:border-border-dark bg-amber-500/5 p-3 space-y-2">
      <p className="text-xs text-text dark:text-white">
        <strong>'{sourceStage.name}'</strong> 단계의 task를 다른 단계로 이동 후 이 단계를 삭제합니다.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">→</span>
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
        >
          <option value="">합칠 대상 선택</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button variant="primary" size="sm" onClick={handleMerge} disabled={!targetId || merge.isPending}>
          {merge.isPending ? "처리 중..." : "실행"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep StageManagerModal | head -10`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/dashboard/progress-risk/components/StageManagerModal/MergePanel.tsx
git commit -m "feat(stage-manager): MergePanel — 합치기 실행 UI"
```

---

## Task 24: PageHeader에 [단계 관리] 버튼 + 모달 연결

**Files:**
- Modify: `src/app/dashboard/progress-risk/components/PageHeader.tsx`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: PageHeader props 확장 + 버튼 추가**

`src/app/dashboard/progress-risk/components/PageHeader.tsx`에서 props에 `onOpenStageManager: () => void` 추가, 헤더 액션 영역에 버튼 추가:

```typescript
interface Props {
  // ... 기존 props
  onOpenStageManager: () => void;
}

// JSX에서 기존 액션 버튼들(엑셀 다운로드, Excel 가져오기, 새 task 추가) 옆에 추가:
<Button variant="outline" leftIcon="layers" onClick={onOpenStageManager}>
  단계 관리
</Button>
```

- [ ] **Step 2: page.tsx에 모달 상태 + 렌더링 추가**

`src/app/dashboard/progress-risk/page.tsx`:

```typescript
import { StageManagerModal } from "./components/StageManagerModal";

// 컴포넌트 본문 안:
const [stageManagerOpen, setStageManagerOpen] = useState(false);

// PageHeader에 prop 전달:
<PageHeader
  // ... 기존 props
  onOpenStageManager={() => setStageManagerOpen(true)}
/>

// 모달 렌더링 추가 (다른 모달들 옆):
{selectedProject && (
  <StageManagerModal
    isOpen={stageManagerOpen}
    onClose={() => setStageManagerOpen(false)}
    projectId={selectedProject.id}
  />
)}
```

`components/index.ts`에 `StageManagerModal` export 추가 (또는 직접 import).

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit src/app/dashboard/progress-risk/ 2>&1 | head -15`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/app/dashboard/progress-risk/components/PageHeader.tsx src/app/dashboard/progress-risk/page.tsx src/app/dashboard/progress-risk/components/index.ts
git commit -m "feat(page-header): [단계 관리] 버튼 + 모달 연결"
```

---

## Phase G — Excel + 정리

## Task 25: Excel export 카테고리/단계명 출력

**Files:**
- Modify: `src/app/api/progress-tasks/export/route.ts`

- [ ] **Step 1: 출력 컬럼 변경**

기존 export는 `현재 단계` 컬럼에 enum 라벨을 출력. 새로:

```typescript
import { STAGE_CATEGORY_LABEL } from "@/lib/stage-categories";

// findMany에 include 확장:
const tasks = await prisma.progressTask.findMany({
  where: { projectId },
  orderBy: { order: "asc" },
  include: {
    assignees: { include: { user: { select: { name: true } } } },
    currentStageDef: { select: { name: true } },
  },
});

// 출력 row 매핑에서:
const row = {
  // ... 기존 필드
  "카테고리": STAGE_CATEGORY_LABEL[t.stageCategory],
  "현재 단계": t.currentStageDef?.name ?? "",
  // ...
};
```

기존 `STAGE_LABEL[t.currentStage]` 부분 제거.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit src/app/api/progress-tasks/export/route.ts`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/progress-tasks/export/route.ts
git commit -m "feat(api): Excel export에 카테고리 추가 + 단계명 출력"
```

---

## Task 26: Excel import 카테고리/단계명 매핑

**Files:**
- Modify: `src/app/api/progress-tasks/import/route.ts`

- [ ] **Step 1: 매핑 로직 교체**

기존:
```typescript
const stage = parseStage(row["현재 단계"] as string);
// ... task 생성 시 currentStage: stage
```

다음으로 교체:

```typescript
import { STAGE_CATEGORY_REVERSE, type StageCategory } from "@/lib/stage-categories";

// 카테고리 파싱
function parseCategory(value: unknown): StageCategory {
  if (!value) return "ETC";
  const s = String(value).trim();
  return STAGE_CATEGORY_REVERSE[s] ?? "ETC";
}

// import 핸들러 안에서 — clearExisting 처리 이후, task 생성 루프 진입 전에 단계 매핑 캐시 구축:
const stageDefs = await prisma.progressStageDef.findMany({ where: { projectId } });
const stageMapByCategory = new Map<StageCategory, Map<string, string>>();
for (const sd of stageDefs) {
  let inner = stageMapByCategory.get(sd.category);
  if (!inner) {
    inner = new Map();
    stageMapByCategory.set(sd.category, inner);
  }
  inner.set(sd.name, sd.id);
}

// task 생성 루프 안에서:
const category = parseCategory(row["카테고리"]);
const stageName = row["현재 단계"] ? String(row["현재 단계"]).trim() : "";
const currentStageId = stageName ? (stageMapByCategory.get(category)?.get(stageName) ?? null) : null;
if (stageName && !currentStageId) {
  stats.errors.push(`행 ${idx + 2}: 단계 '${stageName}'을(를) 찾을 수 없습니다.`);
}

await prisma.progressTask.create({
  data: {
    /* 기존 필드 — code, name, startDate 등 */,
    stageCategory: category,
    currentStageId,
    // currentStage 필드 제거
  },
});
```

기존 `parseStage`, `STAGE_REVERSE`, `VALID_STAGES` 등 ProgressStage 관련 코드 모두 제거.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit src/app/api/progress-tasks/import/route.ts`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/progress-tasks/import/route.ts
git commit -m "feat(api): Excel import에 카테고리 + 단계명 매핑 (못 찾으면 null + 경고)"
```

---

## Task 27: 회귀 점검 + 잔존 코드 정리

- [ ] **Step 1: ProgressStage 참조 잔존 검사**

Run: `grep -rn "ProgressStage\|currentStage\b\|STAGE_ORDER\|STAGE_LABEL\|STAGE_SHORT\|stageProgressPct" src/ scripts/`

마이그레이션 스크립트의 `currentStage`(legacy 데이터 조회) 외에 잔존이 있으면 제거.

- [ ] **Step 2: 전체 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 전체 단위 테스트**

Run: `npx vitest run`
Expected: 모든 테스트 통과.

- [ ] **Step 4: 빌드 통과 확인 (선택)**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 수동 회귀 점검**

브라우저에서 다음을 확인:
1. `/dashboard/progress-risk` 진입 → 기존 task들이 모두 ETC 카테고리 + 단계 정상 표시
2. task 카테고리 select 변경 → 단계 stepper가 새 카테고리로 갱신 + currentStageId 자동 초기화
3. 헤더 [단계 관리] 클릭 → 모달 열림, 카테고리 탭 전환, 단계 추가/이름변경/삭제/합치기 동작
4. 신규 프로젝트 생성 → ETC 카테고리에 10개 단계 자동 시드 확인 (Admin이 단계 관리 모달에서 확인 가능)
5. Excel export → "카테고리"와 "현재 단계" 컬럼 모두 정상
6. Excel import → 카테고리 매핑 + 단계 매핑, 잘못된 단계명은 errors에 기록

- [ ] **Step 6: 정리 커밋 (있으면)**

```bash
git add -u
git commit -m "refactor: 카테고리별 가변 단계 시스템 회귀 점검 후 사소한 정리"
```

(없으면 skip)

---

## 자체 검토 메모

**스펙 커버리지 매핑:**
- ✓ Section 2-1 StageCategory enum: Task 1
- ✓ Section 2-2 ProgressStageDef 테이블: Task 1
- ✓ Section 2-3 ProgressTask 필드 변경: Task 1, Task 4
- ✓ Section 3 마이그레이션: Task 2 (상수), Task 3 (스크립트), Task 4 (drop)
- ✓ Section 4 API 5개: Task 5, 6, 7
- ✓ Section 4-6 인가 정책: Task 5, 6, 7 (in-route 가드)
- ✓ Section 5-1 그리드 컬럼: Task 17
- ✓ Section 5-2 [단계 관리] 버튼: Task 24
- ✓ Section 5-3 StageManagerModal: Task 21, 22, 23
- ✓ Section 5-4 StageStepper 동적: Task 15
- ✓ Section 5-5 진척률 산식: Task 2 (헬퍼), Task 11 (PATCH), Task 12 (POST)
- ✓ Section 5-6 forecast: Task 13, 14
- ✓ Section 6 Excel I/O: Task 25, 26
- ✓ Section 8 에러 처리: Task 11 (자동 null), Task 22 (삭제 confirm), Task 7 (다른 카테고리 차단)
- ✓ Section 9 테스트: Task 13, 18

**범위 외 (디자인 12절 명시):**
- 단계별 가중치
- 카테고리 CRUD
- 단계 템플릿 복사

**위험 요소 재확인:**
- Task 4의 schema 2차 drop은 Task 3의 마이그레이션이 완벽히 성공한 뒤에만 실행할 것
- 잔존 task가 currentStageId=null인 경우 진척률 0% 표시는 의도된 동작
