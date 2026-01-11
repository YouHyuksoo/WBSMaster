/**
 * @file src/app/dashboard/chat/components/ChatMessageItem.tsx
 * @description
 * 개별 채팅 메시지 아이템 컴포넌트입니다.
 * React.memo로 감싸서 해당 메시지가 변경되지 않으면 리렌더링하지 않습니다.
 *
 * 기능:
 * - 사용자/어시스턴트 메시지 구분 표시
 * - 마크다운 렌더링
 * - SQL 쿼리 접기/펼치기
 * - 차트/마인드맵 표시
 * - 피드백 (좋아요/싫어요) UI
 */

import React, { memo, useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Icon, Card } from "@/components/ui";
import ChartRenderer from "./ChartRenderer";
import MindmapRenderer, { MindmapNode } from "./MindmapRenderer";

/**
 * 피드백 타입
 */
type FeedbackRating = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | null;

/**
 * 채팅 메시지 타입
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sqlQuery?: string;
  chartType?: "bar" | "line" | "pie" | "area" | "mindmap";
  chartData?: Record<string, unknown>[];
  mindmapData?: MindmapNode;
  createdAt: string;
  processingTimeMs?: number;
  /** 전체 데이터 건수 (LIMIT 적용 전) */
  totalCount?: number;
  /** 표시된 데이터 건수 (LIMIT 적용 후) */
  displayedCount?: number;
  feedback?: {
    rating: FeedbackRating;
    comment?: string;
  };
}

interface ChatMessageItemProps {
  message: ChatMessage;
  onFeedback: (messageId: string, rating: FeedbackRating) => void;
  onFeedbackComment: (messageId: string, comment: string) => void;
  onFullscreenMindmap: (data: MindmapNode) => void;
  /** Excel 다운로드 핸들러 (SQL 쿼리를 전달받아 전체 데이터 Excel 다운로드) */
  onExcelDownload?: (sqlQuery: string) => void;
}

/**
 * 채팅 메시지 아이템 컴포넌트
 */
