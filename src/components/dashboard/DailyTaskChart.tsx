/**
 * @file src/components/dashboard/DailyTaskChart.tsx
 * @description
 * 사이버펑크 테마가 적용된 일자별 작업 할당량 차트입니다.
 * 프로젝트의 마지막 레벨(LEVEL4) 작업들이 각 일자별로 얼마나 할당되어 있는지 시각화합니다.
 *
 * 주요 기능:
 * - WBS 데이터를 기반으로 일자별 작업 부하 집계
 * - Recharts를 사용한 반응형 Area Chart
 * - 사이버펑크 스타일 (네온 효과, 그라데이션)
 * - 7일/30일/전체 기간 필터링
 */

"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useWbsItems } from "@/hooks/useWbs";
import { Icon } from "@/components/ui";
import {
  format,
  eachDayOfInterval,
  isWithinInterval,
  isValid,
  addDays,
  subDays,
} from "date-fns";

interface DailyTaskChartProps {
  projectId: string; // 데이터를 조회할 프로젝트 ID
}

type DateFilter = "7D" | "30D" | "ALL";

/**
 * WBS 항목 데이터 인터페이스
 */
interface WbsItemData {
  id: string;
  level: string;
  parentId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  children?: WbsItemData[];
  [key: string]: unknown;
}

// 차트 데이터 타입
interface ChartDataItem {
  date: string;
  displayDate: string;
  fullDate: string;
  count: number;
}

