/**
 * @file src/app/dashboard/chat/page.tsx
 * @description
 * AI 어시스턴트 채팅 페이지입니다.
 * 프로젝트 상황을 질문하고 데이터 분석 결과를 받습니다.
 *
 * 성능 최적화:
 * - ChatInput: 입력 상태를 로컬에서 관리하여 메시지 목록 리렌더링 방지
 * - ChatMessageItem: React.memo로 개별 메시지만 리렌더링
 * - ChartRenderer/MindmapRenderer: React.memo로 차트 리렌더링 방지
 * - EXAMPLE_GROUPS: 컴포넌트 외부 상수로 재생성 방지
 *
 * 초보자 가이드:
 * 1. **메시지 영역**: 대화 기록 표시 (마크다운 + 차트)
 * 2. **입력 영역**: 메시지 입력 및 전송
 * 3. **프로젝트 선택**: 특정 프로젝트 컨텍스트로 질문
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon, Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useProject } from "@/contexts";
import { api, AiPersona } from "@/lib/api";

// 최적화된 컴포넌트들
import ChatMessageItem, { ChatMessage } from "./components/ChatMessageItem";
import ChatInput from "./components/ChatInput";
import MindmapRenderer, { MindmapNode } from "./components/MindmapRenderer";
import { EXAMPLE_GROUPS, ExampleGroup } from "./components/constants";
import { ExcelMappingModal } from "./components/ExcelMappingModal";

/**
 * 피드백 타입
 */
type FeedbackRating = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | null;

/**
 * 채팅 페이지 컴포넌트
 */
