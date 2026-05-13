/**
 * @file src/app/dashboard/progress-risk/page.tsx
 * @description
 * 진도 및 리스크 보고서 메인 페이지 (Phase 1: 리스트 탭만)
 *
 * 초보자 가이드:
 * 1. **헤더**: 페이지 타이틀 + 액션 버튼
 * 2. **본문**: 빈 상태 또는 task 그리드 (Task 9~16에서 추가)
 */
"use client";

import { useState } from "react";
import { useProject } from "@/contexts";
import { useProgressTasks } from "@/hooks";
import {
  PageHeader,
  AddTaskModal,
  TaskGrid,
  FilterBar,
  applyFilters,
  type Filters,
} from "./components";
import { Icon } from "@/components/ui";

export default function ProgressRiskPage() {
  const { selectedProject } = useProject();
  const { data: tasks = [], isLoading } = useProgressTasks(selectedProject?.id);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    category: "",
    userId: "",
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

      {selectedProject && (
        <AddTaskModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          projectId={selectedProject.id}
          existingTasks={tasks}
        />
      )}

      {selectedProject && !isLoading && tasks.length > 0 && (
        <>
          <FilterBar tasks={tasks} filters={filters} onChange={setFilters} />
          <TaskGrid tasks={filteredTasks} projectId={selectedProject.id} />
        </>
      )}
    </div>
  );
}
