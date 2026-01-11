/**
 * @file src/app/dashboard/chat/components/SuggestionsCarousel.tsx
 * @description
 * 제안 질문을 카로셀 형태로 표시하는 컴포넌트입니다.
 * 3개씩 표시하고 좌우 화살표로 이동할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **visibleCount**: 한 번에 표시할 카드 수 (기본 3개)
 * 2. **currentIndex**: 현재 시작 인덱스
 * 3. **화살표 버튼**: 좌우 이동 (순환)
 */

"use client";

import { useState, useCallback } from "react";
import { Icon } from "@/components/ui";
import { ExampleGroup } from "./constants";

interface SuggestionsCarouselProps {
  /** 제안 그룹 목록 */
  suggestions: ExampleGroup[];
  /** 질문 클릭 핸들러 */
  onQuestionClick: (question: string) => void;
  /** 로딩 중 여부 */
  isLoading?: boolean;
  /** 프로젝트 선택 여부 */
  isProjectSelected?: boolean;
}

/**
 * 제안 질문 카로셀 컴포넌트
 */
export function SuggestionsCarousel({
  suggestions,
  onQuestionClick,
  isLoading = false,
  isProjectSelected = true,
}: SuggestionsCarouselProps) {
  // 한 번에 표시할 카드 수
  const visibleCount = 3;
  // 현재 시작 인덱스
  const [currentIndex, setCurrentIndex] = useState(0);

  // 이전으로 이동
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev - 1;
      // 처음에서 이전으로 가면 마지막으로
      if (newIndex < 0) {
        return suggestions.length - visibleCount;
      }
      return newIndex;
    });
  }, [suggestions.length]);

  // 다음으로 이동
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev + 1;
      // 마지막에서 다음으로 가면 처음으로
      if (newIndex > suggestions.length - visibleCount) {
        return 0;
      }
      return newIndex;
    });
  }, [suggestions.length]);

  // 현재 보여줄 그룹들
  const visibleGroups = suggestions.slice(currentIndex, currentIndex + visibleCount);

  // 인디케이터 (페이지 점)
  const totalPages = suggestions.length - visibleCount + 1;

  return (
    <div className="w-full max-w-5xl">
      {/* 카로셀 컨테이너 */}
      <div className="relative flex items-center gap-4">
        {/* 이전 버튼 */}
        <button
          onClick={handlePrev}
          className="flex-shrink-0 p-2 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark hover:bg-primary/10 hover:border-primary/30 transition-all"
          title="이전"
        >
          <Icon name="chevron_left" size="md" className="text-text-secondary" />
        </button>

        {/* 카드들 */}
        <div className="flex-1 grid grid-cols-3 gap-4">
          {visibleGroups.map((group) => (
            <div
              key={group.title}
              className="p-4 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark hover:border-primary/30 transition-all min-h-[220px]"
            >
              {/* 그룹 헤더 */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border dark:border-border-dark">
                <div className={`p-1.5 rounded-lg bg-opacity-20 ${group.color.replace('text-', 'bg-')}/20`}>
                  <Icon name={group.icon} size="sm" className={group.color} />
                </div>
                <span className="text-base font-semibold text-text dark:text-white">
                  {group.title}
                </span>
              </div>
              {/* 질문 목록 */}
              <div className="space-y-2">
                {group.questions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => onQuestionClick(question)}
                    disabled={isLoading || !isProjectSelected}
                    className="w-full text-left text-sm leading-relaxed py-2 px-3 text-text-secondary dark:text-slate-400 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={question}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={handleNext}
          className="flex-shrink-0 p-2 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark hover:bg-primary/10 hover:border-primary/30 transition-all"
          title="다음"
        >
          <Icon name="chevron_right" size="md" className="text-text-secondary" />
        </button>
      </div>

      {/* 페이지 인디케이터 */}
      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: totalPages }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentIndex
                ? "bg-primary w-6"
                : "bg-border dark:bg-border-dark hover:bg-primary/50"
            }`}
            title={`${idx + 1} / ${totalPages}`}
          />
        ))}
      </div>
    </div>
  );
}
