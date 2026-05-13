# 진도 및 리스크 보고서 — Phase 2 구현 계획 (알고리즘 + 진단 UI)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 1 평면 모델 위에 실시간 forecast/critical-path/충돌 감지 알고리즘을 얹고, 상단 KPI를 4장 → 6장으로 확장하며 진단 결과를 한 줄 배너로 노출. Gantt 시각화는 Phase 3로 이월.

**Architecture:** 알고리즘은 **클라이언트 사이드** 순수 함수 모듈(`src/lib/progress-calc/`)로 격리하고, React Query `select`로 `useComputeForecast` 단일 훅에서 derive. 진단 결과는 컴포넌트가 훅에서 직접 소비. Phase 1 컴포넌트는 그대로 유지.

**Tech Stack:** TypeScript 5, Vitest 2.1, date-fns 4.1, React Query 5, React 19.2

**Reference:**
- Design spec: `docs/superpowers/specs/2026-05-13-progress-risk-report-design.md` (섹션 6 알고리즘)
- Phase 1 plan: `docs/superpowers/plans/2026-05-13-progress-risk-report-phase1.md`

**Phase 2 미포함 (Phase 3 이월):** Gantt 탭, 인력부하 탭, 진단 탭 (권장 조치 카드), TabSwitcher, ZoomControl

---

## 파일 구조

```
src/lib/
├── progress-stages.ts                                # 신규 — STAGE_ORDER 공유 (I-1 fix)
└── progress-calc/                                    # 신규 디렉토리
    ├── types.ts                                      # 계산 결과 타입 (Forecast, Conflict, Diagnosis)
    ├── forecast.ts                                   # forward-pass 전파
    ├── critical-path.ts                              # CPM 식별
    ├── conflicts.ts                                  # 인력 충돌 감지 (주 단위)
    ├── diagnose.ts                                   # 진단 판정 + 권장 조치
    └── __tests__/
        ├── forecast.test.ts
        ├── critical-path.test.ts
        ├── conflicts.test.ts
        └── diagnose.test.ts

src/app/api/progress-tasks/[id]/route.ts              # 수정 — 순환 검증 + 날짜 범위 검증 (I-2, I-3)
src/app/api/progress-tasks/route.ts                   # 수정 — 날짜 범위 검증 (I-3)

src/hooks/useProgressTasks.ts                         # 수정 — mutation onError toast (I-4)
src/hooks/useComputeForecast.ts                       # 신규 — select로 derive

src/app/dashboard/progress-risk/
├── constants.ts                                      # 수정 — STAGE_ORDER을 lib/progress-stages.ts에서 re-export
└── components/
    ├── KpiRow.tsx                                    # 수정 — 4장 → 6장 (공수 부족, 일정 초과, 충돌 인원 추가)
    ├── VerdictBanner.tsx                             # 신규
    └── index.ts                                      # export 추가

src/app/dashboard/progress-risk/page.tsx              # 수정 — useComputeForecast 사용 + VerdictBanner 렌더
```

---

## Part A: Phase 1 최종 리뷰 Important 이슈 정리 (Tasks 1-4)

## Task 1: STAGE_ORDER 공유 모듈 (I-1 fix)

**Files:**
- Create: `src/lib/progress-stages.ts`
- Modify: `src/app/dashboard/progress-risk/constants.ts` (STAGE_ORDER 등을 lib에서 re-export)
- Modify: `src/app/api/progress-tasks/[id]/route.ts` (인라인 배열 제거 → import)

- [ ] **Step 1: `src/lib/progress-stages.ts` 생성**

```typescript
/**
 * @file src/lib/progress-stages.ts
 * @description
 * 진도 단계(ProgressStage) 공유 상수 — 서버/클라이언트 모두 사용
 *
 * 초보자 가이드:
 * 1. **STAGE_ORDER**: 9단계 순서 배열 (진행률 계산 기준)
 * 2. **stageProgressPct**: currentStage가 N번째면 N/9 진행률
 *
 * Phase 1에서 src/app/dashboard/progress-risk/constants.ts에 있었으나,
 * 서버 라우트도 사용해야 하므로 src/lib/로 이동.
 */
import type { ProgressStage } from "@/app/dashboard/progress-risk/types";

export const STAGE_ORDER: ProgressStage[] = [
  "ANALYSIS", "DESIGN", "IMPLEMENTATION",
  "UNIT_TEST", "IT_TEST", "TRAINING",
  "INTEGRATION_TEST", "MIGRATION", "STABILIZATION",
];

export function stageProgressPct(stage: ProgressStage): number {
  return Math.round(((STAGE_ORDER.indexOf(stage) + 1) / STAGE_ORDER.length) * 100);
}
```

- [ ] **Step 2: `src/app/dashboard/progress-risk/constants.ts` 수정**

상단 STAGE_ORDER 정의 + stageProgressPct 함수를 제거하고 lib에서 re-export:

```typescript
/**
 * @file src/app/dashboard/progress-risk/constants.ts
 * @description
 * 진도 및 리스크 보고서 페이지의 상수 정의
 *
 * 초보자 가이드:
 * 1. **STAGE_ORDER**: src/lib/progress-stages.ts에서 가져옴 (서버와 공유)
 * 2. **STAGE_LABEL**: 각 단계의 한글 풀네임
 * 3. **STAGE_SHORT**: 그리드 표시용 짧은 라벨
 */
import type { ProgressStage } from "./types";

// 공유 모듈에서 re-export (서버 라우트와 동일한 출처)
export { STAGE_ORDER, stageProgressPct } from "@/lib/progress-stages";

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

/** 자주 쓰는 역할 옵션 */
export const ROLE_OPTIONS = ["분석자", "설계자", "개발자", "테스터", "교육담당", "운영", "기타"];
```

- [ ] **Step 3: `src/app/api/progress-tasks/[id]/route.ts` 수정**

PATCH 핸들러 내부의 인라인 STAGE_ORDER 배열 제거 후 import:

```typescript
// 파일 상단 import에 추가
import { STAGE_ORDER } from "@/lib/progress-stages";

// PATCH 핸들러 내부에서 다음 블록 제거:
//   const STAGE_ORDER = [
//     "ANALYSIS", "DESIGN", "IMPLEMENTATION", ...
//   ];
// 대신 곧바로 STAGE_ORDER.indexOf(...) 사용
```

- [ ] **Step 4: TypeScript 검증 + 기존 테스트 확인**

```bash
npx tsc --noEmit
npx vitest run src/app/dashboard/progress-risk/__tests__/constants.test.ts
```
Expected: tsc 0 errors, 6 tests passed (Phase 1 테스트 그대로 통과)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/progress-stages.ts \
        src/app/dashboard/progress-risk/constants.ts \
        src/app/api/progress-tasks/\[id\]/route.ts
