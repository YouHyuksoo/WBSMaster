# 진도 및 리스크 보고서 — Phase 3 구현 계획 (Gantt + 인력부하 + 진단 탭)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 2 알고리즘 결과(forecast / critical path / conflicts / diagnosis)를 3개 시각화 탭(Gantt / 인력부하 / 진단)으로 표시. 탭 전환 시스템 추가.

**Architecture:** 탭 전환은 page-level state(`activeTab`)로 관리. Gantt는 native HTML + CSS grid + SVG overlay(화살표)로 구현 (ECharts/Recharts 미사용 — 디자인 통제 + 단계 진행바 통합). 인력부하는 user × week 매트릭스. 진단은 권장 조치 카드 리스트.

**Tech Stack:** React 19.2, TypeScript 5, Tailwind 4, date-fns 4.1 (이미 설치된 라이브러리만 사용)

**Reference:**
- Design spec: `docs/superpowers/specs/2026-05-13-progress-risk-report-design.md` (섹션 5.3~5.5)
- Phase 2 plan: `docs/superpowers/plans/2026-05-13-progress-risk-report-phase2.md`

**Phase 3 미포함:** Excel 가져오기/내보내기 실제 구현 (Phase 4로 이월), 진단 탭의 deep link (Phase 4)

---

## 파일 구조

```
src/app/dashboard/progress-risk/
├── page.tsx                                          # 수정 — 탭 전환 + 본문 분기
├── types.ts                                          # 수정 — TabKey 타입 추가
└── components/
    ├── TabSwitcher.tsx                               # 신규 — 4개 탭 전환
    ├── index.ts                                      # 수정 — export 추가
    ├── ListTab/
    │   └── index.tsx                                 # 신규 — 기존 FilterBar+TaskGrid 묶음 (리팩토링)
    ├── GanttTab/
    │   ├── index.tsx                                 # 신규 — Gantt 탭 메인
    │   ├── GanttChart.tsx                            # 신규 — 차트 컨테이너
    │   ├── GanttRow.tsx                              # 신규 — 1 task = 1 행
    │   ├── GanttBars.tsx                             # 신규 — 계획/실제/예측 막대
    │   ├── DependencyArrows.tsx                      # 신규 — SVG overlay 화살표
    │   ├── DeadlineMarkers.tsx                       # 신규 — 목표/예측 세로선
    │   ├── ZoomControl.tsx                           # 신규 — 일/주/월/분기
    │   └── timeScale.ts                              # 신규 — 시간축 ↔ x좌표 변환
    ├── LoadTab/
    │   ├── index.tsx                                 # 신규 — 인력부하 메인
    │   ├── LoadHeatmap.tsx                           # 신규 — user × week 매트릭스
    │   └── loadBuckets.ts                            # 신규 — user별 주차 버킷 계산
    └── DiagnosisTab/
        ├── index.tsx                                 # 신규 — 진단 탭 메인
        └── RecommendationCard.tsx                    # 신규 — 카드 컴포넌트
```

---

## Task 1: TabSwitcher + 리스트 탭 분리 + 페이지 통합

**Files:**
- Create: `src/app/dashboard/progress-risk/components/TabSwitcher.tsx`
- Create: `src/app/dashboard/progress-risk/components/ListTab/index.tsx`
- Modify: `src/app/dashboard/progress-risk/types.ts` (TabKey 추가)
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: `types.ts`에 TabKey 추가**

파일 끝에 추가:

```typescript
export type TabKey = "list" | "gantt" | "load" | "diagnosis";
```

- [ ] **Step 2: `TabSwitcher.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/TabSwitcher.tsx
 * @description 4개 탭 전환 (리스트 / Gantt / 인력부하 / 진단)
 */
"use client";
import { Icon } from "@/components/ui";
import type { TabKey } from "../types";

interface Tab {
  key: TabKey;
  icon: string;
  label: string;
  count?: number;
}

interface Props {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  conflictCount?: number;
  recommendationCount?: number;
}

export function TabSwitcher({ activeTab, onChange, conflictCount = 0, recommendationCount = 0 }: Props) {
  const tabs: Tab[] = [
    { key: "list",      icon: "list_alt",    label: "리스트" },
    { key: "gantt",     icon: "timeline",    label: "Gantt" },
    { key: "load",      icon: "groups",      label: "인력부하", count: conflictCount },
    { key: "diagnosis", icon: "diagnosis",   label: "진단",     count: recommendationCount },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg w-fit">
      {tabs.map(t => {
        const active = t.key === activeTab;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              active
                ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                : "text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <Icon name={t.icon} size="xs" />
            <span>{t.label}</span>
            {t.count !== undefined && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                active ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark text-text-secondary"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: `ListTab/index.tsx` 생성 — 기존 리스트 UI 묶음**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/ListTab/index.tsx
 * @description 리스트 탭 (FilterBar + TaskGrid) — page에서 분리
 */
"use client";
import type { ProgressTask } from "@/lib/api";
import { FilterBar, applyFilters, type Filters } from "../FilterBar";
import { TaskGrid } from "../TaskGrid";

interface Props {
  tasks: ProgressTask[];
  projectId: string;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}

export function ListTab({ tasks, projectId, filters, onFiltersChange }: Props) {
  const filtered = applyFilters(tasks, filters);
  return (
    <div className="space-y-4">
      <FilterBar tasks={tasks} filters={filters} onChange={onFiltersChange} />
      <TaskGrid tasks={filtered} projectId={projectId} />
    </div>
  );
}
```

- [ ] **Step 4: `components/index.ts`에 export 추가**

기존 라인들 다음에:

```typescript
export { TabSwitcher } from "./TabSwitcher";
export { ListTab } from "./ListTab";
```

- [ ] **Step 5: `page.tsx`를 탭 전환 구조로 리팩토링**

