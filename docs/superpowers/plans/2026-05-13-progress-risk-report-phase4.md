# 진도 및 리스크 보고서 — Phase 4 구현 계획 (Excel I/O + Deep Link + 화살표)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영 편의성 폴리시 — Excel 가져오기/내보내기, 진단 카드 → 리스트 탭 deep link, Gantt 선후행 SVG 화살표 overlay.

**Architecture:** Excel I/O는 기존 `customer-requirements/import` 패턴 답습 (xlsx 라이브러리 + 공통 `ImportExcelModal`). Deep link은 page-level highlight state로 구현 (router 사용 X). SVG arrows는 Gantt 차트 위에 absolute overlay로 그림.

**Tech Stack:** xlsx 0.18.5 (이미 설치), 기존 `ImportExcelModal` 컴포넌트 재사용, native SVG

**Reference:**
- Design spec: `docs/superpowers/specs/2026-05-13-progress-risk-report-design.md` (섹션 7 API + 5.3 Gantt)
- 기존 import 패턴: `src/app/api/customer-requirements/import/route.ts`
- 기존 export 패턴: `src/app/api/chat/export/route.ts`
- 공통 컴포넌트: `src/components/common/ImportExcelModal.tsx`

---

## 파일 구조

```
src/app/api/progress-tasks/
├── export/route.ts                                   # 신규 — GET .xlsx 응답
└── import/route.ts                                   # 신규 — POST multipart 업로드

src/lib/api.ts                                        # 수정 — exportUrl/import 메서드 추가

src/app/dashboard/progress-risk/
├── page.tsx                                          # 수정 — 모달 + deep link state
└── components/
    ├── PageHeader.tsx                                # 수정 — export/import 핸들러 연결
    ├── ImportTaskModal.tsx                           # 신규 — ImportExcelModal 래퍼
    ├── TaskRow.tsx                                   # 수정 — highlight prop 수신
    ├── TaskGrid.tsx                                  # 수정 — highlightTaskId prop
    ├── ListTab/index.tsx                             # 수정 — highlightTaskId 전달
    ├── DiagnosisTab/
    │   ├── index.tsx                                 # 수정 — onCardClick prop
    │   └── RecommendationCard.tsx                    # 수정 — onClick 콜백
    └── GanttTab/
        ├── DependencyArrows.tsx                      # 신규 — SVG overlay
        └── GanttChart.tsx                            # 수정 — arrows overlay 통합
```

---

## Task 1: Excel 내보내기 API + PageHeader 연결

**Files:**
- Create: `src/app/api/progress-tasks/export/route.ts`
- Modify: `src/lib/api.ts` (exportUrl 함수)
- Modify: `src/app/dashboard/progress-risk/components/PageHeader.tsx`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: `src/app/api/progress-tasks/export/route.ts` 생성**