git commit -m "$(cat <<'EOF'
fix: STAGE_ORDER 공유 모듈로 통합 (Phase 1 리뷰 I-1)

server/client 양쪽에 인라인으로 중복되던 9단계 배열을
src/lib/progress-stages.ts 단일 출처로 통합.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 서버 사이드 순환 의존성 검증 (I-2 fix)

**Files:**
- Modify: `src/app/api/progress-tasks/[id]/route.ts` (PATCH 핸들러에 검증 추가)

- [ ] **Step 1: PATCH 핸들러에 순환 검증 로직 추가**

PATCH 핸들러 안 `data` 객체 구성 직후, `prisma.progressTask.update` 호출 직전에 다음 검증 추가:

```typescript
// predecessorId 변경 시 순환 의존성 검증 (서버 사이드)
if (body.predecessorId !== undefined && body.predecessorId !== null) {
  // 1) 자기 자신 선행 방지
  if (body.predecessorId === id) {
    return NextResponse.json(
      { error: "자기 자신을 선행 task로 지정할 수 없습니다." },
      { status: 400 }
    );
  }

  // 2) 같은 프로젝트의 모든 task를 가져와 순환 탐지
  const target = await prisma.progressTask.findUnique({ where: { id }, select: { projectId: true } });
  if (!target) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  const all = await prisma.progressTask.findMany({
    where: { projectId: target.projectId },
    select: { id: true, predecessorId: true },
  });

  // 3) BFS로 무효 선행 집합 계산 (PredecessorSelect와 동일 알고리즘)
  const invalid = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of all) {
      if (!invalid.has(t.id) && t.predecessorId && invalid.has(t.predecessorId)) {
        invalid.add(t.id);
        changed = true;
      }
    }
  }

  if (invalid.has(body.predecessorId)) {
    return NextResponse.json(
      { error: "순환 의존성이 발생합니다. 다른 선행 task를 선택하세요." },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 2: 검증 (TypeScript + 수동)**

```bash
npx tsc --noEmit
```
Expected: 0 errors

수동 확인 (선택): `npm run dev` 후 DevTools에서 A→B→A 순환 시도 PATCH → 400 "순환 의존성" 응답.

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/progress-tasks/\[id\]/route.ts
git commit -m "$(cat <<'EOF'
fix: predecessorId PATCH에 순환 의존성 서버 검증 추가 (Phase 1 리뷰 I-2)

클라이언트 PredecessorSelect의 BFS 알고리즘과 동일한 로직을 서버에 복제.
curl 등으로 우회 시도해도 400 차단.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 날짜 범위 검증 (I-3 fix)

**Files:**
- Modify: `src/app/api/progress-tasks/route.ts` (POST에 endDate >= startDate)
- Modify: `src/app/api/progress-tasks/[id]/route.ts` (PATCH에 endDate >= startDate)
- Modify: `src/app/dashboard/progress-risk/components/AddTaskModal.tsx` (제출 전 검증)
- Modify: `src/app/dashboard/progress-risk/components/TaskRow.tsx` (인라인 편집 시 검증)

- [ ] **Step 1: POST 라우트에 검증 추가**

`src/app/api/progress-tasks/route.ts`의 POST 핸들러에서 필수 필드 검증 다음에 추가:

```typescript
// 필수 필드 검증 다음에:
const startDt = new Date(startDate);
const endDt = new Date(endDate);
if (endDt < startDt) {
  return NextResponse.json(
    { error: "종료일이 시작일보다 빠를 수 없습니다." },
    { status: 400 }
  );
}
```

기존 `new Date(startDate)` / `new Date(endDate)` 호출은 위 변수로 대체.

- [ ] **Step 2: PATCH 라우트에 검증 추가**

`src/app/api/progress-tasks/[id]/route.ts`의 PATCH 핸들러에서, `data` 구성 후 update 직전에 추가:

```typescript
// 날짜 변경 시 startDate ≤ endDate 검증
const willUpdateStart = body.startDate !== undefined;
const willUpdateEnd = body.endDate !== undefined;
if (willUpdateStart || willUpdateEnd) {
  const existing = await prisma.progressTask.findUnique({
    where: { id },
    select: { startDate: true, endDate: true },
  });
  if (existing) {
    const newStart = willUpdateStart ? new Date(body.startDate) : existing.startDate;
    const newEnd = willUpdateEnd ? new Date(body.endDate) : existing.endDate;
    if (newEnd < newStart) {
      return NextResponse.json(
        { error: "종료일이 시작일보다 빠를 수 없습니다." },
        { status: 400 }
      );
    }
  }
}
```

- [ ] **Step 3: AddTaskModal에 검증 추가**

`handleSubmit` 함수 시작 부분에 추가:

```typescript
const handleSubmit = async () => {
  if (!name || !startDate || !endDate) return;
  if (new Date(endDate) < new Date(startDate)) {
    alert("종료일이 시작일보다 빠를 수 없습니다.");
    return;
  }
  // 기존 mutateAsync 호출...
};
```

- [ ] **Step 4: TaskRow의 debounce 저장 시 검증 추가**

TaskRow에서 startDate/endDate input의 onChange가 setState만 하고 debounce로 mutate. 검증은 setState 직후:

기존 `useDebouncedUpdate` 호출을 wrapper로 변경하지 말고, mutate 호출 직전에 검증하는 게 더 단순. 다음과 같이 mutate 콜백을 래핑:

```typescript
// 변경 전:
const [startDate, setStartDate] = useDebouncedUpdate(
  task.startDate.slice(0, 10),
  v => update.mutate({ id: task.id, data: { startDate: v } })
);

// 변경 후 (양쪽 날짜 모두 동일 패턴):
const [startDate, setStartDate] = useDebouncedUpdate(
  task.startDate.slice(0, 10),
  v => {
    const end = task.endDate.slice(0, 10);
    if (new Date(end) < new Date(v)) {
      alert("종료일보다 늦은 시작일은 지정할 수 없습니다.");
      setStartDate(task.startDate.slice(0, 10)); // 롤백
      return;
    }
    update.mutate({ id: task.id, data: { startDate: v } });
  }
);
const [endDate, setEndDate] = useDebouncedUpdate(
  task.endDate.slice(0, 10),
  v => {
    const start = task.startDate.slice(0, 10);
    if (new Date(v) < new Date(start)) {
      alert("시작일보다 빠른 종료일은 지정할 수 없습니다.");
      setEndDate(task.endDate.slice(0, 10));
      return;
    }
    update.mutate({ id: task.id, data: { endDate: v } });
  }
);
```

- [ ] **Step 5: 검증 + 커밋**

```bash
npx tsc --noEmit
git add src/app/api/progress-tasks/ src/app/dashboard/progress-risk/components/AddTaskModal.tsx src/app/dashboard/progress-risk/components/TaskRow.tsx
git commit -m "$(cat <<'EOF'
fix: 일정 endDate ≥ startDate 클라이언트/서버 검증 (Phase 1 리뷰 I-3)

