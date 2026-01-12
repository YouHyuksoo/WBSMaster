/**
 * @file src/app/dashboard/equipment/components/EquipmentCanvas.tsx
 * @description
 * React Flow 캔버스 컴포넌트
 * 설비 노드와 연결선을 표시하고 드래그/연결 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **ReactFlow**: 노드 기반 다이어그램 라이브러리
 * 2. **nodes**: 설비 목록을 노드로 변환 (positionX/Y가 0이 아닌 것만 표시)
 * 3. **edges**: 연결 정보를 엣지로 변환 (id, source, target)
 * 4. **onNodeDragStop**: 노드 드래그 종료 시 위치 DB 업데이트
 * 5. **onConnect**: 핸들 드래그로 연결 생성 시 DB 저장
 * 6. **onNodesDelete**: 노드 삭제 시 위치를 (0, 0)으로 초기화 (캔버스에서만 제거)
 *
 * 수정 방법:
 * - 캔버스 스타일: ReactFlow className 수정
 * - 연결선 색상: CONNECTION_TYPE_CONFIG 수정
 * - 캔버스 제거 기준: positionX === 0 && positionY === 0 필터 조건
 */

"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  NodeDragHandler,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { Equipment, EquipmentConnection } from "@/lib/api";
import { EquipmentNode } from "./EquipmentNode";
import { useUpdateEquipment } from "../hooks/useEquipment";
import { useCreateConnection, useDeleteConnection } from "../hooks/useEquipmentConnections";
import { CONNECTION_TYPE_CONFIG } from "../types";

/** 노드 타입 정의 */
const nodeTypes = {
  equipment: EquipmentNode,
};

/** Props 타입 */
interface EquipmentCanvasProps {
  equipments: Equipment[];
  connections: EquipmentConnection[];
  selectedId: string | null;
  onSelectNode: (id: string) => void;
}

/**
 * 내부 캔버스 컴포넌트 (useReactFlow 사용)
 */
