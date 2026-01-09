/**
 * @file src/app/dashboard/chat/components/ChatInput.tsx
 * @description
 * 채팅 입력 영역 컴포넌트입니다.
 * 독립적인 상태 관리로 입력 시 메시지 목록 리렌더링을 방지합니다.
 *
 * 기능:
 * - 텍스트 입력 및 전송
 * - 엑셀 파일 첨부
 * - 예시 질문 팝오버
 */

import React, { memo, useState, useRef, useCallback } from "react";
import { Icon, Button } from "@/components/ui";
import { EXAMPLE_GROUPS } from "./constants";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  targetType: "task" | "issue" | "requirement";
  onTargetTypeChange: (type: "task" | "issue" | "requirement") => void;
  onExcelUpload: () => void;
  isLoading: boolean;
  isUploadingExcel: boolean;
  selectedProjectId: string;
}

/**
 * 채팅 입력 컴포넌트
 * 입력 상태를 로컬에서 관리하여 부모 컴포넌트 리렌더링 방지
 */
const ChatInput = memo(function ChatInput({
  onSendMessage,
  onFileSelect,
  selectedFile,
  onClearFile,
  targetType,
  onTargetTypeChange,
  onExcelUpload,
  isLoading,
  isUploadingExcel,
  selectedProjectId,
}: ChatInputProps) {
  // 로컬 상태 - 부모 컴포넌트와 분리
  const [inputMessage, setInputMessage] = useState("");
  const [showExamplePopover, setShowExamplePopover] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 메시지 전송 핸들러
   */
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || isLoading) return;
    onSendMessage(inputMessage);
    setInputMessage("");
  }, [inputMessage, isLoading, onSendMessage]);

  /**
   * 엔터 키 핸들러
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  /**
   * 파일 선택 핸들러
   */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
      // 입력 초기화 (같은 파일 다시 선택 가능하도록)
      e.target.value = "";
    },
    [onFileSelect]
  );

  /**
   * 예시 질문 선택 핸들러
   */
  const handleExampleSelect = useCallback((question: string) => {
    setInputMessage(question);
    setShowExamplePopover(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="p-4 border-t border-border dark:border-border-dark">
      {/* 첨부된 파일 미리보기 */}
      {selectedFile && (
        <div className="mb-3 p-3 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Icon name="description" size="sm" className="text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-text dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 등록 대상 선택 */}
              <select
                value={targetType}
                onChange={(e) =>
                  onTargetTypeChange(e.target.value as "task" | "issue" | "requirement")
                }
                className="px-3 py-1.5 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm"
              >
                <option value="task">태스크로 등록</option>
                <option value="issue">이슈로 등록</option>
                <option value="requirement">요구사항으로 등록</option>
              </select>
              {/* 삭제 버튼 */}
              <button
                onClick={onClearFile}
                className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                title="파일 제거"
              >
                <Icon name="close" size="sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {/* 파일 첨부 버튼 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="md"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isUploadingExcel}
          title="엑셀 파일 첨부 (.xlsx, .xls, .csv)"
        >
          <Icon name="attach_file" size="sm" />
        </Button>

        {/* 예시 보기 버튼 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setShowExamplePopover(!showExamplePopover)}
            title="예시 질문 보기"
            className={showExamplePopover ? "bg-primary/10 text-primary" : ""}
          >
            <Icon name="lightbulb" size="sm" />
          </Button>

          {/* 예시 질문 팝오버 */}
          {showExamplePopover && (
            <div className="absolute bottom-full left-0 mb-2 w-[800px] max-h-[400px] overflow-y-auto p-4 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-xl z-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text dark:text-white">
                  예시 질문
                </h3>
                <button
                  onClick={() => setShowExamplePopover(false)}
                  className="p-1 rounded hover:bg-background dark:hover:bg-background-dark"
                >
                  <Icon name="close" size="xs" className="text-text-secondary" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {EXAMPLE_GROUPS.map((group) => (
                  <div key={group.title}>
                    <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-border dark:border-border-dark">
                      <Icon name={group.icon} size="xs" className={group.color} />
                      <span className="text-xs font-semibold text-text dark:text-white">
                        {group.title}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {group.questions.map((question, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExampleSelect(question)}
                          className="w-full text-left text-[11px] leading-tight py-1.5 px-2 rounded hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedFile
                ? "파일과 함께 보낼 메시지를 입력하세요..."
                : "질문을 입력하세요... (Shift+Enter로 줄바꿈)"
            }
            rows={1}
            className="w-full px-4 py-3 pr-12 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />
        </div>

        {/* 파일이 있으면 업로드 버튼, 없으면 전송 버튼 */}
        {selectedFile ? (
          <Button
            variant="primary"
            onClick={onExcelUpload}
            disabled={isUploadingExcel || !selectedProjectId}
            leftIcon={isUploadingExcel ? "progress_activity" : "upload"}
          >
            {isUploadingExcel ? "처리중..." : "업로드"}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            leftIcon={isLoading ? "progress_activity" : "send"}
          >
            전송
          </Button>
        )}
      </div>

      <p className="text-xs text-text-secondary mt-2 text-center">
        AI 어시스턴트는 프로젝트 데이터를 분석하여 답변합니다. 민감한 정보는 입력하지
        마세요.
      </p>
    </div>
  );
});

export default ChatInput;
