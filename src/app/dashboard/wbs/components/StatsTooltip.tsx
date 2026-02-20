/**
 * @file src/app/dashboard/wbs/components/StatsTooltip.tsx
 * @description
 * WBS 통계 배지 호버 시 계산 상세를 보여주는 툴팁 컴포넌트입니다.
 * 각 배지(계획/실적/지연율/달성률)마다 대분류별 기여도를 표 형태로 표시합니다.
 *
 * 초보자 가이드:
 * 1. **StatsTooltipBadge**: 배지 + 호버 툴팁을 감싸는 래퍼
 * 2. **level1Details**: 대분류별 가중치, 말단수, 기간경과율, 평균진행률 등 상세 데이터
 */

"use client";

import React, { useState, useRef, useEffect } from "react";

/** 대분류별 상세 계산 데이터 */
export interface Level1Detail {
  name: string;
  weight: number;
  leafCount: number;
  avgProgress: number;
  avgPeriodProgress: number;
  plannedContrib: number;
  actualContrib: number;
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  delayedCount: number;
}

/** 툴팁 종류 */
type TooltipType = "planned" | "actual" | "delay" | "achievement";

interface StatsTooltipBadgeProps {
  type: TooltipType;
  children: React.ReactNode;
  className?: string;
  /** 툴팁 수평 정렬: left(좌측 기준), center(중앙), right(우측 기준) */
  align?: "left" | "center" | "right";
  level1Details: Level1Detail[];
  plannedProgress: number;
  actualProgress: number;
  delayRate: number;
  achievementRate: number;
  totalWeight: number;
}

