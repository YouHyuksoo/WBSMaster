/**
 * @file src/components/common/FloatingMenu.tsx
 * @description
 * 플로팅 메뉴 컴포넌트입니다.
 * 모든 대시보드 페이지에 표시되며 드래그로 옮길 수 있는 원형 버튼입니다.
 *
 * 초보자 가이드:
 * 1. **호버 인터랙션**: 메인 버튼에 마우스를 올리면 메뉴가 위로 펼쳐집니다.
 * 2. **메뉴 항목**: 위로, 아래로, AI 대화 (3개)
 * 3. **애니메이션**: 순차적으로 펼쳐지는 딜레이 효과 적용
 * 4. **닫기 기능**: X 버튼 클릭 시 메뉴가 숨겨지며, localStorage에 저장됩니다.
 * 5. **이동**: 메인 버튼을 드래그하거나 방향키로 이동하며 위치를 기억합니다.
 *
 * 메뉴 추가 방법:
 * - menuItems 배열에 { icon, label, action } 객체를 추가하면 됩니다.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { useFloatingMenuDrag } from "@/components/common/useFloatingMenuDrag";

const STORAGE_KEY = "floating-menu-hidden";

/**
 * 플로팅 메뉴 컴포넌트
 * - 기본 오른쪽 하단, 드래그 위치 기억
 * - 메인 버튼 호버 시 메뉴 펼침
 * - 닫기 기능 (localStorage 저장)
 */
export function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const router = useRouter();
  const drag = useFloatingMenuDrag(() => setIsOpen(false));
  const opensDown = !!drag.position && drag.position.y < 216;
  const labelsOnRight = !!drag.position && drag.position.x < 112;
  const menuHeight = drag.viewport.height ? Math.max(40, opensDown
    ? drag.viewport.height - (drag.position?.y ?? 0) - 76
    : (drag.position?.y ?? drag.viewport.height - 80) - 24) : undefined;

  // localStorage에서 숨김 상태 불러오기
  useEffect(() => {
    const hidden = localStorage.getItem(STORAGE_KEY) === "true";
    setIsHidden(hidden);
  }, []);

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

  /**
   * 메뉴 숨기기 (localStorage에 저장)
   */
  const handleClose = () => {
    setIsHidden(true);
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  /**
   * 메뉴 다시 보이기
   */
  const handleShow = () => {
    setIsHidden(false);
    localStorage.setItem(STORAGE_KEY, "false");
  };

  // 메뉴 항목 정의 (아래에서 위로 표시됨 - flex-col-reverse)
  const menuItems = [
    { icon: "keyboard_arrow_down", label: "아래로", action: scrollDown },
    { icon: "keyboard_arrow_up", label: "위로", action: scrollUp },
    { icon: "smart_toy", label: "AI 대화", action: goToChat },
  ];

  // 메뉴가 숨겨진 경우 작은 표시만
  if (isHidden) {
    return (
      <div className="fixed z-[70] size-14" style={drag.style}>
      <button
        onClick={handleShow}
        {...drag.bind}
        style={{ touchAction: "none" }}
        className="absolute inset-2 size-10 rounded-full cursor-grab active:cursor-grabbing select-none
          bg-gradient-to-br from-primary/50 to-purple-600/50
          flex items-center justify-center shadow-lg hover:shadow-xl
          hover:from-primary hover:to-purple-600
          transition-shadow duration-300"
        title="클릭하여 표시 · 드래그 또는 방향키로 이동"
        aria-label="플로팅 메뉴 표시"
      >
        <Icon name="widgets" size="sm" className="text-white" />
      </button>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[70] size-14"
      style={drag.style}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* 화면 가장자리에 맞춰 펼침 방향과 라벨 위치를 변경합니다. */}
      <div
        style={{ maxHeight: menuHeight }}
        inert={!isOpen || drag.isDragging}
        className={`absolute w-max flex ${opensDown ? "top-full pt-3 flex-col" : "bottom-full pb-3 flex-col-reverse"} ${labelsOnRight ? "left-2" : "right-2"} gap-3 overflow-y-auto transition-all duration-300 motion-reduce:transition-none ${
          isOpen && !drag.isDragging
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* 닫기 버튼 (가장 위에 표시) */}
        <button
          onClick={handleClose}
          className={`group flex items-center gap-2 ${labelsOnRight ? "flex-row-reverse justify-end" : "justify-end"}`}
          style={{ transitionDelay: "0ms" }}
        >
          {/* 라벨 */}
          <span
            className={`px-2 py-1 rounded bg-red-900 text-white text-xs whitespace-nowrap
              transition-all duration-200 ${
                isOpen
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-2"
              }`}
            style={{ transitionDelay: "100ms" }}
          >
            닫기
          </span>
          {/* 아이콘 버튼 */}
          <div
            className="size-10 rounded-full bg-red-700 hover:bg-red-600
              flex items-center justify-center shadow-lg transition-colors"
          >
            <Icon name="close" size="sm" className="text-white" />
          </div>
        </button>

        {/* 기존 메뉴 아이템들 */}
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className={`group flex items-center gap-2 justify-end ${labelsOnRight ? "flex-row-reverse" : ""}`}
            style={{ transitionDelay: `${(index + 1) * 50}ms` }}
          >
            {/* 라벨 (왼쪽에 표시) */}
            <span
              className={`px-2 py-1 rounded bg-slate-900 text-white text-xs whitespace-nowrap
                transition-all duration-200 ${
                  isOpen
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-2"
                }`}
              style={{ transitionDelay: `${(index + 1) * 50 + 100}ms` }}
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
        {...drag.bind}
        onPointerEnter={(event) => { if (event.pointerType === "mouse" && !drag.isDragging) setIsOpen(true); }}
        onClick={() => setIsOpen(true)}
        onKeyDown={(event) => { drag.bind.onKeyDown(event); if (event.key === "Escape") setIsOpen(false); }}
        style={{ touchAction: "none" }}
        aria-label="플로팅 메뉴"
        aria-expanded={isOpen && !drag.isDragging}
        title="드래그 또는 방향키로 이동 · 클릭하여 메뉴 열기"
        className={`size-14 rounded-full bg-gradient-to-br from-primary to-purple-600 cursor-grab active:cursor-grabbing select-none
          flex items-center justify-center shadow-xl hover:shadow-2xl
          focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary
          transition-shadow duration-300 motion-reduce:transition-none`}
      >
        <Icon name={isOpen ? "expand_less" : "widgets"} size="lg" className="text-white" />
      </button>
    </div>
  );
}
