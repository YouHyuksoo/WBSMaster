/**
 * @file src/app/dashboard/components/pulse/ProjectPulsePanel.tsx
 * @description
 * 프로젝트 카드 오른쪽의 "프로젝트 한눈에" 영역: 상황 타일을 가로로 흘려 보여 줍니다.
 *
 * 초보자 가이드:
 * 1. 타일이 영역보다 넓으면 5초마다 한 칸씩 자동으로 넘어가고, 끝에 닿으면 처음으로 돌아간다
 * 2. 마우스를 올리거나 키보드 포커스가 들어오면 멈춘다. 시스템 모션 감소 설정이면 자동으로 넘기지 않는다
 * 3. 가로 스크롤(트랙패드 · Shift+휠 · 끌기)로 직접 넘길 수 있고, 오른쪽 위 ‹ › 로도 넘길 수 있다
 * 4. 데이터: useProjectPulse(오늘 · 누적 · 긴급 · 추이) + useWbsScheduleStats(진척률 · WBS 상태)
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { useProjectPulse, useWbsScheduleStats } from "@/hooks";
import { usePulseColors } from "./usePulseColors";
import { OpenTile, ProgressTile, ScheduleTile, TodayTile, TrendTile, UrgentTile, WbsStatusTile } from "./PulseTiles";

const STEP_MS = 5000;

export function ProjectPulsePanel({ projectId }: { projectId: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const { data: pulse, isLoading, isError } = useProjectPulse(projectId);
  const { data: stats } = useWbsScheduleStats({ projectId });
  const colors = usePulseColors();

  const step = useCallback((direction: 1 | -1) => {
    const node = track.current;
    if (!node) return;
    const tile = node.querySelector("section");
    const amount = (tile?.getBoundingClientRect().width ?? 260) + 12;
    const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 4;
    if (direction === 1 && atEnd) node.scrollTo({ left: 0, behavior: "smooth" });
    else node.scrollBy({ left: direction * amount, behavior: "smooth" });
  }, []);

  // 자동 넘김: 멈춤 · 모션 감소 · 넘칠 게 없으면 하지 않는다
  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      const node = track.current;
      if (node && node.scrollWidth > node.clientWidth + 4) step(1);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [paused, step]);

  // 프로젝트가 바뀌면 처음 타일부터
  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
  }, [projectId]);

  return (
    <div
      className="relative min-w-0 flex-1 flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex items-center justify-between gap-2 pb-2">
        <p className="text-xs font-semibold text-text-secondary">
          프로젝트 한눈에 {isError && <span className="text-error font-normal">· 불러오지 못했습니다</span>}
          {isLoading && <span className="font-normal">· 불러오는 중</span>}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-text-secondary">{paused ? "멈춤" : "자동 넘김"}</span>
          <button type="button" aria-label="이전 현황" onClick={() => step(-1)} className="size-6 flex items-center justify-center rounded-md text-text-secondary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Icon name="chevron_left" size="sm" />
          </button>
          <button type="button" aria-label="다음 현황" onClick={() => step(1)} className="size-6 flex items-center justify-center rounded-md text-text-secondary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Icon name="chevron_right" size="sm" />
          </button>
        </div>
      </div>
      <div ref={track} className="flex h-[176px] gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl" tabIndex={0} aria-label="프로젝트 현황 타일 (가로로 넘겨 보기)">
        <ProgressTile stats={stats} colors={colors} />
        <UrgentTile pulse={pulse} />
        <TodayTile pulse={pulse} />
        <WbsStatusTile stats={stats} colors={colors} />
        <TrendTile pulse={pulse} colors={colors} />
        <OpenTile pulse={pulse} />
        <ScheduleTile pulse={pulse} />
      </div>
    </div>
  );
}
