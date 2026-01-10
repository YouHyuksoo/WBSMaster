/**
 * @file src/app/dashboard/chat/history/page.tsx
 * @description
 * AI 채팅 히스토리 및 분석 페이지입니다.
 * 사용자 피드백을 기반으로 AI 응답 품질을 분석합니다.
 *
 * 초보자 가이드:
 * 1. **통계 카드**: 전체 피드백 통계 (긍정/부정/중립)
 * 2. **필터**: 기간, 프로젝트, 평점으로 필터링
 * 3. **피드백 목록**: 사용자 질문과 AI 응답, 피드백 상세
 *
 * 수정 방법:
 * - 새 통계 추가: stats 섹션에 카드 추가
 * - 필터 추가: filterParams에 새 필터 추가
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon, Button, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useProject } from "@/contexts";
import Link from "next/link";

/**
 * 피드백 타입
 * 피드백 자체에 분석용 데이터가 저장되어 있어 chatHistory 삭제 후에도 조회 가능
 */
interface FeedbackItem {
  id: string;
  rating: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  comment: string | null;
  isSqlCorrect: boolean | null;
  isResponseHelpful: boolean | null;
  isChartUseful: boolean | null;
  tags: string[];
  createdAt: string;

  // ===== 분석용 데이터 (피드백 자체에 저장됨) =====
  userQuery: string | null;           // 사용자 질문
  llmResponse: string | null;         // LLM 전체 응답
  sqlQuery: string | null;            // 생성된 SQL
  chartType: string | null;           // 차트 타입
  chartData: Record<string, unknown> | null;  // 차트 데이터
  mindmapData: Record<string, unknown> | null; // 마인드맵 데이터
  processingTimeMs: number | null;    // 처리 시간
  sqlGenTimeMs: number | null;        // SQL 생성 시간
  sqlExecTimeMs: number | null;       // SQL 실행 시간
  projectId: string | null;           // 프로젝트 ID
  projectName: string | null;         // 프로젝트 이름
  personaId: string | null;           // 페르소나 ID
  personaName: string | null;         // 페르소나 이름

  // chatHistory는 삭제되어도 피드백은 유지되므로 nullable (참조용)
  chatHistory: {
    id: string;
    role: string;
    content: string;
    sqlQuery: string | null;
    chartType: string | null;
    userQuery: string | null;
    processingTimeMs: number | null;
    sqlGenTimeMs: number | null;
    sqlExecTimeMs: number | null;
    errorMessage: string | null;
    createdAt: string;
    project: {
      id: string;
      name: string;
    } | null;
  } | null;
}

/**
 * 통계 타입
 */
interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positiveRate: number;
  avgProcessingTimeMs: number;
  avgSqlGenTimeMs: number;
  avgSqlExecTimeMs: number;
}

/**
 * 채팅 히스토리/분석 페이지
 */