```typescript
/**
 * @file src/app/api/progress-tasks/export/route.ts
 * @description GET /api/progress-tasks/export?projectId=... — .xlsx 다운로드
 */
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const STAGE_LABEL: Record<string, string> = {
  ANALYSIS: "분석", DESIGN: "설계", IMPLEMENTATION: "구현",
  UNIT_TEST: "단위테스트", IT_TEST: "IT 테스트", TRAINING: "교육",
  INTEGRATION_TEST: "통합테스트", MIGRATION: "이행", STABILIZATION: "안정화",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기", IN_PROGRESS: "진행중", HOLDING: "홀딩",
  DELAYED: "지연", COMPLETED: "완료", CANCELLED: "취소",
};

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const tasks = await prisma.progressTask.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    include: {
      assignees: {
        include: { user: { select: { name: true } } },
      },
    },
  });

  // 워크북 + 시트 생성
  const rows = tasks.map(t => ({
    "코드": t.code ?? "",
    "기능명": t.name,
    "카테고리": t.category ?? "",
    "설명": t.description ?? "",
    "시작일": t.startDate.toISOString().slice(0, 10),
    "종료일": t.endDate.toISOString().slice(0, 10),
    "실제 시작일": t.actualStartDate?.toISOString().slice(0, 10) ?? "",
    "실제 종료일": t.actualEndDate?.toISOString().slice(0, 10) ?? "",
    "현재 단계": STAGE_LABEL[t.currentStage] ?? t.currentStage,
    "상태": STATUS_LABEL[t.status] ?? t.status,
    "진행률(%)": t.progress,
    "공수(MD)": t.effortMd ?? "",
    "선행 task 코드": (t.predecessorId
      ? tasks.find(x => x.id === t.predecessorId)?.code
      : null) ?? "",
    "담당자": t.assignees.map(a => `${a.user.name}${a.role ? `(${a.role})` : ""}${a.allocationPct !== 100 ? ` ${a.allocationPct}%` : ""}`).join(", "),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "진도리스크");

  // 컬럼 너비
  ws["!cols"] = [
    { wch: 8 }, { wch: 25 }, { wch: 12 }, { wch: 30 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 9 }, { wch: 9 },
    { wch: 12 }, { wch: 30 },
  ];

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fileName = `progress-risk-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
```

- [ ] **Step 2: `src/lib/api.ts`에 exportUrl 헬퍼 추가**

`progressTasks` namespace 안에 마지막 메서드로 추가:

```typescript
    /** 엑셀 다운로드 URL 생성 (window.location.href에 할당) */
    exportUrl: (projectId: string) =>
      `/api/progress-tasks/export?projectId=${encodeURIComponent(projectId)}`,
```

- [ ] **Step 3: `PageHeader.tsx` 수정 — onExportExcel 동작 확인**

기존 prop `onExportExcel`이 이미 있음. JSX는 그대로 두고, page.tsx에서 핸들러를 연결.

- [ ] **Step 4: `page.tsx`에서 export 핸들러 연결**

`PageHeader` 호출 부분에 핸들러 추가:

```tsx
import { api } from "@/lib/api";

// JSX에서:
<PageHeader
  project={selectedProject}
  taskCount={tasks.length}
  onAddTask={() => setAddModalOpen(true)}
  onExportExcel={() => {
    if (selectedProject) {
      window.location.href = api.progressTasks.exportUrl(selectedProject.id);
    }
  }}
/>
```

- [ ] **Step 5: 빌드 + 수동 확인**

```bash
npx tsc --noEmit
npm run dev
```

브라우저에서 `/dashboard/progress-risk` → "엑셀 다운로드" 클릭 → .xlsx 다운로드 → 열어서 14개 컬럼 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/app/api/progress-tasks/export/ src/lib/api.ts src/app/dashboard/progress-risk/page.tsx
git commit -m "$(cat <<'EOF'
feat: 진도 task 엑셀 내보내기 — GET /api/progress-tasks/export

서버에서 xlsx 생성, 14개 컬럼 (코드/기능명/카테고리/일정/단계/담당자 등).
한글 라벨로 변환, 선행 task는 코드로 표시.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Excel 가져오기 API

**Files:**
- Create: `src/app/api/progress-tasks/import/route.ts`

- [ ] **Step 1: `import/route.ts` 생성**

기존 `customer-requirements/import/route.ts` 패턴 따름.

```typescript
/**
 * @file src/app/api/progress-tasks/import/route.ts
 * @description POST multipart 업로드 → 진도 task 대량 등록
 *
 * 컬럼 매핑 (엑셀 → DB):
 * - 기능명 (필수)
 * - 카테고리 (선택)
 * - 설명 (선택)
 * - 시작일 (필수, YYYY-MM-DD 또는 Excel 시리얼)
 * - 종료일 (필수)
 * - 현재 단계 (선택, 한글 라벨 또는 enum)
 * - 공수(MD) (선택)
 * - 선행 task 코드 (선택, 같은 프로젝트 안에서 매칭)
 */
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const STAGE_REVERSE: Record<string, string> = {
  "분석": "ANALYSIS", "설계": "DESIGN", "구현": "IMPLEMENTATION",
  "단위테스트": "UNIT_TEST", "IT 테스트": "IT_TEST", "교육": "TRAINING",
  "통합테스트": "INTEGRATION_TEST", "이행": "MIGRATION", "안정화": "STABILIZATION",
};