export default function ChatPage() {
  const toast = useToast();
  const { selectedProject, projects } = useProject();

  // 상태
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // 페르소나 상태
  const [personas, setPersonas] = useState<AiPersona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);

  // AI 설정 상태 (현재 사용 중인 모델 표시용)
  const [aiSettings, setAiSettings] = useState<{
    provider: string;
    geminiModel: string;
    mistralModel: string;
  } | null>(null);

  // 동적 제안 질문 상태
  const [suggestions, setSuggestions] = useState<ExampleGroup[]>(EXAMPLE_GROUPS);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);

  // 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fullscreenMindmap, setFullscreenMindmap] = useState<MindmapNode | null>(null);

  // 엑셀 파일 업로드 상태
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetType, setTargetType] = useState<"task" | "issue" | "requirement">("task");
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [excelParseResult, setExcelParseResult] = useState<{
    headers: string[];
    sampleData: Record<string, unknown>[];
    totalRows: number;
    rawData: Record<string, unknown>[];
  } | null>(null);
  const [suggestedMappings, setSuggestedMappings] = useState<Record<string, string>>({});

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * 메시지 영역 스크롤
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * chartData 유효성 검사 함수
   * 잘못된 chartData가 있으면 null로 변환하여 3D 차트 오류 방지
   */
  const validateChartData = (chartData: unknown): Record<string, unknown>[] | null => {
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      return null;
    }
    // 모든 항목에 name과 value가 있는지 확인
    const isValid = chartData.every(
      (d) => d && typeof d === "object" && "name" in d && "value" in d
    );
    return isValid ? chartData : null;
  };

  /**
   * 채팅 기록 불러오기
   */
  const loadChatHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const params = new URLSearchParams();
      if (selectedProjectId) {
        params.append("projectId", selectedProjectId);
      }
      params.append("limit", "100");

      const res = await fetch(`/api/chat?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // chartData 유효성 검사 후 설정 (잘못된 데이터 필터링)
        const sanitizedData = data.map((msg: ChatMessage) => ({
          ...msg,
          chartData: validateChartData(msg.chartData),
        }));
        setMessages(sanitizedData);
      }
    } catch (error) {
      console.error("채팅 기록 로드 실패:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // 선택된 프로젝트 동기화
  useEffect(() => {
    if (selectedProject) {
      setSelectedProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  /**
   * 페르소나 목록 불러오기
   */
  const loadPersonas = useCallback(async () => {
    try {
      setIsLoadingPersonas(true);
      const data = await api.personas.list();
      setPersonas(data);
      // 기본 페르소나 선택
      const defaultPersona = data.find((p) => p.isDefault);
      if (defaultPersona && !selectedPersonaId) {
        setSelectedPersonaId(defaultPersona.id);
      }
    } catch (error) {
      console.error("페르소나 로드 실패:", error);
    } finally {
      setIsLoadingPersonas(false);
    }
  }, [selectedPersonaId]);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  /**
   * AI 설정 불러오기 (현재 사용 중인 모델 표시용)
   */
  const loadAiSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-settings");
      if (res.ok) {
        const data = await res.json();
        setAiSettings({
          provider: data.provider,
          geminiModel: data.geminiModel,
          mistralModel: data.mistralModel,
        });
      }
    } catch (error) {
      console.error("AI 설정 로드 실패:", error);
    }
  }, []);

  useEffect(() => {
    loadAiSettings();
  }, [loadAiSettings]);

  /**
   * 제안 질문 새로고침
   * LLM에게 새로운 제안을 요청하고, 응답이 있으면 업데이트
   * 응답이 없거나 오류 시 기존 제안 유지
   */
  const refreshSuggestions = useCallback(async () => {
    setIsRefreshingSuggestions(true);
    try {
      const res = await fetch("/api/chat/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // AI가 생성한 제안이면 업데이트
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
          if (data.source === "ai") {
            toast.success("새로운 제안이 생성되었습니다!");
          }
        }
      }
    } catch (error) {
      console.error("제안 새로고침 실패:", error);
      // 오류 시 기존 제안 유지 (아무 동작 안함)
    } finally {
      setIsRefreshingSuggestions(false);
    }
  }, [selectedProjectId, toast]);

  /**
   * 메시지 전송 (ChatInput에서 호출)
   */
  const handleSendMessage = useCallback(
    async (inputMessage: string) => {
      if (!inputMessage.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: inputMessage,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: inputMessage,
            projectId: selectedProjectId || null,
            personaId: selectedPersonaId || null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          console.log("[Chat] API 응답:", {
            chartType: data.chartType,
            hasMindmapData: !!data.mindmapData,
          });
          const assistantMessage: ChatMessage = {
            id: data.id,
            role: "assistant",
            content: data.content,
            sqlQuery: data.sqlQuery,
            chartType: data.chartType,
            chartData: data.chartData,
            mindmapData: data.mindmapData,
            createdAt: new Date().toISOString(),
            processingTimeMs: data.processingTimeMs,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          const error = await res.json();
          toast.error(error.error || "메시지 전송에 실패했습니다.");
        }
      } catch (error) {
        console.error("메시지 전송 실패:", error);
        toast.error("메시지 전송 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, selectedProjectId, selectedPersonaId, toast]
  );

  /**
   * 파일 선택 핸들러
   */
  const handleFileSelect = useCallback(
    (file: File) => {
      // 파일 확장자 검증
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "csv"].includes(ext || "")) {
        toast.error("지원하지 않는 파일 형식입니다. (.xlsx, .xls, .csv만 가능)");
        return;
      }

      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("파일 크기는 5MB 이하여야 합니다.");
        return;
      }

      setSelectedFile(file);
    },
    [toast]
  );

  /**
   * 엑셀 파일 업로드 및 파싱 처리
   */
  const handleExcelUpload = useCallback(async () => {
    if (!selectedFile) return;

    // 프로젝트 선택 확인
    if (!selectedProjectId) {
      toast.error("프로젝트를 먼저 선택해주세요.");
      return;
    }

    setIsUploadingExcel(true);

    try {
      // 1. 파일 파싱 API 호출
      const formData = new FormData();
      formData.append("file", selectedFile);

      const parseRes = await fetch("/api/excel/parse", {
        method: "POST",
        body: formData,
      });

      if (!parseRes.ok) {
        const error = await parseRes.json();
        toast.error(error.error || "파일 파싱에 실패했습니다.");
        return;
      }

      const parseData = await parseRes.json();
      setExcelParseResult(parseData);

      // 2. LLM 컬럼 매핑 요청
      const mappingRes = await fetch("/api/excel/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: parseData.headers,
          sampleData: parseData.sampleData,
          targetType,
        }),
      });

      if (mappingRes.ok) {
        const mappingData = await mappingRes.json();
        setSuggestedMappings(mappingData.mappings || {});
      } else {
        setSuggestedMappings({});
      }

      // 3. 매핑 모달 표시
      setShowMappingModal(true);

      // 4. 채팅에 사용자 메시지 추가
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: `📎 **${selectedFile.name}** 파일을 업로드했습니다.\n- 총 ${parseData.totalRows}건의 데이터\n- ${targetType === "task" ? "태스크" : targetType === "issue" ? "이슈" : "요구사항"}로 등록 예정`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
    } catch (error) {
      console.error("엑셀 업로드 실패:", error);
      toast.error("엑셀 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingExcel(false);
    }
  }, [selectedFile, selectedProjectId, targetType, toast]);

  /**
   * 매핑 확인 후 벌크 임포트 실행
   */
  const handleMappingConfirm = useCallback(
    async (finalMappings: Record<string, string>) => {
      if (!excelParseResult || !selectedProjectId) return;

      setIsUploadingExcel(true);

      try {
        const res = await fetch("/api/excel/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType,
            projectId: selectedProjectId,
            data: excelParseResult.rawData,
            mappings: finalMappings,
          }),
        });

        const result = await res.json();

        if (res.ok) {
          const assistantMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `✅ **엑셀 데이터 등록 완료**\n\n- 성공: **${result.success}건**\n- 실패: **${result.failed}건**${result.errors?.length > 0 ? `\n\n**오류 내역:**\n${result.errors.slice(0, 5).join("\n")}${result.errors.length > 5 ? `\n... 외 ${result.errors.length - 5}건` : ""}` : ""}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          toast.success(`${result.success}건 등록 완료!`);
        } else {
          toast.error(result.error || "등록에 실패했습니다.");
        }
      } catch (error) {
        console.error("벌크 임포트 실패:", error);
        toast.error("등록 중 오류가 발생했습니다.");
      } finally {
        setIsUploadingExcel(false);
        setShowMappingModal(false);
        setSelectedFile(null);
        setExcelParseResult(null);
        setSuggestedMappings({});
      }
    },
    [excelParseResult, selectedProjectId, targetType, toast]
  );

  /**
   * 채팅 기록 삭제 확인 모달 열기
   */
  const handleClearHistory = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  /**
   * 피드백 제출
   */
  const handleFeedback = useCallback(
    async (messageId: string, rating: FeedbackRating) => {
      try {
        const res = await fetch("/api/chat/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatHistoryId: messageId,
            rating,
          }),
        });

        if (res.ok) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, feedback: { rating, comment: msg.feedback?.comment } }
                : msg
            )
          );
          toast.success(rating === "POSITIVE" ? "감사합니다!" : "의견을 반영하겠습니다.");
        } else {
          const error = await res.json();
          toast.error(error.error || "피드백 제출에 실패했습니다.");
        }
      } catch (error) {
        console.error("피드백 제출 실패:", error);
        toast.error("피드백 제출 중 오류가 발생했습니다.");
      }
    },
    [toast]
  );

  /**
   * 피드백 코멘트 제출
   */
  const handleFeedbackComment = useCallback(
    async (messageId: string, comment: string) => {
      if (!comment.trim()) return;

      try {
        const message = messages.find((m) => m.id === messageId);
        const res = await fetch("/api/chat/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatHistoryId: messageId,
            rating: message?.feedback?.rating || "NEGATIVE",
            comment,
          }),
        });

        if (res.ok) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    feedback: {
                      ...msg.feedback,
                      rating: msg.feedback?.rating || "NEGATIVE",
                      comment,
                    },
                  }
                : msg
            )
          );
          toast.success("상세 의견이 등록되었습니다.");
        }
      } catch (error) {
        console.error("피드백 코멘트 제출 실패:", error);
      }
    },
    [messages, toast]
  );

  /**
   * 채팅 기록 삭제 실행
   */
  const confirmClearHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) {
        params.append("projectId", selectedProjectId);
      }

      const res = await fetch(`/api/chat?${params.toString()}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessages([]);
        toast.success("채팅 기록이 삭제되었습니다.");
      }
    } catch (error) {
      console.error("채팅 기록 삭제 실패:", error);
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setShowDeleteModal(false);
    }
  }, [selectedProjectId, toast]);

  /**
   * 마인드맵 전체화면 열기
   */
  const handleFullscreenMindmap = useCallback((data: MindmapNode) => {
    setFullscreenMindmap(data);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Icon name="smart_toy" size="sm" className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-text dark:text-white">AI 어시스턴트</h1>
              {/* 현재 사용 중인 모델 표시 */}
              {aiSettings && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  aiSettings.provider === "gemini"
                    ? "bg-blue-500/20 text-blue-500"
                    : "bg-orange-500/20 text-orange-500"
                }`}>
                  {aiSettings.provider === "gemini"
                    ? `Gemini ${aiSettings.geminiModel.replace("gemini-", "").replace("-latest", "")}`
                    : `Mistral ${aiSettings.mistralModel.replace("mistral-", "").replace("-latest", "")}`}
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary">
              프로젝트 데이터를 분석하고 질문에 답합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 페르소나 선택 */}
          <div className="relative">
            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              disabled={isLoadingPersonas}
              className="pl-9 pr-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm appearance-none min-w-[160px]"
            >
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
            <Icon
              name={personas.find((p) => p.id === selectedPersonaId)?.icon || "smart_toy"}
              size="xs"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
          </div>

          {/* 프로젝트 선택 */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm"
          >
            <option value="">전체 프로젝트</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {/* 기록 삭제 */}
          <Button variant="ghost" size="sm" onClick={handleClearHistory} leftIcon="delete">
            기록 삭제
          </Button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Icon name="progress_activity" size="lg" className="text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          // 빈 상태 - 그룹별 예시 질문
          <div className="flex flex-col items-center justify-center h-full w-full px-4">
            <div className="size-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-3">
              <Icon name="chat" size="md" className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-text dark:text-white mb-1">
              무엇이든 물어보세요
            </h2>
            <p className="text-text-secondary text-sm mb-4">
              프로젝트 데이터 분석, 등록, 수정 등 다양한 작업을 도와드려요
            </p>

            {/* 제안 새로고침 버튼 */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={refreshSuggestions}
                disabled={isRefreshingSuggestions}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="AI에게 새로운 제안 요청"
              >
                <Icon
                  name="refresh"
                  size="xs"
                  className={isRefreshingSuggestions ? "animate-spin" : ""}
                />
                <span>{isRefreshingSuggestions ? "새로고침 중..." : "제안 새로고침"}</span>
              </button>
            </div>

            {/* 그룹별 예시 질문 - 동적 상태 사용 */}
            <div className="grid grid-cols-5 gap-4 w-full max-w-6xl">
              {suggestions.map((group) => (
                <div
                  key={group.title}
                  className="p-3 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark"
                >
                  {/* 그룹 헤더 */}
                  <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-border dark:border-border-dark">
                    <Icon name={group.icon} size="xs" className={group.color} />
                    <span className="text-sm font-semibold text-text dark:text-white">
                      {group.title}
                    </span>
                  </div>
                  {/* 질문 목록 - 클릭 시 바로 전송 */}
                  <div className="space-y-1.5">
                    {group.questions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(question)}
                        disabled={isLoading || !selectedProjectId}
                        className="w-full text-left text-[11px] leading-tight py-1.5 px-2 text-text-secondary line-clamp-2 rounded hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={question}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // 메시지 목록 - ChatMessageItem 사용
          messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              onFeedback={handleFeedback}
              onFeedbackComment={handleFeedbackComment}
              onFullscreenMindmap={handleFullscreenMindmap}
            />
          ))
        )}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface dark:bg-surface-dark rounded-2xl rounded-bl-md p-4">
              <div className="flex items-center gap-2">
                <Icon name="progress_activity" size="sm" className="text-primary animate-spin" />
                <span className="text-text-secondary text-sm">분석 중...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 - ChatInput 컴포넌트 */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        onClearFile={() => setSelectedFile(null)}
        targetType={targetType}
        onTargetTypeChange={setTargetType}
        onExcelUpload={handleExcelUpload}
        isLoading={isLoading}
        isUploadingExcel={isUploadingExcel}
        selectedProjectId={selectedProjectId}
        suggestions={suggestions}
        onRefreshSuggestions={refreshSuggestions}
        isRefreshingSuggestions={isRefreshingSuggestions}
      />

      {/* 채팅 기록 삭제 확인 모달 */}
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
                채팅 기록 삭제
              </h3>

              {/* 메시지 */}
              <p className="text-text-secondary text-center mb-6">
                모든 채팅 기록이 삭제됩니다.
                <br />
                이 작업은 되돌릴 수 없습니다.
              </p>

              {/* 버튼 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteModal(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 !bg-error hover:!bg-error/90"
                  onClick={confirmClearHistory}
                >
                  삭제
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 전체화면 마인드맵 모달 */}
      {fullscreenMindmap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pt-16">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setFullscreenMindmap(null)}
          />
          {/* 모달 컨텐츠 */}
          <div className="relative w-[92vw] h-[85vh] max-h-[calc(100vh-100px)] bg-background dark:bg-background-dark rounded-xl shadow-2xl overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border dark:border-border-dark">
              <div className="flex items-center gap-3">
                <Icon name="account_tree" size="sm" className="text-primary" />
                <h2 className="text-lg font-bold text-text dark:text-white">WBS 마인드맵</h2>
                <span className="text-xs text-text-secondary">
                  (노드 클릭으로 펼치기/접기)
                </span>
              </div>
              <button
                onClick={() => setFullscreenMindmap(null)}
                className="p-1.5 hover:bg-surface dark:hover:bg-surface-dark rounded-lg transition-colors"
                title="닫기 (ESC)"
              >
                <Icon name="close" size="sm" className="text-text-secondary" />
              </button>
            </div>
            {/* 마인드맵 */}
            <div className="p-3 h-[calc(100%-56px)]">
              <MindmapRenderer data={fullscreenMindmap} isFullscreen />
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 매핑 모달 */}
      {showMappingModal && excelParseResult && (
        <ExcelMappingModal
          isOpen={showMappingModal}
          onClose={() => {
            setShowMappingModal(false);
            setSelectedFile(null);
            setExcelParseResult(null);
            setSuggestedMappings({});
          }}
          headers={excelParseResult.headers}
          sampleData={excelParseResult.sampleData}
          totalRows={excelParseResult.totalRows}
          targetType={targetType}
          suggestedMappings={suggestedMappings}
          onConfirm={handleMappingConfirm}
          isLoading={isUploadingExcel}
        />
      )}
    </div>
  );
}
