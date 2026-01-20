/**
 * @file src/app/dashboard/weekly-report/components/AiWriteModal.tsx
 * @description
 * AI 주간보고 작성 모달 컴포넌트입니다.
 * 사용자가 자연어로 업무 내용을 입력하면 AI가 자동으로 분류하고 등록합니다.
 *
 * 초보자 가이드:
 * 1. **채팅 UI**: 사용자 입력 → AI 응답 표시
 * 2. **미리보기**: 파싱된 업무 항목을 카드 형태로 표시
 * 3. **등록**: 확인 후 bulkCreateItems로 일괄 등록
 *
 * @example
 * <AiWriteModal
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 *   reportId="xxx"
 *   targetType="PREVIOUS_RESULT"
 *   onItemsAdded={() => refetch()}
 * />
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { useBulkCreateReportItems } from "@/hooks";
import { useToast } from "@/contexts";
import { ReportItemType, WorkCategory } from "@/lib/api";
import { getCategoryInfo, WORK_CATEGORIES } from "../constants";

/** 파싱된 업무 항목 타입 */
interface ParsedItem {
  type: ReportItemType;
  category: WorkCategory;
  title: string;
  description?: string;
  progress: number;
  isCompleted: boolean;
}

/** AI 응답 타입 */
interface AIResponse {
  items: ParsedItem[];
  message?: string;
}

/** 채팅 메시지 타입 */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  items?: ParsedItem[];
  isLoading?: boolean;
}

interface AiWriteModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 주간보고 ID */
  reportId: string;
  /** 대상 유형 (전주 실적 / 차주 계획) */
  targetType: ReportItemType;
  /** 항목 추가 완료 후 콜백 */
  onItemsAdded: () => void;
}

/**
 * AI 주간보고 작성 모달
 */
export function AiWriteModal({
  isOpen,
  onClose,
  reportId,
  targetType,
  onItemsAdded,
}: AiWriteModalProps) {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingItems, setPendingItems] = useState<ParsedItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bulkCreateItems = useBulkCreateReportItems();

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 모달 열릴 때 입력창 포커스
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setPendingItems([]);
      setInputValue("");
    }
  }, [isOpen]);

  /**
   * AI에게 메시지 보내기
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
    };

    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: "assistant",
      content: "업무를 분석하고 있어요...",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputValue("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/weekly-reports/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage.content,
          targetType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "AI 생성 실패");
      }

      const data: AIResponse = await response.json();

      // 로딩 메시지 제거하고 실제 응답으로 교체
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingMessage.id);
        return [
          ...filtered,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.message || `${data.items.length}건의 업무를 분류했어요!`,
            items: data.items,
          },
        ];
      });

      // 대기 항목에 추가
      setPendingItems((prev) => [...prev, ...data.items]);
    } catch (error) {
      console.error("[AiWriteModal] 오류:", error);

      // 로딩 메시지를 에러 메시지로 교체
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingMessage.id);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: error instanceof Error ? error.message : "AI 생성에 실패했습니다.",
          },
        ];
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Enter 키 핸들러
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * 대기 항목에서 삭제
   */
  const handleRemoveItem = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * 항목 카테고리 변경
   */
  const handleCategoryChange = (index: number, category: WorkCategory) => {
    setPendingItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, category } : item))
    );
  };

  /**
   * 항목 일괄 등록
   */
  const handleRegisterItems = async () => {
    if (pendingItems.length === 0) return;

    try {
      const itemsToCreate = pendingItems.map((item, index) => ({
        type: targetType,
        category: item.category,
        title: item.title,
        description: item.description || undefined,
        progress: item.progress,
        isCompleted: item.isCompleted,
        isAdditional: targetType === "PREVIOUS_RESULT",
        order: index,
      }));

      await bulkCreateItems.mutateAsync({
        reportId,
        items: itemsToCreate,
      });

      toast.success(`${pendingItems.length}건의 업무가 등록되었습니다.`);
      onItemsAdded();
      onClose();
    } catch (error) {
      console.error("[AiWriteModal] 등록 실패:", error);
      toast.error("업무 등록에 실패했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Icon name="auto_awesome" className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                AI로 {targetType === "PREVIOUS_RESULT" ? "전주 실적" : "차주 계획"} 작성
              </h2>
              <p className="text-sm text-muted-foreground">
                업무 내용을 자유롭게 입력하면 자동으로 분류해드려요
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Icon name="close" size="sm" />
          </button>
        </div>

        {/* 채팅 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Icon name="chat" size="xl" className="mb-4 opacity-50" />
              <p className="text-center">
                업무 내용을 자유롭게 입력해보세요.<br />
                예: "API 개발 완료하고, 회의 2번 참석함, 다음주에 테스트 진행 예정"
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>{msg.content}</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">{msg.content}</p>
                      {/* 분류된 항목 미리보기 (메시지 내) */}
                      {msg.items && msg.items.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-background rounded-lg p-2 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryInfo(item.category).color}`}>
                                  {getCategoryInfo(item.category).label}
                                </span>
                                <span className="font-medium text-foreground">{item.title}</span>
                                {item.isCompleted && (
                                  <Icon name="check_circle" size="xs" className="text-success" />
                                )}
                              </div>
                              {item.description && (
                                <p className="text-muted-foreground text-xs mt-1">{item.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 대기 항목 영역 */}
        {pendingItems.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                등록 대기 ({pendingItems.length}건)
              </span>
              <button
                onClick={() => setPendingItems([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                전체 삭제
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
              {pendingItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border"
                >
                  {/* 카테고리 선택 */}
                  <select
                    value={item.category}
                    onChange={(e) => handleCategoryChange(idx, e.target.value as WorkCategory)}
                    className="text-xs bg-transparent border-none focus:ring-0 cursor-pointer"
                  >
                    {WORK_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-foreground truncate max-w-[150px]">
                    {item.title}
                  </span>
                  {item.isCompleted && (
                    <Icon name="check" size="xs" className="text-success" />
                  )}
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="text-muted-foreground hover:text-error"
                  >
                    <Icon name="close" size="xs" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 입력 영역 */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="업무 내용을 입력하세요... (예: API 개발 완료, 테스트 진행 중)"
              disabled={isGenerating}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isGenerating}
              isLoading={isGenerating}
            >
              <Icon name="send" size="sm" />
            </Button>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleRegisterItems}
            disabled={pendingItems.length === 0 || bulkCreateItems.isPending}
            isLoading={bulkCreateItems.isPending}
          >
            <Icon name="add" size="sm" className="mr-1" />
            {pendingItems.length}건 등록하기
          </Button>
        </div>
      </div>
    </div>
  );
}
