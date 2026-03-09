/**
 * @file src/app/dashboard/weekly-report/components/SummaryModal.tsx
 * @description
 * 주간보고 취합 모달 컴포넌트입니다.
 * 취합 보고서 생성 및 상세 보기를 지원합니다.
 *
 * 초보자 가이드:
 * 1. **생성 모드**: 주간보고 선택 → 취합 → LLM 분석
 * 2. **상세 모드**: 멤버별 실적/계획, LLM 분석 결과 표시
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { Icon, Button, useToast } from "@/components/ui";
import { WeeklySummary, WeeklyReport, MemberSummaryData } from "@/lib/api";
import {
  useWeeklyReports,
  useWeeklySummaries,
  useCreateWeeklySummary,
  useUpdateWeeklySummary,
  useAnalyzeWeeklySummary,
  useCurrentUser,
} from "@/hooks";
import { useProject } from "@/contexts";
import { getProjectWeekDateRange, formatShortDate } from "../constants";

interface SummaryModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 */
  onClose: () => void;
  /** 프로젝트 ID */
  projectId: string;
  /** 상세 보기 모드의 취합 보고서 (null이면 생성 모드) */
  summary?: WeeklySummary | null;
  /** 현재 주차 정보 */
  weekInfo: {
    year: number;
    week: number;
    weekStart: Date;
    weekEnd: Date;
  };
}

/**
 * 주간보고 취합 모달
 */
