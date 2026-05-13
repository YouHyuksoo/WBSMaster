# 프로젝트 진도 및 리스크 보고서 — 디자인 문서

| | |
|---|---|
| **작성일** | 2026-05-13 |
| **상태** | 디자인 승인 대기 |
| **대상 페이지** | `/dashboard/progress-risk` |
| **연관 모델** | `ProgressTask`, `ProgressTaskAssignee`, `ProgressStage` (신규) / `Project`, `User`, `TaskStatus` (기존) |

---

## 1. 개요

### 1.1 목적
MES 프로젝트의 **전체 공수 부담**과 **일정 리스크**를 실시간으로 진단하는 운영 도구. 단순 보고서가 아니라 데이터가 바뀌면 자동으로 forecast / Critical Path / 인력 충돌이 재계산되어 시각화에 반영되는 라이브 대시보드.

### 1.2 핵심 가치
한 화면에서 다음 두 가지 진단 결과를 자동으로 도출한다:

- **🔴 일정 초과 (Schedule Overrun)** — Critical Path 합산이 목표 종료일을 초과
- **🟠 공수 부족 (Resource Shortage)** — 특정 인원이 동시 진행 task에 100% 초과로 할당됨

### 1.3 사용자
- **주 사용자**: PM (프로젝트 관리자)
- **부 사용자**: 임원/고객사 (정기 보고용)
- **데이터 입력 책임자**: PM이 직접 task와 단계, 담당자, 일정을 입력

### 1.4 비범위 (Out of Scope)
- **자동 일정 조정**: forecast는 자동 계산되지만, 계획 일정(`startDate`/`endDate`)이 자동으로 변경되지는 않음. PM이 진단 결과를 보고 수동 조정.
- **다대다 선행**: 한 task의 선행은 1개만(`predecessorId` 단일 필드). 복잡한 의존성 그래프는 향후 확장.
- **개인별 휴가/일정 캘린더 연동**: 현재는 `allocationPct` 단일 값으로 부하 계산. 휴가는 향후.
- **기존 WBS와의 통합**: WBS(LEVEL1~4 계층)는 산출물 분류용으로 그대로 유지. 본 페이지는 독립적인 진도 관리 영역.

---

## 2. 사용자 시나리오

### 2.1 신규 프로젝트 — 기능 등록부터
1. PM이 `/dashboard/progress-risk` 진입 → 빈 페이지 + "task 추가" 안내
2. `+ task 추가` → 폼에 기능명 / 시작일 / 종료일 / 카테고리 입력 → 행 생성
3. 그리드 행에서 단계 진행 바 클릭 → 현재 상태 설정 (보통 초기엔 "분석")
4. 담당자 칩 클릭 → 모달에서 사용자/역할/참여율 추가
5. 다음 task 추가 → 선행 task 드롭다운에서 이전 task 선택 → forecast 자동 계산
6. 24개 기능 task 모두 등록 → Gantt 탭 → 전체 일정 한눈에 확인

### 2.2 운영 중 — 진척 업데이트
1. PM이 매일 페이지 열고 그리드 확인
2. 완료된 단계의 task → 진행 바를 다음 단계로 클릭 (예: ② 설계 → ③ 구현)
3. `actualStartDate` / `actualEndDate` 입력 → forecast 즉시 재계산
4. 상단 진단 배너에서 변화 확인 → 일정 초과 임박 시 진단 탭으로 이동

### 2.3 리스크 발견 → 조치
1. 진단 탭의 권장 조치 카드 확인
2. "박개발 5/15~6/5 더블 부킹" → 해당 task 행 클릭 → 모달에서 담당자 변경 또는 참여율 조정
3. 즉시 충돌 해소 확인 (인력부하 차트에서 해당 셀이 빨강 → 노랑/초록으로 변화)

---

## 3. 데이터 모델

### 3.1 신규 모델 3개