```tsx
/**
 * @file src/app/dashboard/progress-risk/page.tsx
 * @description
 * 진도 및 리스크 보고서 메인 페이지 (Phase 3: 탭 전환)
 */
"use client";

import { useState } from "react";
import { useProject } from "@/contexts";
import { useComputeForecast } from "@/hooks";
import {
  PageHeader,
  AddTaskModal,
  KpiRow,
  VerdictBanner,
  TabSwitcher,
  ListTab,
  type Filters,
} from "./components";
import { Icon } from "@/components/ui";
import type { TabKey } from "./types";

export default function ProgressRiskPage() {
  const { selectedProject } = useProject();
  const projectEnd = selectedProject?.endDate ? new Date(selectedProject.endDate) : null;
  const { data, isLoading } = useComputeForecast(selectedProject?.id, projectEnd);

  const tasks = data?.tasks ?? [];
  const conflicts = data?.conflicts ?? [];
  const diagnosis = data?.diagnosis;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("list");
  const [filters, setFilters] = useState<Filters>({
    search: "", status: "all", category: "", userId: "",
  });

  const conflictUserCount = new Set(conflicts.map(c => c.userId)).size;
  const recCount = diagnosis?.recommendations.length ?? 0;

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
          <VerdictBanner diagnosis={diagnosis} tasks={tasks} projectEndDate={projectEnd} />
          <KpiRow tasks={tasks} conflicts={conflicts} diagnosis={diagnosis} />
          <TabSwitcher
            activeTab={activeTab}
            onChange={setActiveTab}
            conflictCount={conflictUserCount}
            recommendationCount={recCount}
          />

          {activeTab === "list" && (
            <ListTab
              tasks={tasks}
              projectId={selectedProject.id}
              filters={filters}
              onFiltersChange={setFilters}
            />
          )}
          {activeTab === "gantt" && (
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
              <p className="text-text-secondary">Gantt 탭 — Task 2에서 구현</p>
            </div>
          )}
          {activeTab === "load" && (
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
              <p className="text-text-secondary">인력부하 탭 — Task 7에서 구현</p>
            </div>
          )}
          {activeTab === "diagnosis" && (
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
              <p className="text-text-secondary">진단 탭 — Task 8~9에서 구현</p>
            </div>
          )}
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

- [ ] **Step 6: 빌드 + 커밋**

```bash
npx tsc --noEmit
npm run build
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: TabSwitcher + ListTab 분리 — 4개 탭 전환 구조 도입

Phase 3 진입. 리스트 탭은 기존 FilterBar+TaskGrid 묶음.
Gantt/인력부하/진단 탭은 placeholder, 후속 task에서 구현.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: timeScale + GanttChart 프레임 (시간축 + 행 헤더)

**Files:**
- Create: `src/app/dashboard/progress-risk/components/GanttTab/timeScale.ts`
- Create: `src/app/dashboard/progress-risk/components/GanttTab/GanttChart.tsx`
- Create: `src/app/dashboard/progress-risk/components/GanttTab/index.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: `timeScale.ts` 생성**

```typescript
/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/timeScale.ts
 * @description 시간축 ↔ x 좌표 변환 + 눈금 생성
 */
import { addDays, differenceInDays, startOfMonth, addMonths, format } from "date-fns";
import type { ProgressTask } from "@/lib/api";

export type ZoomLevel = "day" | "week" | "month" | "quarter";

export interface TimeScale {
  start: Date;
  end: Date;
  totalDays: number;
  /** 0~1 비율로 변환 */
  toRatio: (date: Date) => number;
  /** 막대 width 비율 (end - start) */
  widthRatio: (start: Date, end: Date) => number;
  /** 눈금 정보 */
  ticks: Array<{ date: Date; label: string; ratio: number }>;
}