POST/PATCH 라우트에 서버 검증, AddTaskModal에 제출 전 alert,
TaskRow 인라인 편집에 즉시 롤백 처리.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Mutation 에러 toast 피드백 (I-4 fix)

**Files:**
- Modify: `src/hooks/useProgressTasks.ts` (각 mutation에 onError 추가)

- [ ] **Step 1: `useToast` import 확인**

기존 패턴: 다른 페이지(`issues/page.tsx` 등)는 `useToast`를 컴포넌트 단에서 호출. 훅 안에서는 직접 호출 불가(React 컴포넌트 컨텍스트 필요). 대안 두 가지:

- (A) 훅에서 `useQueryClient`와 함께 글로벌 toast 함수 호출 (toast 라이브러리가 글로벌 API 제공한다면)
- (B) 훅은 그대로, 컴포넌트 측에서 mutation의 isError 상태를 watching하여 toast 호출

**프로젝트 패턴 점검:** `src/contexts/ToastContext.tsx` 의 `useToast()` 훅은 React Hook이라 훅 내부에서 호출 가능 (다른 훅도 컨텍스트 의존 가능). 따라서 (A) 채택.

```typescript
// 파일 상단 import 추가:
import { useToast } from "@/contexts";
```

- [ ] **Step 2: 각 mutation에 onError 추가**

`useProgressTasks.ts`의 모든 mutation 훅에 `useToast` 호출 + `onError` 콜백 추가. 패턴 예시 (useCreateProgressTask):

```typescript
export function useCreateProgressTask() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: { /* 기존 */ }) => api.progressTasks.create(data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: progressTaskKeys.list(vars.projectId) }),
    onError: (err: Error) => showToast(err.message || "task 생성 실패", "error"),
  });
}
```

같은 패턴을 다음 6개 훅에 모두 적용:
- `useCreateProgressTask` — "task 생성 실패"
- `useUpdateProgressTask` — "task 수정 실패"
- `useDeleteProgressTask` — "task 삭제 실패"
- `useAddAssignee` — "담당자 추가 실패"
- `useUpdateAssignee` — "담당자 수정 실패"
- `useRemoveAssignee` — "담당자 제거 실패"

**중요:** `useToast()` 의 실제 API 시그니처(`showToast` vs `toast.error` vs `addToast` 등)를 `src/contexts/ToastContext.tsx`에서 확인 후 위 호출을 정확한 이름으로 조정. 잘못된 이름이면 컴파일 실패하므로 즉시 발견됨.

- [ ] **Step 3: 검증**

```bash
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/useProgressTasks.ts
git commit -m "$(cat <<'EOF'
fix: 진도 task 7개 mutation에 onError toast 피드백 (Phase 1 리뷰 I-4)

생성/수정/삭제/담당자 관리 실패 시 사용자에게 toast로 알림.
실패가 무음이던 문제 해결.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Part B: 알고리즘 엔진 (Tasks 5-9)

## Task 5: forecast.ts — Forward-Pass 전파

**Files:**
- Create: `src/lib/progress-calc/types.ts`
- Create: `src/lib/progress-calc/forecast.ts`
- Create: `src/lib/progress-calc/__tests__/forecast.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `__tests__/forecast.test.ts`

```typescript
/**
 * @file src/lib/progress-calc/__tests__/forecast.test.ts
 * @description forecast 전파 알고리즘 검증
 */
import { describe, it, expect } from "vitest";
import { computeForecast } from "../forecast";
import type { ForecastInput } from "../types";

const today = (offset = 0) => {
  const d = new Date(2026, 4, 13); // 2026-05-13 고정 (테스트 결정성)
  d.setDate(d.getDate() + offset);
  return d;
};

function task(
  id: string,
  start: Date,
  end: Date,
  opts: Partial<ForecastInput> = {}
): ForecastInput {
  return {
    id,
    startDate: start,
    endDate: end,
    actualStartDate: null,
    actualEndDate: null,
    currentStage: "ANALYSIS",
    predecessorId: null,
    ...opts,
  };
}

describe("computeForecast", () => {
  it("선행 없는 task는 계획대로 forecastEnd 반환", () => {
    const t = task("T1", today(0), today(4));
    const result = computeForecast([t], today(0));
    expect(result.get("T1")!.forecastEnd.toDateString()).toBe(today(4).toDateString());
  });

  it("완료된 task는 actualEnd가 forecastEnd", () => {
    const t = task("T1", today(0), today(4), { actualEndDate: today(6) });
    const result = computeForecast([t], today(10));
    expect(result.get("T1")!.forecastEnd.toDateString()).toBe(today(6).toDateString());
  });

  it("선행이 지연되면 후행 forecastStart도 밀린다", () => {
    const t1 = task("T1", today(0), today(4), { actualEndDate: today(9) });
    const t2 = task("T2", today(5), today(9), { predecessorId: "T1" });
    const result = computeForecast([t1, t2], today(10));
    // T1이 today+9에 끝났으므로 T2의 forecastStart는 today+10
    // duration 4영업일이라 forecastEnd는 today+10+~4
    expect(result.get("T2")!.forecastStart.getTime()).toBeGreaterThanOrEqual(today(10).getTime());
  });

  it("진행 중 task는 currentStage로 진척률을 결정", () => {
    const t = task("T1", today(-5), today(5), {
      actualStartDate: today(-5),
      currentStage: "DESIGN", // 2/9 ≈ 22%
    });
    const result = computeForecast([t], today(0));
    // 진척률 22%이므로 남은 78%는 미래에. 종료일은 today 이후여야 함.
    expect(result.get("T1")!.forecastEnd.getTime()).toBeGreaterThanOrEqual(today(0).getTime());
  });

  it("순환 의존성은 감지되어 에러 발생", () => {
    const t1 = task("T1", today(0), today(4), { predecessorId: "T2" });
    const t2 = task("T2", today(5), today(9), { predecessorId: "T1" });
    expect(() => computeForecast([t1, t2], today(0))).toThrow(/cycle/i);
  });
});
```

- [ ] **Step 2: types.ts 생성**

