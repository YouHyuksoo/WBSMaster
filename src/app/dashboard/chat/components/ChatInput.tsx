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
 * - 음성 입력 (녹음 → OpenAI 전사, 기준 설정 > 음성 회의록 의 OpenAI 키)
 */

import React, { memo, useState, useRef, useCallback, useEffect } from "react";
import { Icon, Button, useToast } from "@/components/ui";
import { EXAMPLE_GROUPS, ExampleGroup } from "./constants";
import { useVoiceRecorder } from "../hooks/useOpenAIVoice";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  targetType: "task" | "issue" | "requirement" | "intake";
  onTargetTypeChange: (type: "task" | "issue" | "requirement" | "intake") => void;
  onExcelUpload: () => void;
  isLoading: boolean;
  isUploadingExcel: boolean;
  selectedProjectId: string;
  /** 동적 제안 질문 (외부에서 전달, 없으면 기본값 사용) */
  suggestions?: ExampleGroup[];
  /** 제안 새로고침 함수 */
  onRefreshSuggestions?: () => void;
  /** 제안 새로고침 중 여부 */
  isRefreshingSuggestions?: boolean;
  /** 외부에서 입력창에 텍스트 설정 (제안 클릭 시 사용) */
  suggestedInput?: string;
  /** 외부 입력 처리 완료 시 호출 */
  onSuggestedInputHandled?: () => void;
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
  suggestions = EXAMPLE_GROUPS,
  onRefreshSuggestions,
  isRefreshingSuggestions = false,
  suggestedInput,
  onSuggestedInputHandled,
}: ChatInputProps) {
  const toast = useToast();

  // 로컬 상태 - 부모 컴포넌트와 분리
  const [inputMessage, setInputMessage] = useState("");
  const [showExamplePopover, setShowExamplePopover] = useState(false);

  // 음성 입력: 녹음 → OpenAI 전사 (src/app/dashboard/chat/hooks/useOpenAIVoice.ts)
  const appendVoiceText = useCallback((text: string) => {
    setInputMessage((prev) => (prev ? `${prev} ${text}` : text));
    inputRef.current?.focus();
  }, []);
  const showVoiceError = useCallback((message: string) => toast.error(message), [toast]);
  const voice = useVoiceRecorder(appendVoiceText, showVoiceError);
  const isListening = voice.isRecording;
  const isSpeechSupported = voice.supported;
  const toggleListening = voice.toggle;

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 외부에서 제안된 입력 처리
   * suggestedInput이 변경되면 입력창에 설정
   */
  useEffect(() => {
    if (suggestedInput) {
      setInputMessage(suggestedInput);
      onSuggestedInputHandled?.();
      // 입력창에 포커스
      inputRef.current?.focus();
    }
  }, [suggestedInput, onSuggestedInputHandled]);

  /**
   * 메시지 전송 핸들러
   */
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || isLoading || isUploadingExcel || (selectedFile && targetType !== "intake") || !selectedProjectId) return;
    onSendMessage(inputMessage);
    setInputMessage("");
  }, [inputMessage, isLoading, isUploadingExcel, selectedFile, targetType, selectedProjectId, onSendMessage]);

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
                  onTargetTypeChange(e.target.value as "task" | "issue" | "requirement" | "intake")
                }
                className="px-3 py-1.5 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm"
              >
                <option value="intake">AI로 문서 분석</option>
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
          accept=".txt,.md,.docx,.pdf,.xlsx,.xls,.csv"
          disabled={isLoading || isUploadingExcel || !selectedProjectId}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="md"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isUploadingExcel || !selectedProjectId}
          title="문서 첨부 (txt, md, docx, pdf, xlsx, xls, csv)"
          aria-label="문서 첨부"
        >
          <Icon name="attach_file" size="sm" />
        </Button>

        {/* 음성 입력 버튼 */}
        {isSpeechSupported && (
          <div className="relative">
            <Button
              variant={isListening ? "primary" : "ghost"}
              size="md"
              onClick={toggleListening}
              disabled={isLoading || isUploadingExcel || voice.isTranscribing}
              title={isListening ? "클릭하면 녹음을 멈추고 글자로 바꿉니다" : "클릭하여 음성으로 입력 (OpenAI 전사)"}
              className={isListening ? "bg-rose-500 hover:bg-rose-600 text-white" : ""}
            >
              <Icon name={voice.isTranscribing ? "progress_activity" : isListening ? "mic" : "mic_none"} size="sm" className={voice.isTranscribing ? "animate-spin" : ""} />
              {isListening && <span className="ml-1 text-xs">녹음 중 (다시 누르면 변환)</span>}
              {voice.isTranscribing && <span className="ml-1 text-xs">변환 중...</span>}
            </Button>
            {/* 녹음 중 표시 점 */}
            {isListening && (
              <span className="absolute -top-1 -right-1 size-3 bg-rose-500 rounded-full animate-pulse" />
            )}
          </div>
        )}

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
                <div className="flex items-center gap-2">
                  {/* 새로고침 버튼 */}
                  {onRefreshSuggestions && (
                    <button
                      onClick={onRefreshSuggestions}
                      disabled={isRefreshingSuggestions}
                      className="p-1 rounded hover:bg-primary/10 text-text-secondary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="AI에게 새로운 제안 요청"
                    >
                      <Icon
                        name="refresh"
                        size="xs"
                        className={isRefreshingSuggestions ? "animate-spin" : ""}
                      />
                    </button>
                  )}
                  <button
                    onClick={() => setShowExamplePopover(false)}
                    className="p-1 rounded hover:bg-background dark:hover:bg-background-dark"
                  >
                    <Icon name="close" size="xs" className="text-text-secondary" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {suggestions.map((group) => (
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
              isListening
                ? "🎤 말씀하세요... 다 말한 뒤 마이크 버튼을 다시 누르면 글자로 들어갑니다"
                : selectedFile
                  ? "파일과 함께 보낼 메시지를 입력하세요..."
                  : "질문을 입력하세요... (Shift+Enter로 줄바꿈)"
            }
            rows={1}
            className={`w-full px-4 py-3 pr-12 rounded-xl bg-surface dark:bg-surface-dark border text-text dark:text-white placeholder-text-secondary resize-none focus:outline-none focus:ring-2 ${
              isListening
                ? "border-rose-500 focus:ring-rose-500/50 bg-rose-500/5 dark:bg-rose-950/20"
                : "border-border dark:border-border-dark focus:ring-primary/50"
            }`}
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />
        </div>

        {/* 파일이 있으면 업로드 버튼, 없으면 전송 버튼 */}
        {selectedFile && targetType !== "intake" ? (
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
            disabled={!inputMessage.trim() || isLoading || !selectedProjectId}
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