const ChatMessageItem = memo(function ChatMessageItem({
  message,
  onFeedback,
  onFeedbackComment,
  onFullscreenMindmap,
  onExcelDownload,
}: ChatMessageItemProps) {
  const [feedbackInput, setFeedbackInput] = useState("");
  const messageRef = useRef<HTMLDivElement>(null);

  const handleFeedbackKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && feedbackInput.trim()) {
      onFeedbackComment(message.id, feedbackInput);
      setFeedbackInput("");
    }
  };

  /**
   * 메시지 시작 부분으로 스크롤
   */
  const scrollToTop = useCallback(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /**
   * 메시지 끝 부분으로 스크롤
   */
  const scrollToBottom = useCallback(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, []);

  return (
    <div
      ref={messageRef}
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] ${
          message.role === "user"
            ? "bg-primary text-white rounded-2xl rounded-br-md px-4 py-3"
            : "bg-surface dark:bg-surface-dark rounded-2xl rounded-bl-md"
        }`}
      >
        {message.role === "assistant" ? (
          <div className="p-4 space-y-4">
            {/* 마크다운 렌더링 */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // 코드 블록 스타일링
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code
                        className="px-1.5 py-0.5 rounded bg-background-dark text-primary text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code
                        className="block p-3 rounded-lg bg-background-dark text-sm overflow-x-auto"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  // 테이블 스타일링 (라이트/다크 모드 지원)
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="min-w-full border-collapse text-sm">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                      {children}
                    </td>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* SQL 쿼리 표시 */}
            {message.sqlQuery && (
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text">
                  <Icon name="code" size="xs" />
                  <span>실행된 SQL 쿼리</span>
                  <Icon
                    name="expand_more"
                    size="xs"
                    className="group-open:rotate-180 transition-transform"
                  />
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-background-dark text-sm overflow-x-auto">
                  <code className="text-green-400">{message.sqlQuery}</code>
                </pre>
              </details>
            )}

            {/* Excel 다운로드 버튼 (전체 건수가 표시 건수보다 많을 때) */}
            {message.sqlQuery &&
             message.totalCount !== undefined &&
             message.displayedCount !== undefined &&
             message.totalCount > message.displayedCount && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Icon name="info" size="sm" className="text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    전체 {message.totalCount.toLocaleString()}건 중 {message.displayedCount.toLocaleString()}건만 표시됩니다.
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    전체 데이터가 필요하시면 Excel로 다운로드하세요.
                  </p>
                </div>
                {onExcelDownload && (
                  <button
                    onClick={() => onExcelDownload(message.sqlQuery!)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors flex-shrink-0"
                    title="전체 데이터 Excel 다운로드"
                  >
                    <Icon name="download" size="sm" />
                    <span>Excel 다운로드</span>
                  </button>
                )}
              </div>
            )}

            {/* 차트 표시 - chartData 유효성 검사 후 렌더링 */}
            {message.chartType &&
             message.chartType !== "mindmap" &&
             message.chartData &&
             Array.isArray(message.chartData) &&
             message.chartData.length > 0 &&
             message.chartData.every(d => d && typeof d === 'object' && d.name !== undefined && d.value !== undefined) && (
              <Card>
                <div className="p-4">
                  <ChartRenderer
                    chartType={message.chartType}
                    chartData={message.chartData}
                  />
                </div>
              </Card>
            )}

            {/* 마인드맵 표시 */}
            {message.chartType === "mindmap" && message.mindmapData && (
              <Card>
                <div className="p-2">
                  <div className="flex items-center justify-between px-2 pb-2 border-b border-border-dark">
                    <div className="flex items-center gap-2">
                      <Icon name="account_tree" size="sm" className="text-primary" />
                      <span className="text-sm font-medium text-text dark:text-white">
                        마인드맵
                      </span>
                      <span className="text-xs text-text-secondary">
                        (노드를 클릭하면 펼치기/접기)
                      </span>
                    </div>
                    <button
                      onClick={() => onFullscreenMindmap(message.mindmapData!)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
                      title="전체화면으로 보기"
                    >
                      <Icon name="fullscreen" size="sm" />
                      <span>전체화면</span>
                    </button>
                  </div>
                  <MindmapRenderer data={message.mindmapData} />
                </div>
              </Card>
            )}

            {/* 피드백 UI */}
            <div className="mt-3 pt-3 border-t border-border dark:border-border-dark">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">
                    응답이 도움이 되었나요?
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onFeedback(message.id, "POSITIVE")}
                      className={`p-1.5 rounded-lg transition-all ${
                        message.feedback?.rating === "POSITIVE"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "text-text-secondary hover:text-emerald-500 hover:bg-emerald-500/10"
                      }`}
                      title="도움됨"
                    >
                      <Icon name="thumb_up" size="sm" />
                    </button>
                    <button
                      onClick={() => onFeedback(message.id, "NEGATIVE")}
                      className={`p-1.5 rounded-lg transition-all ${
                        message.feedback?.rating === "NEGATIVE"
                          ? "bg-rose-500/20 text-rose-500"
                          : "text-text-secondary hover:text-rose-500 hover:bg-rose-500/10"
                      }`}
                      title="개선필요"
                    >
                      <Icon name="thumb_down" size="sm" />
                    </button>

                    {/* 구분선 */}
                    <div className="w-px h-4 bg-border dark:bg-border-dark mx-1" />

                    {/* 스크롤 버튼 */}
                    <button
                      onClick={scrollToTop}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
                      title="응답 처음으로"
                    >
                      <Icon name="keyboard_arrow_up" size="sm" />
                    </button>
                    <button
                      onClick={scrollToBottom}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
                      title="응답 마지막으로"
                    >
                      <Icon name="keyboard_arrow_down" size="sm" />
                    </button>
                  </div>
                </div>
                {message.processingTimeMs && (
                  <span className="text-[10px] text-text-secondary">
                    {(message.processingTimeMs / 1000).toFixed(1)}초
                  </span>
                )}
              </div>
              {/* 상세 피드백 입력 (부정적 피드백 시 표시) */}
              {message.feedback?.rating === "NEGATIVE" && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="개선이 필요한 부분을 알려주세요..."
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    onKeyDown={handleFeedbackKeyDown}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
});

export default ChatMessageItem;
