/**
 * @file src/app/dashboard/progress-risk/page.tsx
 * @description
 * 진도 및 리스크 보고서 메인 페이지 (Phase 3: 탭 전환)
 *
 * 초보자 가이드:
 * 1. **헤더**: 페이지 타이틀 + 액션 버튼
 * 2. **TabSwitcher**: 4개 탭 (리스트 / Gantt / 인력부하 / 진단)
 * 3. **각 탭**: 독립적인 컴포넌트로 구성
 * 4. **Placeholder**: Gantt/인력부하/진단은 후속 task에서 구현
 */
"use client";

import { useState } from "react";
import { useProject } from "@/contexts";
import { useComputeForecast } from "@/hooks";
import { api } from "@/lib/api";
import {
  PageHeader,
  AddTaskModal,
  ImportTaskModal,
  type Filters,
  FilterBar,
  KpiRow,
  TabSwitcher,
  ListTab,
  GanttTab,
  LoadTab,
  RiskIssueTab,
  DiagnosisTab,
  StageManagerModal,
} from "./components";
import { Icon } from "@/components/ui";
import type { TabKey } from "./types";
import type { Recommendation } from "@/lib/progress-calc/types";
import type { ListViewMode } from "./components/ListTab/listViewMode";

export default function ProgressRiskPage() {
  const { selectedProject } = useProject();
  const projectEnd = selectedProject?.endDate ? new Date(selectedProject.endDate) : null;
  const { data, isLoading, isFetching, refetch } = useComputeForecast(selectedProject?.id, projectEnd);

  const tasks = data?.tasks ?? [];
  const conflicts = data?.conflicts ?? [];
  const diagnosis = data?.diagnosis;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [stageManagerOpen, setStageManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("list");
  const [listViewMode, setListViewMode] = useState<ListViewMode>("pagination");
  const [filters, setFilters] = useState<Filters>({
    search: "", status: "all", businessUnit: "", category: "", majorCategory: "",
  });
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);

  const conflictUserCount = new Set(conflicts.map((c) => c.userId)).size;
  const recCount = diagnosis?.recommendations.length ?? 0;

  const handleCardClick = (rec: Recommendation) => {
    if (rec.taskId) {
      setHighlightTaskId(rec.taskId);
      setActiveTab("list");
      setTimeout(() => setHighlightTaskId(null), 3000);
    } else if (rec.userId) {
      setActiveTab("load");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 고정 헤더 영역 — 스크롤 시에도 항상 보임 */}
      <div className="flex-none px-6 pt-6 space-y-4">
        <PageHeader
          taskCount={tasks.length}
          onAddTask={() => setAddModalOpen(true)}
          onExportExcel={() => {
            if (selectedProject) {
              window.location.href = api.progressTasks.exportUrl(selectedProject.id);
            }
          }}
          onImportExcel={() => setImportModalOpen(true)}
          onOpenStageManager={() => setStageManagerOpen(true)}
          onRefresh={() => refetch()}
          isRefreshing={isFetching && !isLoading}
        />

        {selectedProject && tasks.length > 0 && (
          <>
            <KpiRow tasks={tasks} conflicts={conflicts} diagnosis={diagnosis} projectEndDate={projectEnd} />
            <div className="flex flex-wrap items-center gap-3">
              <TabSwitcher
                activeTab={activeTab}
                onChange={setActiveTab}
                conflictCount={conflictUserCount}
                recommendationCount={recCount}
              />
              {activeTab === "list" && (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                  <FilterBar tasks={tasks} filters={filters} onChange={setFilters} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 콘텐츠 영역 — 모든 탭이 자체 스크롤을 가지므로 flex 전파만 담당 */}
      <div className="flex-1 min-h-0 flex flex-col px-6 pb-6 pt-4">
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
            <p className="text-xs text-text-secondary opacity-60">우측 상단의 &quot;DATA 추가&quot;로 시작하세요.</p>
          </div>
        )}

        {selectedProject && tasks.length > 0 && (
          <>
            {activeTab === "list" && (
              <ListTab
                tasks={tasks}
                projectId={selectedProject.id}
                filters={filters}
                viewMode={listViewMode}
                onViewModeChange={setListViewMode}
                highlightTaskId={highlightTaskId}
              />
            )}

            {activeTab === "gantt" && (
              <GanttTab
                tasks={tasks}
                forecast={data?.forecast ?? new Map()}
                projectEndDate={projectEnd}
                criticalPath={diagnosis?.criticalPath}
              />
            )}

            {activeTab === "load" && data && (
              <LoadTab tasks={tasks} forecast={data.forecast} />
            )}

            {activeTab === "riskIssues" && (
              <RiskIssueTab projectId={selectedProject.id} tasks={tasks} />
            )}

            {activeTab === "diagnosis" && (
              <DiagnosisTab diagnosis={diagnosis} onCardClick={handleCardClick} />
            )}
          </>
        )}
      </div>

      {selectedProject && (
        <>
          <AddTaskModal
            isOpen={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            projectId={selectedProject.id}
            existingTasks={tasks}
          />
          <ImportTaskModal
            isOpen={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            onSuccess={() => setImportModalOpen(false)}
            projectId={selectedProject.id}
          />
          <StageManagerModal
            isOpen={stageManagerOpen}
            onClose={() => setStageManagerOpen(false)}
            projectId={selectedProject.id}
          />
        </>
      )}
    </div>
  );
}
