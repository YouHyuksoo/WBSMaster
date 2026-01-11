/**
 * @file src/components/dashboard/AssigneeTaskChart.tsx
 * @description
 * 사이버펑크 테마가 적용된 담당자별 작업 분포 도넛 차트입니다.
 * 각 담당자가 전체 기간 동안 얼마나 많은 작업을 담당하는지 비율로 시각화합니다.
 *
 * 주요 기능:
 * - WBS 데이터를 기반으로 담당자별 작업 건수 집계
 * - Recharts를 사용한 도넛 차트 (PieChart)
 * - 사이버펑크 스타일 (네온 효과, 그라데이션)
 * - 호버 시 상세 정보 표시
 */

"use client";

import { useMemo, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";
import { useWbsItems } from "@/hooks/useWbs";
import { Icon } from "@/components/ui";
import { isValid } from "date-fns";

interface AssigneeTaskChartProps {
  projectId: string;
}

/**
 * WBS 항목 데이터 인터페이스
 * API에서 assignees 배열로 반환됨 (복수 담당자 지원)
 */
interface WbsItemData {
  id: string;
  level: string;
  parentId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  assignees?: Array<{
    id: string;
    name?: string | null;
    email?: string;
  }>;
  children?: WbsItemData[];
  [key: string]: unknown;
}

// 담당자별 색상 팔레트 (사이버펑크 테마)
const ASSIGNEE_COLORS = [
  "#00f3ff", // 시안
  "#fa00ff", // 마젠타
  "#39ff14", // 네온 그린
  "#ff6b35", // 오렌지
  "#ffd700", // 골드
  "#ff1493", // 딥 핑크
  "#7b68ee", // 미디엄 슬레이트 블루
  "#00ff7f", // 스프링 그린
];

// 차트 데이터 타입
interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
  [key: string]: string | number;
}

// 커스텀 툴팁 Props 타입
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataItem;
  }>;
}

/**
 * 커스텀 툴팁 컴포넌트
 */
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/90 border border-[#00f3ff]/50 p-4 rounded-lg shadow-[0_0_15px_rgba(0,243,255,0.3)] backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: data.color,
              boxShadow: `0 0 8px ${data.color}`,
            }}
          />
          <span className="text-sm font-bold text-white">{data.name}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">작업 건수:</span>
            <span className="text-sm font-bold" style={{ color: data.color }}>
              {data.value}건
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">비율:</span>
            <span className="text-sm font-bold" style={{ color: data.color }}>
              {data.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * 활성 섹터 렌더링 (호버 시 확대 효과)
 */
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
  } = props;

  return (
    <g>
      {/* 확대된 섹터 */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 5}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: `drop-shadow(0 0 15px ${fill})`,
        }}
      />
      {/* 내부 원 */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 5}
        outerRadius={innerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
      {/* 중앙 텍스트 */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="#fff"
        className="text-sm font-bold"
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 15}
        textAnchor="middle"
        fill={fill}
        className="text-lg font-bold"
        style={{ filter: `drop-shadow(0 0 4px ${fill})` }}
      >
        {payload.value}건
      </text>
      <text
        x={cx}
        y={cy + 35}
        textAnchor="middle"
        fill="#94a3b8"
        className="text-xs"
      >
        ({payload.percentage.toFixed(1)}%)
      </text>
    </g>
  );
};

