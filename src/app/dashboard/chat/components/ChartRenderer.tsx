/**
 * @file src/app/dashboard/chat/components/ChartRenderer.tsx
 * @description
 * Recharts 기반 차트 렌더링 컴포넌트입니다.
 * 대시보드와 동일한 사이버펑크 테마 스타일을 적용합니다.
 *
 * 지원 차트 타입:
 * - bar: 그래디언트 막대 차트
 * - line: 부드러운 곡선 라인 차트
 * - pie: 도넛 차트 (중앙 라벨)
 * - area: 그래디언트 영역 차트
 */

"use client";

import React, { memo, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

/**
 * 사이버펑크 테마 색상 팔레트
 */
const CYBER_COLORS = [
  "#00f3ff", // 시안
  "#fa00ff", // 마젠타
  "#39ff14", // 네온 그린
  "#ff6b35", // 오렌지
  "#ffd700", // 골드
  "#ff1493", // 딥 핑크
  "#7b68ee", // 미디엄 슬레이트 블루
  "#00ff7f", // 스프링 그린
];

/**
 * 차트 데이터 아이템 타입
 */
interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface ChartRendererProps {
  chartType: "bar" | "line" | "pie" | "area";
  chartData: Record<string, unknown>[];
}

/**
 * 커스텀 툴팁 Props 타입
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataItem;
    value: number;
    name: string;
  }>;
  label?: string;
}

/**
 * 커스텀 툴팁 컴포넌트 - 사이버펑크 스타일
 */
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/90 border border-[#00f3ff]/50 p-4 rounded-lg shadow-[0_0_15px_rgba(0,243,255,0.3)] text-[#00f3ff] backdrop-blur-md">
        <p className="text-sm font-bold mb-2 text-white">
          {label || data.payload.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#fa00ff] shadow-[0_0_8px_#fa00ff]" />
          <span className="text-sm font-medium text-slate-300">값:</span>
          <span className="text-lg font-bold text-[#fa00ff]">
            {data.value}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * 파이 차트용 커스텀 툴팁
 */
const PieTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = Number(payload[0].payload.total) || 0;
    const percentage = total > 0 ? ((Number(data.value) / total) * 100).toFixed(1) : 0;

    return (
      <div className="bg-slate-900/90 border border-[#fa00ff]/50 p-4 rounded-lg shadow-[0_0_15px_rgba(250,0,255,0.3)] backdrop-blur-md">
        <p className="text-sm font-bold mb-2 text-white">{data.name}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">값:</span>
            <span className="text-sm font-bold text-[#00f3ff]">{data.value}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">비율:</span>
            <span className="text-sm font-bold text-[#fa00ff]">{percentage}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * 커스텀 범례 렌더링 함수 - 사이버펑크 스타일
 */
const renderLegend = (props: { payload?: Array<{ value: string; color: string }> }) => {
  const { payload } = props;
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-2 px-4">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: entry.color || CYBER_COLORS[index % CYBER_COLORS.length],
              boxShadow: `0 0 6px ${entry.color || CYBER_COLORS[index % CYBER_COLORS.length]}`,
            }}
          />
          <span className="text-xs text-slate-300">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Recharts 기반 차트 렌더링 컴포넌트
 */
const ChartRenderer = memo(function ChartRenderer({
  chartType,
  chartData,
}: ChartRendererProps) {
  // 데이터 유효성 검사
  if (!chartData || chartData.length === 0) {
    console.warn("[ChartRenderer] chartData가 비어있음");
    return null;
  }

  // 유효한 데이터만 필터링 (name과 value가 있는 것만)
  const validData = useMemo(() => {
    const filtered = chartData.filter(
      (d) =>
        d.name !== undefined &&
        d.name !== null &&
        d.value !== undefined &&
        d.value !== null
    ) as ChartDataItem[];

    // 파이 차트를 위한 총합 계산
    const total = filtered.reduce((sum, item) => sum + Number(item.value), 0);
    return filtered.map((item) => ({ ...item, total }));
  }, [chartData]);

  if (validData.length === 0) {
    console.warn("[ChartRenderer] 유효한 데이터가 없음", chartData);
    return null;
  }

  // 공통 스타일
  const axisStyle = {
    fill: "#6b7280",
    fontSize: 12,
    fontFamily: "monospace",
  };

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={validData}
              margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
            >
              <defs>
                {validData.map((_, index) => (
                  <linearGradient
                    key={`barGradient-${index}`}
                    id={`barGradient-${index}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={CYBER_COLORS[index % CYBER_COLORS.length]}
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor={CYBER_COLORS[index % CYBER_COLORS.length]}
                      stopOpacity={0.6}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d2d44" />
              <XAxis
                dataKey="name"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={() => (
                  <div className="flex flex-wrap justify-center gap-4 mt-4 px-4">
                    {validData.map((item, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: CYBER_COLORS[index % CYBER_COLORS.length],
                            boxShadow: `0 0 6px ${CYBER_COLORS[index % CYBER_COLORS.length]}`,
                          }}
                        />
                        <span className="text-xs text-slate-300">{item.name}</span>
                        <span className="text-xs font-bold" style={{ color: CYBER_COLORS[index % CYBER_COLORS.length] }}>
                          ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                animationDuration={1000}
              >
                {validData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#barGradient-${index})`}
                    style={{
                      filter: `drop-shadow(0 4px 8px ${CYBER_COLORS[index % CYBER_COLORS.length]}40)`,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart
              data={validData}
              margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
            >
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00f3ff" />
                  <stop offset="50%" stopColor="#fa00ff" />
                  <stop offset="100%" stopColor="#00f3ff" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d2d44" />
              <XAxis
                dataKey="name"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={() => (
                  <div className="flex flex-wrap justify-center gap-4 mt-4 px-4">
                    {validData.map((item, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: CYBER_COLORS[index % CYBER_COLORS.length],
                            boxShadow: `0 0 6px ${CYBER_COLORS[index % CYBER_COLORS.length]}`,
                          }}
                        />
                        <span className="text-xs text-slate-300">{item.name}</span>
                        <span className="text-xs font-bold" style={{ color: CYBER_COLORS[index % CYBER_COLORS.length] }}>
                          ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                dot={{
                  fill: "#00f3ff",
                  stroke: "#fff",
                  strokeWidth: 2,
                  r: 5,
                }}
                activeDot={{
                  fill: "#fa00ff",
                  stroke: "#fff",
                  strokeWidth: 2,
                  r: 8,
                }}
                animationDuration={1500}
                style={{
                  filter: "drop-shadow(0 0 6px rgba(0, 243, 255, 0.5))",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        const total = validData.reduce((sum, item) => sum + Number(item.value), 0);
        return (
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Pie
                data={validData}
                cx="50%"
                cy="40%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                animationDuration={1000}
              >
                {validData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CYBER_COLORS[index % CYBER_COLORS.length]}
                    stroke={CYBER_COLORS[index % CYBER_COLORS.length]}
                    strokeWidth={1}
                    style={{
                      filter: `drop-shadow(0 0 8px ${CYBER_COLORS[index % CYBER_COLORS.length]})`,
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                verticalAlign="bottom"
                content={() => (
                  <div className="flex flex-wrap justify-center gap-4 mt-4 px-4">
                    {validData.map((item, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: CYBER_COLORS[index % CYBER_COLORS.length],
                            boxShadow: `0 0 6px ${CYBER_COLORS[index % CYBER_COLORS.length]}`,
                          }}
                        />
                        <span className="text-xs text-slate-300">{item.name}</span>
                        <span className="text-xs font-bold" style={{ color: CYBER_COLORS[index % CYBER_COLORS.length] }}>
                          ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              />
              {/* 중앙 총계 표시 */}
              <text
                x="50%"
                y="36%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-2xl font-bold"
                fill="#fff"
              >
                {total}
              </text>
              <text
                x="50%"
                y="44%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs"
                fill="#94a3b8"
              >
                총계
              </text>
            </PieChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart
              data={validData}
              margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
            >
              <defs>
                <linearGradient id="cyberGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#fa00ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00f3ff" />
                  <stop offset="50%" stopColor="#fa00ff" />
                  <stop offset="100%" stopColor="#00f3ff" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d2d44" />
              <XAxis
                dataKey="name"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={() => (
                  <div className="flex flex-wrap justify-center gap-4 mt-4 px-4">
                    {validData.map((item, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: CYBER_COLORS[index % CYBER_COLORS.length],
                            boxShadow: `0 0 6px ${CYBER_COLORS[index % CYBER_COLORS.length]}`,
                          }}
                        />
                        <span className="text-xs text-slate-300">{item.name}</span>
                        <span className="text-xs font-bold" style={{ color: CYBER_COLORS[index % CYBER_COLORS.length] }}>
                          ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#areaLineGradient)"
                strokeWidth={3}
                fill="url(#cyberGradient)"
                animationDuration={1500}
                style={{
                  filter: "drop-shadow(0 0 6px rgba(0, 243, 255, 0.5))",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative w-full bg-[#0a0a12] rounded-xl border border-[#1e1e3f] overflow-hidden shadow-2xl p-4">
      {/* 사이버펑크 배경 효과 */}
      <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#00f3ff] to-transparent opacity-50" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#fa00ff] to-transparent opacity-50" />

      {/* 차트 영역 */}
      <div className="relative z-10">{renderChart()}</div>
    </div>
  );
});

export default ChartRenderer;