// Recharts 커스텀 툴팁 Props 타입
interface TooltipPayload {
  payload: ChartDataItem;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

/**
 * 커스텀 툴팁 컴포넌트
 * 차트 호버 시 표시되는 팝업
 */
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/90 border border-[#00f3ff]/50 p-4 rounded-lg shadow-[0_0_15px_rgba(0,243,255,0.3)] text-[#00f3ff] backdrop-blur-md">
        <p className="text-sm font-bold mb-2 text-white">{data.fullDate}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#fa00ff] shadow-[0_0_8px_#fa00ff]" />
          <span className="text-sm font-medium text-slate-300">진행 작업:</span>
          <span className="text-lg font-bold text-[#fa00ff]">
            {data.count}건
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function DailyTaskChart({ projectId }: DailyTaskChartProps) {
  const [filter, setFilter] = useState<DateFilter>("30D");

  // WBS 데이터 조회 (평탄화된 목록)
  const { data: wbsItems = [], isLoading } = useWbsItems({
    projectId,
    flat: true,
  });

  /**
   * 차트 데이터 가공
   * 말단 업무(자식이 없는 항목)의 기간을 분석하여 일자별 할당된 작업 수를 계산합니다.
   */
  const chartData = useMemo(() => {
    if (!wbsItems.length) return [];

    // 타입 캐스팅
    const allItems = wbsItems as unknown as WbsItemData[];

    // 부모 ID 목록 수집 (다른 항목이 참조하는 parentId들)
    const parentIds = new Set<string>();
    allItems.forEach((item) => {
      if (item.parentId) {
        parentIds.add(item.parentId);
      }
    });

    // 말단 업무 필터링 (누군가의 부모가 아닌 항목 = 자식이 없는 항목)
    // 날짜가 유효한 항목만 포함
    const tasks = allItems.filter(
      (item) =>
        !parentIds.has(item.id) &&
        item.startDate &&
        item.endDate &&
        isValid(new Date(item.startDate)) &&
        isValid(new Date(item.endDate))
    );

    if (tasks.length === 0) return [];

    // 2. 전체 기간 산정
    const dates = tasks.flatMap((t) => [
      new Date(t.startDate!),
      new Date(t.endDate!),
    ]);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // 3. 필터에 따른 표시 기간 설정
    let start: Date;
    let end: Date;
    const today = new Date();

    if (filter === "7D") {
      start = subDays(today, 6);
      end = addDays(today, 7); // 미래 7일까지
    } else if (filter === "30D") {
      start = subDays(today, 15);
      end = addDays(today, 15); // 전후 15일
    } else {
      start = minDate;
      end = maxDate;
    }

    // 4. 일자별 데이터 생성
    if (end.getTime() < start.getTime()) return [];

    try {
      const dayInterval = eachDayOfInterval({ start, end });

      return dayInterval.map((day: Date) => {
        // 해당 날짜에 진행 중인(기간에 포함되는) 작업 수 계산
        const count = tasks.filter((task) =>
          isWithinInterval(day, {
            start: new Date(task.startDate!),
            end: new Date(task.endDate!),
          })
        ).length;

        return {
          date: format(day, "yyyy-MM-dd"),
          displayDate: format(day, "MM.dd"),
          fullDate: format(day, "yyyy년 MM월 dd일"),
          count,
        };
      });
    } catch (e) {
      console.error("Date interval calculation failed", e);
      return [];
    }
  }, [wbsItems, filter]);

  if (isLoading) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center bg-slate-900 rounded-xl border border-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00f3ff]" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="h-[400px] w-full flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-slate-800 gap-4 text-slate-400">
        <Icon name="insert_chart" size="xl" />
        <p>프로젝트를 선택하면 작업 차트가 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-[#0a0a12] rounded-xl border border-[#1e1e3f] overflow-hidden shadow-2xl group">
      {/* 사이버펑크 배경 효과 */}
      <div className="absolute inset-0 bg-[url('https://api.placeholder.com/cyberpunk-grid.png')] opacity-10 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#00f3ff] to-transparent opacity-50" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#fa00ff] to-transparent opacity-50" />

      {/* 헤더 & 필터 */}
      <div className="relative z-10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="ssid_chart" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-linear-to-r from-[#00f3ff] to-[#fa00ff]">
              PROJECT WORKLOAD
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-mono tracking-wide">
            DAILY TASK DISTRIBUTION // PROJECT ID: {projectId.slice(0, 8)}...
          </p>
        </div>

        {/* 네온 스타일 필터 버튼 */}
        <div className="flex items-center p-1 bg-[#1a1a2e] rounded-lg border border-[#2d2d44]">
          {[
            { key: "7D", label: "7 DAYS" },
            { key: "30D", label: "30 DAYS" },
            { key: "ALL", label: "ALL TIME" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key as DateFilter)}
              className={`
                px-4 py-1.5 text-xs font-bold font-mono transition-all duration-300 rounded-md
                ${
                  filter === item.key
                    ? "bg-[#00f3ff]/20 text-[#00f3ff] shadow-[0_0_10px_rgba(0,243,255,0.3)]"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }
              `}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 영역 */}
      <div className="relative z-10 w-full h-[350px] px-2 pb-4">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="cyberGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#fa00ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00f3ff" />
                  <stop offset="50%" stopColor="#fa00ff" />
                  <stop offset="100%" stopColor="#00f3ff" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#2d2d44"
              />

              <XAxis
                dataKey="displayDate"
                tick={{
                  fill: "#6b7280",
                  fontSize: 12,
                  fontFamily: "monospace",
                }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />

              <YAxis
                tick={{
                  fill: "#6b7280",
                  fontSize: 12,
                  fontFamily: "monospace",
                }}
                axisLine={false}
                tickLine={false}
                dx={-10}
              />

              <Tooltip content={<CustomTooltip />} />

              <ReferenceLine y={0} stroke="#2d2d44" />

              <Area
                type="monotone"
                dataKey="count"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                fill="url(#cyberGradient)"
                animationDuration={1500}
                filter="drop-shadow(0 0 6px rgba(0, 243, 255, 0.5))"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono">
            <span className="text-4xl mb-2 opacity-20">NO DATA</span>
            <p className="text-xs tracking-widest text-[#fa00ff]/50">
              ASSIGN TASKS TO VISUALIZE WORKLOAD
            </p>
          </div>
        )}
      </div>

      {/* 하단 장식용 바 */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-[#00f3ff] via-[#fa00ff] to-[#00f3ff] opacity-20"></div>
    </div>
  );
}
