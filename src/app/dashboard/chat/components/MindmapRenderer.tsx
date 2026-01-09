/**
 * @file src/app/dashboard/chat/components/MindmapRenderer.tsx
 * @description
 * 마인드맵 렌더링 컴포넌트입니다.
 * React.memo로 감싸서 불필요한 리렌더링을 방지합니다.
 *
 * 기능:
 * - ECharts 트리 차트로 마인드맵 표시
 * - 진행률에 따른 노드 색상
 * - 툴팁에 상세 정보 (진행률, 담당자, 완료일) 표시
 * - 전체화면 모드 지원
 */

import React, { memo, useMemo } from "react";
import ReactECharts from "echarts-for-react";

/**
 * 마인드맵 노드 타입
 */
export interface MindmapNode {
  name: string;
  children?: MindmapNode[];
  value?: number;
  progress?: number;
  assignee?: string;
  endDate?: string;
  status?: string;
  itemStyle?: {
    color?: string;
  };
}

interface MindmapRendererProps {
  data: MindmapNode;
  isFullscreen?: boolean;
}

/**
 * 노드 수 계산
 */
const countNodes = (node: MindmapNode): number => {
  let count = 1;
  if (node.children) {
    node.children.forEach((child) => (count += countNodes(child)));
  }
  return count;
};

/**
 * 노드 색상 결정 - 진행률 기반
 */
const getNodeColor = (node: MindmapNode): string => {
  if (typeof node.progress === "number") {
    if (node.progress >= 100) return "#10B981"; // 완료 - 에메랄드
    if (node.progress >= 80) return "#3B82F6"; // 80% 이상 - 블루
    if (node.progress >= 50) return "#06B6D4"; // 50% 이상 - 시안
    if (node.progress >= 20) return "#F59E0B"; // 20% 이상 - 앰버
    return "#EF4444"; // 20% 미만 - 레드
  }
  return "#3B82F6"; // 기본 블루
};

/**
 * 데이터에 색상 정보 추가
 */
const addColorToNodes = (node: MindmapNode): MindmapNode => {
  const color = getNodeColor(node);
  return {
    ...node,
    itemStyle: { color },
    children: node.children?.map(addColorToNodes),
  };
};

/**
 * 마인드맵 렌더링 컴포넌트
 */
const MindmapRenderer = memo(function MindmapRenderer({
  data,
  isFullscreen = false,
}: MindmapRendererProps) {
  if (!data) return null;

  // 노드 수에 따라 초기 깊이 조절 - useMemo로 캐싱
  const { totalNodes, initialDepth, coloredData } = useMemo(() => {
    const total = countNodes(data);
    const depth = total > 50 ? 1 : total > 20 ? 2 : 3;
    const colored = addColorToNodes(data);
    return { totalNodes: total, initialDepth: depth, coloredData: colored };
  }, [data]);

  // 현재 테마 감지 (dark 클래스 확인)
  const isDarkMode =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const textColor = isDarkMode ? "#E5E7EB" : "#1F2937";
  const lineColor = isDarkMode ? "#6B7280" : "#9CA3AF";

  // ECharts 옵션 - useMemo로 캐싱
  const mindmapOption = useMemo(() => {
    /**
     * 노드 라벨 포맷터 - 진행률, 담당자, 완료일 포함
     */
    const formatLabel = (params: { data: MindmapNode }) => {
      const { name, progress, assignee, endDate } = params.data;
      const parts: string[] = [];

      // 이름 (전체화면이 아니면 줄이기)
      let displayName = name;
      if (!isFullscreen && name.length > 20) {
        displayName = name.slice(0, 20) + "...";
      }
      parts.push(displayName);

      // 추가 정보 (있을 경우에만 표시)
      const infoParts: string[] = [];
      if (typeof progress === "number") {
        infoParts.push(`${progress}%`);
      }
      if (assignee) {
        infoParts.push(assignee);
      }
      if (endDate) {
        const date = new Date(endDate);
        if (!isNaN(date.getTime())) {
          infoParts.push(`${date.getMonth() + 1}/${date.getDate()}`);
        }
      }

      if (infoParts.length > 0) {
        parts.push(`(${infoParts.join(" | ")})`);
      }

      return parts.join(" ");
    };

    /**
     * 툴팁 포맷터 - 상세 정보 표시
     */
    const formatTooltip = (params: { data: MindmapNode }) => {
      const { name, progress, assignee, endDate, status } = params.data;
      const lines: string[] = [`<strong>${name}</strong>`];

      if (typeof progress === "number") {
        const progressColor =
          progress >= 80
            ? "#10B981"
            : progress >= 50
            ? "#3B82F6"
            : progress >= 20
            ? "#F59E0B"
            : "#EF4444";
        lines.push(
          `<span style="color:${progressColor}">진행률: ${progress}%</span>`
        );
      }
      if (assignee) {
        lines.push(`담당자: ${assignee}`);
      }
      if (endDate) {
        const date = new Date(endDate);
        if (!isNaN(date.getTime())) {
          const formatted = date.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          lines.push(`완료일: ${formatted}`);
        }
      }
      if (status) {
        const statusMap: Record<string, string> = {
          PENDING: "대기",
          IN_PROGRESS: "진행중",
          COMPLETED: "완료",
          ON_HOLD: "보류",
        };
        lines.push(`상태: ${statusMap[status] || status}`);
      }

      return lines.join("<br/>");
    };

    return {
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
        borderColor: isDarkMode ? "#374151" : "#E5E7EB",
        textStyle: {
          color: isDarkMode ? "#E5E7EB" : "#1F2937",
        },
        formatter: formatTooltip,
      },
      series: [
        {
          type: "tree",
          data: [coloredData],
          top: "5%",
          left: isFullscreen ? "5%" : "10%",
          bottom: "5%",
          right: isFullscreen ? "20%" : "25%",
          symbolSize: isFullscreen ? 14 : 10,
          orient: "LR",
          label: {
            position: "left",
            verticalAlign: "middle",
            align: "right",
            fontSize: isFullscreen ? 13 : 11,
            color: textColor,
            formatter: formatLabel,
            rich: {
              progress: {
                color: "#3B82F6",
                fontSize: 10,
              },
            },
          },
          leaves: {
            label: {
              position: "right",
              verticalAlign: "middle",
              align: "left",
            },
          },
          emphasis: {
            focus: "descendant",
          },
          expandAndCollapse: true,
          animationDuration: 550,
          animationDurationUpdate: 750,
          initialTreeDepth: isFullscreen ? 2 : initialDepth,
          lineStyle: {
            color: lineColor,
            width: 1.5,
            curveness: 0.5,
          },
        },
      ],
      backgroundColor: "transparent",
    };
  }, [coloredData, isFullscreen, isDarkMode, textColor, lineColor, initialDepth]);

  const height = isFullscreen ? "calc(85vh - 100px)" : "500px";

  return (
    <ReactECharts
      option={mindmapOption}
      style={{ height, width: "100%" }}
      opts={{ renderer: "canvas" }}
    />
  );
});

export default MindmapRenderer;
