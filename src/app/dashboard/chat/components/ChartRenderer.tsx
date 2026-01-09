/**
 * @file src/app/dashboard/chat/components/ChartRenderer.tsx
 * @description
 * ECharts 기반 차트 렌더링 컴포넌트입니다.
 * 모던하고 세련된 시각화를 제공합니다.
 *
 * 지원 차트 타입:
 * - bar: 그래디언트 막대 차트
 * - bar3d: 3D 막대 차트
 * - line: 부드러운 곡선 라인 차트
 * - pie: 도넛 차트 (중앙 라벨)
 * - area: 그래디언트 영역 차트
 */

import React, { memo, useMemo, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import "echarts-gl";

/**
 * 모던 그래디언트 색상 팔레트
 */
const GRADIENT_COLORS = [
  { start: "#6366F1", end: "#8B5CF6" },  // indigo → violet
  { start: "#10B981", end: "#34D399" },  // emerald
  { start: "#F59E0B", end: "#FBBF24" },  // amber
  { start: "#EF4444", end: "#F87171" },  // red
  { start: "#3B82F6", end: "#60A5FA" },  // blue
  { start: "#EC4899", end: "#F472B6" },  // pink
  { start: "#06B6D4", end: "#22D3EE" },  // cyan
  { start: "#8B5CF6", end: "#A78BFA" },  // purple
];

/**
 * 단색 팔레트 (그래디언트 시작색 기준)
 */
const SOLID_COLORS = GRADIENT_COLORS.map(c => c.start);

interface ChartRendererProps {
  chartType: "bar" | "bar3d" | "line" | "pie" | "area";
  chartData: Record<string, unknown>[];
}

/**
 * ECharts 기반 차트 렌더링 컴포넌트
 */
const ChartRenderer = memo(function ChartRenderer({
  chartType,
  chartData,
}: ChartRendererProps) {
  const chartRef = useRef<ReactECharts>(null);

  // 3D 차트 cleanup - 컴포넌트 언마운트 시 애니메이션 중지
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        const instance = chartRef.current.getEchartsInstance();
        if (instance && !instance.isDisposed()) {
          // 3D 차트의 경우 애니메이션을 먼저 중지
          instance.dispatchAction({ type: 'bindViewControl', bindAutoRotate: false });
          instance.dispose();
        }
      }
    };
  }, []);

  // 데이터 유효성 검사
  if (!chartData || chartData.length === 0) {
    console.warn("[ChartRenderer] chartData가 비어있음");
    return null;
  }

  // 유효한 데이터만 필터링 (name과 value가 있는 것만)
  const validData = chartData.filter(
    (d) => d.name !== undefined && d.name !== null && d.value !== undefined && d.value !== null
  );

  if (validData.length === 0) {
    console.warn("[ChartRenderer] 유효한 데이터가 없음", chartData);
    return null;
  }

  const labels = validData.map((d) => String(d.name || ""));
  const values = validData.map((d) => Number(d.value) || 0);

  // 디버깅: 데이터 확인
  if (chartType === "bar3d") {
    console.log("[ChartRenderer] bar3d 데이터:", { labels, values, validData });
  }

  // 다크모드 감지
  const isDarkMode = typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const textColor = isDarkMode ? "#E5E7EB" : "#374151";
  const gridColor = isDarkMode ? "#374151" : "#E5E7EB";
  const bgColor = "transparent";

  /**
   * 공통 툴팁 스타일
   */
  const tooltipStyle = {
    backgroundColor: isDarkMode ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)",
    borderColor: isDarkMode ? "#374151" : "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    padding: [12, 16],
    textStyle: {
      color: textColor,
      fontSize: 13,
    },
    extraCssText: "box-shadow: 0 10px 40px rgba(0,0,0,0.2); backdrop-filter: blur(8px);",
  };

  /**
   * 공통 그리드 스타일
   */
  const gridStyle = {
    left: "3%",
    right: "4%",
    bottom: "12%",
    top: "10%",
    containLabel: true,
  };

  const option = useMemo(() => {
    switch (chartType) {
      case "bar":
        return {
          backgroundColor: bgColor,
          tooltip: {
            ...tooltipStyle,
            trigger: "axis",
            axisPointer: {
              type: "shadow",
              shadowStyle: {
                color: isDarkMode ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.08)",
              },
            },
          },
          grid: gridStyle,
          xAxis: {
            type: "category",
            data: labels,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: textColor,
              fontSize: 12,
              margin: 12,
            },
          },
          yAxis: {
            type: "value",
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: {
              lineStyle: {
                color: gridColor,
                type: "dashed",
              },
            },
            axisLabel: {
              color: textColor,
              fontSize: 12,
            },
          },
          series: [
            {
              type: "bar",
              data: values.map((v, i) => ({
                value: v,
                itemStyle: {
                  color: {
                    type: "linear",
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                      { offset: 0, color: GRADIENT_COLORS[i % GRADIENT_COLORS.length].start },
                      { offset: 1, color: GRADIENT_COLORS[i % GRADIENT_COLORS.length].end },
                    ],
                  },
                  borderRadius: [6, 6, 0, 0],
                  shadowColor: GRADIENT_COLORS[i % GRADIENT_COLORS.length].start,
                  shadowBlur: 8,
                  shadowOffsetY: 4,
                },
              })),
              barWidth: "50%",
              emphasis: {
                itemStyle: {
                  shadowBlur: 20,
                  shadowOffsetY: 8,
                },
              },
              animationDuration: 1000,
              animationEasing: "elasticOut",
            },
          ],
        };

      case "line":
        return {
          backgroundColor: bgColor,
          tooltip: {
            ...tooltipStyle,
            trigger: "axis",
            axisPointer: {
              type: "cross",
              crossStyle: { color: SOLID_COLORS[0] },
              lineStyle: { color: SOLID_COLORS[0], type: "dashed" },
            },
          },
          grid: gridStyle,
          xAxis: {
            type: "category",
            data: labels,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: textColor,
              fontSize: 12,
              margin: 12,
            },
          },
          yAxis: {
            type: "value",
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: {
              lineStyle: {
                color: gridColor,
                type: "dashed",
              },
            },
            axisLabel: {
              color: textColor,
              fontSize: 12,
            },
          },
          series: [
            {
              type: "line",
              data: values,
              smooth: 0.4,
              symbol: "circle",
              symbolSize: 10,
              lineStyle: {
                width: 3,
                color: {
                  type: "linear",
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: GRADIENT_COLORS[0].start },
                    { offset: 1, color: GRADIENT_COLORS[0].end },
                  ],
                },
                shadowColor: GRADIENT_COLORS[0].start,
                shadowBlur: 10,
                shadowOffsetY: 8,
              },
              itemStyle: {
                color: GRADIENT_COLORS[0].start,
                borderColor: "#fff",
                borderWidth: 2,
                shadowColor: GRADIENT_COLORS[0].start,
                shadowBlur: 8,
              },
              areaStyle: {
                color: {
                  type: "linear",
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: `${GRADIENT_COLORS[0].start}40` },
                    { offset: 1, color: `${GRADIENT_COLORS[0].start}05` },
                  ],
                },
              },
              emphasis: {
                scale: true,
                itemStyle: {
                  shadowBlur: 16,
                },
              },
              animationDuration: 1500,
              animationEasing: "cubicOut",
            },
          ],
        };

      case "pie":
        const total = values.reduce((a, b) => a + b, 0);
        return {
          backgroundColor: bgColor,
          tooltip: {
            ...tooltipStyle,
            trigger: "item",
            formatter: "{b}: {c} ({d}%)",
          },
          legend: {
            orient: "horizontal",
            bottom: "5%",
            itemGap: 20,
            itemWidth: 12,
            itemHeight: 12,
            textStyle: {
              color: textColor,
              fontSize: 12,
            },
          },
          series: [
            {
              type: "pie",
              radius: ["45%", "70%"],
              center: ["50%", "45%"],
              avoidLabelOverlap: true,
              itemStyle: {
                borderRadius: 8,
                borderColor: isDarkMode ? "#1F2937" : "#FFFFFF",
                borderWidth: 3,
              },
              label: {
                show: false,
              },
              emphasis: {
                scale: true,
                scaleSize: 10,
                itemStyle: {
                  shadowBlur: 20,
                  shadowColor: "rgba(0, 0, 0, 0.3)",
                },
              },
              data: validData.map((d, i) => ({
                value: d.value,
                name: d.name,
                itemStyle: {
                  color: {
                    type: "linear",
                    x: 0, y: 0, x2: 1, y2: 1,
                    colorStops: [
                      { offset: 0, color: GRADIENT_COLORS[i % GRADIENT_COLORS.length].start },
                      { offset: 1, color: GRADIENT_COLORS[i % GRADIENT_COLORS.length].end },
                    ],
                  },
                },
              })),
              animationType: "scale",
              animationDuration: 1000,
              animationEasing: "elasticOut",
            },
            // 중앙 텍스트를 위한 가짜 시리즈
            {
              type: "pie",
              radius: ["0%", "0%"],
              center: ["50%", "45%"],
              silent: true,
              label: {
                show: true,
                position: "center",
                formatter: () => `{total|${total}}\n{label|총계}`,
                rich: {
                  total: {
                    fontSize: 28,
                    fontWeight: "bold",
                    color: textColor,
                    lineHeight: 36,
                  },
                  label: {
                    fontSize: 13,
                    color: isDarkMode ? "#9CA3AF" : "#6B7280",
                    lineHeight: 20,
                  },
                },
              },
              data: [{ value: 0 }],
            },
          ],
        };

      case "area":
        return {
          backgroundColor: bgColor,
          tooltip: {
            ...tooltipStyle,
            trigger: "axis",
            axisPointer: {
              type: "line",
              lineStyle: { color: SOLID_COLORS[1], type: "dashed" },
            },
          },
          grid: gridStyle,
          xAxis: {
            type: "category",
            data: labels,
            boundaryGap: false,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: textColor,
              fontSize: 12,
              margin: 12,
            },
          },
          yAxis: {
            type: "value",
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: {
              lineStyle: {
                color: gridColor,
                type: "dashed",
              },
            },
            axisLabel: {
              color: textColor,
              fontSize: 12,
            },
          },
          series: [
            {
              type: "line",
              data: values,
              smooth: 0.5,
              symbol: "circle",
              symbolSize: 8,
              lineStyle: {
                width: 3,
                color: GRADIENT_COLORS[1].start,
                shadowColor: GRADIENT_COLORS[1].start,
                shadowBlur: 8,
                shadowOffsetY: 4,
              },
              itemStyle: {
                color: GRADIENT_COLORS[1].start,
                borderColor: "#fff",
                borderWidth: 2,
              },
              areaStyle: {
                color: {
                  type: "linear",
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: `${GRADIENT_COLORS[1].start}60` },
                    { offset: 0.5, color: `${GRADIENT_COLORS[1].start}20` },
                    { offset: 1, color: `${GRADIENT_COLORS[1].start}05` },
                  ],
                },
              },
              emphasis: {
                scale: true,
              },
              animationDuration: 1500,
              animationEasing: "cubicOut",
            },
          ],
        };

      case "bar3d":
        // 3D 차트는 유효한 labels가 필수
        if (labels.length === 0 || labels.some(l => !l)) {
          console.warn("[ChartRenderer] bar3d: labels가 유효하지 않음", labels);
          return {};
        }
        return {
          backgroundColor: bgColor,
          tooltip: {
            ...tooltipStyle,
            trigger: "item",
          },
          xAxis3D: {
            type: "category",
            data: [...labels], // 새 배열로 복사하여 전달
            axisLabel: { color: textColor, fontSize: 11 },
            axisLine: { lineStyle: { color: gridColor } },
          },
          yAxis3D: {
            type: "category",
            data: [""],
            axisLabel: { show: false },
            axisLine: { show: false },
          },
          zAxis3D: {
            type: "value",
            axisLabel: { color: textColor, fontSize: 11 },
            axisLine: { lineStyle: { color: gridColor } },
          },
          grid3D: {
            boxWidth: 180,
            boxDepth: 60,
            boxHeight: 100,
            viewControl: {
              alpha: 20,
              beta: 35,
              distance: 260,
              rotateSensitivity: 1,
              zoomSensitivity: 1,
              autoRotate: false,  // 자동 회전 비활성화 (오류 방지)
            },
            light: {
              main: { intensity: 1.2, shadow: true },
              ambient: { intensity: 0.4 },
            },
            environment: isDarkMode ? "#111827" : "#F9FAFB",
          },
          series: [
            {
              type: "bar3D",
              data: values.map((v, i) => ({
                value: [i, 0, v],
                itemStyle: {
                  color: {
                    type: "linear",
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                      { offset: 0, color: GRADIENT_COLORS[i % GRADIENT_COLORS.length].start },
                      { offset: 1, color: GRADIENT_COLORS[i % GRADIENT_COLORS.length].end },
                    ],
                  },
                  opacity: 0.9,
                },
              })),
              shading: "realistic",
              realisticMaterial: {
                roughness: 0.4,
                metalness: 0.1,
              },
              label: {
                show: true,
                formatter: (params: { value: number[] }) => String(params.value[2]),
                textStyle: { color: "#fff", fontSize: 12, fontWeight: "bold" },
                distance: 5,
              },
              emphasis: {
                itemStyle: {
                  color: "#FFD700",
                  opacity: 1,
                },
              },
              barSize: 25,
              animationDuration: 800,
              animationEasing: "cubicOut",
            },
          ],
        };

      default:
        return {};
    }
  }, [chartType, validData, labels, values, isDarkMode, textColor, gridColor]);

  // option이 비어있으면 렌더링하지 않음 (3D 차트 오류 방지)
  if (!option || Object.keys(option).length === 0) {
    console.warn("[ChartRenderer] option이 비어있어 렌더링 스킵", { chartType });
    return null;
  }

  return (
    <ReactECharts
      ref={chartRef}
      option={option}
      style={{ height: chartType === "bar3d" ? "380px" : "320px", width: "100%" }}
      opts={{ renderer: "canvas" }}
      notMerge={true}
      lazyUpdate={true}
      onChartReady={(instance) => {
        // 3D 차트 초기화 완료 후 로그
        if (chartType === "bar3d") {
          console.log("[ChartRenderer] bar3d 차트 준비 완료");
        }
      }}
    />
  );
});

export default ChartRenderer;
