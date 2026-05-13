/**
 * @file src/app/dashboard/progress-risk/page.tsx
 * @description
 * 진도 및 리스크 보고서 메인 페이지 (Phase 2: 알고리즘 통합)
 *
 * 초보자 가이드:
 * 1. **헤더**: 페이지 타이틀 + 액션 버튼
 * 2. **본문**: KpiRow + FilterBar + TaskGrid
 * 3. **useComputeForecast**: tasks/conflicts/diagnosis를 한 훅에서 derive
 */
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
  VerdictBanner,
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
          <VerdictBanner diagnosis={diagnosis} tasks={tasks} projectEndDate={projectEnd} />
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