export function buildTimeScale(
  tasks: ProgressTask[],
  zoom: ZoomLevel,
  projectEndDate: Date | null
): TimeScale {
  // 모든 task의 가장 빠른 시작과 가장 늦은 종료
  let start = new Date();
  let end = new Date();
  if (tasks.length > 0) {
    start = new Date(Math.min(...tasks.map(t => new Date(t.startDate).getTime())));
    end = new Date(Math.max(
      ...tasks.map(t => new Date(t.endDate).getTime()),
      ...(projectEndDate ? [projectEndDate.getTime()] : []),
    ));
  }

  // 양 끝에 1주 패딩
  start = addDays(start, -7);
  end = addDays(end, 14);

  const totalDays = Math.max(1, differenceInDays(end, start));

  const toRatio = (date: Date) => differenceInDays(date, start) / totalDays;
  const widthRatio = (s: Date, e: Date) => Math.max(0, differenceInDays(e, s) / totalDays);

  // 눈금 생성: zoom 기준
  const ticks: TimeScale["ticks"] = [];
  if (zoom === "month" || zoom === "quarter") {
    let cur = startOfMonth(start);
    while (cur <= end) {
      ticks.push({ date: cur, label: format(cur, "MM/dd"), ratio: toRatio(cur) });
      cur = addMonths(cur, zoom === "month" ? 1 : 3);
    }
  } else {
    // day/week: 약 8~12개의 눈금이 되도록 step 자동 계산
    const stepDays = zoom === "day" ? Math.max(1, Math.ceil(totalDays / 10)) : 7;
    let cur = new Date(start);
    while (cur <= end) {
      ticks.push({ date: cur, label: format(cur, "MM/dd"), ratio: toRatio(cur) });
      cur = addDays(cur, stepDays);
    }
  }

  return { start, end, totalDays, toRatio, widthRatio, ticks };
}
```

- [ ] **Step 2: `GanttChart.tsx` 생성 (프레임만, 막대는 Task 3에서)**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttChart.tsx
 * @description Gantt 차트 컨테이너 — 시간축 + 행 헤더 (막대는 GanttRow)
 */
"use client";
import type { ProgressTask } from "@/lib/api";
import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
}

const GRID_COLS = "36px 1fr 130px 1fr";  // 인덱스 / 기능명 / mini-stepper / 시간축

export function GanttChart({ tasks, forecast, timeScale }: Props) {
  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 overflow-x-auto">
      {/* 헤더: 시간축 눈금 */}
      <div className="grid gap-2 text-xs text-text-secondary mb-2" style={{ gridTemplateColumns: GRID_COLS }}>
        <div></div>
        <div className="font-semibold uppercase">기능</div>
        <div className="font-semibold uppercase">단계</div>
        <div className="relative h-5">
          {timeScale.ticks.map((t, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 text-[10px]"
              style={{ left: `${t.ratio * 100}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* 행 placeholder (Task 3에서 GanttRow로 교체) */}
      {tasks.map((task, idx) => (
        <div
          key={task.id}
          className="grid gap-2 py-1.5 border-b border-border/30 dark:border-border-dark/30 text-xs items-center"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="text-text-secondary">{idx + 1}</div>
          <div className="text-text dark:text-white truncate" title={`${task.code} ${task.name}`}>
            <span className="text-text-secondary text-[10px] mr-1">{task.code}</span>
            {task.name}
          </div>
          <div className="text-text-secondary">{/* mini-stepper placeholder */}—</div>
          <div className="relative h-5 bg-white/3 rounded">
            {/* bars placeholder (Task 3에서 GanttBars로 교체) */}
            <div className="absolute inset-0 flex items-center justify-center text-[9px] text-text-secondary opacity-30">
              bars in Task 3
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `GanttTab/index.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/index.tsx
 * @description Gantt 탭 — GanttChart + ZoomControl
 */
"use client";
import { useState } from "react";
import type { ProgressTask } from "@/lib/api";
import type { Forecast } from "@/lib/progress-calc/types";
import { GanttChart } from "./GanttChart";
import { buildTimeScale, type ZoomLevel } from "./timeScale";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  projectEndDate: Date | null;
}

export function GanttTab({ tasks, forecast, projectEndDate }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const timeScale = buildTimeScale(tasks, zoom, projectEndDate);

  return (
    <div className="space-y-3">
      {/* Zoom control은 Task 6에서 ZoomControl 컴포넌트로 교체 */}
      <div className="flex justify-end gap-1 text-xs">
        {(["day", "week", "month", "quarter"] as ZoomLevel[]).map(z => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`px-2.5 py-1 rounded ${
              zoom === z
                ? "bg-primary/15 border border-primary/40 text-primary"
                : "bg-white/5 border border-white/10 text-text-secondary"
            }`}
          >
            {z === "day" ? "일" : z === "week" ? "주" : z === "month" ? "월" : "분기"}
          </button>
        ))}
      </div>

      <GanttChart tasks={tasks} forecast={forecast} timeScale={timeScale} />
    </div>
  );
}
```

- [ ] **Step 4: `components/index.ts`에 export 추가**

```typescript
export { GanttTab } from "./GanttTab";
```

- [ ] **Step 5: `page.tsx`에서 GanttTab placeholder 교체**

기존 `activeTab === "gantt"` 분기를:
```tsx
{activeTab === "gantt" && data && (
  <GanttTab
    tasks={tasks}
    forecast={data.forecast}
    projectEndDate={projectEnd}
  />
)}
```

import에 `GanttTab` 추가.

- [ ] **Step 6: 빌드 + 커밋**

```bash
npx tsc --noEmit
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: Gantt 탭 프레임 + timeScale + ZoomControl 기본 — 막대는 후속 task

시간축 눈금 + 행 헤더 + zoom 토글. 막대 영역은 placeholder.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: GanttRow + GanttBars (계획/실제/예측 막대)

**Files:**
- Create: `src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx`
- Create: `src/app/dashboard/progress-risk/components/GanttTab/GanttBars.tsx`
- Modify: `src/app/dashboard/progress-risk/components/GanttTab/GanttChart.tsx`

- [ ] **Step 1: `GanttBars.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttBars.tsx
 * @description 한 행의 3종 막대 (계획/실제/예측)
 */
import type { ProgressTask } from "@/lib/api";
import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";

interface Props {
  task: ProgressTask;
  forecast: Forecast | undefined;
  timeScale: TimeScale;
  onCriticalPath: boolean;
}

export function GanttBars({ task, forecast, timeScale, onCriticalPath }: Props) {
  const plannedStart = new Date(task.startDate);
  const plannedEnd = new Date(task.endDate);
  const actualStart = task.actualStartDate ? new Date(task.actualStartDate) : null;
  const actualEnd = task.actualEndDate ? new Date(task.actualEndDate) : null;

  const planLeft = `${timeScale.toRatio(plannedStart) * 100}%`;
  const planWidth = `${timeScale.widthRatio(plannedStart, plannedEnd) * 100}%`;

  // 실제 막대 (있을 때만)
  let actualBar: { left: string; width: string; delayed: boolean } | null = null;
  if (actualStart) {
    const aEnd = actualEnd ?? new Date(); // 진행 중이면 today까지
    const delayed = actualEnd ? actualEnd > plannedEnd : new Date() > plannedEnd;
    actualBar = {
      left: `${timeScale.toRatio(actualStart) * 100}%`,
      width: `${timeScale.widthRatio(actualStart, aEnd) * 100}%`,
      delayed,
    };
  }

  // 예측 막대 (미완료이고 forecast가 계획과 다를 때)
  let forecastBar: { left: string; width: string } | null = null;
  if (!actualEnd && forecast) {
    const fEnd = forecast.forecastEnd;
    if (fEnd > plannedEnd || forecast.forecastStart > plannedStart) {
      forecastBar = {
        left: `${timeScale.toRatio(forecast.forecastStart) * 100}%`,
        width: `${timeScale.widthRatio(forecast.forecastStart, fEnd) * 100}%`,
      };
    }
  }

  const cpClass = onCriticalPath ? "shadow-[0_0_6px_rgba(239,68,68,0.5)]" : "";

  return (
    <div className="relative h-5">
      {/* 계획 막대 */}
      <div
        className={`absolute top-0 h-2 rounded-sm bg-blue-500/40 border border-blue-500/60 ${cpClass}`}
        style={{ left: planLeft, width: planWidth }}
        title={`계획: ${task.startDate.slice(0, 10)} ~ ${task.endDate.slice(0, 10)}`}
      />

      {/* 실제 막대 */}
      {actualBar && (
        <div
          className={`absolute h-1 rounded-sm ${
            actualBar.delayed ? "bg-error" : "bg-success"
          } ${cpClass}`}
          style={{ top: "12px", left: actualBar.left, width: actualBar.width }}
          title={`실제: ${actualStart?.toISOString().slice(0, 10)} ~ ${actualEnd?.toISOString().slice(0, 10) ?? "진행 중"}`}
        />
      )}

      {/* 예측 막대 */}
      {forecastBar && (
        <div
          className={`absolute h-1 rounded-sm border border-dashed border-orange-500 bg-orange-500/40 ${cpClass}`}
          style={{ top: "12px", left: forecastBar.left, width: forecastBar.width }}
          title="예측 일정"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: `GanttRow.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx
 * @description Gantt 1행 — 인덱스 + 기능명 + mini-stepper + 막대
 */
import type { ProgressTask } from "@/lib/api";
import type { Forecast } from "@/lib/progress-calc/types";
import { STAGE_ORDER } from "@/lib/progress-stages";
import { GanttBars } from "./GanttBars";
import type { TimeScale } from "./timeScale";

interface Props {
  index: number;
  task: ProgressTask;
  forecast: Forecast | undefined;
  timeScale: TimeScale;
  onCriticalPath: boolean;
  gridCols: string;
}

export function GanttRow({ index, task, forecast, timeScale, onCriticalPath, gridCols }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(task.currentStage);

  return (
    <div
      className="grid gap-2 py-1.5 border-b border-border/30 dark:border-border-dark/30 text-xs items-center"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="text-text-secondary">{index}</div>
      <div className="text-text dark:text-white truncate" title={`${task.code} ${task.name}`}>
        <span className="text-text-secondary text-[10px] mr-1">{task.code}</span>
        {task.name}
        {onCriticalPath && (
          <span className="ml-1 text-[9px] text-error">⚡</span>
        )}
      </div>

      {/* mini-stepper: 9 dots */}
      <div className="flex items-center gap-0.5">
        {STAGE_ORDER.map((_, i) => {
          const bg = i === currentIdx
            ? "bg-[#00f3ff]"
            : i < currentIdx
              ? "bg-green-500"
              : "bg-white/10 dark:bg-white/5";
          return <div key={i} className={`w-1.5 h-1.5 rounded-sm ${bg}`} />;
        })}
      </div>

      <GanttBars task={task} forecast={forecast} timeScale={timeScale} onCriticalPath={onCriticalPath} />
    </div>
  );
}
```

- [ ] **Step 3: `GanttChart.tsx` 교체 — 행 placeholder를 GanttRow로**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/GanttChart.tsx
 * @description Gantt 차트 컨테이너 — 시간축 + 행 목록
 */
"use client";
import type { ProgressTask } from "@/lib/api";
import type { Forecast } from "@/lib/progress-calc/types";
import { GanttRow } from "./GanttRow";
import type { TimeScale } from "./timeScale";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
  criticalPathIds?: Set<string>;
}

const GRID_COLS = "36px 1fr 130px 1fr";

export function GanttChart({ tasks, forecast, timeScale, criticalPathIds }: Props) {
  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 overflow-x-auto">
      {/* 헤더: 시간축 눈금 */}
      <div className="grid gap-2 text-xs text-text-secondary mb-2" style={{ gridTemplateColumns: GRID_COLS }}>
        <div></div>
        <div className="font-semibold uppercase">기능</div>
        <div className="font-semibold uppercase">단계</div>
        <div className="relative h-5">
          {timeScale.ticks.map((t, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 text-[10px]"
              style={{ left: `${t.ratio * 100}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* 행 목록 */}
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
    </div>
  );
}
```

- [ ] **Step 4: GanttTab index에서 criticalPathIds 전달**

`GanttTab/index.tsx`를 수정해서 diagnosis.criticalPath를 받고 Set으로 변환해 GanttChart에 넘김:

```tsx
interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  projectEndDate: Date | null;
  criticalPath?: string[];
}

export function GanttTab({ tasks, forecast, projectEndDate, criticalPath }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const timeScale = buildTimeScale(tasks, zoom, projectEndDate);
  const cpSet = new Set(criticalPath ?? []);

  return (
    <div className="space-y-3">
      {/* zoom 컨트롤 동일 */}
      <GanttChart tasks={tasks} forecast={forecast} timeScale={timeScale} criticalPathIds={cpSet} />
    </div>
  );
}
```

- [ ] **Step 5: page.tsx에서 criticalPath 전달**

```tsx
{activeTab === "gantt" && data && (
  <GanttTab
    tasks={tasks}
    forecast={data.forecast}
    projectEndDate={projectEnd}
    criticalPath={diagnosis?.criticalPath}
  />
)}
```

- [ ] **Step 6: 빌드 + 커밋**

```bash
npx tsc --noEmit
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: Gantt 막대 — 계획(파랑)/실제(초록·빨강)/예측(주황 점선) + Critical Path 발광

실제 막대는 진행 중이면 today까지, 완료면 actualEnd까지.
지연 여부는 plannedEnd 비교. Critical Path는 box-shadow로 강조.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: DeadlineMarkers (목표/예측 세로선)

**Files:**
- Create: `src/app/dashboard/progress-risk/components/GanttTab/DeadlineMarkers.tsx`
- Modify: `src/app/dashboard/progress-risk/components/GanttTab/GanttChart.tsx`

- [ ] **Step 1: `DeadlineMarkers.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/DeadlineMarkers.tsx
 * @description Gantt 위 세로선 (목표 종료일 / 예측 종료일)
 *
 * 시간축 영역 안에서 절대 위치로 렌더. 시간축이 grid의 4번째 컬럼이므로
 * relative wrapper 안에 absolute 세로선을 배치.
 */
import type { Forecast } from "@/lib/progress-calc/types";
import type { TimeScale } from "./timeScale";

interface Props {
  projectEndDate: Date | null;
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
  rowCount: number; // 차트 전체 높이 결정용
}

export function DeadlineMarkers({ projectEndDate, forecast, timeScale, rowCount }: Props) {
  // 예측 종료일 = 모든 forecast.forecastEnd의 max
  const allEnds = [...forecast.values()].map(f => f.forecastEnd.getTime());
  const maxForecast = allEnds.length > 0
    ? new Date(Math.max(...allEnds))
    : null;

  // 두 세로선이 겹치지 않을 때만 둘 다 표시
  const showForecast = maxForecast && projectEndDate && maxForecast > projectEndDate;

  const heightPx = 24 * rowCount + 28; // 헤더 28 + 각 행 24

  return (
    <>
      {/* 목표 종료일 (자홍색) */}
      {projectEndDate && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${timeScale.toRatio(projectEndDate) * 100}%`,
            top: 0,
            height: `${heightPx}px`,
            width: "2px",
            background: "#fa00ff",
          }}
        >
          <span
            className="absolute -top-1 -translate-x-1/2 text-[9px] text-pink-500 whitespace-nowrap"
            style={{ left: "1px" }}
          >
            목표
          </span>
        </div>
      )}

      {/* 예측 종료일 (빨강) — 목표 초과 시만 */}
      {showForecast && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${timeScale.toRatio(maxForecast) * 100}%`,
            top: 0,
            height: `${heightPx}px`,
            width: "2px",
            background: "#ef4444",
          }}
        >
          <span
            className="absolute -top-1 -translate-x-1/2 text-[9px] text-red-500 whitespace-nowrap"
            style={{ left: "1px" }}
          >
            예측
          </span>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: GanttChart에 DeadlineMarkers 통합**

`GanttChart.tsx`를 수정 — 차트 전체를 wrapping하는 relative 영역 추가, DeadlineMarkers는 시간축 컬럼만 cover:

```tsx
// imports에 추가
import { DeadlineMarkers } from "./DeadlineMarkers";

// Props에 추가
interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
  timeScale: TimeScale;
  criticalPathIds?: Set<string>;
  projectEndDate?: Date | null;  // 추가
}

// JSX 변경 — 시간축 컬럼(헤더 + 행) 안에 absolute 마커를 배치하려면
// grid 4번째 컬럼 영역을 자체 relative wrapper로 감싸기. 간단히 차트 전체를
// relative로 두고 컬럼 width를 비율(%)로 계산해 left 오프셋을 적용.
// 여기서는 시간축 영역만 wrap하는 sub-grid를 만들지 않고, 행마다 마커를 그리는 대신
// 차트 컨테이너 하나에 overlay를 한 번만 그림 (위치 계산이 GanttBars와 동일 비율 기반).

// 가장 단순한 방법: 시간축 영역만 cover하는 absolute wrapper를
// 차트 컨테이너 끝에 추가. 단, 컨테이너의 grid 4번째 컬럼 영역(시간축)에 정렬해야 함.
// → 차트 컨테이너 자체를 relative로 두고, time scale을 column 1fr에 매핑.
//   markers는 그 1fr 안에서 그려져야 하지만 grid 구조상 어렵다.
// → 대안: markers를 GanttChart의 각 GanttRow 위에 그리지 않고,
//   별도 absolute layer를 시간축 col만 차지하는 div로 만들어 overlay.

// 구현: 시간축 컬럼만 차지하는 별도 div를 grid 4번째 칼럼에 배치:
return (
  <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 overflow-x-auto">
    <div className="relative">
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

      {/* 행 목록 */}
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

      {/* 시간축 컬럼만 cover하는 markers overlay */}
      <div
        className="absolute pointer-events-none"
        style={{
          // grid 4번째 컬럼 시작 위치 = 36 + 8 (gap) + ?? — 단순 계산이 어렵다.
          // 우회: top 0부터 절대 위치, left는 calc로 처리.
          top: 0,
          left: "calc(36px + 0.5rem + ((100% - 36px - 130px - 1.5rem) / 2) + 0.5rem + 130px + 0.5rem)",
          right: 0,
          bottom: 0,
        }}
      >
        <DeadlineMarkers
          projectEndDate={projectEndDate ?? null}
          forecast={forecast}
          timeScale={timeScale}
          rowCount={tasks.length}
        />
      </div>
    </div>
  </div>
);
```

**Note:** 위 left calc가 복잡하다. 더 단순한 방법은 grid의 4번째 컬럼을 그냥 1fr이 아니라 별도 wrapper로 감싸는 것. 또 다른 옵션: CSS grid `subgrid` 또는 column ref. 가장 안전한 방법은 GanttBars와 동일하게 행 단위로 markers의 column에 들어가 absolute로 그리는 것이지만 행을 가로지르는 세로선 효과를 내려면 별도 layer가 필요.

**간소화 대안:** DeadlineMarkers를 GanttRow의 마지막 컬럼(`<div class="relative h-5">`) 내부에 함께 렌더 — 단 그러면 행마다 표시되어 보기 좋지 않음. 대신 차트 컨테이너에 한 번만 그리고, 시간축 컬럼만 차지하는 div를 별도로 두기:

```tsx
// GRID_COLS을 부모 div의 grid에 적용하고, 시간축 컬럼만 ref로 absolute positioning 안에 markers를 둠.
// 가장 확실한 방법: 시간축 컬럼 영역을 자체 wrapper로 만들고 그 안에 markers + 모든 행의 막대를 위치시킴.
// 즉, GanttChart 구조를 다음과 같이 재설계:
//   [인덱스/기능/단계 | 시간축 영역(absolute 마커 + 행마다 absolute 막대)]
// 행이 시간축 영역 안에 absolute로 들어가야 함 — 매우 복잡.

// 본 plan에서는 단순화: markers를 행에 cover하지 않고, 헤더 직후 한 줄 띠로 표시.
// 즉, 각 행을 가로지르는 세로선이 아니라, 차트 상단에 "목표 5/30, 예측 6/15" 같은 마커 라벨로 대체.
```

**최종 결정 (간소화):** DeadlineMarkers를 차트 헤더 하단에 horizontal bar로 표시 (위치 라벨만). 세로선 가로지르기는 Phase 4 polish로 이월. 다음과 같이 단순 라벨로 구현:

```tsx
// 새 단순 DeadlineMarkers.tsx
export function DeadlineMarkers({ projectEndDate, forecast, timeScale }: Props) {
  const allEnds = [...forecast.values()].map(f => f.forecastEnd.getTime());
  const maxForecast = allEnds.length > 0 ? new Date(Math.max(...allEnds)) : null;
  const showForecast = maxForecast && projectEndDate && maxForecast > projectEndDate;

  return (
    <div className="relative h-5 mt-1 mb-2">
      {projectEndDate && (
        <div
          className="absolute -translate-x-1/2 text-[10px] text-pink-500 font-semibold whitespace-nowrap"
          style={{ left: `${timeScale.toRatio(projectEndDate) * 100}%` }}
        >
          ▼ 목표 {projectEndDate.toISOString().slice(0, 10)}
        </div>
      )}
      {showForecast && (
        <div
          className="absolute -translate-x-1/2 text-[10px] text-red-500 font-semibold whitespace-nowrap"
          style={{ left: `${timeScale.toRatio(maxForecast) * 100}%`, top: "12px" }}
        >
          ▼ 예측 {maxForecast.toISOString().slice(0, 10)}
        </div>
      )}
    </div>
  );
}
```

GanttChart에서 헤더 다음, 첫 행 이전에 markers 배치 (시간축 컬럼 영역에 정렬):

```tsx
<div className="grid gap-2" style={{ gridTemplateColumns: GRID_COLS }}>
  <div></div>
  <div></div>
  <div></div>
  <DeadlineMarkers projectEndDate={projectEndDate ?? null} forecast={forecast} timeScale={timeScale} />
</div>
```

- [ ] **Step 3: Props 업데이트 + page.tsx 전달**

GanttChart Props에 `projectEndDate` 추가 + GanttTab에서 전달.

- [ ] **Step 4: 빌드 + 커밋**

```bash
npx tsc --noEmit
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: Gantt 목표/예측 종료일 라벨 마커 (DeadlineMarkers)

▼ 목표 (자홍) + ▼ 예측 (빨강, 목표 초과 시) 라벨로 시간축에 위치.
세로선 가로지르기는 Phase 4 polish로 이월 (CSS grid 복잡도 회피).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: ZoomControl 컴포넌트 분리

**Files:**
- Create: `src/app/dashboard/progress-risk/components/GanttTab/ZoomControl.tsx`
- Modify: `src/app/dashboard/progress-risk/components/GanttTab/index.tsx`

- [ ] **Step 1: `ZoomControl.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/ZoomControl.tsx
 * @description Gantt zoom 토글 (일/주/월/분기)
 */
"use client";
import type { ZoomLevel } from "./timeScale";

interface Props {
  value: ZoomLevel;
  onChange: (zoom: ZoomLevel) => void;
}

const OPTIONS: { key: ZoomLevel; label: string }[] = [
  { key: "day",     label: "일" },
  { key: "week",    label: "주" },
  { key: "month",   label: "월" },
  { key: "quarter", label: "분기" },
];

export function ZoomControl({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 text-xs">
      {OPTIONS.map(opt => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`px-2.5 py-1 rounded border transition-colors ${
              active
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-white/5 dark:bg-white/5 border-white/10 text-text-secondary"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: GanttTab에서 ZoomControl 사용**

기존 인라인 zoom 버튼들을 컴포넌트로 교체:

```tsx
import { ZoomControl } from "./ZoomControl";

// JSX에서 기존 인라인 버튼 div를:
<div className="flex justify-end">
  <ZoomControl value={zoom} onChange={setZoom} />
</div>
```

- [ ] **Step 3: 커밋**

```bash
npx tsc --noEmit
git add src/app/dashboard/progress-risk/components/GanttTab/
git commit -m "$(cat <<'EOF'
refactor: Gantt ZoomControl 컴포넌트 분리

GanttTab 안 인라인 버튼들을 ZoomControl로 추출. 단일 책임 + 재사용성 향상.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 인력부하 탭 — loadBuckets 계산 + LoadHeatmap

**Files:**
- Create: `src/app/dashboard/progress-risk/components/LoadTab/loadBuckets.ts`
- Create: `src/app/dashboard/progress-risk/components/LoadTab/LoadHeatmap.tsx`
- Create: `src/app/dashboard/progress-risk/components/LoadTab/index.tsx`
- Create: `src/app/dashboard/progress-risk/components/LoadTab/__tests__/loadBuckets.test.ts`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: 실패 테스트 작성** — `__tests__/loadBuckets.test.ts`

```typescript
/**
 * @file src/app/dashboard/progress-risk/components/LoadTab/__tests__/loadBuckets.test.ts
 */
import { describe, it, expect } from "vitest";
import { buildLoadBuckets } from "../loadBuckets";
import type { Forecast } from "@/lib/progress-calc/types";

const d = (offset: number) => {
  const base = new Date(2026, 4, 13);
  base.setDate(base.getDate() + offset);
  return base;
};

describe("buildLoadBuckets", () => {
  it("user별로 주차 버킷에 참여율 누적", () => {
    const assignees = [
      { taskId: "T1", userId: "U1", allocationPct: 100, user: { id: "U1", name: "Alice", email: "a@x" } },
      { taskId: "T2", userId: "U1", allocationPct: 50,  user: { id: "U1", name: "Alice", email: "a@x" } },
    ];
    const forecast = new Map<string, Forecast>([
      ["T1", { forecastStart: d(0), forecastEnd: d(7), duration: 7 }],
      ["T2", { forecastStart: d(0), forecastEnd: d(7), duration: 7 }],
    ]);
    const result = buildLoadBuckets(assignees, forecast);
    expect(result.length).toBe(1);
    expect(result[0].userId).toBe("U1");
    expect(result[0].weeks.length).toBeGreaterThan(0);
    expect(result[0].weeks[0].sumPct).toBe(150);
  });

  it("assignee 없으면 빈 배열", () => {
    const result = buildLoadBuckets([], new Map());
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: `loadBuckets.ts` 구현**

```typescript
/**
 * @file src/app/dashboard/progress-risk/components/LoadTab/loadBuckets.ts
 * @description user × week 매트릭스용 부하 버킷 계산
 */
import { eachWeekOfInterval, getISOWeek, getISOWeekYear } from "date-fns";
import type { Forecast } from "@/lib/progress-calc/types";

interface AssigneeWithUser {
  taskId: string;
  userId: string;
  allocationPct: number;
  user: { id: string; name: string; email: string; avatar?: string | null };
}

export interface WeekBucket {
  key: string; // "2026-W20"
  date: Date;  // 그 주 월요일
  sumPct: number;
}

export interface UserLoad {
  userId: string;
  userName: string;
  avatar: string | null;
  weeks: WeekBucket[];
}

function weekKey(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, "0")}`;
}

export function buildLoadBuckets(
  assignees: AssigneeWithUser[],
  forecast: Map<string, Forecast>
): UserLoad[] {
  const byUser = new Map<string, AssigneeWithUser[]>();
  for (const a of assignees) {
    const list = byUser.get(a.userId) ?? [];
    list.push(a);
    byUser.set(a.userId, list);
  }

  const results: UserLoad[] = [];

  for (const [userId, items] of byUser) {
    const buckets = new Map<string, WeekBucket>();

    for (const a of items) {
      const f = forecast.get(a.taskId);
      if (!f) continue;
      const weeks = eachWeekOfInterval(
        { start: f.forecastStart, end: f.forecastEnd },
        { weekStartsOn: 1 }
      );
      for (const w of weeks) {
        const key = weekKey(w);
        const existing = buckets.get(key);
        if (existing) {
          existing.sumPct += a.allocationPct;
        } else {
          buckets.set(key, { key, date: w, sumPct: a.allocationPct });
        }
      }
    }

    const sortedWeeks = [...buckets.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
    results.push({
      userId,
      userName: items[0].user.name,
      avatar: items[0].user.avatar ?? null,
      weeks: sortedWeeks,
    });
  }

  return results.sort((a, b) => a.userName.localeCompare(b.userName));
}
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
npx vitest run src/app/dashboard/progress-risk/components/LoadTab/__tests__/loadBuckets.test.ts
```
Expected: PASS — 2 tests

- [ ] **Step 4: `LoadHeatmap.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/LoadTab/LoadHeatmap.tsx
 * @description user × week 부하 매트릭스 시각화
 */
import { format } from "date-fns";
import type { UserLoad } from "./loadBuckets";

interface Props {
  loads: UserLoad[];
}

function cellColor(pct: number): string {
  if (pct > 100) return "bg-error";
  if (pct >= 70) return "bg-warning";
  if (pct > 0) return "bg-success";
  return "bg-white/5 dark:bg-white/5";
}

export function LoadHeatmap({ loads }: Props) {
  if (loads.length === 0) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
        <p className="text-text-secondary">담당자가 할당된 task가 없습니다.</p>
      </div>
    );
  }

  // 모든 user의 주차 키 union → 정렬
  const allWeekKeys = new Set<string>();
  for (const load of loads) {
    for (const w of load.weeks) allWeekKeys.add(w.key);
  }
  const weekKeysSorted = [...allWeekKeys].sort();
  const weekDateMap = new Map<string, Date>();
  for (const load of loads) {
    for (const w of load.weeks) {
      if (!weekDateMap.has(w.key)) weekDateMap.set(w.key, w.date);
    }
  }

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left text-text-secondary uppercase pb-2 pr-3 min-w-[140px]">담당자</th>
            {weekKeysSorted.map(wk => {
              const d = weekDateMap.get(wk)!;
              return (
                <th key={wk} className="text-text-secondary text-[9px] pb-2 px-1 whitespace-nowrap font-normal">
                  {format(d, "MM/dd")}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loads.map(load => {
            const byKey = new Map(load.weeks.map(w => [w.key, w]));
            return (
              <tr key={load.userId} className="border-t border-border/30 dark:border-border-dark/30">
                <td className="text-text dark:text-white py-2 pr-3 whitespace-nowrap">
                  {load.userName}
                </td>
                {weekKeysSorted.map(wk => {
                  const bucket = byKey.get(wk);
                  const pct = bucket?.sumPct ?? 0;
                  const heightPct = Math.min(100, pct);
                  return (
                    <td key={wk} className="px-1 py-1.5">
                      <div className="relative h-4 w-6 bg-white/5 dark:bg-white/5 rounded-sm overflow-hidden" title={`${pct}%`}>
                        <div
                          className={`absolute bottom-0 left-0 right-0 ${cellColor(pct)} rounded-sm`}
                          style={{ height: `${heightPct}%` }}
                        />
                        {pct > 100 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[7px] text-white font-bold">!</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex gap-3 mt-3 text-[10px] text-text-secondary">
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-success rounded-sm"></span>정상 ≤70%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-warning rounded-sm"></span>주의 70~100%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-error rounded-sm"></span>과부하 &gt;100%</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `LoadTab/index.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/LoadTab/index.tsx
 * @description 인력부하 탭 — LoadHeatmap 컨테이너
 */
"use client";
import type { ProgressTask } from "@/lib/api";
import type { Forecast } from "@/lib/progress-calc/types";
import { buildLoadBuckets } from "./loadBuckets";
import { LoadHeatmap } from "./LoadHeatmap";

interface Props {
  tasks: ProgressTask[];
  forecast: Map<string, Forecast>;
}

export function LoadTab({ tasks, forecast }: Props) {
  const flatAssignees = tasks.flatMap(t =>
    t.assignees.map(a => ({
      taskId: t.id,
      userId: a.userId,
      allocationPct: a.allocationPct,
      user: a.user,
    }))
  );
  const loads = buildLoadBuckets(flatAssignees, forecast);

  return <LoadHeatmap loads={loads} />;
}
```

- [ ] **Step 6: `components/index.ts`에 export 추가**

```typescript
export { LoadTab } from "./LoadTab";
```

- [ ] **Step 7: `page.tsx`에서 LoadTab placeholder 교체**

```tsx
{activeTab === "load" && data && (
  <LoadTab tasks={tasks} forecast={data.forecast} />
)}
```

import에 `LoadTab` 추가.

- [ ] **Step 8: 빌드 + 커밋**

```bash
npx tsc --noEmit
npm run build
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: 인력부하 탭 — user × week 히트맵 + loadBuckets 단위 테스트

ISO 주차 기준 누적 참여율 매트릭스. 70%↑ 노랑, 100%↑ 빨강.
빈 셀(미할당)은 회색. 그 주 합산 % 툴팁.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 진단 탭 — RecommendationCard

**Files:**
- Create: `src/app/dashboard/progress-risk/components/DiagnosisTab/RecommendationCard.tsx`
- Create: `src/app/dashboard/progress-risk/components/DiagnosisTab/index.tsx`
- Modify: `src/app/dashboard/progress-risk/components/index.ts`
- Modify: `src/app/dashboard/progress-risk/page.tsx`

- [ ] **Step 1: `RecommendationCard.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/DiagnosisTab/RecommendationCard.tsx
 * @description 진단 권장 조치 카드 (severity 별 색상)
 */
import { Icon } from "@/components/ui";
import type { Recommendation } from "@/lib/progress-calc/types";

interface Props {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: Props) {
  const isHigh = recommendation.severity === "high";

  const bgClass = isHigh
    ? "bg-error/5 border-error/30"
    : "bg-warning/5 border-warning/30";
  const iconBg = isHigh ? "bg-error/10" : "bg-warning/10";
  const iconColor = isHigh ? "text-error" : "text-warning";
  const icon = isHigh ? "priority_high" : "warning";

  return (
    <div className={`flex items-start gap-3 border rounded-lg p-4 ${bgClass}`} role="article">
      <div className={`size-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon name={icon} size="sm" className={iconColor} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${iconColor}`}>
          {isHigh ? "🔴 우선 조치" : "🟠 주의"}
        </p>
        <p className="text-sm text-text dark:text-white mt-1">{recommendation.message}</p>
        {(recommendation.taskId || recommendation.userId) && (
          <p className="text-[10px] text-text-secondary mt-2">
            {recommendation.taskId && <>관련 task: <code className="bg-white/5 px-1 rounded">{recommendation.taskId}</code> </>}
            {recommendation.userId && <>관련 사용자: <code className="bg-white/5 px-1 rounded">{recommendation.userId}</code></>}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `DiagnosisTab/index.tsx` 생성**

```tsx
/**
 * @file src/app/dashboard/progress-risk/components/DiagnosisTab/index.tsx
 * @description 진단 탭 — verdict 요약 + 권장 조치 카드 목록
 */
"use client";
import type { Diagnosis } from "@/lib/progress-calc/types";
import { Icon } from "@/components/ui";
import { RecommendationCard } from "./RecommendationCard";

interface Props {
  diagnosis: Diagnosis | undefined;
}

const VERDICT_LABEL: Record<Diagnosis["verdict"], { label: string; icon: string; color: string }> = {
  NORMAL:            { label: "정상",         icon: "check_circle", color: "text-success" },
  SCHEDULE_OVERRUN:  { label: "일정 초과",     icon: "schedule",     color: "text-error" },
  RESOURCE_SHORTAGE: { label: "공수 부족",     icon: "person_off",   color: "text-warning" },
  BOTH:              { label: "복합 위험",     icon: "error",        color: "text-error" },
};

export function DiagnosisTab({ diagnosis }: Props) {
  if (!diagnosis) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
        <p className="text-text-secondary">계산 중...</p>
      </div>
    );
  }

  const verdictMeta = VERDICT_LABEL[diagnosis.verdict];

  return (
    <div className="space-y-4">
      {/* Verdict 요약 카드 */}
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-surface dark:bg-background-dark flex items-center justify-center">
            <Icon name={verdictMeta.icon} className={verdictMeta.color} />
          </div>
          <div>
            <p className="text-xs text-text-secondary">현재 진단</p>
            <p className={`text-xl font-bold ${verdictMeta.color}`}>{verdictMeta.label}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Metric label="일정 초과" value={diagnosis.overrunDays > 0 ? `+${diagnosis.overrunDays}일` : "0"} />
          <Metric label="공수 부족" value={diagnosis.shortageMd > 0 ? `-${diagnosis.shortageMd.toFixed(1)} MD` : "0"} />
          <Metric label="Critical Path 길이" value={`${diagnosis.criticalPath.length}개`} />
          <Metric label="권장 조치" value={`${diagnosis.recommendations.length}건`} />
        </div>
      </div>

      {/* 권장 조치 목록 */}
      {diagnosis.recommendations.length === 0 ? (
        <div className="bg-success/5 border border-success/30 rounded-xl p-8 text-center">
          <Icon name="check_circle" size="xl" className="text-success mb-2" />
          <p className="text-success font-medium">조치 권장사항 없음</p>
          <p className="text-xs text-text-secondary mt-1">현재 상태가 정상 범위에 있습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {diagnosis.recommendations.map((r, i) => (
            <RecommendationCard key={i} recommendation={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface dark:bg-background-dark rounded-lg p-2.5">
      <p className="text-[10px] text-text-secondary">{label}</p>
      <p className="text-sm font-semibold text-text dark:text-white mt-0.5">{value}</p>
    </div>
  );
}
```

- [ ] **Step 3: `components/index.ts`에 export 추가**

```typescript
export { DiagnosisTab } from "./DiagnosisTab";
```

- [ ] **Step 4: `page.tsx`에서 placeholder 교체**

```tsx
{activeTab === "diagnosis" && (
  <DiagnosisTab diagnosis={diagnosis} />
)}
```

import에 `DiagnosisTab` 추가.

- [ ] **Step 5: 최종 빌드 + 통합 확인**

```bash
npx tsc --noEmit
npm run build
npx vitest run
```
Expected:
- tsc 0 errors
- 빌드 성공
- 모든 단위 테스트 통과 (Phase 1: 6 constants + Phase 2: 15 calc + Phase 3: 2 load = 23 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/app/dashboard/progress-risk/
git commit -m "$(cat <<'EOF'
feat: 진단 탭 — Verdict 요약 + RecommendationCard 목록

Phase 3 완료. 4개 탭 시각화 시스템 완성:
- 리스트 / Gantt / 인력부하 / 진단
- Critical Path 강조, forecast 막대, user×week 부하맵, 권장 조치 카드

Phase 4 영역: Excel import/export 실제 구현, 진단 카드 deep link.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 완료 체크리스트

- [ ] TabSwitcher 4탭 전환 동작
- [ ] ListTab 분리 (기존 동작 유지)
- [ ] GanttChart + GanttRow + GanttBars (계획/실제/예측)
- [ ] Critical Path 시각적 강조
- [ ] DeadlineMarkers (목표/예측 라벨)
- [ ] ZoomControl (일/주/월/분기)
- [ ] LoadHeatmap (user × week, 색상 단계)
- [ ] loadBuckets 단위 테스트
- [ ] DiagnosisTab (Verdict 요약 + RecommendationCard)
- [ ] `npm run build` 성공
- [ ] 모든 단위 테스트 통과

**Phase 4 (향후):** 선후행 SVG 화살표 overlay, Excel import/export, 진단 카드 deep link, 단계별 분리 일정 (매트릭스 모델로 확장).

---

## 자체 점검

| 확인 항목 | 결과 |
|----------|------|
| Phase 2 산출물(forecast/conflicts/diagnosis) 모두 소비 | ✅ |
| 컴포넌트 폴더 분리 (GanttTab/LoadTab/DiagnosisTab) | ✅ |
| 외부 라이브러리 추가 없음 (date-fns만) | ✅ |
| 200줄 미만 컴포넌트 유지 | ✅ |
| 빈 상태 / 로딩 상태 처리 | ✅ |
| 다크모드 호환 | ✅ |
| 단위 테스트 (loadBuckets) | ✅ |
| Phase 4 이월 명시 (SVG 화살표, Excel) | ✅ |
