/**
 * @file src/app/dashboard/weekly-report/components/SummaryPanel.tsx
 * @description
 * 주간보고 취합 리스트 패널 컴포넌트입니다.
 * 페이지 우측에 표시되며 생성된 취합 보고서 목록을 보여줍니다.
 *
 * 초보자 가이드:
 * 1. **취합 목록**: 프로젝트별 취합 보고서 리스트
 * 2. **LLM 분석**: 분석 완료 여부 표시
 * 3. **상세 보기**: 클릭 시 취합 페이지로 이동
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, ConfirmModal, useToast } from "@/components/ui";
import { WeeklySummary } from "@/lib/api";
import { useWeeklySummaries, useDeleteWeeklySummary } from "@/hooks";

interface SummaryPanelProps {
  /** 프로젝트 ID */
  projectId: string;
  /** 취합 보고서 클릭 핸들러 (레거시, 선택적) */
  onSelectSummary?: (summary: WeeklySummary) => void;
  /** 새 취합 생성 클릭 핸들러 */
  onCreateNew: () => void;
}

/**
 * 주간보고 취합 리스트 패널
 */
export function SummaryPanel({
  projectId,
  onSelectSummary,
  onCreateNew,
}: SummaryPanelProps) {
  const router = useRouter();
  const toast = useToast();

  // 취합 보고서 필터 메모이제이션 (불필요한 쿼리 재실행 방지)
  const summaryFilters = useMemo(
    () => ({ projectId }),
    [projectId]
  );

  const { data: summaries = [], isLoading } = useWeeklySummaries(summaryFilters);
  const deleteSummary = useDeleteWeeklySummary();

  /** 취합 보고서 클릭 - 상세 페이지로 이동 */
  const handleSelectSummary = (summary: WeeklySummary) => {
    // 페이지로 이동
    router.push(`/dashboard/weekly-report/summary/${summary.id}`);
    // 레거시 콜백 호출 (필요한 경우)
    onSelectSummary?.(summary);
  };

  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingSummaryId, setDeletingSummaryId] = useState<string | null>(null);
  const [deletingSummaryTitle, setDeletingSummaryTitle] = useState("");

  /** 삭제 핸들러 - 확인 모달 표시 */
  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setDeletingSummaryId(id);
    setDeletingSummaryTitle(title);
    setShowDeleteConfirm(true);
  };

  /** 삭제 확인 */
  const handleConfirmDelete = async () => {
    if (!deletingSummaryId) return;

    try {
      await deleteSummary.mutateAsync(deletingSummaryId);
      toast.success("취합 보고서가 삭제되었습니다.");
    } catch (error) {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setShowDeleteConfirm(false);
      setDeletingSummaryId(null);
      setDeletingSummaryTitle("");
    }
  };

  return (
    <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-border dark:border-border-dark">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text dark:text-white flex items-center gap-2">
            <Icon name="summarize" size="sm" className="text-primary" />
            취합 보고서
          </h3>
          <Button
            variant="primary"
            size="sm"
            leftIcon="add"
            onClick={onCreateNew}
          >
            새 취합
          </Button>
        </div>
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : summaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
            <Icon name="folder_open" size="lg" className="mb-2 opacity-50" />
            <p className="text-sm">취합 보고서가 없습니다</p>
            <p className="text-xs mt-1">주간보고를 선택하여 취합하세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {summaries.map((summary) => (
              <div
                key={summary.id}
                onClick={() => handleSelectSummary(summary)}
                className="p-3 rounded-lg bg-background dark:bg-background-dark hover:bg-primary/5 border border-transparent hover:border-primary/20 cursor-pointer transition-all group"
              >
                {/* 제목 */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-text dark:text-white line-clamp-2">
                    {summary.title}
                  </h4>
                  <button
                    onClick={(e) => handleDelete(e, summary.id, summary.title)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-error rounded transition-all"
                    title="삭제"
                  >
                    <Icon name="delete" size="xs" />
                  </button>
                </div>

                {/* 주차 정보 */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-secondary">
                    {summary.year}년 {summary.weekNumber}주차
                  </span>
                  <span className="text-xs text-text-secondary">•</span>
                  <span className="text-xs text-text-secondary">
                    {summary.memberIds.length}명
                  </span>
                </div>

                {/* LLM 분석 상태 */}
                <div className="flex items-center gap-2 mt-2">
                  {summary.llmAnalyzedAt ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">
                      <Icon name="auto_awesome" size="xs" />
                      AI 분석 완료
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-text-secondary">
                      <Icon name="pending" size="xs" />
                      분석 대기
                    </span>
                  )}
                </div>

                {/* 생성자/생성일 */}
                <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
                  {summary.createdBy?.avatar ? (
                    <img
                      src={summary.createdBy.avatar}
                      alt={summary.createdBy.name || ""}
                      className="size-4 rounded-full object-cover"
                    />
                  ) : (
                    <Icon name="person" size="xs" />
                  )}
                  <span>{summary.createdBy?.name || summary.createdBy?.email}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="취합 보고서 삭제"
        message={`"${deletingSummaryTitle}" 취합 보고서를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingSummaryId(null);
          setDeletingSummaryTitle("");
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteSummary.isPending}
      />
    </div>
  );
}