export default function ChatHistoryPage() {
  const toast = useToast();
  const { projects } = useProject();

  // 상태
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 필터 상태
  const [filterRating, setFilterRating] = useState<string>("");
  const [filterProjectId, setFilterProjectId] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // 페이지네이션
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  // 상세 보기 토글
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 선택 삭제용 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"selected" | "all" | "single">("selected");
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * 피드백 목록 로드
   */
  const loadFeedbacks = useCallback(async (reset = false) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("limit", String(LIMIT));
      params.append("offset", String(reset ? 0 : offset));
      params.append("includeStats", "true");

      if (filterRating) params.append("rating", filterRating);
      if (filterProjectId) params.append("projectId", filterProjectId);
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);

      const res = await fetch(`/api/chat/feedback?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setFeedbacks(data.feedbacks);
          setOffset(LIMIT);
        } else {
          setFeedbacks((prev) => [...prev, ...data.feedbacks]);
          setOffset((prev) => prev + LIMIT);
        }
        setStats(data.stats);
        setHasMore(data.pagination.hasMore);
      }
    } catch (error) {
      console.error("피드백 로드 실패:", error);
      toast.error("피드백을 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [offset, filterRating, filterProjectId, filterStartDate, filterEndDate, toast]);

  // 초기 로드
  useEffect(() => {
    loadFeedbacks(true);
  }, [filterRating, filterProjectId, filterStartDate, filterEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 상세 토글
   */
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * 선택 토글
   */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * 전체 선택/해제
   */
  const toggleSelectAll = () => {
    if (selectedIds.size === feedbacks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(feedbacks.map((f) => f.id)));
    }
  };

  /**
   * 단일 삭제 모달 열기
   */
  const openSingleDeleteModal = (id: string) => {
    setSingleDeleteId(id);
    setDeleteTarget("single");
    setShowDeleteModal(true);
  };

  /**
   * 선택 삭제 모달 열기
   */
  const openSelectedDeleteModal = () => {
    if (selectedIds.size === 0) {
      toast.error("삭제할 항목을 선택해주세요.");
      return;
    }
    setDeleteTarget("selected");
    setShowDeleteModal(true);
  };

  /**
   * 전체 삭제 모달 열기
   */
  const openAllDeleteModal = () => {
    setDeleteTarget("all");
    setShowDeleteModal(true);
  };

  /**
   * 삭제 실행
   */
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const params = new URLSearchParams();

      if (deleteTarget === "single" && singleDeleteId) {
        params.append("id", singleDeleteId);
      } else if (deleteTarget === "selected") {
        params.append("ids", Array.from(selectedIds).join(","));
      } else if (deleteTarget === "all") {
        params.append("all", "true");
        if (filterProjectId) params.append("projectId", filterProjectId);
        if (filterRating) params.append("rating", filterRating);
      }

      const res = await fetch(`/api/chat/feedback?${params.toString()}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.deletedCount}개 피드백이 삭제되었습니다.`);
        setSelectedIds(new Set());
        setSingleDeleteId(null);
        loadFeedbacks(true);
      } else {
        const error = await res.json();
        toast.error(error.error || "삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  /**
   * 평점 배지 색상
   */
  const getRatingStyle = (rating: string) => {
    switch (rating) {
      case "POSITIVE":
        return "bg-emerald-500/20 text-emerald-500";
      case "NEGATIVE":
        return "bg-rose-500/20 text-rose-500";
      default:
        return "bg-slate-500/20 text-slate-500";
    }
  };

  /**
   * 평점 라벨
   */
  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case "POSITIVE":
        return "긍정";
      case "NEGATIVE":
        return "부정";
      default:
        return "중립";
    }
  };

  /**
   * 시간 포맷팅
   */
  const formatTime = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * 날짜 포맷팅
   */
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto bg-background dark:bg-background-dark">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/chat">
            <Button variant="ghost" size="sm" leftIcon="arrow_back">
              채팅으로 돌아가기
            </Button>
          </Link>
          <div className="w-px h-6 bg-border dark:bg-border-dark" />
          <div>
            <h1 className="text-2xl font-bold text-text dark:text-white">채팅 분석</h1>
            <p className="text-sm text-text-secondary">AI 응답 품질 및 피드백 분석</p>
          </div>
        </div>

        {/* 삭제 버튼 영역 */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon="delete"
              onClick={openSelectedDeleteModal}
              className="text-error border-error hover:bg-error/10"
            >
              선택 삭제 ({selectedIds.size})
            </Button>
          )}
          {feedbacks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon="delete_sweep"
              onClick={openAllDeleteModal}
              className="text-text-secondary hover:text-error"
            >
              전체 삭제
            </Button>
          )}
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-text-secondary mb-1">전체 피드백</div>
            <div className="text-2xl font-bold text-text dark:text-white">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-text-secondary mb-1">긍정률</div>
            <div className="text-2xl font-bold text-emerald-500">{stats.positiveRate}%</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1 text-sm text-text-secondary mb-1">
              <Icon name="thumb_up" size="xs" className="text-emerald-500" />
              긍정
            </div>
            <div className="text-2xl font-bold text-emerald-500">{stats.positive}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1 text-sm text-text-secondary mb-1">
              <Icon name="thumb_down" size="xs" className="text-rose-500" />
              부정
            </div>
            <div className="text-2xl font-bold text-rose-500">{stats.negative}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-text-secondary mb-1">평균 처리시간</div>
            <div className="text-2xl font-bold text-primary">{formatTime(stats.avgProcessingTimeMs)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-text-secondary mb-1">평균 SQL 실행</div>
            <div className="text-2xl font-bold text-sky-500">{formatTime(stats.avgSqlExecTimeMs)}</div>
          </Card>
        </div>
      )}

      {/* 필터 */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Icon name="filter_alt" size="sm" className="text-text-secondary" />
            <span className="text-sm font-medium text-text dark:text-white">필터</span>
          </div>

          {/* 평점 필터 */}
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm"
          >
            <option value="">전체 평점</option>
            <option value="POSITIVE">긍정</option>
            <option value="NEGATIVE">부정</option>
            <option value="NEUTRAL">중립</option>
          </select>

          {/* 프로젝트 필터 */}
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm"
          >
            <option value="">전체 프로젝트</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {/* 기간 필터 */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm"
            />
            <span className="text-text-secondary">~</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm"
            />
          </div>

          {/* 필터 초기화 */}
          {(filterRating || filterProjectId || filterStartDate || filterEndDate) && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon="refresh"
              onClick={() => {
                setFilterRating("");
                setFilterProjectId("");
                setFilterStartDate("");
                setFilterEndDate("");
              }}
            >
              초기화
            </Button>
          )}

          {/* 전체 선택 */}
          {feedbacks.length > 0 && (
            <>
              <div className="w-px h-6 bg-border dark:bg-border-dark" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === feedbacks.length && feedbacks.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-text-secondary">전체 선택</span>
              </label>
            </>
          )}
        </div>
      </Card>

      {/* 피드백 목록 */}
      <div className="space-y-4">
        {isLoading && feedbacks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="progress_activity" size="lg" className="text-primary animate-spin" />
          </div>
        ) : feedbacks.length === 0 ? (
          <Card className="p-12 text-center">
            <Icon name="feedback" size="lg" className="text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text dark:text-white mb-2">피드백이 없습니다</h3>
            <p className="text-text-secondary">AI 응답에 피드백을 남겨보세요.</p>
          </Card>
        ) : (
          feedbacks.map((feedback) => (
            <Card key={feedback.id} className="overflow-hidden">
              {/* 헤더 */}
              <div className="flex items-center justify-between p-4 hover:bg-surface/50 dark:hover:bg-surface-dark/50 transition-colors">
                <div className="flex items-center gap-3">
                  {/* 체크박스 */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(feedback.id)}
                    onChange={() => toggleSelect(feedback.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />

                  {/* 클릭 영역 (펼치기용) */}
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => toggleExpand(feedback.id)}
                  >
                    {/* 평점 배지 */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRatingStyle(feedback.rating)}`}>
                      {getRatingLabel(feedback.rating)}
                    </span>

                    {/* 질문 요약 (피드백 자체 데이터 우선 사용) */}
                    <span className="text-text dark:text-white font-medium truncate max-w-md">
                      {feedback.userQuery || feedback.chatHistory?.userQuery || "질문 없음"}
                    </span>

                    {/* 프로젝트 (피드백 자체 데이터 우선 사용) */}
                    {(feedback.projectName || feedback.chatHistory?.project) && (
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {feedback.projectName || feedback.chatHistory?.project?.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* 처리 시간 (피드백 자체 데이터 우선 사용) */}
                  <span className="text-xs text-text-secondary">
                    {formatTime(feedback.processingTimeMs || feedback.chatHistory?.processingTimeMs || null)}
                  </span>

                  {/* 날짜 */}
                  <span className="text-xs text-text-secondary">
                    {formatDate(feedback.createdAt)}
                  </span>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openSingleDeleteModal(feedback.id);
                    }}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                    title="삭제"
                  >
                    <Icon name="delete" size="sm" />
                  </button>

                  {/* 펼치기 아이콘 */}
                  <button
                    onClick={() => toggleExpand(feedback.id)}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Icon
                      name={expandedIds.has(feedback.id) ? "expand_less" : "expand_more"}
                      size="sm"
                    />
                  </button>
                </div>
              </div>

              {/* 상세 내용 */}
              {expandedIds.has(feedback.id) && (
                <div className="p-4 pt-0 border-t border-border dark:border-border-dark">
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    {/* 사용자 질문 (피드백 자체 데이터 우선 사용) */}
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1">
                        <Icon name="person" size="xs" /> 사용자 질문
                      </h4>
                      <div className="p-3 rounded-lg bg-primary/10 text-text dark:text-white text-sm whitespace-pre-wrap">
                        {feedback.userQuery || feedback.chatHistory?.userQuery || "N/A"}
                      </div>
                    </div>

                    {/* AI 응답 (피드백 자체 데이터 우선 사용, 전체 표시) */}
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1">
                        <Icon name="smart_toy" size="xs" /> AI 응답
                      </h4>
                      <div className="p-3 rounded-lg bg-surface dark:bg-surface-dark text-text dark:text-white text-sm max-h-96 overflow-y-auto whitespace-pre-wrap">
                        {feedback.llmResponse || feedback.chatHistory?.content || "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* SQL 쿼리 (피드백 자체 데이터 우선 사용) */}
                  {(feedback.sqlQuery || feedback.chatHistory?.sqlQuery) && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1">
                        <Icon name="code" size="xs" /> 생성된 SQL
                      </h4>
                      <pre className="p-3 rounded-lg bg-background-dark text-green-400 text-xs overflow-x-auto">
                        {feedback.sqlQuery || feedback.chatHistory?.sqlQuery}
                      </pre>
                    </div>
                  )}

                  {/* 차트 데이터 (피드백 자체에 저장된 데이터) */}
                  {feedback.chartData && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1">
                        <Icon name="bar_chart" size="xs" /> 차트 데이터
                      </h4>
                      <pre className="p-3 rounded-lg bg-sky-950/50 text-sky-300 text-xs overflow-x-auto max-h-48 overflow-y-auto">
                        {JSON.stringify(feedback.chartData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* 마인드맵 데이터 (피드백 자체에 저장된 데이터) */}
                  {feedback.mindmapData && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1">
                        <Icon name="account_tree" size="xs" /> 마인드맵 데이터
                      </h4>
                      <pre className="p-3 rounded-lg bg-purple-950/50 text-purple-300 text-xs overflow-x-auto max-h-48 overflow-y-auto">
                        {JSON.stringify(feedback.mindmapData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* 메타 정보 (피드백 자체 데이터 우선 사용) */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    {(feedback.chartType || feedback.chatHistory?.chartType) && (
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <Icon name="bar_chart" size="xs" />
                        차트: {feedback.chartType || feedback.chatHistory?.chartType}
                      </div>
                    )}
                    {(feedback.sqlGenTimeMs || feedback.chatHistory?.sqlGenTimeMs) && (
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <Icon name="code" size="xs" />
                        SQL 생성: {formatTime(feedback.sqlGenTimeMs || feedback.chatHistory?.sqlGenTimeMs || null)}
                      </div>
                    )}
                    {(feedback.sqlExecTimeMs || feedback.chatHistory?.sqlExecTimeMs) && (
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <Icon name="database" size="xs" />
                        SQL 실행: {formatTime(feedback.sqlExecTimeMs || feedback.chatHistory?.sqlExecTimeMs || null)}
                      </div>
                    )}
                    {feedback.personaName && (
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <Icon name="psychology" size="xs" />
                        페르소나: {feedback.personaName}
                      </div>
                    )}
                    {feedback.chatHistory?.errorMessage && (
                      <div className="flex items-center gap-1 text-xs text-error">
                        <Icon name="error" size="xs" />
                        오류: {feedback.chatHistory.errorMessage}
                      </div>
                    )}
                  </div>

                  {/* 피드백 코멘트 */}
                  {feedback.comment && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <h4 className="text-sm font-medium text-amber-500 mb-1 flex items-center gap-1">
                        <Icon name="rate_review" size="xs" /> 사용자 코멘트
                      </h4>
                      <p className="text-sm text-text dark:text-white">{feedback.comment}</p>
                    </div>
                  )}

                  {/* 상세 피드백 */}
                  <div className="mt-4 flex gap-3">
                    {feedback.isSqlCorrect !== null && (
                      <span className={`text-xs px-2 py-1 rounded ${feedback.isSqlCorrect ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"}`}>
                        SQL {feedback.isSqlCorrect ? "정확" : "부정확"}
                      </span>
                    )}
                    {feedback.isResponseHelpful !== null && (
                      <span className={`text-xs px-2 py-1 rounded ${feedback.isResponseHelpful ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"}`}>
                        응답 {feedback.isResponseHelpful ? "유용" : "개선필요"}
                      </span>
                    )}
                    {feedback.isChartUseful !== null && (
                      <span className={`text-xs px-2 py-1 rounded ${feedback.isChartUseful ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"}`}>
                        차트 {feedback.isChartUseful ? "유용" : "개선필요"}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}

        {/* 더 보기 */}
        {hasMore && feedbacks.length > 0 && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => loadFeedbacks(false)}
              disabled={isLoading}
              leftIcon={isLoading ? "progress_activity" : "expand_more"}
            >
              {isLoading ? "로딩 중..." : "더 보기"}
            </Button>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-xl max-w-sm w-full animate-slide-in-up">
            <div className="p-6">
              {/* 아이콘 */}
              <div className="flex justify-center mb-4">
                <div className="size-12 rounded-full bg-error/10 flex items-center justify-center">
                  <Icon name="delete" size="md" className="text-error" />
                </div>
              </div>

              {/* 제목 */}
              <h3 className="text-lg font-bold text-text dark:text-white text-center mb-2">
                {deleteTarget === "single"
                  ? "피드백 삭제"
                  : deleteTarget === "selected"
                  ? `선택 항목 삭제 (${selectedIds.size}개)`
                  : "전체 피드백 삭제"}
              </h3>

              {/* 메시지 */}
              <p className="text-text-secondary text-center mb-6">
                {deleteTarget === "single"
                  ? "이 피드백을 삭제하시겠습니까?"
                  : deleteTarget === "selected"
                  ? `선택한 ${selectedIds.size}개의 피드백을 삭제하시겠습니까?`
                  : "모든 피드백이 삭제됩니다."}
                <br />
                <span className="text-xs text-error">이 작업은 되돌릴 수 없습니다.</span>
              </p>

              {/* 버튼 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSingleDeleteId(null);
                  }}
                  disabled={isDeleting}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 !bg-error hover:!bg-error/90"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  leftIcon={isDeleting ? "progress_activity" : "delete"}
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
