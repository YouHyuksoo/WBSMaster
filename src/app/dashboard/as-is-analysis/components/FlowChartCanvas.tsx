/**
 * @file src/app/dashboard/as-is-analysis/components/FlowChartCanvas.tsx
 * @description
 * Flow Chart 캔버스 컴포넌트입니다.
 * ReactFlow를 사용하여 드래그앤드롭 흐름도를 구현합니다.
 *
 * 초보자 가이드:
 * 1. **노드 팔레트**: 좌측에서 노드를 드래그하여 추가
 * 2. **노드 연결**: 핸들을 드래그하여 연결
 * 3. **저장**: 변경사항은 자동 저장 또는 수동 저장
 */

"use client";

import { useCallback, useRef, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
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

import { Icon, Button } from "@/components/ui";
import { flowChartNodeTypes } from "./nodes";
import type { FlowChartData } from "../types";

interface FlowChartCanvasProps {
  /** 초기 데이터 */
  initialData?: FlowChartData | null;
  /** 저장 핸들러 */
  onSave?: (data: FlowChartData) => void;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
}

/** 노드 팔레트 아이템 */
const NODE_PALETTE = [
  { type: "startEnd", label: "시작", icon: "play_circle", data: { label: "시작", type: "start" }, color: "text-green-600" },
  { type: "process", label: "프로세스", icon: "crop_square", data: { label: "프로세스" }, color: "text-blue-600" },
  { type: "subProcess", label: "서브프로세스", icon: "account_tree", data: { label: "서브프로세스" }, color: "text-cyan-600" },
  { type: "decision", label: "판단", icon: "change_history", data: { label: "조건?" }, color: "text-orange-600" },
  { type: "manualInput", label: "수동입력", icon: "keyboard", data: { label: "수동 입력" }, color: "text-pink-600" },
  { type: "document", label: "문서", icon: "description", data: { label: "문서" }, color: "text-purple-600" },
  { type: "data", label: "데이터", icon: "storage", data: { label: "데이터" }, color: "text-teal-600" },
  { type: "interface", label: "인터페이스", icon: "swap_horiz", data: { label: "인터페이스" }, color: "text-indigo-600" },
  { type: "database", label: "DB저장", icon: "database", data: { label: "DB" }, color: "text-amber-600" },
  { type: "startEnd", label: "종료", icon: "stop_circle", data: { label: "종료", type: "end" }, color: "text-red-600" },
];

/** 연결선 타입 */
type EdgeType = "smoothstep" | "straight" | "step" | "bezier";

/** 기본 노드 */
const defaultNodes: Node[] = [
  {
    id: "start",
    type: "startEnd",
    position: { x: 250, y: 50 },
    data: { label: "시작", type: "start" },
  },
];

/** 기본 엣지 */
const defaultEdges: Edge[] = [];

/**
 * Flow Chart 캔버스 내부 컴포넌트
 */
function FlowChartCanvasInner({ initialData, onSave, readOnly = false }: FlowChartCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || defaultEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [edgeType, setEdgeType] = useState<EdgeType>("smoothstep");

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
            type: edgeType,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [readOnly, setEdges, edgeType]
  );

  // 엣지 클릭 (선택)
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // 노드 선택
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // 캔버스 클릭 (선택 해제)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // 드래그 오버 핸들러
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // 드롭 핸들러 (노드 추가)
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (readOnly || !reactFlowInstance || !reactFlowWrapper.current) return;

      const type = event.dataTransfer.getData("application/reactflow/type");
      const dataStr = event.dataTransfer.getData("application/reactflow/data");

      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: dataStr ? JSON.parse(dataStr) : { label: type },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, readOnly, getId, setNodes]
  );

  // 저장
  const handleSave = useCallback(() => {
    console.log("[FlowChartCanvas] 저장 버튼 클릭:", { nodes, edges, hasOnSave: !!onSave });
    if (onSave) {
      onSave({ nodes, edges });
    } else {
      console.warn("[FlowChartCanvas] onSave props가 전달되지 않았습니다.");
    }
  }, [nodes, edges, onSave]);

  // 선택된 노드 삭제
  const handleDeleteSelectedNode = useCallback(() => {
    if (readOnly || !selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [readOnly, selectedNode, setNodes, setEdges]);

  // 선택된 엣지 삭제
  const handleDeleteSelectedEdge = useCallback(() => {
    if (readOnly || !selectedEdge) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdge(null);
  }, [readOnly, selectedEdge, setEdges]);

  // 연결선 타입 변경 (기존 엣지들도 업데이트)
  const handleEdgeTypeChange = useCallback((newType: EdgeType) => {
    setEdgeType(newType);
    // 기존 엣지들의 타입도 변경
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        type: newType,
      }))
    );
  }, [setEdges]);

  // 드래그 시작 핸들러 (팔레트)
  const onDragStart = useCallback((event: React.DragEvent, nodeType: string, data: Record<string, unknown>) => {
    event.dataTransfer.setData("application/reactflow/type", nodeType);
    event.dataTransfer.setData("application/reactflow/data", JSON.stringify(data));
    event.dataTransfer.effectAllowed = "move";
  }, []);

  return (
    <div className="h-full flex">
      {/* 노드 팔레트 */}
      {!readOnly && (
        <div className="w-28 border-r border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-2 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-text-secondary uppercase mb-2">노드</p>
          {NODE_PALETTE.map((item, index) => (
            <div
              key={`${item.type}-${index}`}
              draggable
              onDragStart={(e) => onDragStart(e, item.type, item.data)}
              className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 cursor-grab hover:shadow-md transition-shadow"
            >
              <Icon name={item.icon} size="xs" className={item.color} />
              <span className="text-[10px] text-text dark:text-white">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* 캔버스 */}
      <div ref={reactFlowWrapper} className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={flowChartNodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          className="bg-white dark:bg-slate-900"
          /* 휠 스크롤 동작 설정: Ctrl+휠로만 줌, 일반 휠은 페이지 스크롤 */
          zoomOnScroll={false}
          panOnScroll={false}
          zoomActivationKeyCode="Control"
          defaultEdgeOptions={{
            type: edgeType,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 },
          }}
          deleteKeyCode="Delete"
        >
          <Background variant={BackgroundVariant.Dots} gap={15} size={1} color="#e2e8f0" />
          <Controls showInteractive={!readOnly} />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case "startEnd":
                  return node.data?.type === "start" ? "#22c55e" : "#ef4444";
                case "process":
                  return "#3b82f6";
                case "subProcess":
                  return "#06b6d4";
                case "decision":
                  return "#f97316";
                case "manualInput":
                  return "#ec4899";
                case "document":
                  return "#a855f7";
                case "data":
                  return "#14b8a6";
                case "interface":
                  return "#6366f1";
                case "database":
                  return "#f59e0b";
                default:
                  return "#94a3b8";
              }
            }}
            className="!bg-slate-100 dark:!bg-slate-800"
          />

          {/* 도구 패널 (상단 중앙) */}
          {!readOnly && (
            <Panel position="top-center" className="flex gap-2 bg-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg p-1.5">
              {/* 연결선 타입 선택 */}
              <div className="flex items-center gap-1 pr-2 border-r border-border dark:border-border-dark">
                <span className="text-[10px] font-semibold text-text-secondary mr-1">연결선:</span>

                {/* Smoothstep (부드러운 곡선) */}
                <button
                  onClick={() => handleEdgeTypeChange("smoothstep")}
                  className={`p-1.5 rounded transition-colors ${
                    edgeType === "smoothstep"
                      ? "bg-primary text-white"
                      : "hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
                  }`}
                  title="부드러운 곡선"
                >
                  <Icon name="timeline" size="xs" />
                </button>

                {/* Straight (직선) */}
                <button
                  onClick={() => handleEdgeTypeChange("straight")}
                  className={`p-1.5 rounded transition-colors ${
                    edgeType === "straight"
                      ? "bg-primary text-white"
                      : "hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
                  }`}
                  title="직선"
                >
                  <Icon name="remove" size="xs" />
                </button>

                {/* Step (직각) */}
                <button
                  onClick={() => handleEdgeTypeChange("step")}
                  className={`p-1.5 rounded transition-colors ${
                    edgeType === "step"
                      ? "bg-primary text-white"
                      : "hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
                  }`}
                  title="직각 계단식"
                >
                  <Icon name="bar_chart" size="xs" />
                </button>

                {/* Bezier (베지어 곡선) */}
                <button
                  onClick={() => handleEdgeTypeChange("bezier")}
                  className={`p-1.5 rounded transition-colors ${
                    edgeType === "bezier"
                      ? "bg-primary text-white"
                      : "hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
                  }`}
                  title="베지어 곡선"
                >
                  <Icon name="show_chart" size="xs" />
                </button>
              </div>

              {/* 삭제 버튼 */}
              {(selectedNode || selectedEdge) && (
                <button
                  onClick={selectedNode ? handleDeleteSelectedNode : handleDeleteSelectedEdge}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-error/10 hover:bg-error/20 text-error transition-colors"
                  title={selectedNode ? "노드 삭제" : "연결선 삭제"}
                >
                  <Icon name="delete" size="xs" />
                  <span className="text-[10px] font-medium">
                    {selectedNode ? "노드" : "연결선"} 삭제
                  </span>
                </button>
              )}

              {/* 저장 버튼 */}
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2 py-1 rounded bg-primary hover:bg-primary-hover text-white transition-colors"
                title="저장"
              >
                <Icon name="save" size="xs" />
                <span className="text-[10px] font-medium">저장</span>
              </button>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

/**
 * Flow Chart 캔버스 컴포넌트 (Provider 포함)
 */
export function FlowChartCanvas(props: FlowChartCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowChartCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