```typescript
/**
 * @file src/lib/progress-calc/types.ts
 * @description 진도 계산 모듈의 공유 타입
 */
import type { ProgressStage } from "@/app/dashboard/progress-risk/types";

export interface ForecastInput {
  id: string;
  startDate: Date;
  endDate: Date;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  currentStage: ProgressStage;
  predecessorId: string | null;
}

export interface Forecast {
  forecastStart: Date;
  forecastEnd: Date;
  duration: number; // 영업일
}

export interface Conflict {
  userId: string;
  week: string; // ISO week "2026-W20"
  sumPct: number;
  overflow: number;
}

export type Verdict = "NORMAL" | "RESOURCE_SHORTAGE" | "SCHEDULE_OVERRUN" | "BOTH";

export interface Recommendation {
  severity: "high" | "medium";
  message: string;
  taskId?: string;
  userId?: string;
}

export interface Diagnosis {
  verdict: Verdict;
  overrunDays: number;
  shortageMd: number;
  criticalPath: string[];
  recommendations: Recommendation[];
}
```

- [ ] **Step 3: forecast.ts 구현**

```typescript
/**
 * @file src/lib/progress-calc/forecast.ts
 * @description Forward-pass 전파로 각 task의 forecastStart / forecastEnd 계산
 *
 * 초보자 가이드:
 * 1. **topologicalSort**: 선행 → 후행 순서로 정렬 (순환 시 throw)
 * 2. **computeForecast**: 정렬된 순서대로 각 task의 예측 일정 계산
 * 3. **businessDays**: 주말 제외 영업일 기준 (date-fns differenceInBusinessDays)
 */
import { addDays, differenceInBusinessDays, isAfter, max as maxDate } from "date-fns";
import { STAGE_ORDER } from "@/lib/progress-stages";
import type { ForecastInput, Forecast } from "./types";

/** 토폴로지 정렬 — 순환이 있으면 throw */
export function topologicalSort(tasks: ForecastInput[]): ForecastInput[] {
  const byId = new Map(tasks.map(t => [t.id, t]));
  const visited = new Set<string>();
  const result: ForecastInput[] = [];
  const visiting = new Set<string>(); // 순환 감지용

  function visit(t: ForecastInput) {
    if (visited.has(t.id)) return;
    if (visiting.has(t.id)) {
      throw new Error(`Dependency cycle detected at task ${t.id}`);
    }
    visiting.add(t.id);
    if (t.predecessorId) {
      const pred = byId.get(t.predecessorId);
      if (pred) visit(pred);
    }
    visiting.delete(t.id);
    visited.add(t.id);
    result.push(t);
  }

  for (const t of tasks) visit(t);
  return result;
}

/** Forward-pass forecast 계산 */
export function computeForecast(
  tasks: ForecastInput[],
  today: Date
): Map<string, Forecast> {
  const sorted = topologicalSort(tasks);
  const result = new Map<string, Forecast>();

  for (const t of sorted) {
    const duration = Math.max(1, differenceInBusinessDays(t.endDate, t.startDate));

    // 시작일: 선행 있으면 max(계획, 선행.forecastEnd + 1일)
    let forecastStart = t.startDate;
    if (t.predecessorId) {
      const pred = result.get(t.predecessorId);
      if (pred) {
        forecastStart = maxDate([t.startDate, addDays(pred.forecastEnd, 1)]);
      }
    }

    // 종료일: 진행 상태별 분기
    let forecastEnd: Date;
    if (t.actualEndDate) {
      forecastEnd = t.actualEndDate;
    } else if (t.actualStartDate) {
      const stageIdx = STAGE_ORDER.indexOf(t.currentStage);
      const progressPct = (stageIdx + 1) / STAGE_ORDER.length;
      const remaining = Math.max(1, duration * (1 - progressPct));
      forecastEnd = addDays(today, Math.ceil(remaining));
      // 단, 계획 종료일이 이미 지난 진행 중 task는 today와 max
      if (isAfter(today, t.endDate)) {
        forecastEnd = maxDate([forecastEnd, today]);
      }
    } else {
      forecastEnd = addDays(forecastStart, duration);
    }

    result.set(t.id, { forecastStart, forecastEnd, duration });
  }
  return result;
}
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

```bash
npx vitest run src/lib/progress-calc/__tests__/forecast.test.ts
```
Expected: 5 tests passed

- [ ] **Step 5: 커밋**

```bash
git add src/lib/progress-calc/
git commit -m "$(cat <<'EOF'
feat: forecast 알고리즘 (forward-pass 전파) + Vitest 단위 테스트

date-fns 기반 영업일 계산. 선행/후행/진행 중/완료 4가지 케이스 + 순환 감지.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: critical-path.ts — CPM 식별

**Files:**
- Create: `src/lib/progress-calc/critical-path.ts`
- Create: `src/lib/progress-calc/__tests__/critical-path.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
/**
 * @file src/lib/progress-calc/__tests__/critical-path.test.ts
 */
import { describe, it, expect } from "vitest";
import { findCriticalPath } from "../critical-path";
import type { ForecastInput, Forecast } from "../types";

const d = (offset: number) => {
  const base = new Date(2026, 4, 13);
  base.setDate(base.getDate() + offset);
  return base;
};

describe("findCriticalPath", () => {
  it("단일 task는 그 task 자신이 critical path", () => {
    const tasks: ForecastInput[] = [{
      id: "T1", startDate: d(0), endDate: d(4),
      actualStartDate: null, actualEndDate: null,
      currentStage: "ANALYSIS", predecessorId: null,
    }];
    const forecast = new Map<string, Forecast>([
      ["T1", { forecastStart: d(0), forecastEnd: d(4), duration: 4 }],
    ]);
    expect(findCriticalPath(tasks, forecast)).toEqual(["T1"]);
  });

  it("선행 체인이 critical path로 잡힌다", () => {
    const tasks: ForecastInput[] = [
      { id: "T1", startDate: d(0), endDate: d(4), actualStartDate: null, actualEndDate: null, currentStage: "ANALYSIS", predecessorId: null },
      { id: "T2", startDate: d(5), endDate: d(9), actualStartDate: null, actualEndDate: null, currentStage: "ANALYSIS", predecessorId: "T1" },
      { id: "T3", startDate: d(10), endDate: d(14), actualStartDate: null, actualEndDate: null, currentStage: "ANALYSIS", predecessorId: "T2" },
    ];
    const forecast = new Map<string, Forecast>([
      ["T1", { forecastStart: d(0), forecastEnd: d(4), duration: 4 }],
      ["T2", { forecastStart: d(5), forecastEnd: d(9), duration: 4 }],
      ["T3", { forecastStart: d(10), forecastEnd: d(14), duration: 4 }],
    ]);
    expect(findCriticalPath(tasks, forecast)).toEqual(["T1", "T2", "T3"]);
  });

  it("두 갈래 중 늦게 끝나는 갈래가 critical path", () => {
    const tasks: ForecastInput[] = [
      { id: "A", startDate: d(0), endDate: d(2), actualStartDate: null, actualEndDate: null, currentStage: "ANALYSIS", predecessorId: null },
      { id: "B", startDate: d(0), endDate: d(5), actualStartDate: null, actualEndDate: null, currentStage: "ANALYSIS", predecessorId: null },
    ];
    const forecast = new Map<string, Forecast>([
      ["A", { forecastStart: d(0), forecastEnd: d(2), duration: 2 }],
      ["B", { forecastStart: d(0), forecastEnd: d(5), duration: 5 }],
    ]);
    expect(findCriticalPath(tasks, forecast)).toEqual(["B"]);
  });
});
```