const VALID_STAGES = new Set([
  "ANALYSIS", "DESIGN", "IMPLEMENTATION", "UNIT_TEST", "IT_TEST",
  "TRAINING", "INTEGRATION_TEST", "MIGRATION", "STABILIZATION",
]);

function parseStage(value: string | undefined | null): string {
  if (!value) return "ANALYSIS";
  const s = String(value).trim();
  if (VALID_STAGES.has(s)) return s;
  if (STAGE_REVERSE[s]) return STAGE_REVERSE[s];
  return "ANALYSIS";
}

function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "number") {
    // Excel 시리얼 (1900-01-01 기준)
    const excelEpoch = new Date(1900, 0, 1);
    const days = value - 2; // Excel의 1900년 윤년 버그 보정
    return new Date(excelEpoch.getTime() + days * 86400000);
  }
  if (value instanceof Date) return value;
  return null;
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const clearExisting = formData.get("clearExisting") === "true";

  if (!file || !projectId) {
    return NextResponse.json({ error: "file과 projectId가 필요합니다." }, { status: 400 });
  }

  // 파일 파싱
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    return NextResponse.json({ error: "시트가 비어있습니다." }, { status: 400 });
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const stats = { total: rows.length, created: 0, skipped: 0, errors: [] as string[] };

  // 기존 데이터 삭제 (옵션)
  if (clearExisting) {
    await prisma.progressTask.deleteMany({ where: { projectId } });
  }

  // 시작 카운트 (자동 코드 부여용)
  let counter = await prisma.progressTask.count({ where: { projectId } });
  // 같은 import 내 선행 매칭용: code → id
  const codeMap = new Map<string, string>();

  for (const [idx, row] of rows.entries()) {
    try {
      const name = String(row["기능명"] ?? "").trim();
      const startDate = parseExcelDate(row["시작일"]);
      const endDate = parseExcelDate(row["종료일"]);

      if (!name || !startDate || !endDate) {
        stats.skipped++;
        stats.errors.push(`행 ${idx + 2}: 필수 필드 누락 (기능명/시작일/종료일)`);
        continue;
      }
      if (endDate < startDate) {
        stats.skipped++;
        stats.errors.push(`행 ${idx + 2}: 종료일이 시작일보다 빠름`);
        continue;
      }

      counter++;
      const code = `T-${String(counter).padStart(3, "0")}`;
      const stage = parseStage(row["현재 단계"] as string);

      // 선행 task 매칭 — 같은 import 안에서 또는 DB 안에서 코드로 검색
      let predecessorId: string | null = null;
      const predCode = row["선행 task 코드"] ? String(row["선행 task 코드"]).trim() : "";
      if (predCode) {
        if (codeMap.has(predCode)) {
          predecessorId = codeMap.get(predCode)!;
        } else {
          const existing = await prisma.progressTask.findFirst({
            where: { projectId, code: predCode },
            select: { id: true },
          });
          if (existing) predecessorId = existing.id;
        }
      }

      const effortRaw = row["공수(MD)"];
      const effortMd = typeof effortRaw === "number" ? effortRaw : null;

      const created = await prisma.progressTask.create({
        data: {
          projectId,
          code,
          name,
          category: row["카테고리"] ? String(row["카테고리"]).trim() : null,
          description: row["설명"] ? String(row["설명"]).trim() : null,
          startDate,
          endDate,
          currentStage: stage as never,
          effortMd,
          predecessorId,
          order: counter - 1,
        },
      });

      codeMap.set(code, created.id);
      stats.created++;
    } catch (e) {
      stats.skipped++;
      stats.errors.push(`행 ${idx + 2}: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    }
  }

  return NextResponse.json({
    success: true,
    message: `${stats.created}개 생성, ${stats.skipped}개 스킵`,
    stats,
  });
}
```

- [ ] **Step 2: 빌드 + 커밋**

```bash
npx tsc --noEmit
git add src/app/api/progress-tasks/import/
git commit -m "$(cat <<'EOF'
feat: 진도 task 엑셀 가져오기 — POST /api/progress-tasks/import

multipart 업로드 → 행별 task 등록. 한글 단계 라벨 자동 변환,
선행 task 코드 매칭 (같은 import + DB 모두), Excel 시리얼 날짜 처리,
clearExisting 옵션으로 기존 삭제 후 일괄 등록.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: ImportTaskModal 통합

**Files:**
- Create: `src/app/dashboard/progress-risk/components/ImportTaskModal.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/page.tsx`
- Modify: `src/app/dashboard/progress-risk/components/PageHeader.tsx` (이미 onImportExcel prop 있음)

- [ ] **Step 1: `ImportTaskModal.tsx` 생성 (공통 ImportExcelModal 래퍼)**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/ImportTaskModal.tsx
 * @description 진도 task 엑셀 가져오기 모달 — 공통 ImportExcelModal 래퍼
 */
"use client";
import { ImportExcelModal } from "@/components/common";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

export function ImportTaskModal({ isOpen, onClose, onSuccess, projectId }: Props) {
  return (
    <ImportExcelModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      projectId={projectId}
      title="진도 task 가져오기"
      apiEndpoint="/api/progress-tasks/import"
      templateConfig={{
        fileName: "진도리스크_템플릿",
        sheetName: "진도리스크",
        columns: [
          { header: "기능명",         key: "name",          width: 25, example: "주문등록" },
          { header: "카테고리",       key: "category",      width: 12, example: "기준관리" },
          { header: "설명",           key: "description",   width: 30 },
          { header: "시작일",         key: "startDate",     width: 12, example: "2026-05-01" },
          { header: "종료일",         key: "endDate",       width: 12, example: "2026-05-30" },
          { header: "현재 단계",      key: "currentStage",  width: 10, example: "분석" },
          { header: "공수(MD)",       key: "effortMd",      width: 9,  example: 7.5 },
          { header: "선행 task 코드", key: "predecessorCode", width: 12, example: "T-001" },
        ],
      }}
      hints={[
        "첫 번째 행은 헤더입니다 (수정 금지)",
        "기능명/시작일/종료일은 필수",
        "현재 단계는 한글(분석/설계/...) 또는 영문 enum 입력 가능",
        "선행 task 코드는 같은 프로젝트 또는 같은 import 안의 코드만 매칭",
        "코드(T-001 등)는 자동 부여됩니다 — 시트에 입력하지 마세요",
      ]}
    />
  );
}
```

- [ ] **Step 2: `components/index.ts`에 export 추가**

```typescript
export { ImportTaskModal } from "./ImportTaskModal";
```

- [ ] **Step 3: `page.tsx`에 모달 통합**

기존 useState 옆에 추가:
```tsx
const [importModalOpen, setImportModalOpen] = useState(false);
```

`PageHeader` 호출에 추가:
```tsx
onImportExcel={() => setImportModalOpen(true)}
```

JSX 끝(AddTaskModal 근처)에 추가:
```tsx
{selectedProject && (
  <ImportTaskModal
    isOpen={importModalOpen}
    onClose={() => setImportModalOpen(false)}
    onSuccess={() => setImportModalOpen(false)}
    projectId={selectedProject.id}
  />
)}
```

import 추가:
```typescript
import { ImportTaskModal } from "./components";
```

- [ ] **Step 4: 빌드 + 커밋**

```bash
npx tsc --noEmit
npm run build
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: ImportTaskModal — 진도 task 엑셀 가져오기 UI

공통 ImportExcelModal 래퍼. 8개 컬럼 템플릿 + 5개 힌트.
다운로드된 템플릿에 데이터 입력 후 업로드 → 일괄 등록.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 진단 카드 deep link (DiagnosisTab → ListTab + 하이라이트)

**Files:**
- Modify: `src/app/dashboard/progress-risk/components/DiagnosisTab/RecommendationCard.tsx`
- Modify: `src/app/dashboard/progress-risk/components/DiagnosisTab/index.tsx`
- Modify: `src/app/dashboard/progress-risk/components/ListTab/index.tsx`
- Modify: `src/app/dashboard/progress-risk/components/TaskGrid.tsx`
- Modify: `src/app/dashboard/progress-risk/components/TaskRow.tsx`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: `RecommendationCard.tsx` 수정 — onClick prop 추가**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/DiagnosisTab/RecommendationCard.tsx
 */
import { Icon } from "@/components/ui";
import type { Recommendation } from "@/lib/progress-calc/types";

interface Props {
  recommendation: Recommendation;
  onClick?: (rec: Recommendation) => void;
}

export function RecommendationCard({ recommendation, onClick }: Props) {
  const isHigh = recommendation.severity === "high";
  const bgClass = isHigh
    ? "bg-error/5 border-error/30 hover:bg-error/10"
    : "bg-warning/5 border-warning/30 hover:bg-warning/10";
  const iconBg = isHigh ? "bg-error/10" : "bg-warning/10";
  const iconColor = isHigh ? "text-error" : "text-warning";
  const icon = isHigh ? "priority_high" : "warning";
  const clickable = onClick && (recommendation.taskId || recommendation.userId);

  const Wrapper = clickable
    ? (props: React.PropsWithChildren<{ className: string }>) => (
        <button
          type="button"
          onClick={() => onClick!(recommendation)}
          className={`${props.className} text-left w-full cursor-pointer transition-colors`}
          aria-label="관련 task로 이동"
        >
          {props.children}
        </button>
      )
    : (props: React.PropsWithChildren<{ className: string }>) => (
        <div className={props.className} role="article">
          {props.children}
        </div>
      );

  return (
    <Wrapper className={`flex items-start gap-3 border rounded-lg p-4 ${bgClass}`}>
      <div className={`size-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon name={icon} size="sm" className={iconColor} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${iconColor}`}>
          {isHigh ? "🔴 우선 조치" : "🟠 주의"}
          {clickable && <span className="ml-2 text-[10px] text-text-secondary">→ 클릭해서 task로 이동</span>}
        </p>
        <p className="text-sm text-text dark:text-white mt-1">{recommendation.message}</p>
        {(recommendation.taskId || recommendation.userId) && (
          <p className="text-[10px] text-text-secondary mt-2">
            {recommendation.taskId && <>관련 task: <code className="bg-white/5 px-1 rounded">{recommendation.taskId}</code> </>}
            {recommendation.userId && <>관련 사용자: <code className="bg-white/5 px-1 rounded">{recommendation.userId}</code></>}
          </p>
        )}
      </div>
    </Wrapper>
  );
}
```

- [ ] **Step 2: `DiagnosisTab/index.tsx` 수정 — onCardClick prop 추가 + 전달**

```tsx
// Props 변경
interface Props {
  diagnosis: Diagnosis | undefined;
  onCardClick?: (rec: Recommendation) => void;
}

// 함수 시그니처
export function DiagnosisTab({ diagnosis, onCardClick }: Props) {
  // ...

  // RecommendationCard 매핑 부분:
  diagnosis.recommendations.map((r, i) => (
    <RecommendationCard key={i} recommendation={r} onClick={onCardClick} />
  ))
}
```

import에 `Recommendation` 타입 추가:
```typescript
import type { Diagnosis, Recommendation } from "@/lib/progress-calc/types";
```

- [ ] **Step 3: `TaskRow.tsx` 수정 — highlight 표시**

`Props`에 `highlighted` 추가:

```tsx
interface Props {
  index: number;
  task: ProgressTask;
  projectId: string;
  allTasks: ProgressTask[];
  gridCols: string;
  highlighted?: boolean;
}
```

행 컨테이너 className에 highlight 클래스 추가:

```tsx
<div
  className={`grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1200px] text-sm ${
    highlighted ? "bg-primary/10 ring-2 ring-primary/40" : ""
  }`}
  style={{ gridTemplateColumns: gridCols }}
>
```

- [ ] **Step 4: `TaskGrid.tsx` 수정 — highlightTaskId prop 전달**

```tsx
interface Props {
  tasks: ProgressTask[];
  projectId: string;
  highlightTaskId?: string | null;
}

export function TaskGrid({ tasks, projectId, highlightTaskId }: Props) {
  // ...
  return (
    // ...
    {tasks.map((task, idx) => (
      <TaskRow
        key={task.id}
        // ...기존 props
        highlighted={highlightTaskId === task.id}
      />
    ))}
  );
}
```

- [ ] **Step 5: `ListTab/index.tsx` 수정 — highlightTaskId 전달**

```tsx
interface Props {
  tasks: ProgressTask[];
  projectId: string;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  highlightTaskId?: string | null;
}

export function ListTab({ tasks, projectId, filters, onFiltersChange, highlightTaskId }: Props) {
  const filtered = applyFilters(tasks, filters);
  return (
    <div className="space-y-4">
      <FilterBar tasks={tasks} filters={filters} onChange={onFiltersChange} />
      <TaskGrid tasks={filtered} projectId={projectId} highlightTaskId={highlightTaskId} />
    </div>
  );
}
```

- [ ] **Step 6: `page.tsx` 수정 — highlight state + deep link 핸들러**

```tsx
import type { Recommendation } from "@/lib/progress-calc/types";

// state 추가
const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);

// handler 추가
const handleCardClick = (rec: Recommendation) => {
  if (rec.taskId) {
    setHighlightTaskId(rec.taskId);
    setActiveTab("list");
    // 3초 후 자동 해제
    setTimeout(() => setHighlightTaskId(null), 3000);
  } else if (rec.userId) {
    setFilters(f => ({ ...f, userId: rec.userId! }));
    setActiveTab("list");
  }
};

// JSX 변경
{activeTab === "list" && (
  <ListTab
    tasks={tasks}
    projectId={selectedProject.id}
    filters={filters}
    onFiltersChange={setFilters}
    highlightTaskId={highlightTaskId}
  />
)}

{activeTab === "diagnosis" && (
  <DiagnosisTab diagnosis={diagnosis} onCardClick={handleCardClick} />
)}
```

- [ ] **Step 7: 빌드 + 커밋**

```bash
npx tsc --noEmit
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: 진단 카드 deep link — 카드 클릭 시 리스트 탭 + 행 하이라이트

taskId 있으면 해당 행 ring 강조 (3초 자동 해제),
userId 있으면 담당자 필터 적용. 둘 다 없으면 클릭 불가.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Gantt SVG 선후행 화살표 overlay

**Files:**
- Create: `src/app/dashboard/progress-risk/components/GanttTab/DependencyArrows.tsx`
- Modify: `src/app/dashboard/progress-risk/components/GanttTab/GanttChart.tsx`

- [ ] **Step 1: `DependencyArrows.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/DependencyArrows.tsx
 * @description Gantt 위 선후행 의존성 SVG 화살표 overlay
 *
 * 알고리즘:
 * 1. 각 task의 (forecastEnd, rowIndex) → (forecastStart, rowIndex)로 화살표
 * 2. 화살표는 task A의 막대 우측 끝 → task B의 막대 좌측 끝
 * 3. L자 형태 (직각 꺾임)
 */
import type { ProgressTask } from "@/lib/api";
import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
  rowHeight: number; // 각 행 높이 (px)
  rowGap: number;    // 행 간격 (px)
}

export function DependencyArrows({ tasks, forecast, timeScale, rowHeight, rowGap }: Props) {
  // task id → row index 매핑
  const indexById = new Map<string, number>();
  tasks.forEach((t, i) => indexById.set(t.id, i));

  // 화살표 좌표 계산
  const arrows: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; key: string }> = [];

  for (const t of tasks) {
    if (!t.predecessorId) continue;
    const fromIdx = indexById.get(t.predecessorId);
    const toIdx = indexById.get(t.id);
    if (fromIdx === undefined || toIdx === undefined) continue;

    const fromTask = tasks[fromIdx];
    const fromFore = forecast.get(fromTask.id);
    const toFore = forecast.get(t.id);
    if (!fromFore || !toFore) continue;

    // 좌표는 % 기반이지만 SVG는 px 기반이라야 함 → preserveAspectRatio="none" 활용
    // 간단화: 화살표 좌표를 % 단위로 그리고 viewBox는 0~100, height는 행 수 기반
    const fromX = timeScale.toRatio(fromFore.forecastEnd) * 100;
    const fromY = fromIdx * (rowHeight + rowGap) + rowHeight / 2;
    const toX = timeScale.toRatio(toFore.forecastStart) * 100;
    const toY = toIdx * (rowHeight + rowGap) + rowHeight / 2;

    arrows.push({ from: { x: fromX, y: fromY }, to: { x: toX, y: toY }, key: `${fromTask.id}-${t.id}` });
  }

  if (arrows.length === 0) return null;

  const totalHeight = tasks.length * (rowHeight + rowGap);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width="100%"
      height={totalHeight}
      viewBox={`0 0 100 ${totalHeight}`}
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker
          id="arrowhead-dep"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 6 3, 0 6" fill="#94a3b8" />
        </marker>
      </defs>
      {arrows.map(a => {
        // L자: from에서 우측으로 살짝 → 아래로 → to의 좌측으로
        const midX = (a.from.x + a.to.x) / 2;
        const d = `M ${a.from.x} ${a.from.y} H ${midX} V ${a.to.y} H ${a.to.x}`;
        return (
          <path
            key={a.key}
            d={d}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="0.3"
            strokeDasharray="0.8,0.4"
            markerEnd="url(#arrowhead-dep)"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: `GanttChart.tsx` 수정 — 행 영역을 relative wrapper로 감싸고 화살표 overlay**

```tsx
"use client";
import type { ProgressTask } from "@/lib/api";
import type { Forecast } from "@/lib/progress-calc/types";
import { GanttRow } from "./GanttRow";
import { DeadlineMarkers } from "./DeadlineMarkers";
import { DependencyArrows } from "./DependencyArrows";
import type { TimeScale } from "./timeScale";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
  criticalPathIds?: Set<string>;
  projectEndDate?: Date | null;
}

const GRID_COLS = "36px 1fr 130px 1fr";
const ROW_HEIGHT = 20; // 각 행 본문 높이 (h-5)
const ROW_GAP = 12;    // border + padding (py-1.5)

export function GanttChart({ tasks, forecast, timeScale, criticalPathIds, projectEndDate }: Props) {
  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 overflow-x-auto">
      {/* 헤더 */}
      <div className="grid gap-2 text-xs text-text-secondary mb-2" style={{ gridTemplateColumns: GRID_COLS }}>
        <div></div>
        <div className="font-semibold uppercase">기능</div>
        <div className="font-semibold uppercase">단계</div>
        <div className="relative h-5">
          {timeScale.ticks.map((t, i) => (
            <span key={i} className="absolute -translate-x-1/2 text-[10px]" style={{ left: `${t.ratio * 100}%` }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* 마커 */}
      <div className="grid gap-2" style={{ gridTemplateColumns: GRID_COLS }}>
        <div></div>
        <div></div>
        <div></div>
        <DeadlineMarkers
          projectEndDate={projectEndDate ?? null}
          forecast={forecast}
          timeScale={timeScale}
        />
      </div>

      {/* 행 + 화살표 overlay */}
      <div className="relative">
        {tasks.map((task, idx) => (
          <GanttRow
            key={task.id}
            index={idx + 1}
            task={task}
            forecast={forecast.get(task.id)}
            timeScale={timeScale}
            onCriticalPath={criticalPathIds?.has(task.id) ?? false}
            gridCols={GRID_COLS}
          />
        ))}

        {/* 시간축 컬럼 영역에만 정렬된 화살표 overlay */}
        <div
          className="absolute pointer-events-none"
          style={{
            // grid 4번째 컬럼 (시간축) 위치 = 36 + 8 + ?? + 130 + 8 + ?? = 복잡
            // 단순화: 차트의 우측 1/2 영역만 차지 (실용적 근사)
            // 정밀: CSS variable 또는 ref 측정 필요 — 향후 polish
            top: 0,
            // GRID_COLS "36px 1fr 130px 1fr" 기준: 좌측 영역(36+8+1fr+8+130+8)을 제외한 우측 1fr
            // calc로 정확히 계산:
            left: `calc((100% - 36px - 130px - 1.5rem) / 2 + 36px + 130px + 1.5rem)`,
            right: 0,
            bottom: 0,
          }}
        >
          <DependencyArrows
            tasks={tasks}
            forecast={forecast}
            timeScale={timeScale}
            rowHeight={ROW_HEIGHT}
            rowGap={ROW_GAP}
          />
        </div>
      </div>
    </div>
  );
}
```

**Note:** `left: calc(...)` 가 정확한 시간축 컬럼 시작 위치를 계산. CSS grid의 `1fr 1fr` 컬럼이 동일 너비를 갖는 가정 위에서 (총 너비 - 고정 컬럼 합) / 2 + 좌측 영역.

- [ ] **Step 3: 빌드 + 수동 확인**

```bash
npx tsc --noEmit
npm run dev
```

브라우저 `/dashboard/progress-risk` → Gantt 탭 → 선행 task가 있는 task들 사이에 회색 점선 L자 화살표 보이는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/app/dashboard/progress-risk/components/GanttTab/
git commit -m "$(cat <<'EOF'
feat: Gantt 선후행 SVG 화살표 overlay (DependencyArrows)

predecessorId 있는 task 사이에 L자 점선 화살표.
viewBox 100단위 + preserveAspectRatio=none + non-scaling-stroke으로
% 좌표를 그대로 활용. 시간축 컬럼 영역에 absolute overlay.

Phase 4 완료. 진도 및 리스크 보고서 풀 시스템 폴리시 완료.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 완료 체크리스트

- [ ] Excel 내보내기 동작 (.xlsx 다운로드)
- [ ] Excel 가져오기 동작 (대량 task 등록)
- [ ] 한글 단계 라벨 변환 (가져오기)
- [ ] 선행 task 코드 매칭 (같은 import + DB)
- [ ] ImportTaskModal 템플릿 다운로드 + 업로드
- [ ] 진단 카드 클릭 → 리스트 탭으로 이동 + 행 하이라이트
- [ ] 담당자 권장 카드 클릭 → 담당자 필터 적용
- [ ] Gantt 선후행 SVG 화살표 표시
- [ ] `npm run build` 성공
- [ ] 모든 단위 테스트 통과 (회귀)

---

## 자체 점검

| 확인 항목 | 결과 |
|----------|------|
| Excel 라이브러리 재사용 (xlsx 0.18.5) | ✅ |
| ImportExcelModal 공통 컴포넌트 활용 | ✅ |
| 기존 import 패턴 답습 (customer-requirements) | ✅ |
| Deep link은 router 미사용 (page state) | ✅ |
| SVG arrow는 외부 라이브러리 X | ✅ |
| 새 테스트 추가 (Phase 4): 없음 — UI 위주 | ✅ |
| 5 tasks bite-sized 유지 | ✅ |
| Phase 5 영역 명시 X (지금이 마지막 phase) | — |
