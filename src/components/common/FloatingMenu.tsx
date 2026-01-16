/**
 * @file src/components/common/FloatingMenu.tsx
 * @description
 * 플로팅 메뉴 컴포넌트입니다.
 * 모든 대시보드 페이지 오른쪽 하단에 표시되는 원형 플로팅 버튼입니다.
 *
 * 초보자 가이드:
 * 1. **호버 인터랙션**: 마우스를 올리면 메뉴가 위로 펼쳐집니다.
 * 2. **메뉴 항목**: 최상단으로, 최하단으로, AI 대화 (3개)
 * 3. **애니메이션**: 순차적으로 펼쳐지는 딜레이 효과 적용
 *
 * 메뉴 추가 방법:
 * - menuItems 배열에 { icon, label, action } 객체를 추가하면 됩니다.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";

/**
 * 플로팅 메뉴 컴포넌트
 * - 오른쪽 하단 고정 위치
 * - 호버 시 메뉴 펼침
 */
export function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  /**
   * 메인 콘텐츠 영역(main 태그)을 찾아서 스크롤
   */
  const getScrollContainer = () => {
    // id로 먼저 찾고, 없으면 main 태그, 그래도 없으면 documentElement
    return (
      document.getElementById("main-content") ||
      document.querySelector("main") ||
      document.documentElement
    );
  };

  /**
   * 위로 스크롤 (마우스 휠처럼 일정량)
   */
  const scrollUp = () => {
    const container = getScrollContainer();
    container.scrollBy({ top: -300, behavior: "smooth" });
  };

  /**
   * 아래로 스크롤 (마우스 휠처럼 일정량)
   */
  const scrollDown = () => {
    const container = getScrollContainer();
    container.scrollBy({ top: 300, behavior: "smooth" });
  };

  /**
   * AI 대화 페이지로 이동
   */
  const goToChat = () => {
    router.push("/dashboard/chat");
  };

  // 메뉴 항목 정의 (아래에서 위로 표시됨 - flex-col-reverse)
  const menuItems = [
    { icon: "keyboard_arrow_down", label: "아래로", action: scrollDown },
    { icon: "keyboard_arrow_up", label: "위로", action: scrollUp },
    { icon: "smart_toy", label: "AI 대화", action: goToChat },
  ];

  return (
    <div
      className={`fixed bottom-6 z-[70] transition-all duration-300 ${
        isOpen ? "right-6" : "right-[-35px]"
      }`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* 펼쳐지는 메뉴 아이템들 (위로 펼쳐짐) */}
      <div
        className={`flex flex-col-reverse gap-3 mb-3 transition-all duration-300 ${
          isOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className="group flex items-center gap-2 justify-end"
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            {/* 라벨 (왼쪽에 표시) */}
            <span
              className={`px-2 py-1 rounded bg-slate-900 text-white text-xs whitespace-nowrap
                transition-all duration-200 ${
                  isOpen
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-2"
                }`}
              style={{ transitionDelay: `${index * 50 + 100}ms` }}
            >
              {item.label}
            </span>
            {/* 아이콘 버튼 */}
            <div
              className="size-10 rounded-full bg-slate-700 hover:bg-primary
                flex items-center justify-center shadow-lg transition-colors"
            >
              <Icon name={item.icon} size="sm" className="text-white" />
            </div>
          </button>
        ))}
      </div>

      {/* 메인 플로팅 버튼 */}
      <button
        className={`size-14 rounded-full bg-gradient-to-br from-primary to-purple-600
          flex items-center justify-center shadow-xl hover:shadow-2xl
          transition-all duration-300 ${isOpen ? "rotate-180 opacity-100" : "rotate-0 opacity-40"}`}
      >
        <Icon name={isOpen ? "close" : "widgets"} size="lg" className="text-white" />
      </button>
    </div>
  );
}
