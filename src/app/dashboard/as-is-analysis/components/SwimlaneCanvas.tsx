/**
 * @file src/app/dashboard/as-is-analysis/components/SwimlaneCanvas.tsx
 * @description
 * Swimlane 캔버스 컴포넌트입니다.
 * 담당자/부서별 레인으로 구분된 프로세스 흐름도를 구현합니다.
 *
 * 초보자 가이드:
 * 1. **레인 추가**: 담당자/부서별 레인 추가
 * 2. **노드 배치**: 각 레인에 프로세스 노드 배치
 * 3. **연결**: 레인 간 프로세스 연결
 */

"use client";

import { useCallback, useRef, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  ReactFlowInstance,
  MarkerType,
  Panel,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";

import { Icon, Button, Input } from "@/components/ui";
import { swimlaneNodeTypes } from "./nodes";
import type { SwimlaneData, SwimlaneHeader } from "../types";

interface SwimlaneCanvasProps {
  /** 초기 데이터 */
  initialData?: SwimlaneData | null;
  /** 저장 핸들러 */
  onSave?: (data: SwimlaneData) => void;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
}

/** 레인 높이 */
const LANE_HEIGHT = 150;

/** 레인 색상 */
const LANE_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", header: "bg-blue-100" },
  { bg: "bg-green-50", border: "border-green-200", header: "bg-green-100" },
  { bg: "bg-purple-50", border: "border-purple-200", header: "bg-purple-100" },
  { bg: "bg-orange-50", border: "border-orange-200", header: "bg-orange-100" },
  { bg: "bg-pink-50", border: "border-pink-200", header: "bg-pink-100" },
  { bg: "bg-cyan-50", border: "border-cyan-200", header: "bg-cyan-100" },
];

/**
 * Swimlane 캔버스 내부 컴포넌트
 */
