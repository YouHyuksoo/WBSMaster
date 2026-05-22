/**
 * @file src/app/dashboard/progress-risk/components/RiskIssueTab/index.tsx
 * @description 리스크 이슈 탭 메인 — KPI / 필터 / 카드 그리드 / 등록 모달
 *
 * 초보자 가이드:
 * 1. **KPI 4장**: 미해결/일정리스크/에스컬레이션/해결완료 카운트
 * 2. **필터 바**: 카테고리 + 대분류 (서버) + 상태 + 검색 (클라이언트)
 * 3. **카드 그리드**: 1열(좁은 화면) / 2열(xl 이상), 각 카드 인라인 편집
 * 4. **등록 모달**: 우측 상단 "이슈 등록" 버튼으로 트리거
 */
"use client";

import { useMemo, useState } from "react";
import { Icon, useToast } from "@/components/ui";
import {
  useDeleteProgressRiskIssue,
  useProgressRiskIssues,
  useUpdateProgressRiskIssue,
} from "@/hooks";
import type { ProgressRiskIssue, ProgressTask, StageCategory } from "@/lib/api";
import { isOpenStatus } from "./constants";
import { RiskIssueCard } from "./RiskIssueCard";
import { RiskIssueCreateModal } from "./RiskIssueCreateModal";
import { RiskIssueFilters, type StatusFilter } from "./RiskIssueFilters";
import { RiskIssueKpiCards } from "./RiskIssueKpiCards";
import {
  getMajorCategoriesForStageCategory,
  mergeMajorCategoriesWithIssues,
} from "./riskIssueOptions";

const ALL_MAJOR = "__ALL__";

interface Props {
  projectId: string;
  tasks: ProgressTask[];
}

export function RiskIssueTab({ projectId, tasks }: Props) {
  const toast = useToast();
  const update = useUpdateProgressRiskIssue();
  const remove = useDeleteProgressRiskIssue();

  const [stageCategory, setStageCategory] = useState<StageCategory>("MES_SYSTEM");
  const [majorCategory, setMajorCategory] = useState<string>(ALL_MAJOR);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN_ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // 카테고리 안의 모든 이슈를 한 번에 가져와 클라이언트에서 대분류·상태·검색 필터링
  const { data: issues = [], isLoading } = useProgressRiskIssues({
    projectId,
    stageCategory,
  });

  const baseMajorCategories = useMemo(
    () => getMajorCategoriesForStageCategory(tasks, stageCategory),
    [tasks, stageCategory]
  );
  const majorCategories = useMemo(
    () => mergeMajorCategoriesWithIssues(baseMajorCategories, issues, stageCategory),
    [baseMajorCategories, issues, stageCategory]
  );

  const filteredIssues = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return issues.filter((issue) => {
      if (majorCategory !== ALL_MAJOR && issue.majorCategory !== majorCategory) return false;
      if (statusFilter === "OPEN_ALL" && !isOpenStatus(issue.status)) return false;
      if (statusFilter !== "ALL" && statusFilter !== "OPEN_ALL" && issue.status !== statusFilter) return false;
      if (!keyword) return true;
      return (
        issue.title.toLowerCase().includes(keyword) ||
        (issue.assignee ?? "").toLowerCase().includes(keyword) ||
        (issue.decisionMaker ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [issues, majorCategory, statusFilter, searchKeyword]);

  const patchIssue = (issue: ProgressRiskIssue, data: Partial<ProgressRiskIssue>) => {
    update.mutate({ id: issue.id, data });
  };

  const handleDelete = (issue: ProgressRiskIssue) => {
    if (!window.confirm(`"${issue.title}" 이슈를 삭제하시겠습니까?`)) return;
    remove.mutate(issue.id, {
      onSuccess: () => toast.success("리스크 이슈가 삭제되었습니다."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "삭제 실패"),
    });
  };

  return (
    <div className="space-y-4">
      <RiskIssueKpiCards issues={issues} />

      <RiskIssueFilters
        stageCategory={stageCategory}
        onStageCategoryChange={(value) => {
          setStageCategory(value);
          setMajorCategory(ALL_MAJOR);
        }}
        majorCategory={majorCategory}
        majorCategories={majorCategories}
        onMajorCategoryChange={setMajorCategory}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchKeyword={searchKeyword}
        onSearchKeywordChange={setSearchKeyword}
        filteredCount={filteredIssues.length}
        totalCount={issues.length}
        onCreateClick={() => setCreateModalOpen(true)}
      />

      {isLoading ? (
        <div className="rounded-xl border border-border bg-background-white p-12 text-center shadow-sm dark:border-border-dark dark:bg-surface-dark">
          <Icon name="progress_activity" size="lg" className="animate-spin text-primary mb-3" />
          <p className="text-sm text-text-secondary">불러오는 중...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <EmptyState hasAnyIssue={issues.length > 0} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filteredIssues.map((issue) => (
            <RiskIssueCard
              key={issue.id}
              issue={issue}
              onPatch={(data) => patchIssue(issue, data)}
              onDelete={() => handleDelete(issue)}
            />
          ))}
        </div>
      )}

      <RiskIssueCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        projectId={projectId}
        stageCategory={stageCategory}
        majorCategories={majorCategories}
        defaultMajorCategory={majorCategory === ALL_MAJOR ? (majorCategories[0] ?? "") : majorCategory}
        onStageCategoryChange={(value) => {
          setStageCategory(value);
          setMajorCategory(ALL_MAJOR);
        }}
      />
    </div>
  );
}

function EmptyState({ hasAnyIssue }: { hasAnyIssue: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background-white p-12 text-center shadow-sm dark:border-border-dark dark:bg-surface-dark">
      <Icon name={hasAnyIssue ? "filter_alt_off" : "shield_with_heart"} size="xl" className="text-text-secondary mb-3" />
      <p className="text-sm font-semibold text-text dark:text-white mb-1">
        {hasAnyIssue ? "조건에 맞는 이슈가 없습니다." : "등록된 리스크 이슈가 없습니다."}
      </p>
      <p className="text-xs text-text-secondary">
        {hasAnyIssue ? "상태 필터나 검색어를 변경해보세요." : "우측 상단 \"이슈 등록\"으로 시작하세요."}
      </p>
    </div>
  );
}
