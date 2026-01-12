/**
 * @file src/app/dashboard/weekly-report/summary/[id]/page.tsx
 * @description
 * 주간보고 취합 상세 페이지입니다.
 * 왼쪽: 추진실적, 오른쪽: 실시예정으로 구분하여 표시합니다.
 *
 * 초보자 가이드:
 * 1. **URL**: /dashboard/weekly-report/summary/[id]
 * 2. **레이아웃**: 2단 그리드 (추진실적 | 실시예정)
 * 3. **컬럼**: 부서, 분류, 내용, 담당자, 추진일정, 상태
 *
 * @example
 * /dashboard/weekly-report/summary/abc123 → abc123 ID의 취합 보고서 표시
 */

"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, useToast } from "@/components/ui";
import { useWeeklySummary, useAnalyzeWeeklySummary } from "@/hooks";
import { MemberSummaryData } from "@/lib/api";
import { SummaryTable } from "../components";
import {
  SummaryItem,
  mapWorkCategoryToSummary,
  mapProgressToStatus,
} from "../types";
import { formatDate } from "../../constants";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * 주간보고 취합 상세 페이지
 */
export default function SummaryDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();

  // 취합 보고서 조회
  const { data: summary, isLoading, error } = useWeeklySummary(id);
  const analyzeMutation = useAnalyzeWeeklySummary();

  // 추진실적 데이터 변환
  const previousItems: SummaryItem[] = useMemo(() => {
    if (!summary?.memberSummaries) return [];

    const items: SummaryItem[] = [];
    (summary.memberSummaries as MemberSummaryData[]).forEach((member) => {
      member.previousResults.forEach((result, idx) => {
        items.push({
          id: `${member.memberId}-prev-${idx}`,
          department: "-", // TODO: 부서 정보가 없으면 기본값
          category: mapWorkCategoryToSummary(result.category),
          content: result.title + (result.description ? ` - ${result.description}` : ""),
          assignee: member.memberName,
          schedule: "-", // 추진실적은 일정 없음
          status: mapProgressToStatus(result.isCompleted, result.progress),
          progress: result.progress,
        });
      });
    });

    return items;
  }, [summary?.memberSummaries]);

  // 실시예정 데이터 변환
  const nextItems: SummaryItem[] = useMemo(() => {
    if (!summary?.memberSummaries) return [];

    const items: SummaryItem[] = [];
    (summary.memberSummaries as MemberSummaryData[]).forEach((member) => {
      member.nextPlans.forEach((plan, idx) => {
        items.push({
          id: `${member.memberId}-next-${idx}`,
          department: "-", // TODO: 부서 정보가 없으면 기본값
          category: mapWorkCategoryToSummary(plan.category),
          content: plan.title + (plan.description ? ` - ${plan.description}` : ""),
          assignee: member.memberName,
          schedule: plan.targetDate ? formatDate(plan.targetDate) : "-",
          status: "NOT_STARTED", // 실시예정은 기본 미착수
        });
      });
    });

    return items;
  }, [summary?.memberSummaries]);

  /** 뒤로가기 */
  const handleBack = () => {
    router.push("/dashboard/weekly-report");
  };

  /** AI 재분석 */
  const handleReanalyze = async () => {
    if (!summary) return;
    try {
      await analyzeMutation.mutateAsync(summary.id);
      toast.success("AI 분석이 완료되었습니다.");
    } catch (err) {
      toast.error("AI 분석에 실패했습니다.");
    }
  };

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <Icon name="error" size="xl" className="text-error mb-4" />
            <p className="text-error mb-4">취합 보고서를 불러오는데 실패했습니다.</p>
            <Button variant="outline" leftIcon="arrow_back" onClick={handleBack}>
              목록으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" leftIcon="arrow_back" onClick={handleBack}>
              뒤로
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Icon name="summarize" className="text-[#00f3ff]" />
                <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
                  WEEKLY SUMMARY
                </span>
                <span className="text-slate-400 text-sm font-normal ml-1">
                  / 주간보고 취합
                </span>
              </h1>
              {summary && (
                <p className="text-text-secondary mt-1">
                  {summary.year}년 {summary.weekNumber}주차 •{" "}
                  {new Date(summary.weekStart).toLocaleDateString("ko-KR")} ~{" "}
                  {new Date(summary.weekEnd).toLocaleDateString("ko-KR")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {summary && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Icon name="group" size="sm" className="text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {summary.memberIds.length}명 취합
                  </span>
                </div>
                <Button
                  variant="outline"
                  leftIcon="auto_awesome"
                  onClick={handleReanalyze}
                  disabled={analyzeMutation.isPending}
                >
                  {analyzeMutation.isPending ? "분석 중..." : "AI 재분석"}
                </Button>
                <Button variant="outline" leftIcon="download">
                  엑셀 다운로드
                </Button>
                <Button variant="outline" leftIcon="print">
                  인쇄
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 요약 정보 카드 */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 제목 카드 */}
            <div className="col-span-2 lg:col-span-3 bg-gradient-to-br from-primary/10 to-info/10 border border-primary/20 rounded-xl p-4">
              <h2 className="font-semibold text-text dark:text-white text-lg">
                {summary.title}
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                생성일: {new Date(summary.createdAt).toLocaleDateString("ko-KR")} •
                작성자: {summary.createdBy?.name || summary.createdBy?.email}
              </p>
            </div>

            {/* 추진실적 건수 */}
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center gap-2">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="task_alt" className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{previousItems.length}</p>
                  <p className="text-xs text-text-secondary">추진실적</p>
                </div>
              </div>
            </div>

            {/* 실시예정 건수 */}
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center gap-2">
                <div className="size-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Icon name="event_upcoming" className="text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-info">{nextItems.length}</p>
                  <p className="text-xs text-text-secondary">실시예정</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2단 테이블 레이아웃 */}
        <div className="flex gap-6 min-h-[500px]">
          {/* 왼쪽: 추진실적 */}
          <SummaryTable type="previous" items={previousItems} isLoading={isLoading} />

          {/* 오른쪽: 실시예정 */}
          <SummaryTable type="next" items={nextItems} isLoading={isLoading} />
        </div>

        {/* AI 분석 결과 */}
        {summary && (
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-warning/10 to-primary/10 border-b border-border dark:border-border-dark">
              <h3 className="font-semibold text-text dark:text-white flex items-center gap-2">
                <Icon name="auto_awesome" className="text-warning" />
                AI 분석 결과
              </h3>
              {summary.llmAnalyzedAt && (
                <span className="text-xs text-text-secondary">
                  분석일: {new Date(summary.llmAnalyzedAt).toLocaleString("ko-KR")}
                </span>
              )}
            </div>

            <div className="p-4">
              {summary.llmSummary ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-text dark:text-white"
                  dangerouslySetInnerHTML={{ __html: formatLlmMarkdown(summary.llmSummary) }}
                />
              ) : (
                <div className="text-center py-8">
                  <Icon
                    name="auto_awesome"
                    size="xl"
                    className="text-text-secondary opacity-50 mb-2"
                  />
                  <p className="text-text-secondary mb-4">
                    AI 분석이 아직 실행되지 않았습니다
                  </p>
                  <Button
                    variant="primary"
                    leftIcon="auto_awesome"
                    onClick={handleReanalyze}
                    disabled={analyzeMutation.isPending}
                  >
                    {analyzeMutation.isPending ? "분석 중..." : "AI 분석 실행"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * LLM 마크다운을 HTML로 변환
 */
function formatLlmMarkdown(text: string): string {
  return text
    .replace(/### (.*?)$/gm, '<h4 class="font-semibold mt-3 mb-1">$1</h4>')
    .replace(/## (.*?)$/gm, '<h3 class="font-bold mt-4 mb-2 text-lg">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/- (.*?)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\n/g, "<br/>");
}
