/**
 * @file src/components/common/HoverTooltip.tsx
 * @description
 * 표 칸에 마우스를 올리면 전체 내용을 보여주는 툴팁입니다.
 * document.body 에 고정 위치(fixed)로 띄워서, 가로 스크롤 표 상자(overflow)나 필터 줄에 잘리거나 가려지지 않습니다.
 *
 * 초보자 가이드:
 * - <HoverTooltip label="요구사항" content={req.content}>{칸 내용}</HoverTooltip>
 * - enabled=false 면 툴팁을 띄우지 않는다 (예: 짧은 이름은 생략)
 * - strong: 제목처럼 굵게 보여줄 때
 * - 칸 위 · 아래 중 공간이 넓은 쪽으로 열리고, 폭은 최대 560px(화면 폭 - 32px), 높이는 남는 공간까지
 * - 스크롤 · 창 크기 변경 시 닫힌다 (고정 위치라 따라가지 않으므로)
 */
"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface HoverTooltipProps {
  /** 툴팁 머리 라벨 (예: "요구사항") */
  label: string;
  /** 툴팁 본문 */
  content: ReactNode;
  /** false 면 툴팁을 띄우지 않음 */
  enabled?: boolean;
  /** 본문을 굵게 (제목류) */
  strong?: boolean;
  /** 키보드 포커스로 열고, 툴팁 안의 긴 내용은 스크롤해서 읽을 수 있게 함 */
  interactive?: boolean;
  /** 감싸는 칸의 클래스 (기본 min-w-0: 그리드 칸 안 truncate 유지) */
  className?: string;
  children: ReactNode;
}

interface TooltipPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: "above" | "below";
}

/** 툴팁 최대 폭 · 화면 여백 */
const MAX_WIDTH = 560;
const MARGIN = 16;
const GAP = 8;

/** 칸 위치로 툴팁 위치 계산 (테스트에서도 쓴다) */
export function computeTooltipPosition(
  rect: Pick<DOMRect, "left" | "top" | "bottom">,
  viewport: { width: number; height: number },
  gap = GAP,
): TooltipPosition {
  const width = Math.min(MAX_WIDTH, viewport.width - MARGIN * 2);
  const left = Math.min(Math.max(MARGIN, rect.left), viewport.width - width - MARGIN);
  const spaceAbove = rect.top - MARGIN;
  const spaceBelow = viewport.height - rect.bottom - MARGIN;
  const placement = spaceAbove > spaceBelow ? "above" : "below";
  const maxHeight = Math.max(120, (placement === "above" ? spaceAbove : spaceBelow) - gap);
  const top = placement === "above" ? rect.top - gap : rect.bottom + gap;
  return { left, top, width, maxHeight, placement };
}

export function HoverTooltip({ label, content, enabled = true, strong = false, interactive = false, className = "min-w-0", children }: HoverTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const id = useId();
  const [pos, setPos] = useState<TooltipPosition | null>(null);

  const show = useCallback(() => {
    if (!enabled || !ref.current) return;
    setPos(computeTooltipPosition(ref.current.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, interactive ? 0 : GAP));
  }, [enabled, interactive]);
  const hide = useCallback(() => setPos(null), []);

  // 고정 위치라 스크롤 · 창 크기 변경을 따라가지 않으므로 닫는다
  useEffect(() => {
    if (!pos) return;
    const onScroll = (event: Event) => {
      if (interactive && event.target instanceof Node && tooltip.current?.contains(event.target)) return;
      hide();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", hide);
    if (interactive) window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", hide);
      if (interactive) window.removeEventListener("keydown", onKeyDown);
    };
  }, [pos, hide, interactive]);

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={show}
      onMouseLeave={hide}
      tabIndex={interactive && enabled ? 0 : undefined}
      aria-describedby={interactive && pos ? id : undefined}
      onFocus={interactive ? show : undefined}
      onBlur={interactive ? hide : undefined}
    >
      {children}
      {pos &&
        createPortal(
          <div
            ref={tooltip}
            id={interactive ? id : undefined}
            role="tooltip"
            className={`fixed z-[100] rounded-lg border border-slate-700 bg-slate-900 p-3 text-white shadow-xl ${interactive ? "overflow-auto overscroll-contain" : "pointer-events-none overflow-hidden"}`}
            style={{
              left: pos.left,
              top: pos.top,
              maxWidth: pos.width,
              maxHeight: pos.maxHeight,
              transform: pos.placement === "above" ? "translateY(-100%)" : undefined,
            }}
          >
            <p className="mb-1 text-xs text-slate-400">{label}</p>
            <div className={`text-sm whitespace-pre-wrap break-words ${strong ? "font-medium" : ""}`}>{content}</div>
          </div>,
          document.body
        )}
    </div>
  );
}