/** 숫자를 소수점 1자리까지 표시 */
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** 툴팁 내용 렌더러 */
function TooltipContent({
  type,
  level1Details,
  plannedProgress,
  actualProgress,
  delayRate,
  achievementRate,
  totalWeight,
}: Omit<StatsTooltipBadgeProps, "children" | "className">) {

  if (type === "planned") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-600">
          <span className="text-sky-400 font-bold text-sm">계획 진척률 = {fmt(plannedProgress)}%</span>
        </div>
        <div className="text-[11px] text-slate-300 space-y-1">
          <p className="font-semibold text-slate-200">산식: Σ (가중치 × 말단 평균기간경과비율) / 100</p>
          <p>각 대분류 하위 말단 업무들의 기간경과비율 평균에 가중치를 곱한 합계</p>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-slate-400 border-b border-slate-600">
              <th className="text-left py-1 pr-2">대분류</th>
              <th className="text-right py-1 px-1 whitespace-nowrap">가중치</th>
              <th className="text-right py-1 px-1 whitespace-nowrap">말단수</th>
              <th className="text-right py-1 px-1 whitespace-nowrap">평균경과</th>
              <th className="text-right py-1 pl-1 whitespace-nowrap">기여값</th>
            </tr>
          </thead>
          <tbody>
            {level1Details.map((d, i) => (
              <tr key={i} className="text-slate-200 border-b border-slate-700/50">
                <td className="py-1 pr-2 max-w-[120px] truncate">{d.name}</td>
                <td className="text-right py-1 px-1 text-slate-400">{d.weight}%</td>
                <td className="text-right py-1 px-1 text-slate-400">{d.leafCount}개</td>
                <td className="text-right py-1 px-1 text-sky-300">{fmt(d.avgPeriodProgress)}%</td>
                <td className="text-right py-1 pl-1 font-medium text-sky-400">{fmt(d.plannedContrib)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-slate-200 font-bold border-t border-slate-500">
              <td className="py-1.5 pr-2">합계</td>
              <td className="text-right py-1.5 px-1 text-slate-400">{totalWeight}%</td>
              <td className="text-right py-1.5 px-1"></td>
              <td className="text-right py-1.5 px-1"></td>
              <td className="text-right py-1.5 pl-1 text-sky-400">{fmt(plannedProgress)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  if (type === "actual") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-600">
          <span className="text-emerald-400 font-bold text-sm">실적 진척률 = {fmt(actualProgress)}%</span>
        </div>
        <div className="text-[11px] text-slate-300 space-y-1">
          <p className="font-semibold text-slate-200">산식: Σ (가중치 × 말단 평균진행률) / 100</p>
          <p>각 대분류 하위 말단 업무들의 평균 진행률에 가중치를 곱한 합계</p>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-slate-400 border-b border-slate-600">
              <th className="text-left py-1 pr-2">대분류</th>
              <th className="text-right py-1 px-1 whitespace-nowrap">가중치</th>
              <th className="text-right py-1 px-1 whitespace-nowrap">말단수</th>
              <th className="text-right py-1 px-1 whitespace-nowrap">평균진행</th>
              <th className="text-right py-1 pl-1 whitespace-nowrap">기여값</th>
            </tr>
          </thead>
          <tbody>
            {level1Details.map((d, i) => (
              <tr key={i} className="text-slate-200 border-b border-slate-700/50">
                <td className="py-1 pr-2 max-w-[120px] truncate">{d.name}</td>
                <td className="text-right py-1 px-1 text-slate-400">{d.weight}%</td>
                <td className="text-right py-1 px-1 text-slate-400">{d.leafCount}개</td>
                <td className="text-right py-1 px-1 text-emerald-300">{fmt(d.avgProgress)}%</td>
                <td className="text-right py-1 pl-1 font-medium text-emerald-400">{fmt(d.actualContrib)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-slate-200 font-bold border-t border-slate-500">
              <td className="py-1.5 pr-2">합계</td>
              <td className="text-right py-1.5 px-1 text-slate-400">{totalWeight}%</td>
              <td className="text-right py-1.5 px-1"></td>
              <td className="text-right py-1.5 px-1"></td>
              <td className="text-right py-1.5 pl-1 text-emerald-400">{fmt(actualProgress)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  if (type === "delay") {
    const isAhead = delayRate <= 0;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-600">
          <span className={`font-bold text-sm ${isAhead ? "text-emerald-400" : "text-rose-400"}`}>
            지연율 = {delayRate > 0 ? "+" : ""}{fmt(delayRate)}%
          </span>
        </div>
        <div className="text-[11px] text-slate-300 space-y-1.5">
          <p className="font-semibold text-slate-200">산식: 계획 진척률 - 실적 진척률</p>
          <div className="bg-slate-700/50 rounded-lg p-2.5 space-y-1">
            <div className="flex justify-between">
              <span className="text-sky-300">계획 진척률</span>
              <span className="font-medium text-sky-400">{fmt(plannedProgress)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-300">실적 진척률</span>
              <span className="font-medium text-emerald-400">- {fmt(actualProgress)}%</span>
            </div>
            <div className="border-t border-slate-600 pt-1 flex justify-between font-bold">
              <span className={isAhead ? "text-emerald-300" : "text-rose-300"}>지연율</span>
              <span className={isAhead ? "text-emerald-400" : "text-rose-400"}>
                {delayRate > 0 ? "+" : ""}{fmt(delayRate)}%
              </span>
            </div>
          </div>
          <p className={isAhead ? "text-emerald-400" : "text-rose-400"}>
            {isAhead
              ? delayRate === 0
                ? "계획 대비 정확히 일치합니다."
                : `계획 대비 ${fmt(Math.abs(delayRate))}%p 선행 중입니다.`
              : `계획 대비 ${fmt(delayRate)}%p 지연 중입니다.`
            }
          </p>
        </div>
      </div>
    );
  }

  // achievement
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-600">
        <span className={`font-bold text-sm ${
          achievementRate >= 100 ? "text-emerald-400" :
          achievementRate >= 80 ? "text-sky-400" :
          achievementRate >= 60 ? "text-amber-400" : "text-rose-400"
        }`}>
          달성률 = {achievementRate}%
        </span>
      </div>
      <div className="text-[11px] text-slate-300 space-y-1.5">
        <p className="font-semibold text-slate-200">산식: (실적 진척률 / 계획 진척률) × 100</p>
        <div className="bg-slate-700/50 rounded-lg p-2.5 space-y-1">
          <div className="flex justify-between">
            <span className="text-emerald-300">실적 진척률</span>
            <span className="font-medium text-emerald-400">{fmt(actualProgress)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sky-300">계획 진척률</span>
            <span className="font-medium text-sky-400">÷ {fmt(plannedProgress)}%</span>
          </div>
          <div className="border-t border-slate-600 pt-1 flex justify-between font-bold">
            <span className="text-slate-200">× 100</span>
            <span className={
              achievementRate >= 100 ? "text-emerald-400" :
              achievementRate >= 80 ? "text-sky-400" :
              achievementRate >= 60 ? "text-amber-400" : "text-rose-400"
            }>
              {achievementRate}%
            </span>
          </div>
        </div>
        <p className={
          achievementRate >= 100 ? "text-emerald-400" :
          achievementRate >= 80 ? "text-sky-400" :
          achievementRate >= 60 ? "text-amber-400" : "text-rose-400"
        }>
          {achievementRate >= 100
            ? "계획 대비 목표를 달성했습니다."
            : achievementRate >= 80
              ? "계획 대비 양호한 수준입니다."
              : achievementRate >= 60
                ? "계획 대비 주의가 필요합니다."
                : "계획 대비 심각한 지연 상태입니다."
          }
        </p>
      </div>
    </div>
  );
}

/**
 * 통계 배지 + 호버 툴팁 래퍼
 * 배지를 감싸면 마우스 호버 시 계산 상세 팝오버가 표시됩니다.
 */
export default function StatsTooltipBadge({
  type,
  children,
  className = "",
  align = "center",
  level1Details,
  plannedProgress,
  actualProgress,
  delayRate,
  achievementRate,
  totalWeight,
}: StatsTooltipBadgeProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<"bottom" | "top">("bottom");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 화면 아래 공간 부족 시 위쪽으로 표시
  useEffect(() => {
    if (open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition(spaceBelow < 350 ? "top" : "bottom");
    }
  }, [open]);

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), 200);
  };

  const handleLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="cursor-help">{children}</div>
      {open && (
        <div
          className={`absolute z-50 ${
            align === "left" ? "left-0" :
            align === "right" ? "right-0" :
            "left-1/2 -translate-x-1/2"
          } ${
            position === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {/* 화살표 */}
          <div className={`absolute w-0 h-0 ${
            align === "left" ? "left-6" :
            align === "right" ? "right-6" :
            "left-1/2 -translate-x-1/2"
          } ${
            position === "bottom"
              ? "-top-1.5 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-slate-800"
              : "-bottom-1.5 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-800"
          }`} />
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 min-w-[320px] max-w-[420px] animate-fadeIn">
            <TooltipContent
              type={type}
              level1Details={level1Details}
              plannedProgress={plannedProgress}
              actualProgress={actualProgress}
              delayRate={delayRate}
              achievementRate={achievementRate}
              totalWeight={totalWeight}
            />
          </div>
        </div>
      )}
    </div>
  );
}