export function SummaryModal({
  isOpen,
  onClose,
  projectId,
  summary,
  weekInfo,
}: SummaryModalProps) {
  const { data: user } = useCurrentUser();
  const { selectedProject } = useProject();
  const toast = useToast();
  const isDetailMode = !!summary;

  // 선택된 주차 상태 (생성 모드에서 변경 가능)
  const [selectedWeek, setSelectedWeek] = useState(weekInfo.week);
  const [selectedYear, setSelectedYear] = useState(weekInfo.year);

  // 모달 열릴 때 현재 주차로 초기화
  useEffect(() => {
    if (isOpen && !isDetailMode) {
      setSelectedWeek(weekInfo.week);
      setSelectedYear(weekInfo.year);
      setSelectedReportIds([]);
      setTitle(`${weekInfo.year}년 ${weekInfo.week}주차 주간보고 취합`);
    }
  }, [isOpen]);

  // 선택된 주차의 날짜 범위 계산
  const selectedWeekRange = useMemo(() => {
    if (!selectedProject?.startDate) return null;
    return getProjectWeekDateRange(new Date(selectedProject.startDate), selectedWeek);
  }, [selectedProject?.startDate, selectedWeek]);

  // 생성 모드 상태
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [title, setTitle] = useState(
    `${weekInfo.year}년 ${weekInfo.week}주차 주간보고 취합`
  );

  // 주차 변경 핸들러
  const handlePrevWeek = () => {
    if (selectedWeek <= 1) return;
    const newWeek = selectedWeek - 1;
    setSelectedWeek(newWeek);
    setSelectedReportIds([]);
    setTitle(`${selectedYear}년 ${newWeek}주차 주간보고 취합`);
  };

  const handleNextWeek = () => {
    if (selectedWeek >= weekInfo.week) return;
    const newWeek = selectedWeek + 1;
    setSelectedWeek(newWeek);
    setSelectedReportIds([]);
    setTitle(`${selectedYear}년 ${newWeek}주차 주간보고 취합`);
  };

  // 주간보고 필터 메모이제이션 (불필요한 쿼리 재실행 방지)
  const reportFilters = useMemo(
    () => ({
      projectId,
      year: String(selectedYear),
      weekNumber: String(selectedWeek),
    }),
    [projectId, selectedYear, selectedWeek]
  );

  // 취합 보고서 필터 (해당 주차 기존 취합 확인용)
  const summaryFilters = useMemo(
    () => ({ projectId, year: selectedYear, weekNumber: selectedWeek }),
    [projectId, selectedYear, selectedWeek]
  );

  // API 훅
  const { data: reports = [] } = useWeeklyReports(reportFilters);
  const { data: existingSummaries = [] } = useWeeklySummaries(summaryFilters);
  const createSummary = useCreateWeeklySummary();
  const updateSummary = useUpdateWeeklySummary();
  const analyzeSummary = useAnalyzeWeeklySummary();

  // 해당 주차에 이미 취합이 존재하는지 확인
  const existingSummary = useMemo(
    () => existingSummaries.length > 0 ? existingSummaries[0] : null,
    [existingSummaries]
  );
  const isReAggregate = !isDetailMode && !!existingSummary;

  // 제출된 보고서만 필터링
  const submittedReports = useMemo(
    () => reports.filter((r) => r.status === "SUBMITTED"),
    [reports]
  );

  /** 체크박스 토글 */
  const handleToggleReport = (reportId: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  };

  /** 전체 선택/해제 */
  const handleToggleAll = () => {
    if (selectedReportIds.length === submittedReports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(submittedReports.map((r) => r.id));
    }
  };

  /** 취합/재취합 실행 */
  const handleCreate = async () => {
    if (!user || selectedReportIds.length === 0) return;

    try {
      let summaryId: string;

      if (isReAggregate && existingSummary) {
        // 재취합: 기존 취합 보고서 업데이트
        const updated = await updateSummary.mutateAsync({
          id: existingSummary.id,
          data: { title, reportIds: selectedReportIds },
        });
        summaryId = updated.id;
        toast.success("취합 보고서가 재취합되었습니다.");
      } else {
        // 신규 취합
        const weekStart = selectedWeekRange?.start || weekInfo.weekStart;
        const weekEnd = selectedWeekRange?.end || weekInfo.weekEnd;

        const newSummary = await createSummary.mutateAsync({
          projectId,
          year: selectedYear,
          weekNumber: selectedWeek,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          title,
          reportIds: selectedReportIds,
          createdById: user.id,
        });
        summaryId = newSummary.id;
      }

      // 취합 후 LLM 분석 실행
      await analyzeSummary.mutateAsync(summaryId);

      setSelectedReportIds([]);
      onClose();
    } catch (error) {
      console.error("Failed to create/update summary:", error);
      toast.error(isReAggregate ? "재취합에 실패했습니다." : "취합 보고서 생성에 실패했습니다.");
    }
  };

  /** LLM 재분석 */
  const handleReanalyze = async () => {
    if (!summary) return;
    try {
      await analyzeSummary.mutateAsync(summary.id);
    } catch (error) {
      console.error("Failed to analyze:", error);
      toast.error("분석에 실패했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text dark:text-white flex items-center gap-2">
            <Icon name="summarize" className="text-primary" />
            {isDetailMode ? "취합 보고서 상세" : isReAggregate ? "주간보고 재취합" : "주간보고 취합"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text dark:hover:text-white rounded"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          {isDetailMode ? (
            // === 상세 보기 모드 ===
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="bg-surface dark:bg-background-dark rounded-lg p-4">
                <h3 className="font-semibold text-text dark:text-white mb-3">
                  {summary.title}
                </h3>
                <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                  <span>
                    {summary.year}년 {summary.weekNumber}주차
                  </span>
                  <span>•</span>
                  <span>{summary.memberIds.length}명 취합</span>
                  <span>•</span>
                  <span>
                    {new Date(summary.createdAt).toLocaleDateString("ko-KR")} 생성
                  </span>
                </div>
              </div>

              {/* 멤버별 요약 */}
              <div>
                <h4 className="font-semibold text-text dark:text-white mb-3 flex items-center gap-2">
                  <Icon name="group" size="sm" className="text-primary" />
                  멤버별 업무 현황
                </h4>
                <div className="space-y-4">
                  {(summary.memberSummaries as MemberSummaryData[] | null)?.map(
                    (member) => (
                      <div
                        key={member.memberId}
                        className="bg-surface dark:bg-background-dark rounded-lg p-4"
                      >
                        <h5 className="font-medium text-text dark:text-white mb-3">
                          {member.memberName}
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 전주 실적 */}
                          <div>
                            <p className="text-xs font-medium text-primary mb-2">
                              전주 실적
                            </p>
                            {member.previousResults.length > 0 ? (
                              <ul className="space-y-1 text-sm text-text dark:text-white">
                                {member.previousResults.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span
                                      className={`mt-1 ${
                                        item.isCompleted
                                          ? "text-success"
                                          : "text-warning"
                                      }`}
                                    >
                                      {item.isCompleted ? "✓" : "○"}
                                    </span>
                                    <span>
                                      [{item.category}] {item.title}
                                      <span className="text-text-secondary ml-1">
                                        ({item.progress}%)
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-text-secondary">
                                등록된 실적 없음
                              </p>
                            )}
                          </div>
                          {/* 차주 계획 */}
                          <div>
                            <p className="text-xs font-medium text-info mb-2">
                              차주 계획
                            </p>
                            {member.nextPlans.length > 0 ? (
                              <ul className="space-y-1 text-sm text-text dark:text-white">
                                {member.nextPlans.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-info mt-1">→</span>
                                    <span>
                                      [{item.category}] {item.title}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-text-secondary">
                                등록된 계획 없음
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* LLM 분석 결과 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-text dark:text-white flex items-center gap-2">
                    <Icon name="auto_awesome" size="sm" className="text-warning" />
                    AI 분석 결과
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon="refresh"
                    onClick={handleReanalyze}
                    disabled={analyzeSummary.isPending}
                  >
                    {analyzeSummary.isPending ? "분석 중..." : "재분석"}
                  </Button>
                </div>
                {summary.llmSummary ? (
                  <div className="bg-gradient-to-r from-warning/5 to-primary/5 rounded-lg p-4 border border-warning/20">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-text dark:text-white"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(summary.llmSummary) }}
                    />
                  </div>
                ) : (
                  <div className="bg-surface dark:bg-background-dark rounded-lg p-8 text-center">
                    <Icon
                      name="auto_awesome"
                      size="xl"
                      className="text-text-secondary mb-2 opacity-50"
                    />
                    <p className="text-text-secondary">
                      AI 분석이 아직 실행되지 않았습니다
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon="auto_awesome"
                      className="mt-3"
                      onClick={handleReanalyze}
                      disabled={analyzeSummary.isPending}
                    >
                      {analyzeSummary.isPending ? "분석 중..." : "AI 분석 실행"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // === 생성 모드 ===
            <div className="space-y-4">
              {/* 주차 선택기 */}
              <div className="flex items-center justify-center gap-3 p-3 bg-surface dark:bg-background-dark rounded-lg">
                <button
                  onClick={handlePrevWeek}
                  disabled={selectedWeek <= 1}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="이전 주"
                >
                  <Icon name="chevron_left" size="sm" />
                </button>
                <div className="text-center min-w-[200px]">
                  <p className="text-sm font-semibold text-text dark:text-white">
                    {selectedYear}년 {selectedWeek}주차
                    {selectedWeek === weekInfo.week && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        이번 주
                      </span>
                    )}
                  </p>
                  {selectedWeekRange && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      {formatShortDate(selectedWeekRange.start)} ~ {formatShortDate(selectedWeekRange.end)}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleNextWeek}
                  disabled={selectedWeek >= weekInfo.week}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="다음 주"
                >
                  <Icon name="chevron_right" size="sm" />
                </button>
              </div>

              {/* 재취합 안내 배너 */}
              {isReAggregate && existingSummary && (
                <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <Icon name="info" size="sm" className="text-warning shrink-0" />
                  <p className="text-sm text-warning">
                    이 주차에 이미 취합 보고서가 있습니다. 재취합 시 기존 데이터가 업데이트됩니다.
                  </p>
                </div>
              )}

              {/* 제목 입력 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  취합 보고서 제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                  placeholder="예: 2026년 2주차 주간보고 취합"
                />
              </div>

              {/* 주간보고 선택 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text dark:text-white">
                    취합할 주간보고 선택
                  </label>
                  <button
                    onClick={handleToggleAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {selectedReportIds.length === submittedReports.length
                      ? "전체 해제"
                      : "전체 선택"}
                  </button>
                </div>

                {submittedReports.length === 0 ? (
                  <div className="bg-surface dark:bg-background-dark rounded-lg p-8 text-center">
                    <Icon
                      name="description"
                      size="xl"
                      className="text-text-secondary mb-2 opacity-50"
                    />
                    <p className="text-text-secondary">
                      {selectedYear}년 {selectedWeek}주차에 제출된 주간보고가 없습니다
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {submittedReports.map((report) => (
                      <label
                        key={report.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedReportIds.includes(report.id)
                            ? "bg-primary/5 border-primary/30"
                            : "bg-surface dark:bg-background-dark border-border dark:border-border-dark hover:border-primary/20"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedReportIds.includes(report.id)}
                          onChange={() => handleToggleReport(report.id)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {report.user?.avatar ? (
                            <img
                              src={report.user.avatar}
                              alt={report.user.name || ""}
                              className="size-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <Icon name="person" size="sm" className="text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text dark:text-white truncate">
                              {report.user?.name || report.user?.email}
                            </p>
                            <p className="text-xs text-text-secondary">
                              제출: {new Date(report.submittedAt || report.updatedAt).toLocaleDateString("ko-KR")}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                          제출완료
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 p-4 border-t border-border dark:border-border-dark">
          <Button variant="outline" onClick={onClose}>
            {isDetailMode ? "닫기" : "취소"}
          </Button>
          {!isDetailMode && (
            <Button
              variant="primary"
              leftIcon="auto_awesome"
              onClick={handleCreate}
              disabled={
                selectedReportIds.length === 0 ||
                !title.trim() ||
                createSummary.isPending ||
                updateSummary.isPending ||
                analyzeSummary.isPending
              }
            >
              {createSummary.isPending || updateSummary.isPending || analyzeSummary.isPending
                ? "처리 중..."
                : isReAggregate
                  ? `${selectedReportIds.length}건 재취합 및 분석`
                  : `${selectedReportIds.length}건 취합 및 분석`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 마크다운을 간단한 HTML로 변환
 */
function formatMarkdown(text: string): string {
  return text
    .replace(/### (.*?)$/gm, '<h4 class="font-semibold mt-3 mb-1">$1</h4>')
    .replace(/## (.*?)$/gm, '<h3 class="font-bold mt-4 mb-2 text-lg">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/- (.*?)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\n/g, '<br/>');
}
