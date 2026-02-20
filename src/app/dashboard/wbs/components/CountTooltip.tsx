/**
 * @file src/app/dashboard/wbs/components/CountTooltip.tsx
 * @description
 * 건수 통계 배지 호버 시 대분류별 상세를 보여주는 툴팁 컴포넌트입니다.
 *
 * 초보자 가이드:
 * 1. **CountTooltipBadge**: 건수 배지를 감싸면 호버 시 대분류별 상세 팝오버 표시
 * 2. 전체/계획/완료/진행중/미완료/진척율 6가지 타입 지원
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import type { Level1Detail } from "../types";

export type CountTooltipType = "total" | "pending" | "completed" | "inProgress" | "delayed" | "progressRate";

interface CountTooltipBadgeProps {
  type: CountTooltipType;
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  details: Level1Detail[];
  total: number;
  pending: number;
  completed: number;
  inProgress: number;
  delayed: number;
}

const CFG: Record<CountTooltipType, { title: string; color: string; desc: string; col: string }> = {
  total: { title: "전체", color: "text-red-400", desc: "말단 업무(자식 없는 항목)의 전체 건수", col: "말단수" },
  pending: { title: "계획", color: "text-blue-400", desc: "계획종료일(endDate)이 오늘 이하인 말단 업무 건수", col: "해당건수" },
  completed: { title: "완료", color: "text-green-400", desc: "완료(COMPLETED) 상태인 말단 업무 건수", col: "완료건수" },
  inProgress: { title: "진행중", color: "text-amber-400", desc: "진행중(IN_PROGRESS) 상태인 말단 업무 건수", col: "진행건수" },
  delayed: { title: "미완료", color: "text-rose-400", desc: "계획종료일 초과 & 미완료 말단 업무 건수", col: "미완료건수" },
  progressRate: { title: "진척율", color: "text-red-400", desc: "산식: (완료 건수 / 계획 건수) × 100", col: "완료건수" },
};

/** 대분류별 해당 타입의 건수 반환 */
function getCount(type: CountTooltipType, d: Level1Detail): number {
  if (type === "total") return d.leafCount;
  if (type === "pending") return d.pendingCount;
  if (type === "completed" || type === "progressRate") return d.completedCount;
  if (type === "inProgress") return d.inProgressCount;
  return d.delayedCount;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

function TooltipContent({ type, details, total, pending, completed, inProgress, delayed }: Omit<CountTooltipBadgeProps, "children" | "align">) {
  const c = CFG[type];
  const gCount = type === "total" ? total : type === "pending" ? pending : type === "completed" ? completed : type === "inProgress" ? inProgress : type === "delayed" ? delayed : completed;
  const displayVal = type === "progressRate" ? `${pct(completed, pending)}%` : `${gCount}건`;
  const showRatio = type !== "total";
  const usesPendingBase = type === "progressRate";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-600">
        <span className={`font-bold text-sm ${c.color}`}>{c.title} = {displayVal}</span>
      </div>
      <p className="text-[11px] text-slate-300">{c.desc}</p>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-slate-400 border-b border-slate-600">
            <th className="text-left py-1 pr-2">대분류</th>
            <th className="text-right py-1 px-1 whitespace-nowrap">{c.col}</th>
            {showRatio && <th className="text-right py-1 px-1 whitespace-nowrap">{usesPendingBase ? "계획" : "전체"}</th>}
            {showRatio && <th className="text-right py-1 pl-1 whitespace-nowrap">비율</th>}
          </tr>
        </thead>
        <tbody>
          {details.map((d, i) => {
            const cnt = getCount(type, d);
            const base = usesPendingBase ? d.pendingCount : d.leafCount;
            return (
              <tr key={i} className="text-slate-200 border-b border-slate-700/50">
                <td className="py-1 pr-2 max-w-[120px] truncate">{d.name}</td>
                <td className={`text-right py-1 px-1 font-medium ${c.color}`}>{cnt}건</td>
                {showRatio && <td className="text-right py-1 px-1 text-slate-400">{base}건</td>}
                {showRatio && <td className="text-right py-1 pl-1 text-slate-400">{pct(cnt, base)}%</td>}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="text-slate-200 font-bold border-t border-slate-500">
            <td className="py-1.5 pr-2">합계</td>
            <td className={`text-right py-1.5 px-1 ${c.color}`}>{gCount}건</td>
            {showRatio && <td className="text-right py-1.5 px-1 text-slate-400">{usesPendingBase ? pending : total}건</td>}
            {showRatio && <td className="text-right py-1.5 pl-1 text-slate-400">{displayVal}</td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function CountTooltipBadge({
  type, children, align = "center", details, total, pending, completed, inProgress, delayed,
}: CountTooltipBadgeProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<"bottom" | "top">("bottom");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPosition(window.innerHeight - rect.bottom < 300 ? "top" : "bottom");
    }
  }, [open]);

  const handleEnter = () => { clearTimeout(timeoutRef.current); timeoutRef.current = setTimeout(() => setOpen(true), 200); };
  const handleLeave = () => { clearTimeout(timeoutRef.current); timeoutRef.current = setTimeout(() => setOpen(false), 150); };

  return (
    <div ref={wrapperRef} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <div className="cursor-help">{children}</div>
      {open && (
        <div
          className={`absolute z-50 ${
            align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
          } ${position === "bottom" ? "top-full mt-2" : "bottom-full mb-2"}`}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <div className={`absolute w-0 h-0 ${
            align === "left" ? "left-6" : align === "right" ? "right-6" : "left-1/2 -translate-x-1/2"
          } ${position === "bottom"
            ? "-top-1.5 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-slate-800"
            : "-bottom-1.5 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-800"
          }`} />
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 min-w-[280px] max-w-[380px] animate-fadeIn">
            <TooltipContent type={type} details={details} total={total} pending={pending} completed={completed} inProgress={inProgress} delayed={delayed} />
          </div>
        </div>
      )}
    </div>
  );
}