function EquipmentCanvasInner({
  equipments,
  connections,
  selectedId,
  onSelectNode,
}: EquipmentCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dragPreviewNode, setDragPreviewNode] = useState<Node | null>(null);
  const [draggingEquipmentId, setDraggingEquipmentId] = useState<string | null>(null);
  const [edgeType, setEdgeType] = useState<"smoothstep" | "straight" | "step" | "bezier">("smoothstep");
  const reactFlowInstance = useReactFlow();

  const updateEquipment = useUpdateEquipment();
  const createConnection = useCreateConnection();
  const deleteConnection = useDeleteConnection();

  // 노드 삭제 핸들러 (useRef로 안정적으로 관리)
  const updateEquipmentRef = useRef(updateEquipment);
  updateEquipmentRef.current = updateEquipment;

  // DB 데이터 → React Flow 노드 변환 (캔버스에 배치된 것만)
  useEffect(() => {
    const flowNodes: Node[] = equipments
      .filter((eq) => eq.positionX !== 0 || eq.positionY !== 0) // 위치가 (0, 0)이 아닌 것만
      .map((eq) => ({
        id: eq.id,
        type: "equipment",
        position: { x: eq.positionX, y: eq.positionY },
        data: {
          equipment: eq,
          isSelected: selectedId === eq.id,
          onRemove: (nodeId: string) => {
            // 🚀 즉시 화면에서 제거 (낙관적 업데이트)
            setNodes((prevNodes) => prevNodes.filter((node) => node.id !== nodeId));

            // 백그라운드에서 DB 업데이트 (위치를 (0, 0)으로 초기화)
            updateEquipmentRef.current.mutate(
              {
                id: nodeId,
                data: {
                  positionX: 0,
                  positionY: 0,
                },
              },
              {
                onError: (error) => {
                  console.error("캔버스에서 제거 실패:", error);
                  // 실패 시 사용자에게 알림 (토스트 등)
                  alert("캔버스에서 제거하는데 실패했습니다. 페이지를 새로고침해주세요.");
                },
              }
            );
          },
        },
      }));
    setNodes(flowNodes);
  }, [equipments, selectedId]);

  // DB 데이터 → React Flow 엣지 변환
  useEffect(() => {
    const flowEdges: Edge[] = connections.map((conn) => ({
      id: conn.id,
      source: conn.fromEquipmentId,
      sourceHandle: conn.sourceHandle || "right",
      target: conn.toEquipmentId,
      targetHandle: conn.targetHandle || "left",
      label: conn.label || undefined,
      animated: conn.animated,
      style: {
        stroke: conn.color || CONNECTION_TYPE_CONFIG[conn.type]?.color || "#94A3B8",
        strokeWidth: 2,
      },
      type: edgeType, // 선택된 타입 적용
      // 선택된 엣지 스타일
      className: "react-flow__edge-path",
    }));
    setEdges(flowEdges);
  }, [connections, setEdges, edgeType]);

  // 노드 드래그 종료 → DB 위치 업데이트
  const handleNodeDragStop: NodeDragHandler = useCallback(
    (event, node) => {
      // 백그라운드에서 DB 업데이트 (React Flow가 이미 화면은 업데이트함)
      updateEquipment.mutate(
        {
          id: node.id,
          data: {
            positionX: node.position.x,
            positionY: node.position.y,
          },
        },
        {
          onError: (error) => {
            console.error("위치 저장 실패:", error);
          },
        }
      );
    },
    [updateEquipment]
  );

  // 연결 유효성 검증 (어떤 핸들이든 연결 허용)
  const isValidConnection = useCallback((connection: Connection) => {
    // 같은 노드끼리는 연결 불가
    if (connection.source === connection.target) {
      return false;
    }
    // 그 외에는 모두 허용
    return true;
  }, []);

  // 연결선 생성 (핸들 드래그) → DB 저장
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // 디버그: 어떤 핸들에서 연결되었는지 확인
      console.log("연결 정보:", {
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        target: connection.target,
        targetHandle: connection.targetHandle,
      });

      // ✋ 같은 설비끼리 연결 방지
      if (connection.source === connection.target) {
        alert("같은 설비끼리는 연결할 수 없습니다.");
        return;
      }

      // 🚀 즉시 화면에 연결선 추가 (낙관적 업데이트)
      const tempId = `temp-${Date.now()}`;
      const newEdge: Edge = {
        id: tempId,
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        target: connection.target,
        targetHandle: connection.targetHandle,
        animated: false,
        style: {
          stroke: CONNECTION_TYPE_CONFIG.FLOW.color,
          strokeWidth: 2,
        },
        type: edgeType, // 선택된 타입 적용
      };
      setEdges((prevEdges) => [...prevEdges, newEdge]);

      // 백그라운드에서 DB 저장
      createConnection.mutate(
        {
          fromEquipmentId: connection.source,
          toEquipmentId: connection.target,
          type: "FLOW",
          color: CONNECTION_TYPE_CONFIG.FLOW.color,
          animated: false,
          sourceHandle: connection.sourceHandle || "right",
          targetHandle: connection.targetHandle || "left",
        },
        {
          onSuccess: (data) => {
            // 임시 ID를 실제 ID로 교체
            setEdges((prevEdges) =>
              prevEdges.map((edge) => (edge.id === tempId ? { ...edge, id: data.id } : edge))
            );
          },
          onError: (error) => {
            console.error("연결선 생성 실패:", error);
            // 실패 시 임시 연결선 제거
            setEdges((prevEdges) => prevEdges.filter((edge) => edge.id !== tempId));

            // 에러 메시지 파싱
            const errorMessage = error instanceof Error ? error.message : "연결선 생성에 실패했습니다.";
            alert(errorMessage);
          },
        }
      );
    },
    [createConnection, edgeType]
  );

  // 노드 클릭 이벤트
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  // 드래그 엔터 (드래그 시작 시 설비 ID 저장)
  const onDragEnter = useCallback((event: React.DragEvent) => {
    const equipmentId = event.dataTransfer.getData("application/equipment");
    if (equipmentId) {
      setDraggingEquipmentId(equipmentId);
    }
  }, []);

  // 드래그 오버 (드롭 허용 + 프리뷰 표시)
  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";

      if (!draggingEquipmentId) {
        // 첫 호출 시 equipmentId 가져오기
        const equipmentId = event.dataTransfer.getData("application/equipment");
        if (equipmentId) {
          setDraggingEquipmentId(equipmentId);
        }
        return;
      }

      // 마우스 위치를 캔버스 좌표로 변환
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 드래그 중인 설비 찾기
      const draggedEquipment = equipments.find((eq) => eq.id === draggingEquipmentId);
      if (!draggedEquipment) return;

      // 프리뷰 노드 업데이트 (부드럽게 따라다님)
      setDragPreviewNode({
        id: "drag-preview",
        type: "equipment",
        position: { x: position.x, y: position.y },
        data: {
          equipment: draggedEquipment,
          isSelected: false,
          onRemove: undefined,
        },
        draggable: false,
        selectable: false,
        style: { opacity: 0.6, pointerEvents: "none" },
      });
    },
    [reactFlowInstance, equipments, draggingEquipmentId]
  );

  // 드래그 리브 (프리뷰 제거)
  const onDragLeave = useCallback((event: React.DragEvent) => {
    // 캔버스 영역을 완전히 벗어났을 때만 프리뷰 제거
    const target = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (!relatedTarget || !target.contains(relatedTarget)) {
      setDragPreviewNode(null);
      setDraggingEquipmentId(null);
    }
  }, []);

  // 드롭 (설비 위치 업데이트)
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const equipmentId = event.dataTransfer.getData("application/equipment") || draggingEquipmentId;
      if (!equipmentId) return;

      // 프리뷰 노드 제거 및 상태 초기화
      setDragPreviewNode(null);
      setDraggingEquipmentId(null);

      // 마우스 위치를 캔버스 좌표로 변환
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 🚀 즉시 화면에 노드 추가 (낙관적 업데이트)
      const droppedEquipment = equipments.find((eq) => eq.id === equipmentId);
      if (droppedEquipment) {
        const newNode: Node = {
          id: equipmentId,
          type: "equipment",
          position: { x: position.x, y: position.y },
          data: {
            equipment: { ...droppedEquipment, positionX: position.x, positionY: position.y },
            isSelected: selectedId === equipmentId,
            onRemove: (nodeId: string) => {
              setNodes((prevNodes) => prevNodes.filter((node) => node.id !== nodeId));
              updateEquipmentRef.current.mutate(
                {
                  id: nodeId,
                  data: { positionX: 0, positionY: 0 },
                },
                {
                  onError: (error) => {
                    console.error("캔버스에서 제거 실패:", error);
                    alert("캔버스에서 제거하는데 실패했습니다. 페이지를 새로고침해주세요.");
                  },
                }
              );
            },
          },
        };
        setNodes((prevNodes) => [...prevNodes, newNode]);
      }

      // 백그라운드에서 DB 업데이트
      updateEquipment.mutate(
        {
          id: equipmentId,
          data: {
            positionX: position.x,
            positionY: position.y,
          },
        },
        {
          onError: (error) => {
            console.error("위치 업데이트 실패:", error);
            // 실패 시 노드 제거
            setNodes((prevNodes) => prevNodes.filter((node) => node.id !== equipmentId));
            alert("설비를 배치하는데 실패했습니다. 다시 시도해주세요.");
          },
        }
      );

      // 드롭한 설비 선택
      onSelectNode(equipmentId);
    },
    [reactFlowInstance, updateEquipment, onSelectNode, equipments, selectedId, draggingEquipmentId]
  );

  // 노드 삭제 (캔버스에서만 제거, DB 삭제 X)
  const handleNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        // 위치를 (0, 0)으로 초기화하여 캔버스에서 제거
        // 실제 설비 데이터는 삭제하지 않음
        updateEquipment.mutate({
          id: node.id,
          data: {
            positionX: 0,
            positionY: 0,
          },
        });
      });
    },
    [updateEquipment]
  );

  // 연결선 삭제 (Delete 키 누르면 호출됨)
  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        // 백그라운드에서 DB 삭제
        // (React Flow가 이미 화면에서 제거함)
        deleteConnection.mutate(edge.id, {
          onError: (error) => {
            console.error("연결선 삭제 실패:", error);
            alert("연결선 삭제에 실패했습니다. 페이지를 새로고침해주세요.");
          },
        });
      });
    },
    [deleteConnection]
  );

  // 프리뷰 노드를 포함한 전체 노드 목록
  const displayNodes = dragPreviewNode ? [...nodes, dragPreviewNode] : nodes;

  // ========== 정렬 기능 ==========

  // 선택된 노드들만 필터링
  const getSelectedNodes = useCallback(() => {
    return nodes.filter((node) => node.selected);
  }, [nodes]);

  // 좌측 정렬
  const alignLeft = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const minX = Math.min(...selectedNodes.map((node) => node.position.x));

    // 1단계: 화면 즉시 업데이트
    setNodes((nds) =>
      nds.map((n) => {
        if (selectedNodes.find((sn) => sn.id === n.id)) {
          return { ...n, position: { x: minX, y: n.position.y } };
        }
        return n;
      })
    );

    // 2단계: DB 업데이트 (비동기)
    selectedNodes.forEach((node) => {
      updateEquipment.mutate({
        id: node.id,
        data: { positionX: minX, positionY: node.position.y },
      });
    });
  }, [getSelectedNodes, updateEquipment, setNodes]);

  // 우측 정렬
  const alignRight = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const maxX = Math.max(...selectedNodes.map((node) => node.position.x));

    // 1단계: 화면 즉시 업데이트
    setNodes((nds) =>
      nds.map((n) => {
        if (selectedNodes.find((sn) => sn.id === n.id)) {
          return { ...n, position: { x: maxX, y: n.position.y } };
        }
        return n;
      })
    );

    // 2단계: DB 업데이트 (비동기)
    selectedNodes.forEach((node) => {
      updateEquipment.mutate({
        id: node.id,
        data: { positionX: maxX, positionY: node.position.y },
      });
    });
  }, [getSelectedNodes, updateEquipment, setNodes]);

  // 상단 정렬
  const alignTop = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const minY = Math.min(...selectedNodes.map((node) => node.position.y));

    // 1단계: 화면 즉시 업데이트
    setNodes((nds) =>
      nds.map((n) => {
        if (selectedNodes.find((sn) => sn.id === n.id)) {
          return { ...n, position: { x: n.position.x, y: minY } };
        }
        return n;
      })
    );

    // 2단계: DB 업데이트 (비동기)
    selectedNodes.forEach((node) => {
      updateEquipment.mutate({
        id: node.id,
        data: { positionX: node.position.x, positionY: minY },
      });
    });
  }, [getSelectedNodes, updateEquipment, setNodes]);

  // 하단 정렬
  const alignBottom = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const maxY = Math.max(...selectedNodes.map((node) => node.position.y));

    // 1단계: 화면 즉시 업데이트
    setNodes((nds) =>
      nds.map((n) => {
        if (selectedNodes.find((sn) => sn.id === n.id)) {
          return { ...n, position: { x: n.position.x, y: maxY } };
        }
        return n;
      })
    );

    // 2단계: DB 업데이트 (비동기)
    selectedNodes.forEach((node) => {
      updateEquipment.mutate({
        id: node.id,
        data: { positionX: node.position.x, positionY: maxY },
      });
    });
  }, [getSelectedNodes, updateEquipment, setNodes]);

  // 수평 균등 분배
  const distributeHorizontal = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 3) return;

    const sortedNodes = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
    const minX = sortedNodes[0].position.x;
    const maxX = sortedNodes[sortedNodes.length - 1].position.x;
    const gap = (maxX - minX) / (sortedNodes.length - 1);

    // 새 위치 계산
    const newPositions = sortedNodes.map((node, index) => ({
      id: node.id,
      x: minX + gap * index,
      y: node.position.y,
    }));

    // 1단계: 화면 즉시 업데이트 (모든 노드를 한 번에)
    setNodes((nds) =>
      nds.map((n) => {
        const newPos = newPositions.find((np) => np.id === n.id);
        if (newPos) {
          return { ...n, position: { x: newPos.x, y: newPos.y } };
        }
        return n;
      })
    );

    // 2단계: DB 업데이트 (비동기)
    newPositions.forEach((pos) => {
      updateEquipment.mutate({
        id: pos.id,
        data: { positionX: pos.x, positionY: pos.y },
      });
    });
  }, [getSelectedNodes, updateEquipment, setNodes]);

  // 수직 균등 분배
  const distributeVertical = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 3) return;

    const sortedNodes = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
    const minY = sortedNodes[0].position.y;
    const maxY = sortedNodes[sortedNodes.length - 1].position.y;
    const gap = (maxY - minY) / (sortedNodes.length - 1);

    // 새 위치 계산
    const newPositions = sortedNodes.map((node, index) => ({
      id: node.id,
      x: node.position.x,
      y: minY + gap * index,
    }));

    // 1단계: 화면 즉시 업데이트 (모든 노드를 한 번에)
    setNodes((nds) =>
      nds.map((n) => {
        const newPos = newPositions.find((np) => np.id === n.id);
        if (newPos) {
          return { ...n, position: { x: newPos.x, y: newPos.y } };
        }
        return n;
      })
    );

    // 2단계: DB 업데이트 (비동기)
    newPositions.forEach((pos) => {
      updateEquipment.mutate({
        id: pos.id,
        data: { positionX: pos.x, positionY: pos.y },
      });
    });
  }, [getSelectedNodes, updateEquipment, setNodes]);

  return (
    <div
      className="flex-1 bg-surface dark:bg-background-dark"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnDrag={[1, 2]}
        selectionOnDrag={true}
        selectionMode="partial"
        multiSelectionKeyCode="Shift"
        connectionMode="loose"
        connectionRadius={50}
        defaultEdgeOptions={{
          type: edgeType,
          animated: false,
          style: { strokeWidth: 2 },
        }}
        deleteKeyCode="Delete"
      >
        {/* 배경 그리드 */}
        <Background
          color="#94a3b8"
          gap={16}
          size={1}
          className="dark:bg-background-dark"
        />

        {/* 줌/핏 컨트롤 */}
        <Controls className="bg-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg" />

        {/* 미니맵 */}
        <MiniMap
          nodeColor={(node) => {
            const equipment = (node.data as { equipment: Equipment }).equipment;
            const statusConfig = {
              ACTIVE: "#10b981",
              MAINTENANCE: "#f59e0b",
              INACTIVE: "#6b7280",
              BROKEN: "#ef4444",
              RESERVED: "#3b82f6",
            };
            return statusConfig[equipment.status] || "#6b7280";
          }}
          className="bg-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg"
        />

        {/* 도구 패널 */}
        <Panel position="top-center" className="flex gap-4 bg-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg p-2">
          {/* 연결선 타입 선택 */}
          <div className="flex items-center gap-1 pr-4 border-r border-border dark:border-border-dark">
            <span className="text-xs font-semibold text-text-secondary mr-2">연결선:</span>

            {/* Smoothstep (부드러운 곡선) */}
            <button
              onClick={() => setEdgeType("smoothstep")}
              className={`p-2 rounded transition-colors ${
                edgeType === "smoothstep"
                  ? "bg-primary text-white"
                  : "hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
              }`}
              title="부드러운 곡선"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                timeline
              </span>
            </button>

            {/* Straight (직선) */}
            <button
              onClick={() => setEdgeType("straight")}
              className={`p-2 rounded transition-colors ${
                edgeType === "straight"
                  ? "bg-primary text-white"
                  : "hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
              }`}
              title="직선"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                remove
              </span>
            </button>

            {/* Step (직각) */}
            <button
              onClick={() => setEdgeType("step")}
              className={`p-2 rounded transition-colors ${
                edgeType === "step"
                  ? "bg-primary text-white"
                  : "hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
              }`}
              title="직각 계단식"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                bar_chart
              </span>
            </button>

            {/* Bezier (베지어 곡선) */}
            <button
              onClick={() => setEdgeType("bezier")}
              className={`p-2 rounded transition-colors ${
                edgeType === "bezier"
                  ? "bg-primary text-white"
                  : "hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
              }`}
              title="베지어 곡선"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                show_chart
              </span>
            </button>
          </div>

          {/* 정렬 도구 */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-text-secondary mr-2">정렬:</span>

            {/* 좌측 정렬 */}
            <button
              onClick={alignLeft}
              className="p-2 hover:bg-surface dark:hover:bg-background-dark rounded transition-colors"
              title="좌측 정렬"
            >
              <span className="material-symbols-outlined text-text dark:text-white" style={{ fontSize: 20 }}>
                format_align_left
              </span>
            </button>

            {/* 상단 정렬 */}
            <button
              onClick={alignTop}
              className="p-2 hover:bg-surface dark:hover:bg-background-dark rounded transition-colors"
              title="상단 정렬"
            >
              <span className="material-symbols-outlined text-text dark:text-white" style={{ fontSize: 20 }}>
                vertical_align_top
              </span>
            </button>

            {/* 하단 정렬 */}
            <button
              onClick={alignBottom}
              className="p-2 hover:bg-surface dark:hover:bg-background-dark rounded transition-colors"
              title="하단 정렬"
            >
              <span className="material-symbols-outlined text-text dark:text-white" style={{ fontSize: 20 }}>
                vertical_align_bottom
              </span>
            </button>

            {/* 우측 정렬 */}
            <button
              onClick={alignRight}
              className="p-2 hover:bg-surface dark:hover:bg-background-dark rounded transition-colors"
              title="우측 정렬"
            >
              <span className="material-symbols-outlined text-text dark:text-white" style={{ fontSize: 20 }}>
                format_align_right
              </span>
            </button>

            <div className="w-px h-6 bg-border dark:bg-border-dark mx-1"></div>

            {/* 수평 균등 분배 */}
            <button
              onClick={distributeHorizontal}
              className="p-2 hover:bg-surface dark:hover:bg-background-dark rounded transition-colors"
              title="수평 균등 분배"
            >
              <span className="material-symbols-outlined text-text dark:text-white" style={{ fontSize: 20 }}>
                view_week
              </span>
            </button>

            {/* 수직 균등 분배 */}
            <button
              onClick={distributeVertical}
              className="p-2 hover:bg-surface dark:hover:bg-background-dark rounded transition-colors"
              title="수직 균등 분배"
            >
              <span className="material-symbols-outlined text-text dark:text-white" style={{ fontSize: 20 }}>
                view_agenda
              </span>
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

/**
 * 설비 캔버스 컴포넌트 (ReactFlowProvider 래퍼)
 */
export function EquipmentCanvas(props: EquipmentCanvasProps) {
  return (
    <ReactFlowProvider>
      <EquipmentCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