```prisma
// 진도 관리용 평면 task
model ProgressTask {
  id              String     @id @default(uuid())
  projectId       String
  code            String?    // T-001 자동 부여
  name            String     // "주문등록", "재고관리" 등 기능명
  category        String?    // 대분류 라벨 (선택)
  description     String?
  order           Int        @default(0)

  // 일정 (task당 1개)
  startDate       DateTime   // 계획 시작
  endDate         DateTime   // 계획 종료
  actualStartDate DateTime?
  actualEndDate   DateTime?

  // 진행
  currentStage    ProgressStage  @default(ANALYSIS)
  status          TaskStatus     @default(PENDING)  // 기존 enum 재사용
  progress        Int            @default(0)        // 0-100, 단계로 자동 계산
  effortMd        Float?         // 공수 (자동 계산 또는 수동 오버라이드)

  // 의존성 (단일 선행)
  predecessorId   String?
  isParallel      Boolean    @default(true)

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  // 관계
  project         Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  predecessor     ProgressTask?  @relation("ProgressTaskDeps", fields: [predecessorId], references: [id], onDelete: SetNull)
  successors      ProgressTask[] @relation("ProgressTaskDeps")
  assignees       ProgressTaskAssignee[]

  @@unique([projectId, code])
  @@index([projectId])
  @@index([predecessorId])
  @@map("progress_tasks")
}

// task별 담당자 (다대다 + 역할 + 참여율)
model ProgressTaskAssignee {
  id            String    @id @default(uuid())
  taskId        String
  userId        String
  role          String?   // "설계자" "개발자" "테스터" "교육담당" 등 (자유 텍스트)
  allocationPct Int       @default(100)  // 1~100
  assignedAt    DateTime  @default(now())

  task          ProgressTask  @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([taskId, userId])
  @@index([userId])
  @@map("progress_task_assignees")
}

// 단계 9개 enum
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

### 3.2 기존 모델 변경
- `Project` 모델: `progressTasks ProgressTask[]` 관계 추가
- `User` 모델: `progressAssignments ProgressTaskAssignee[]` 관계 추가

### 3.3 마이그레이션 전략
- `npx prisma migrate dev --name add_progress_task` 로 신규 모델 생성
- 기존 WBS / Issue / Milestone 데이터에 영향 없음 (독립 테이블)
- 초기 데이터: 기존 프로젝트의 WBS LEVEL1을 선택적으로 ProgressTask로 import할 수 있는 스크립트 (`scripts/import-wbs-to-progress.ts`) — 향후

---

## 4. 페이지 구조

### 4.1 라우트
- `/dashboard/progress-risk` — 메인 페이지
- API: `/api/progress-tasks/*`, `/api/progress-tasks/[id]/assignees`

### 4.2 화면 구성

```
┌─────────────────────────────────────────────────────────┐
│ 📊 PROGRESS RISK / 진도 및 리스크 보고서   [엑셀 | 가져오기 | + task]│
├─────────────────────────────────────────────────────────┤
│ 🚨 일정 초과 +12일 & 공수 부족 -38 MD · 예상 종료 ...   │  ← 진단 배너 (조건부)
├─────────────────────────────────────────────────────────┤
│ [총 task] [총 공수] [공수 부족] [일정 초과] [충돌] [정상]  │  ← KPI 6장
├─────────────────────────────────────────────────────────┤
│ ┌─ [📋 리스트] [📅 Gantt] [👥 인력부하] [🎯 진단] ─┐   │  ← 탭
│ │                                                  │   │
│ │        ↓ 선택된 탭의 본문 영역 ↓                │   │
│ │                                                  │   │
│ └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 4.3 컴포넌트 구조

```
src/app/dashboard/progress-risk/
├── page.tsx                    # 메인 페이지 (조합만)
├── components/
│   ├── index.ts
│   ├── PageHeader.tsx          # 헤더 + 액션 버튼
│   ├── VerdictBanner.tsx       # 진단 배너 (조건부 렌더)
│   ├── KpiRow.tsx              # KPI 6장
│   ├── TabSwitcher.tsx         # 4개 탭 전환
│   ├── ListTab/
│   │   ├── index.tsx
│   │   ├── TaskGrid.tsx        # 메인 그리드
│   │   ├── TaskRow.tsx         # 1행
│   │   ├── StageStepper.tsx    # 진행 바 (인라인)
│   │   ├── AssigneeChips.tsx   # 칩 + add 버튼
│   │   ├── FilterBar.tsx       # 검색/필터
│   │   ├── AddTaskModal.tsx    # task 추가 폼
│   │   └── AssigneeModal.tsx   # 담당자 관리 모달
│   ├── GanttTab/
│   │   ├── index.tsx
│   │   ├── GanttChart.tsx      # 메인 차트 (ECharts 또는 자체)
│   │   ├── GanttRow.tsx
│   │   ├── GanttBars.tsx       # 계획/실제/예측 막대
│   │   ├── CriticalPathLine.tsx
│   │   ├── DeadlineMarker.tsx
│   │   └── ZoomControl.tsx
│   ├── LoadTab/
│   │   ├── index.tsx
│   │   └── LoadHeatmap.tsx     # user × week 매트릭스
│   └── DiagnosisTab/
│       ├── index.tsx
│       └── RecommendationCard.tsx
├── hooks/
│   ├── useProgressTasks.ts     # React Query
│   ├── useComputeForecast.ts   # 알고리즘 select
│   ├── useDetectConflicts.ts
│   └── useDiagnose.ts
├── lib/
│   ├── forecast.ts             # forecast 알고리즘
│   ├── critical-path.ts
│   ├── conflicts.ts
│   ├── diagnose.ts
│   └── constants.ts            # STAGE_ORDER, STAGE_LABEL 등
└── types.ts
```

각 파일 200줄 미만 유지 (CLAUDE.md 규칙). `TaskGrid.tsx`가 비대해지면 행 단위 컴포넌트로 분리.

---

## 5. UI 상세

### 5.1 공통 상단

#### 헤더
- 좌측: 페이지 타이틀 (`PROGRESS RISK` 그라데이션 + 한글 부제 + 프로젝트 배지)
- 우측: 엑셀 다운로드 / 엑셀 가져오기 / `+ task 추가` 버튼

#### 진단 배너 (조건부)
- 진단 결과가 `NORMAL`이 아닐 때만 렌더링
- 자홍/빨강/주황 그라데이션 배경
- 한 줄에 핵심 요약: "일정 초과 +12일 & 공수 부족 -38 MD · 예상 종료 2026-08-20 · Critical Path: T-001 → T-002 → T-007"

#### KPI 카드 6장 (반응형 grid)
1. **총 기능 task** — task row count
2. **총 공수 요구** — `Σ computeEffort(task)` (MD)
3. **공수 부족** — `Σ (conflict.overflow / 100) × businessDaysInWeek` (MD, alert 색)
4. **일정 초과** — `max(forecastEnd) - project.endDate` (영업일, alert 색)
5. **충돌 인원** — `unique(conflicts.map(c => c.userId)).length` (명, warn 색)
6. **정상 task** — `tasks.filter(isOnTrack).length / tasks.length` (분수, ok 색)

### 5.2 📋 리스트 탭 (메인 입력)

#### 필터 바
- 검색 input (task 이름)
- 핀: 전체 / 지연 / 진행중 / 완료
- 드롭다운: 카테고리 / 담당자

#### 그리드 컬럼
```
#  | 코드   | 기능명         | 시작     | 종료     | 단계(진행바)              | 선행   | 담당자(칩들)        | 상태       | 진행률 | ⋮
1  | T-001  | 주문등록       | 05/01    | 05/30    | ●●●○○○○○○                 | -      | 김설계 박개발       | 지연+3일   | ▆▆27%  | ⋮
```
- 인라인 편집: 셀 클릭 → 즉시 편집 → debounce 500ms 자동 저장
- 행 색상: 지연=주황 배경, 충돌=빨강 배경
- 단계 진행 바: 9개 점/칸, 클릭으로 현재 단계 변경
- 담당자 칩: 클릭 시 모달, 충돌이면 빨간 칩 + 경고 아이콘
- `⋮`: 삭제 / 복제 / 순서 변경

#### task 추가 모달
간단 폼 (필수 5필드): 코드 자동 / 기능명 / 카테고리 / 시작일 / 종료일 / 선행 task. 저장 후 행에서 디테일 입력.

#### 담당자 관리 모달
- 행 단위: 사용자(선택) / 역할(자유 텍스트 + 자주 쓰는 옵션) / 참여율(1~100) / 삭제
- 더블 부킹 자동 감지 → 빨간 행 + 경고 메시지 ("같은 기간 다른 task에 50% 추가 할당")
- 하단에 자동 계산된 공수 표시 (예: "5일 × 1.5 = 7.5 MD")

### 5.3 📅 Gantt 탭

#### 행 레이아웃 (좌 → 우)
```
# | 기능명 (T-001 주문등록) | mini-stepper (9 dots) | ━━━━━━━━ 시간 축 막대 ━━━━━━━━ |
```

#### 막대 종류
- **계획** (파란 외곽선, 6px 높이, top 2px)
- **실제 정상** (초록 채움, 4px 높이, top 10px) — actualEndDate 또는 진행 중 actual
- **실제 지연** (빨강) — endDate 초과
- **예측** (주황 점선) — forecast 결과
- **Critical Path** — 빨간 발광 (box-shadow)

#### 세로선
- 목표 종료일 (자홍) — `project.endDate`
- 예측 종료일 (빨강) — `max(forecastEnd)`, 목표 초과 시만

#### 선후행 화살표
- 선행 → 후행 task 사이를 잇는 회색 화살표
- 같은 행 내부에서 그려지지 않고, 행 사이를 가로지르는 SVG overlay

#### Zoom 컨트롤
일 / 주(기본) / 월 / 분기

### 5.4 👥 인력부하 탭

#### 매트릭스
- 행: 프로젝트 멤버 (`ProgressTaskAssignee.userId` 기준 unique)
- 열: 주차 (project 기간 동안의 ISO week)
- 셀: 그 주에 그 사람의 총 참여율 (`Σ allocationPct`)

#### 색상
- 0~70%: 초록 (정상)
- 70~100%: 노랑 (주의)
- 100% 초과: **빨강 (충돌)**

#### 막대 높이
참여율 합을 100% 기준으로 비례 (>100%면 셀 가득 + 색상 빨강)

### 5.5 🎯 진단 탭

#### 권장 조치 카드 (자동 생성)
- 🔴 일정 초과 카드: Critical Path 명시 + 첫 지연 task + 권장 조치 (담당자 추가 / 분할)
- 🔴 공수 부족 카드: 충돌 인원/주차/초과 MD + 권장 (담당자 변경 / 시작일 조정)
- 🟠 주의 카드: 70~100% 부하 임박 → 백업 인원 권장

각 카드 클릭 시 관련 행/사용자로 이동 (deep link).

---

## 6. 계산 알고리즘

### 6.1 실행 위치
**클라이언트 사이드** — React Query의 `select` 옵션에서 fetch 결과를 받아 derive. task 수가 수십 개 수준이면 즉시 (<10ms). 입력 변경 시 React Query mutation → invalidate → 자동 재계산.

대안(향후 확장): task 수백 개 시 server-side로 이전 (API 응답에 forecast 포함).

### 6.2 ① Forecast 전파 (Forward-Pass)

```typescript
function computeForecast(tasks: ProgressTask[]): Map<string, Forecast> {
  const sorted = topologicalSort(tasks);  // predecessor 먼저
  const result = new Map<string, Forecast>();

  for (const t of sorted) {
    const duration = businessDaysBetween(t.startDate, t.endDate);

    // 시작일: 선행이 있으면 max(계획, 선행.forecastEnd + 1일)
    let forecastStart = t.startDate;
    if (t.predecessorId) {
      const pred = result.get(t.predecessorId);
      if (pred) {
        forecastStart = maxDate(t.startDate, addBusinessDays(pred.forecastEnd, 1));
      }
    }

    // 종료일: 진행 상태에 따라 분기
    let forecastEnd: Date;
    if (t.actualEndDate) {
      forecastEnd = t.actualEndDate;
    } else if (t.actualStartDate) {
      const stageIdx = STAGE_ORDER.indexOf(t.currentStage);
      const progressPct = (stageIdx + 1) / 9;
      const remaining = Math.max(1, duration * (1 - progressPct));  // 최소 1일
      forecastEnd = addBusinessDays(today(), Math.ceil(remaining));
    } else {
      forecastEnd = addBusinessDays(forecastStart, duration);
    }

    result.set(t.id, { forecastStart, forecastEnd, duration });
  }
  return result;
}
```

### 6.3 ② Critical Path

```typescript
function findCriticalPath(tasks: ProgressTask[], forecast: Map<string, Forecast>): string[] {
  // 가장 늦은 forecastEnd 가진 task부터 시작
  const endTask = tasks.reduce((a, b) =>
    forecast.get(a.id)!.forecastEnd > forecast.get(b.id)!.forecastEnd ? a : b
  );

  // predecessor 체인 역추적
  const path: string[] = [];
  let cur: ProgressTask | undefined = endTask;
  while (cur) {
    path.unshift(cur.id);
    cur = tasks.find(t => t.id === cur!.predecessorId);
  }
  return path;
}
```

### 6.4 ③ 충돌 감지 (Resource Conflict)

```typescript
function detectConflicts(
  tasks: ProgressTask[],
  assignees: ProgressTaskAssignee[],
  forecast: Map<string, Forecast>
): Conflict[] {
  const byUser = groupBy(assignees, a => a.userId);
  const conflicts: Conflict[] = [];

  for (const [userId, items] of byUser) {
    const weekBuckets = new Map<string, number>();  // "2026-W18" → sumPct

    for (const a of items) {
      const f = forecast.get(a.taskId);
      if (!f) continue;
      const weeks = enumerateIsoWeeks(f.forecastStart, f.forecastEnd);
      for (const w of weeks) {
        weekBuckets.set(w, (weekBuckets.get(w) ?? 0) + a.allocationPct);
      }
    }

    for (const [week, sumPct] of weekBuckets) {
      if (sumPct > 100) {
        conflicts.push({ userId, week, sumPct, overflow: sumPct - 100 });
      }
    }
  }
  return conflicts;
}
```

### 6.5 ④ 진단 판정 + 권장 조치

```typescript
function diagnose(
  tasks: ProgressTask[],
  forecast: Map<string, Forecast>,
  conflicts: Conflict[],
  project: Project
): Diagnosis {
  const maxEnd = Math.max(...[...forecast.values()].map(f => f.forecastEnd.getTime()));
  const hasOverrun = maxEnd > project.endDate!.getTime();
  const hasShortage = conflicts.length > 0;

  let verdict: Verdict;
  if (hasOverrun && hasShortage) verdict = 'BOTH';
  else if (hasOverrun) verdict = 'SCHEDULE_OVERRUN';
  else if (hasShortage) verdict = 'RESOURCE_SHORTAGE';
  else verdict = 'NORMAL';

  return {
    verdict,
    overrunDays: businessDaysBetween(project.endDate!, new Date(maxEnd)),
    shortageMd: conflicts.reduce((s, c) => s + (c.overflow / 100) * 5, 0),
    criticalPath: findCriticalPath(tasks, forecast),
    recommendations: buildRecommendations(conflicts, tasks, forecast),
  };
}
```

#### 권장 조치 규칙
1. Critical Path 첫 지연 task → "담당자 추가 검토" (severity: high)
2. 충돌 user별 → "시작일 조정 또는 담당자 변경" (severity: high)
3. 70~100% 임박 부하 → "백업 인원 사전 지정" (severity: medium)

### 6.6 부가: 공수 자동 계산

```typescript
function computeEffort(task: ProgressTask): number {
  if (task.effortMd != null) return task.effortMd;  // 수동 우선

  const duration = businessDaysBetween(task.startDate, task.endDate);
  const totalAlloc = task.assignees.reduce((s, a) => s + a.allocationPct, 0);
  return duration * (totalAlloc / 100);
}
```

### 6.7 엣지 케이스
- **순환 의존성**: `topologicalSort`에서 감지 → 에러 토스트 + 해당 task 빨강 강조
- **task 0개**: 빈 상태 UI ("+ task 추가" 안내)
- **project.endDate 없음**: 일정 초과 진단 비활성화, KPI에서 "—" 표시
- **모두 완료**: 진단 NORMAL + KPI 100%
- **이미 종료일이 지났는데 진행 중**: forecast 음수 방지 위해 `remaining = Math.max(1, ...)`. 행은 빨강(지연) 강조.
- **마지막 단계(STABILIZATION) 도달했지만 actualEndDate 없음**: forecastEnd = today(). 즉시 완료 처리 권장 안내.

### 6.8 상수 정의 (`lib/constants.ts`)

```typescript
export const STAGE_ORDER: ProgressStage[] = [
  'ANALYSIS', 'DESIGN', 'IMPLEMENTATION',
  'UNIT_TEST', 'IT_TEST', 'TRAINING',
  'INTEGRATION_TEST', 'MIGRATION', 'STABILIZATION',
];

export const STAGE_LABEL: Record<ProgressStage, string> = {
  ANALYSIS: '분석',
  DESIGN: '설계',
  IMPLEMENTATION: '구현',
  UNIT_TEST: '단위테스트',
  IT_TEST: 'IT 테스트',
  TRAINING: '교육',
  INTEGRATION_TEST: '통합테스트',
  MIGRATION: '이행',
  STABILIZATION: '안정화',
};

export const STAGE_SHORT: Record<ProgressStage, string> = {
  ANALYSIS: '분석', DESIGN: '설계', IMPLEMENTATION: '구현',
  UNIT_TEST: '단위', IT_TEST: 'IT', TRAINING: '교육',
  INTEGRATION_TEST: '통합', MIGRATION: '이행', STABILIZATION: '안정',
};
```

### 6.9 `progress` 필드 정책
- **자동 계산만**: `currentStage`의 STAGE_ORDER 인덱스 기반 (`(idx+1)/9 × 100`)
- **수동 입력 불가** — UI에서 수정 셀 노출 안 함 (단순성 위해 1차 버전 제한)
- 향후 확장 시 별도 토글로 manual override 가능

---

## 7. API 엔드포인트

```
GET    /api/progress-tasks?projectId=...    # 목록 (assignees include)
POST   /api/progress-tasks                  # 생성
GET    /api/progress-tasks/[id]
PATCH  /api/progress-tasks/[id]             # 부분 수정 (인라인 편집)
DELETE /api/progress-tasks/[id]

POST   /api/progress-tasks/[id]/assignees           # 담당자 추가
PATCH  /api/progress-tasks/[id]/assignees/[userId]  # 역할/참여율 수정
DELETE /api/progress-tasks/[id]/assignees/[userId]

GET    /api/progress-tasks/export?projectId=...     # Excel 다운로드
POST   /api/progress-tasks/import                   # Excel 가져오기
```

- 모든 API는 `getAuthenticatedUser()` 인증 확인 (CLAUDE.md 규칙)
- `projectId` 필터링 필수
- 응답: ProgressTask + assignees (User join) include

---

## 8. 상태 관리 (React Query)

```typescript
// hooks/useProgressTasks.ts
export function useProgressTasks(projectId: string) {
  return useQuery({
    queryKey: ['progress-tasks', projectId],
    queryFn: () => api.progressTasks.list(projectId),
    enabled: !!projectId,
  });
}

// hooks/useComputeForecast.ts
export function useComputeForecast(projectId: string) {
  return useQuery({
    queryKey: ['progress-tasks', projectId],
    queryFn: () => api.progressTasks.list(projectId),
    select: (tasks) => {
      const forecast = computeForecast(tasks);
      const conflicts = detectConflicts(tasks, flattenAssignees(tasks), forecast);
      const diagnosis = diagnose(tasks, forecast, conflicts, project);
      return { tasks, forecast, conflicts, diagnosis };
    },
  });
}

// mutation 시 invalidate
const mutation = useMutation({
  mutationFn: (data) => api.progressTasks.update(id, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress-tasks', projectId] }),
});
```

---

## 9. 테스트 전략

### 9.1 알고리즘 단위 테스트 (Vitest)
- `forecast.test.ts`: forecast 전파 (선행 없음 / 단일 선행 / 다중 후행 / 진행 중 task)
- `critical-path.test.ts`: 단일/분기 경로
- `conflicts.test.ts`: 더블 부킹 / 부분 겹침 / 100% 정확히
- `diagnose.test.ts`: 4가지 판정 매트릭스 모두

### 9.2 E2E (선택)
- task 추가 → 단계 변경 → 진단 결과 변화
- 담당자 추가 → 충돌 발생 → 진단 배너 갱신

---

## 10. 구현 단계 (Phase)

### Phase 1 — 기본 CRUD + 리스트 탭 (MVP)
- Prisma 스키마 추가 + 마이그레이션
- API 라우트 (CRUD)
- React Query 훅
- 리스트 탭 그리드 (인라인 편집)
- task 추가 모달, 담당자 관리 모달
- 단계 진행 바

### Phase 2 — 시각화 (Gantt + 알고리즘)
- forecast / critical path / 충돌 알고리즘 구현
- 알고리즘 단위 테스트
- Gantt 탭 (막대, 화살표, 세로선)
- KPI 카드 + 진단 배너 (조건부)

### Phase 3 — 인력부하 + 진단 탭
- 인력부하 히트맵
- 진단 탭 권장 조치 카드
- 엑셀 가져오기/내보내기

---

## 11. 디자인 가이드 준수

`CLAUDE.md`의 리스트 페이지 스타일 규칙을 따른다:
- 헤더: 아이콘 + 그라데이션 영문 타이틀 + 한글 부제 + 프로젝트 배지
- KPI 카드 그리드 (반응형)
- 탭: pill 형태 + 카운트 배지
- 그리드: Tailwind grid + 어두운 배경 + 행 hover 효과
- 다크모드 대응 (`dark:` 클래스 + 라이트 모드 기본값)
- 컴포넌트 200줄 미만, 페이지 300줄 미만 (분리 강제)
- 모든 파일에 JSDoc `@file`, `@description` 포함

---

## 12. 참고

- 기존 페이지 패턴 참고: `src/app/dashboard/issues/page.tsx`, `src/app/dashboard/customer-requirements/page.tsx`
- 엑셀 가져오기 공통 모달: `@/components/common/ImportExcelModal`
- 프로젝트 컨텍스트: `useProject()` 훅 (`@/contexts`)
- Prisma 7 adapter 패턴: 스크립트에서 사용 시 `PrismaPg` + `Pool` 필요

---

## 부록 A: 결정 사항 요약

| 결정 항목 | 채택 | 폐기 |
|----------|------|------|
| 사용 시나리오 | 시각화 + 보고 하이브리드 (탭 기반) | 인쇄용 보고서, 단순 대시보드 |
| 데이터 단위 | 평면 ProgressTask (task = 기능 1개) | Feature 마스터 + 매트릭스 cell |
| 단계 표현 | currentStage 단일 enum (9개) | 단계별 task 분리, 9개 체크박스 |
| 단계 입력 UI | 진행 바 (Stepper) | 단일 드롭다운, 체크박스 행 |
| 의존성 모델 | predecessorId 단일 선행 | 다대다 edge, 부모 플래그 |
| 담당자 모델 | 다대다 + 역할(자유) + 참여율 | 단일 assignee, 평균 인원 수 |
| 부하 감지 단위 | 주(week) 버킷 | 일 단위, 월 단위 |
| 계산 위치 | 클라이언트 사이드 (React Query select) | 서버 사이드 API 응답 |
| 매트릭스 뷰 | 폐기 | (초기엔 검토했으나 입력 부담으로 제외) |
| WBS 통합 | 독립 영역 (별개 모델) | WBS LEVEL5 확장 |

## 부록 B: 향후 확장 (Out of Scope, 그러나 데이터 모델로 호환)
- 다대다 선행 (별도 `ProgressDependency` 모델로 마이그레이션)
- 사용자 일일 가용 공수 / 휴가 캘린더
- 서버 사이드 계산 + 캐싱 (task 수백 개 시)
- 단계별 분리 일정 (현재 평면 모델에서 매트릭스로 변경 시 데이터 마이그레이션 필요)
- WBS LEVEL4와 자동 연결 (해당 단위업무로부터 ProgressTask 자동 생성)