- [ ] **Step 2: critical-path.ts 구현**

```typescript
/**
 * @file src/lib/progress-calc/critical-path.ts
 * @description 가장 늦은 forecastEnd를 갖는 task에서 predecessor 체인 역추적
 */
import type { ForecastInput, Forecast } from "./types";

export function findCriticalPath(
  tasks: ForecastInput[],
  forecast: Map<string, Forecast>
): string[] {
  if (tasks.length === 0) return [];

  // 가장 늦은 forecastEnd 가진 task 찾기
  let endTask = tasks[0];
  for (const t of tasks) {
    const f = forecast.get(t.id);
    const ef = forecast.get(endTask.id);
    if (f && ef && f.forecastEnd > ef.forecastEnd) endTask = t;
  }

  // predecessor 체인 역추적
  const byId = new Map(tasks.map(t => [t.id, t]));
  const path: string[] = [];
  let cur: ForecastInput | undefined = endTask;
  while (cur) {
    path.unshift(cur.id);
    cur = cur.predecessorId ? byId.get(cur.predecessorId) : undefined;
  }
  return path;
}
```

- [ ] **Step 3: 테스트 통과 확인 + 커밋**

```bash
npx vitest run src/lib/progress-calc/__tests__/critical-path.test.ts
git add src/lib/progress-calc/critical-path.ts src/lib/progress-calc/__tests__/critical-path.test.ts
git commit -m "$(cat <<'EOF'
feat: Critical Path 식별 알고리즘 + 테스트

가장 늦은 forecastEnd에서 predecessor 역추적. 분기 그래프 대응.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: conflicts.ts — 인력 충돌 감지

**Files:**
- Create: `src/lib/progress-calc/conflicts.ts`
- Create: `src/lib/progress-calc/__tests__/conflicts.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
/**
 * @file src/lib/progress-calc/__tests__/conflicts.test.ts
 */
import { describe, it, expect } from "vitest";
import { detectConflicts } from "../conflicts";
import type { ForecastInput, Forecast } from "../types";

const d = (offset: number) => {
  const base = new Date(2026, 4, 13);
  base.setDate(base.getDate() + offset);
  return base;
};

const T1: ForecastInput = {
  id: "T1", startDate: d(0), endDate: d(10),
  actualStartDate: null, actualEndDate: null,
  currentStage: "ANALYSIS", predecessorId: null,
};

const T2: ForecastInput = {
  id: "T2", startDate: d(0), endDate: d(10),
  actualStartDate: null, actualEndDate: null,
  currentStage: "ANALYSIS", predecessorId: null,
};

const forecast = new Map<string, Forecast>([
  ["T1", { forecastStart: d(0), forecastEnd: d(10), duration: 10 }],
  ["T2", { forecastStart: d(0), forecastEnd: d(10), duration: 10 }],
]);