function SwimlaneCanvasInner({ initialData, onSave, readOnly = false }: SwimlaneCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || []);
  const [lanes, setLanes] = useState<SwimlaneHeader[]>(initialData?.lanes || []);
  const [showAddLane, setShowAddLane] = useState(false);
  const [newLaneName, setNewLaneName] = useState("");

  // 노드 ID 생성
  const getId = useCallback(() => `node_${Date.now()}`, []);

  // 연결 추가
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [readOnly, setEdges]
  );

  // 레인 추가
  const handleAddLane = useCallback(() => {
    if (!newLaneName.trim()) return;

    const newLane: SwimlaneHeader = {
      id: `lane_${Date.now()}`,
      name: newLaneName.trim(),
      order: lanes.length,
    };

    setLanes((prev) => [...prev, newLane]);
    setNewLaneName("");
    setShowAddLane(false);
  }, [newLaneName, lanes.length]);

  // 레인 삭제
  const handleRemoveLane = useCallback(
    (laneId: string) => {
      setLanes((prev) => prev.filter((l) => l.id !== laneId));
      // 해당 레인의 노드도 삭제
      setNodes((nds) => nds.filter((n) => n.data?.laneId !== laneId));
    },
    [setNodes]
  );

  // 레인에 노드 추가
  const handleAddNodeToLane = useCallback(
    (laneId: string, laneIndex: number) => {
      const newNode: Node = {
        id: getId(),
        type: "swimlaneProcess",
        position: { x: 150, y: laneIndex * LANE_HEIGHT + LANE_HEIGHT / 2 - 20 },
        data: { label: "새 작업", laneId },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [getId, setNodes]
  );

  // 저장
  const handleSave = useCallback(() => {
    console.log("[SwimlaneCanvas] 저장 버튼 클릭:", { nodes, edges, lanes, hasOnSave: !!onSave });
    if (onSave) {
      onSave({ nodes, edges, lanes });
    } else {
      console.warn("[SwimlaneCanvas] onSave props가 전달되지 않았습니다.");
    }
  }, [nodes, edges, lanes, onSave]);

  // 드래그 오버 핸들러
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* 레인 헤더 영역 */}
      <div className="flex-none border-b border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
        <div className="flex items-center gap-2 p-2">
          <span className="text-xs font-semibold text-text-secondary uppercase">레인</span>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            {lanes.map((lane, index) => {
              const colorSet = LANE_COLORS[index % LANE_COLORS.length];
              return (
                <div
                  key={lane.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colorSet.header} border ${colorSet.border}`}
                >
                  <Icon name="person" size="xs" className="text-text-secondary" />
                  <span className="text-xs font-medium text-text dark:text-slate-800">
                    {lane.name}
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveLane(lane.id)}
                      className="p-0.5 hover:bg-red-100 rounded"
                    >
                      <Icon name="close" size="xs" className="text-text-secondary hover:text-error" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!readOnly && (
            <>
              {showAddLane ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newLaneName}
                    onChange={(e) => setNewLaneName(e.target.value)}
                    placeholder="레인명"
                    className="w-24 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddLane()}
                  />
                  <Button variant="primary" size="sm" onClick={handleAddLane}>
                    추가
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddLane(false)}>
                    취소
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" leftIcon="add" onClick={() => setShowAddLane(true)}>
                  레인 추가
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 캔버스 영역 */}
      <div ref={reactFlowWrapper} className="flex-1 flex overflow-hidden">
        {/* 레인 라벨 (좌측 고정) */}
        <div className="flex-none w-24 border-r border-border dark:border-border-dark overflow-y-auto">
          {lanes.map((lane, index) => {
            const colorSet = LANE_COLORS[index % LANE_COLORS.length];
            return (
              <div
                key={lane.id}
                className={`${colorSet.header} border-b ${colorSet.border} flex items-center justify-center`}
                style={{ height: LANE_HEIGHT }}
              >
                <span className="text-xs font-medium text-text dark:text-slate-800 writing-mode-vertical"
                      style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
                  {lane.name}
                </span>
              </div>
            );
          })}
          {/* 빈 공간 채우기 */}
          <div className="flex-1 min-h-[200px]" />
        </div>

        {/* ReactFlow 영역 */}
        <div className="flex-1 relative">
          {/* 레인 배경 */}
          <div className="absolute inset-0 pointer-events-none">
            {lanes.map((lane, index) => {
              const colorSet = LANE_COLORS[index % LANE_COLORS.length];
              return (
                <div
                  key={lane.id}
                  className={`absolute left-0 right-0 ${colorSet.bg} border-b ${colorSet.border}`}
                  style={{
                    top: index * LANE_HEIGHT,
                    height: LANE_HEIGHT,
                  }}
                >
                  {/* 노드 추가 버튼 */}
                  {!readOnly && (
                    <button
                      onClick={() => handleAddNodeToLane(lane.id, index)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/80 hover:bg-white shadow-sm pointer-events-auto z-10"
                    >
                      <Icon name="add" size="xs" className="text-text-secondary" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* ReactFlow */}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDragOver={onDragOver}
            nodeTypes={swimlaneNodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            className="!bg-transparent"
            minZoom={0.2}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            /* 휠 스크롤 동작 설정: Ctrl+휠로만 줌, 일반 휠은 페이지 스크롤 */
            zoomOnScroll={false}
            panOnScroll={false}
            zoomActivationKeyCode="Control"
          >
            <Background variant={BackgroundVariant.Dots} gap={15} size={1} color="#cbd5e1" />
            <Controls showInteractive={!readOnly} className="!left-2 !bottom-2" />

            {/* 상단 패널 */}
            <Panel position="top-right" className="flex items-center gap-2">
              {!readOnly && (
                <Button variant="primary" size="sm" leftIcon="save" onClick={handleSave}>
                  저장
                </Button>
              )}
            </Panel>
          </ReactFlow>

          {/* 빈 상태 */}
          {lanes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/50 dark:bg-surface-dark/50">
              <div className="text-center">
                <Icon name="view_column" size="xl" className="text-green-300 mb-4" />
                <p className="text-sm text-text-secondary mb-2">레인이 없습니다</p>
                <p className="text-xs text-text-secondary">
                  &apos;레인 추가&apos; 버튼을 클릭하여 담당자별 레인을 추가하세요
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Swimlane 캔버스 컴포넌트 (Provider 포함)
 */
export function SwimlaneCanvas(props: SwimlaneCanvasProps) {
  return (
    <ReactFlowProvider>
      <SwimlaneCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