export function AssigneeTaskChart({ projectId }: AssigneeTaskChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // WBS 데이터 조회 (평탄화된 목록)
  const { data: wbsItems = [], isLoading } = useWbsItems({
    projectId,
    flat: true,
  });

  /**
   * 차트 데이터 가공 - 담당자별 총 작업 건수
   */
  const chartData = useMemo(() => {
    if (!wbsItems.length) return [];

    const allItems = wbsItems as unknown as WbsItemData[];

    // 부모 ID 목록 수집
    const parentIds = new Set<string>();
    allItems.forEach((item) => {
      if (item.parentId) {
        parentIds.add(item.parentId);
      }
    });

    // 말단 업무 필터링 (담당자가 있는 것만)
    const tasks = allItems.filter(
      (item) =>
        !parentIds.has(item.id) &&
        item.startDate &&
        item.endDate &&
        item.assignees &&
        item.assignees.length > 0 &&
        isValid(new Date(item.startDate)) &&
        isValid(new Date(item.endDate))
    );

    if (tasks.length === 0) return [];

    // 담당자별 작업 건수 집계
    const assigneeCount = new Map<string, { name: string; count: number }>();

    tasks.forEach((task) => {
      if (task.assignees) {
        task.assignees.forEach((assignee) => {
          const name = assignee.name || assignee.email?.split("@")[0] || "Unknown";
          const existing = assigneeCount.get(assignee.id);
          if (existing) {
            existing.count += 1;
          } else {
            assigneeCount.set(assignee.id, { name, count: 1 });
          }
        });
      }
    });

    // 총 작업 수 계산
    const totalCount = Array.from(assigneeCount.values()).reduce(
      (sum, item) => sum + item.count,
      0
    );

    // 차트 데이터 변환 (건수 내림차순 정렬)
    const data: ChartDataItem[] = Array.from(assigneeCount.entries())
      .map(([id, { name, count }], index) => ({
        id,
        name,
        value: count,
        color: ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length],
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return data;
  }, [wbsItems]);

  // 총 작업 건수
  const totalTasks = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData]
  );

  // 마우스 이벤트 핸들러
  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(undefined);
  }, []);

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
        <Icon name="group" size="xl" />
        <p>프로젝트를 선택하면 담당자별 차트가 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-[#0a0a12] rounded-xl border border-[#1e1e3f] overflow-hidden shadow-2xl group">
      {/* 사이버펑크 배경 효과 */}
      <div className="absolute inset-0 bg-[url('https://api.placeholder.com/cyberpunk-grid.png')] opacity-10 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#fa00ff] to-transparent opacity-50" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#00f3ff] to-transparent opacity-50" />

      {/* 헤더 */}
      <div className="relative z-10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="group" className="text-[#fa00ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-linear-to-r from-[#fa00ff] to-[#00f3ff]">
              ASSIGNEE DISTRIBUTION
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 담당자별 작업분포
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-mono tracking-wide">
            TOTAL {totalTasks} TASKS // {chartData.length} MEMBERS
          </p>
        </div>
      </div>

      {/* 차트 영역 */}
      <div className="relative z-10 w-full h-[350px] flex">
        {chartData.length > 0 ? (
          <>
            {/* 도넛 차트 */}
            <div className="flex-1 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    {...{ activeIndex } as unknown as Record<string, unknown>}
                    activeShape={renderActiveShape}
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                    animationDuration={1000}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={entry.color}
                        strokeWidth={1}
                        style={{
                          filter:
                            activeIndex === index
                              ? `drop-shadow(0 0 10px ${entry.color})`
                              : `drop-shadow(0 0 4px ${entry.color})`,
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 범례 */}
            <div className="w-48 pr-6 py-4 flex flex-col justify-center">
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {chartData.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeIndex === index
                        ? "bg-white/10"
                        : "hover:bg-white/5"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: entry.color,
                        boxShadow: `0 0 6px ${entry.color}`,
                      }}
                    />
                    <span className="text-xs text-slate-300 truncate flex-1">
                      {entry.name}
                    </span>
                    <span
                      className="text-xs font-bold font-mono"
                      style={{ color: entry.color }}
                    >
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono">
            <span className="text-4xl mb-2 opacity-20">NO DATA</span>
            <p className="text-xs tracking-widest text-[#00f3ff]/50">
              ASSIGN TASKS TO TEAM MEMBERS
            </p>
          </div>
        )}
      </div>

      {/* 하단 장식용 바 */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-[#fa00ff] via-[#00f3ff] to-[#fa00ff] opacity-20"></div>
    </div>
  );
}