describe("detectConflicts", () => {
  it("같은 user가 동일 기간 100% 넘게 할당되면 충돌 감지", () => {
    const assignees = [
      { taskId: "T1", userId: "U1", allocationPct: 100 },
      { taskId: "T2", userId: "U1", allocationPct: 50 },
    ];
    const conflicts = detectConflicts([T1, T2], assignees, forecast);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].userId).toBe("U1");
    expect(conflicts[0].overflow).toBe(50);
  });

  it("다른 user들은 충돌 없음", () => {
    const assignees = [
      { taskId: "T1", userId: "U1", allocationPct: 100 },
      { taskId: "T2", userId: "U2", allocationPct: 100 },
    ];
    const conflicts = detectConflicts([T1, T2], assignees, forecast);
    expect(conflicts).toHaveLength(0);
  });

  it("기간이 겹치지 않으면 충돌 없음", () => {
    const A: ForecastInput = { ...T1, id: "A" };
    const B: ForecastInput = { ...T2, id: "B", startDate: d(20), endDate: d(30) };
    const f = new Map<string, Forecast>([
      ["A", { forecastStart: d(0), forecastEnd: d(10), duration: 10 }],
      ["B", { forecastStart: d(20), forecastEnd: d(30), duration: 10 }],
    ]);
    const assignees = [
      { taskId: "A", userId: "U1", allocationPct: 100 },
      { taskId: "B", userId: "U1", allocationPct: 100 },
    ];
    const conflicts = detectConflicts([A, B], assignees, f);
    expect(conflicts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: conflicts.ts 구현**

```typescript
/**
 * @file src/lib/progress-calc/conflicts.ts
 * @description 사용자별로 주(week) 단위 버킷에 참여율을 누적하여 100% 초과 감지
 */
import { eachWeekOfInterval, getISOWeek, getISOWeekYear } from "date-fns";
import type { ForecastInput, Forecast, Conflict } from "./types";

type AssigneeLike = { taskId: string; userId: string; allocationPct: number };

function weekKey(date: Date): string {
  const w = getISOWeek(date);
  const y = getISOWeekYear(date);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

export function detectConflicts(
  tasks: ForecastInput[],
  assignees: AssigneeLike[],
  forecast: Map<string, Forecast>
): Conflict[] {
  // user별로 그룹화
  const byUser = new Map<string, AssigneeLike[]>();
  for (const a of assignees) {
    const list = byUser.get(a.userId) ?? [];
    list.push(a);
    byUser.set(a.userId, list);
  }

  const conflicts: Conflict[] = [];

  for (const [userId, items] of byUser) {
    // 주(week) 단위 버킷에 누적
    const buckets = new Map<string, number>();

    for (const a of items) {
      const f = forecast.get(a.taskId);
      if (!f) continue;
      const weeks = eachWeekOfInterval(
        { start: f.forecastStart, end: f.forecastEnd },
        { weekStartsOn: 1 } // 월요일 시작
      );
      for (const w of weeks) {
        const key = weekKey(w);
        buckets.set(key, (buckets.get(key) ?? 0) + a.allocationPct);
      }
    }

    for (const [week, sumPct] of buckets) {
      if (sumPct > 100) {
        conflicts.push({ userId, week, sumPct, overflow: sumPct - 100 });
      }
    }
  }

  return conflicts;
}
```

- [ ] **Step 3: 테스트 통과 + 커밋**

```bash
npx vitest run src/lib/progress-calc/__tests__/conflicts.test.ts
git add src/lib/progress-calc/conflicts.ts src/lib/progress-calc/__tests__/conflicts.test.ts
git commit -m "$(cat <<'EOF'
feat: 인력 충돌 감지 알고리즘 (ISO week 버킷) + 테스트

date-fns ISO 주차 기준으로 사용자별 누적 참여율 계산. 100% 초과 시 충돌.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: diagnose.ts — 진단 판정 + 권장 조치

**Files:**
- Create: `src/lib/progress-calc/diagnose.ts`
- Create: `src/lib/progress-calc/__tests__/diagnose.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
/**
 * @file src/lib/progress-calc/__tests__/diagnose.test.ts
 */
import { describe, it, expect } from "vitest";
import { diagnose } from "../diagnose";
import type { ForecastInput, Forecast, Conflict } from "../types";

const d = (offset: number) => {
  const base = new Date(2026, 4, 13);
  base.setDate(base.getDate() + offset);
  return base;
};

const task1: ForecastInput = {
  id: "T1", startDate: d(0), endDate: d(10),
  actualStartDate: null, actualEndDate: null,
  currentStage: "ANALYSIS", predecessorId: null,
};

describe("diagnose", () => {
  it("모두 정상이면 verdict NORMAL", () => {
    const forecast = new Map<string, Forecast>([
      ["T1", { forecastStart: d(0), forecastEnd: d(10), duration: 10 }],
    ]);
    const result = diagnose([task1], forecast, [], d(20));
    expect(result.verdict).toBe("NORMAL");
    expect(result.overrunDays).toBeLessThanOrEqual(0);
  });

  it("일정 초과만 있으면 SCHEDULE_OVERRUN", () => {
    const forecast = new Map<string, Forecast>([
      ["T1", { forecastStart: d(0), forecastEnd: d(15), duration: 15 }],
    ]);
    const result = diagnose([task1], forecast, [], d(10)); // 목표 +5 초과
    expect(result.verdict).toBe("SCHEDULE_OVERRUN");
    expect(result.overrunDays).toBeGreaterThan(0);
  });

  it("충돌만 있으면 RESOURCE_SHORTAGE", () => {
    const forecast = new Map<string, Forecast>([
      ["T1", { forecastStart: d(0), forecastEnd: d(10), duration: 10 }],
    ]);
    const conflicts: Conflict[] = [
      { userId: "U1", week: "2026-W20", sumPct: 150, overflow: 50 },
    ];
    const result = diagnose([task1], forecast, conflicts, d(20));
    expect(result.verdict).toBe("RESOURCE_SHORTAGE");
  });

  it("둘 다 있으면 BOTH + 권장 조치 다수", () => {
    const forecast = new Map<string, Forecast>([
      ["T1", { forecastStart: d(0), forecastEnd: d(15), duration: 15 }],
    ]);
    const conflicts: Conflict[] = [
      { userId: "U1", week: "2026-W20", sumPct: 150, overflow: 50 },
    ];
    const result = diagnose([task1], forecast, conflicts, d(10));
    expect(result.verdict).toBe("BOTH");
    expect(result.recommendations.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: diagnose.ts 구현**

```typescript
/**
 * @file src/lib/progress-calc/diagnose.ts
 * @description 진단 매트릭스 (정상/공수부족/일정초과/둘다) + 권장 조치 생성
 */
import { differenceInBusinessDays } from "date-fns";
import { findCriticalPath } from "./critical-path";
import type { ForecastInput, Forecast, Conflict, Diagnosis, Recommendation } from "./types";

export function diagnose(
  tasks: ForecastInput[],
  forecast: Map<string, Forecast>,
  conflicts: Conflict[],
  projectEndDate: Date
): Diagnosis {
  const allEnds = [...forecast.values()].map(f => f.forecastEnd);
  const maxEnd = allEnds.reduce((a, b) => (a > b ? a : b), new Date(0));

  const hasOverrun = maxEnd > projectEndDate;
  const hasShortage = conflicts.length > 0;

  let verdict: Diagnosis["verdict"];
  if (hasOverrun && hasShortage) verdict = "BOTH";
  else if (hasOverrun) verdict = "SCHEDULE_OVERRUN";
  else if (hasShortage) verdict = "RESOURCE_SHORTAGE";
  else verdict = "NORMAL";

  const overrunDays = hasOverrun ? differenceInBusinessDays(maxEnd, projectEndDate) : 0;
  // 충돌의 overflow를 영업일 기준 평균 MD로 환산 (1주 = 5영업일)
  const shortageMd = conflicts.reduce((s, c) => s + (c.overflow / 100) * 5, 0);

  const criticalPath = findCriticalPath(tasks, forecast);
  const recommendations = buildRecommendations(conflicts, criticalPath, tasks);

  return { verdict, overrunDays, shortageMd, criticalPath, recommendations };
}

function buildRecommendations(
  conflicts: Conflict[],
  criticalPath: string[],
  tasks: ForecastInput[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (criticalPath.length > 0) {
    const firstId = criticalPath[0];
    const first = tasks.find(t => t.id === firstId);
    if (first) {
      recs.push({
        severity: "high",
        message: `Critical Path 시작 task(${firstId})의 담당자 추가 또는 분할 검토`,
        taskId: firstId,
      });
    }
  }

  for (const c of conflicts) {
    recs.push({
      severity: "high",
      message: `${c.userId} ${c.week} 더블부킹(${c.overflow}% 초과) → 시작일 조정 또는 담당자 변경`,
      userId: c.userId,
    });
  }

  return recs;
}
```

- [ ] **Step 3: 테스트 통과 + 커밋**

```bash
npx vitest run src/lib/progress-calc/__tests__/diagnose.test.ts
git add src/lib/progress-calc/diagnose.ts src/lib/progress-calc/__tests__/diagnose.test.ts
git commit -m "$(cat <<'EOF'
feat: 진단 판정 + 권장 조치 생성 알고리즘 + 테스트

(일정초과 × 충돌) 매트릭스로 4단계 verdict 분류. Critical Path 첫 task와
충돌 user별 권장 조치 자동 생성.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: useComputeForecast — React Query select 통합 훅

**Files:**
- Create: `src/hooks/useComputeForecast.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: 훅 생성**

```typescript
/**
 * @file src/hooks/useComputeForecast.ts
 * @description
 * 진도 task 목록 + project 정보를 받아 forecast / conflicts / diagnosis를
 * 한 번에 derive하는 통합 훅. React Query `select`로 메모이즈.
 */
import { useQuery } from "@tanstack/react-query";
import { api, type ProgressTask } from "@/lib/api";
import { computeForecast } from "@/lib/progress-calc/forecast";
import { detectConflicts } from "@/lib/progress-calc/conflicts";
import { diagnose } from "@/lib/progress-calc/diagnose";
import { progressTaskKeys } from "./useProgressTasks";
import type { Forecast, Conflict, Diagnosis } from "@/lib/progress-calc/types";

export interface ProgressComputeResult {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  conflicts: Conflict[];
  diagnosis: Diagnosis;
}

export function useComputeForecast(
  projectId: string | undefined,
  projectEndDate: Date | null
) {
  return useQuery({
    queryKey: progressTaskKeys.list(projectId ?? ""),
    queryFn: () => api.progressTasks.list({ projectId: projectId! }),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    select: (tasks: ProgressTask[]): ProgressComputeResult => {
      const inputs = tasks.map(t => ({
        id: t.id,
        startDate: new Date(t.startDate),
        endDate: new Date(t.endDate),
        actualStartDate: t.actualStartDate ? new Date(t.actualStartDate) : null,
        actualEndDate: t.actualEndDate ? new Date(t.actualEndDate) : null,
        currentStage: t.currentStage,
        predecessorId: t.predecessorId,
      }));

      let forecast: Map<string, Forecast>;
      try {
        forecast = computeForecast(inputs, new Date());
      } catch {
        // 순환 의존성 등: 빈 결과 반환
        forecast = new Map();
      }

      const flatAssignees = tasks.flatMap(t =>
        t.assignees.map(a => ({
          taskId: t.id,
          userId: a.userId,
          allocationPct: a.allocationPct,
        }))
      );

      const conflicts = detectConflicts(inputs, flatAssignees, forecast);
      const diagnosis = diagnose(
        inputs,
        forecast,
        conflicts,
        projectEndDate ?? new Date(8640000000000000) // 미설정 시 무한대 (오버런 X)
      );

      return { tasks, forecast, conflicts, diagnosis };
    },
  });
}
```

- [ ] **Step 2: `hooks/index.ts`에 export 추가**

```typescript
export * from "./useComputeForecast";
```

- [ ] **Step 3: 검증 + 커밋**

```bash
npx tsc --noEmit
git add src/hooks/useComputeForecast.ts src/hooks/index.ts
git commit -m "$(cat <<'EOF'
feat: useComputeForecast — React Query select로 forecast/conflict/diagnosis derive

기존 useProgressTasks와 같은 queryKey 공유로 캐시 중복 없음.
projectEndDate가 null이면 일정 초과 판정 비활성화.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Part C: 진단 UI (Tasks 10-11)

## Task 10: KpiRow 확장 — 4장 → 6장

**Files:**
- Modify: `src/app/dashboard/progress-risk/components/KpiRow.tsx`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: KpiRow.tsx 확장**

기존 KpiRow를 다음으로 교체. Phase 1 시그니처(tasks만 받음)를 유지하면서 새 props 추가:

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/KpiRow.tsx
 * @description KPI 카드 — Phase 2: 6장 (총/공수/공수부족/일정초과/충돌인원/정상)
 */
import type { ProgressTask } from "@/lib/api";
import type { Conflict, Diagnosis } from "@/lib/progress-calc/types";
import { Icon } from "@/components/ui";

interface Props {
  tasks: ProgressTask[];
  conflicts?: Conflict[];
  diagnosis?: Diagnosis;
}

export function KpiRow({ tasks, conflicts = [], diagnosis }: Props) {
  const total = tasks.length;
  // 총 공수 (영업일 기준 평균, 자세한 계산은 forecast에서 가져올 수도)
  const totalEffort = tasks.reduce((sum, t) => {
    if (t.effortMd != null) return sum + t.effortMd;
    const days = Math.max(1, Math.round(
      (new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ));
    const allocSum = t.assignees.reduce((s, a) => s + a.allocationPct, 0);
    return sum + days * (allocSum / 100);
  }, 0);

  const shortageMd = diagnosis?.shortageMd ?? 0;
  const overrunDays = diagnosis?.overrunDays ?? 0;
  const conflictUsers = new Set(conflicts.map(c => c.userId)).size;
  const onTrack = tasks.filter(
    t => t.status === "IN_PROGRESS" || t.status === "COMPLETED"
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard icon="list_alt" iconClass="text-primary" label="총 task" value={String(total)} />
      <KpiCard icon="schedule" iconClass="text-primary" label="총 공수" value={`${totalEffort.toFixed(1)} MD`} />
      <KpiCard
        icon="error"
        iconClass="text-error"
        label="공수 부족"
        value={shortageMd > 0 ? `-${shortageMd.toFixed(1)} MD` : "0"}
        alert={shortageMd > 0}
      />
      <KpiCard
        icon="warning"
        iconClass="text-error"
        label="일정 초과"
        value={overrunDays > 0 ? `+${overrunDays}일` : "0"}
        alert={overrunDays > 0}
      />
      <KpiCard
        icon="person_off"
        iconClass="text-warning"
        label="충돌 인원"
        value={String(conflictUsers)}
        warn={conflictUsers > 0}
      />
      <KpiCard icon="check_circle" iconClass="text-success" label="정상 진행" value={`${onTrack}/${total}`} />
    </div>
  );
}

interface CardProps {
  icon: string;
  iconClass: string;
  label: string;
  value: string;
  alert?: boolean;
  warn?: boolean;
}

function KpiCard({ icon, iconClass, label, value, alert, warn }: CardProps) {
  const variant = alert ? "alert" : warn ? "warn" : "normal";
  const bg = {
    alert: "bg-error/5 border-error/30",
    warn: "bg-warning/5 border-warning/30",
    normal: "bg-background-white dark:bg-surface-dark border-border dark:border-border-dark",
  }[variant];
  const iconBg = {
    alert: "bg-error/10",
    warn: "bg-warning/10",
    normal: "bg-primary/10",
  }[variant];
  const valueColor = {
    alert: "text-error",
    warn: "text-warning",
    normal: "text-text dark:text-white",
  }[variant];

  return (
    <div className={`border rounded-xl p-3 ${bg}`}>
      <div className="flex items-center gap-2">
        <div className={`size-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon name={icon} size="xs" className={iconClass} />
        </div>
        <div>
          <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
          <p className="text-[10px] text-text-secondary">{label}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: page.tsx에서 useComputeForecast 사용**

`page.tsx`를 수정 — `useProgressTasks` 대신 `useComputeForecast` 사용:

```tsx
"use client";

import { useState } from "react";
import { useProject } from "@/contexts";
import { useComputeForecast } from "@/hooks";
import {
  PageHeader,
  AddTaskModal,
  TaskGrid,
  FilterBar,
  applyFilters,
  type Filters,
  KpiRow,
} from "./components";
import { Icon } from "@/components/ui";

export default function ProgressRiskPage() {
  const { selectedProject } = useProject();
  const projectEnd = selectedProject?.endDate ? new Date(selectedProject.endDate) : null;
  const { data, isLoading } = useComputeForecast(selectedProject?.id, projectEnd);

  const tasks = data?.tasks ?? [];
  const conflicts = data?.conflicts ?? [];
  const diagnosis = data?.diagnosis;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "", status: "all", category: "", userId: "",
  });

  const filteredTasks = applyFilters(tasks, filters);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        project={selectedProject}
        taskCount={tasks.length}
        onAddTask={() => setAddModalOpen(true)}
      />

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

      {selectedProject && tasks.length > 0 && (
        <>
          <KpiRow tasks={tasks} conflicts={conflicts} diagnosis={diagnosis} />
          <FilterBar tasks={tasks} filters={filters} onChange={setFilters} />
          <TaskGrid tasks={filteredTasks} projectId={selectedProject.id} />
        </>
      )}

      {selectedProject && (
        <AddTaskModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          projectId={selectedProject.id}
          existingTasks={tasks}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: 검증 + 커밋**

```bash
npx tsc --noEmit
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: KpiRow 6장 확장 (공수 부족/일정 초과/충돌 인원) + useComputeForecast 통합

page.tsx가 useProgressTasks → useComputeForecast로 마이그레이션.
diagnosis 결과가 상단 KPI에 실시간 반영.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: VerdictBanner 컴포넌트

**Files:**
- Create: `src/app/dashboard/progress-risk/components/VerdictBanner.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: VerdictBanner.tsx 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/VerdictBanner.tsx
 * @description 진단 결과 한 줄 배너 — verdict가 NORMAL이면 렌더 안 함
 */
import type { ProgressTask } from "@/lib/api";
import type { Diagnosis } from "@/lib/progress-calc/types";

interface Props {
  diagnosis: Diagnosis | undefined;
  tasks: ProgressTask[];
  projectEndDate: Date | null;
}

export function VerdictBanner({ diagnosis, tasks, projectEndDate }: Props) {
  if (!diagnosis || diagnosis.verdict === "NORMAL") return null;

  const isOverrun = diagnosis.verdict === "SCHEDULE_OVERRUN" || diagnosis.verdict === "BOTH";
  const isShortage = diagnosis.verdict === "RESOURCE_SHORTAGE" || diagnosis.verdict === "BOTH";

  const pathLabels = diagnosis.criticalPath
    .map(id => tasks.find(t => t.id === id)?.code)
    .filter((c): c is string => !!c)
    .join(" → ");

  const expectedEnd = projectEndDate
    ? (() => {
        const d = new Date(projectEndDate);
        d.setDate(d.getDate() + diagnosis.overrunDays);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  const bgClass = isOverrun
    ? "bg-gradient-to-r from-error/15 to-warning/15 border-error/40"
    : "bg-warning/10 border-warning/40";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bgClass}`}
      role="alert"
    >
      <span className="text-xl">🚨</span>
      <div className="flex-1 text-sm">
        {isOverrun && (
          <span className="font-bold text-error">
            일정 초과 +{diagnosis.overrunDays}일
          </span>
        )}
        {isOverrun && isShortage && <span className="text-text-secondary mx-2">&</span>}
        {isShortage && (
          <span className="font-bold text-warning">
            공수 부족 -{diagnosis.shortageMd.toFixed(1)} MD
          </span>
        )}
        {expectedEnd && (
          <span className="text-text-secondary ml-3">· 예상 종료일 {expectedEnd}</span>
        )}
        {pathLabels && (
          <span className="text-text-secondary ml-3">· Critical Path: {pathLabels}</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `index.ts`에 export 추가**

```typescript
export { VerdictBanner } from "./VerdictBanner";
```

- [ ] **Step 3: page.tsx에서 배너 렌더**

`page.tsx`에서 PageHeader 다음, KpiRow 위에 VerdictBanner 추가:

```tsx
import { VerdictBanner } from "./components";
// ... 기존 imports

// JSX의 PageHeader 다음에:
{selectedProject && tasks.length > 0 && (
  <VerdictBanner
    diagnosis={diagnosis}
    tasks={tasks}
    projectEndDate={projectEnd}
  />
)}
```

- [ ] **Step 4: 최종 빌드 + 통합 확인**

```bash
npx tsc --noEmit
npm run build
```
Expected: 빌드 성공

수동 확인 (선택, `npm run dev`):
1. /dashboard/progress-risk 열기
2. 프로젝트 선택 → 기존 task가 있으면 KPI 6장 표시
3. task 추가 + 담당자 더블 부킹 → 충돌 인원 1+, 공수 부족 + 빨간 배너 출현
4. 프로젝트 종료일을 빠르게 당기면 일정 초과 + 자홍 배너 출현
5. verdict NORMAL이면 배너 표시 안 됨

- [ ] **Step 5: 커밋**

```bash
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: VerdictBanner — Phase 2 완성

진단 결과(공수 부족/일정 초과)를 상단 한 줄 배너로 노출.
Critical Path와 예상 종료일 동시 표시. NORMAL이면 비표시.

Phase 2 완료: 알고리즘 엔진 + 진단 KPI/배너.
Phase 3로 이월: Gantt 탭, 인력부하 탭, 진단 탭 (권장 조치 카드).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 완료 체크리스트

- [ ] Phase 1 리뷰 Important 이슈 4개 해결 (I-1 ~ I-4)
- [ ] `src/lib/progress-calc/` 모듈 4개 + 테스트 4개
- [ ] forecast / critical-path / conflicts / diagnose 모두 단위 테스트 통과
- [ ] `useComputeForecast` 훅 통합
- [ ] KpiRow 4장 → 6장 확장
- [ ] VerdictBanner 조건부 렌더링
- [ ] `npm run build` 성공
- [ ] page.tsx 100줄 미만 유지 (CLAUDE.md 규칙)

**다음 단계 (Phase 3):** Gantt 탭 + 인력부하 탭 + 진단 탭 (권장 조치 카드 + 탭 전환 시스템).

---

## 자체 점검 (Plan 작성자용)

| 확인 항목 | 결과 |
|----------|------|
| 모든 task에 정확한 파일 경로 명시 | ✅ |
| 모든 코드 블록 완전 (TBD/TODO 없음) | ✅ |
| 모든 step에 실행 명령 또는 코드 | ✅ |
| 함수/타입명 일관성 (Task 5~11 전체) | ✅ (`Forecast`, `Conflict`, `Diagnosis`, `Recommendation` 등) |
| Phase 2 범위 명확 (Phase 3 이월 명시) | ✅ |
| Phase 1 review Important 4개 모두 task 부여 | ✅ |
| 알고리즘에 단위 테스트 필수 | ✅ (Task 5~8) |
| date-fns 사용 명시 (project에 이미 설치됨) | ✅ |
| 클라이언트/서버 동시 사용 모듈 위치 (`src/lib/`) | ✅ |
