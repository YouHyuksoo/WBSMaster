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
 * 4. **저장/원복 모드**: 드래그/정렬 시 로컬 상태만 변경, 저장 버튼으로 일괄 DB 저장
 * 5. **onConnect**: 핸들 드래그로 연결 생성 시 DB 저장
 * 6. **onNodesDelete**: 노드 삭제 시 위치를 (0, 0)으로 초기화 (캔버스에서만 제거)
 * 7. **distributeHorizontal/Vertical**: 균등 분배 시 최소 간격 보장 (겹침 방지)
 *
 * 수정 방법:
 * - 캔버스 스타일: ReactFlow className 수정
 * - 연결선 색상: CONNECTION_TYPE_CONFIG 수정
 * - 캔버스 제거 기준: positionX === 0 && positionY === 0 필터 조건
 * - 균등 분배 간격: MIN_GAP 상수 수정 (가로 360px, 세로 200px)
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
  SelectionMode,
  ConnectionMode,
  NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { Equipment, EquipmentConnection } from "@/lib/api";
import { EquipmentNode } from "./EquipmentNode";
import { useUpdateEquipment, useBulkUpdateEquipment } from "../hooks/useEquipment";
import { useCreateConnection, useDeleteConnection } from "../hooks/useEquipmentConnections";
import { CONNECTION_TYPE_CONFIG } from "../types";

/** 원본 위치 타입 */
interface OriginalPosition {
  id: string;
  positionX: number;
  positionY: number;
}

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
  /** 포커스할 설비 ID (찾기 기능용) */
  focusEquipmentId?: string | null;
  /** 포커스 완료 후 호출되는 콜백 */
  onFocusComplete?: () => void;
}

/**
 * 내부 캔버스 컴포넌트 (useReactFlow 사용)
 */
function EquipmentCanvasInner({
  equipments,
  connections,
  selectedId,
  onSelectNode,
  focusEquipmentId,
  onFocusComplete,
}: EquipmentCanvasProps) {
  const [nodes, setNodes, defaultOnNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 노드 변경 이벤트 처리 (영역 선택 드래그 시 위치 변경 감지)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 기본 핸들러 호출 (노드 상태 업데이트)
      defaultOnNodesChange(changes);

      // 드래그 종료된 위치 변경이 있으면 변경사항 플래그 설정
      // (dragging이 false인 position 변경 = 드래그 종료)
      const hasPositionChangeEnd = changes.some(
        (change) => change.type === "position" && change.dragging === false
      );
      if (hasPositionChangeEnd) {
        setHasChanges(true);
      }
    },
    [defaultOnNodesChange]
  );
  const [dragPreviewNode, setDragPreviewNode] = useState<Node | null>(null);
  const [draggingEquipmentId, setDraggingEquipmentId] = useState<string | null>(null);
  const [edgeType, setEdgeType] = useState<"smoothstep" | "straight" | "step" | "bezier">("smoothstep");
  const reactFlowInstance = useReactFlow();

  // 원본 위치 저장 (저장/원복 기능용)
  const originalPositionsRef = useRef<OriginalPosition[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const updateEquipment = useUpdateEquipment();
  const bulkUpdateEquipment = useBulkUpdateEquipment();
  const createConnection = useCreateConnection();
  const deleteConnection = useDeleteConnection();

  // 노드 삭제 핸들러 (useRef로 안정적으로 관리)
  const updateEquipmentRef = useRef(updateEquipment);
  updateEquipmentRef.current = updateEquipment;

  // DB 데이터 → React Flow 노드 변환 (캔버스에 배치된 것만)
  useEffect(() => {
    const canvasEquipments = equipments.filter((eq) => eq.positionX !== 0 || eq.positionY !== 0);

    // 원본 위치 저장 (최초 로드 시 또는 데이터 변경 시)
    originalPositionsRef.current = canvasEquipments.map((eq) => ({
      id: eq.id,
      positionX: eq.positionX,
      positionY: eq.positionY,
    }));
    setHasChanges(false); // 데이터 로드 시 변경사항 초기화

    const flowNodes: Node[] = canvasEquipments.map((eq) => ({
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

  // 설비 찾기: focusEquipmentId가 변경되면 해당 노드로 이동
  useEffect(() => {
    if (!focusEquipmentId) return;

    // 해당 노드 찾기
    const targetNode = nodes.find((node) => node.id === focusEquipmentId);
    if (!targetNode) {
      console.warn(`[찾기] 캔버스에 없는 설비입니다: ${focusEquipmentId}`);
      onFocusComplete?.();
      return;
    }

    // 해당 노드로 화면 이동 (줌 레벨 1.2, 부드러운 애니메이션)
    setTimeout(() => {
      reactFlowInstance.setCenter(
        targetNode.position.x + 150, // 노드 중앙으로 (노드 너비의 절반)
        targetNode.position.y + 75,  // 노드 중앙으로 (노드 높이의 절반)
        { zoom: 1.2, duration: 500 }
      );

      // 노드 선택
      onSelectNode(focusEquipmentId);

      // 포커스 완료 콜백
      onFocusComplete?.();
    }, 100);
  }, [focusEquipmentId, nodes, reactFlowInstance, onSelectNode, onFocusComplete]);

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
        strokeWidth: 3,
      },
      type: edgeType, // 선택된 타입 적용
      // 선택된 엣지 스타일
      className: "react-flow__edge-path",
    }));
    setEdges(flowEdges);
  }, [connections, setEdges, edgeType]);

  // 노드 드래그 종료 → 로컬 상태만 변경 (저장 버튼 클릭 시 DB 저장)
  const handleNodeDragStop: NodeDragHandler = useCallback(
    (event, node) => {
      // React Flow가 이미 화면을 업데이트함 - 변경사항 플래그만 설정
      setHasChanges(true);
    },
    []
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
          strokeWidth: 3,
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

      // 변경사항 플래그 설정 (저장 버튼 클릭 시 DB 저장)
      setHasChanges(true);

      // 드롭한 설비 선택
      onSelectNode(equipmentId);
    },
    [reactFlowInstance, onSelectNode, equipments, selectedId, draggingEquipmentId]
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
          skipInvalidation: true, // 위치 초기화 시 refetch 건너뛰기
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

    // 화면 업데이트 (저장 버튼 클릭 시 DB 저장)
    setNodes((nds) =>
      nds.map((n) => {
        if (selectedNodes.find((sn) => sn.id === n.id)) {
          return { ...n, position: { x: minX, y: n.position.y } };
        }
        return n;
      })
    );
    setHasChanges(true);
  }, [getSelectedNodes, setNodes]);

  // 우측 정렬
  const alignRight = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const maxX = Math.max(...selectedNodes.map((node) => node.position.x));

    // 화면 업데이트 (저장 버튼 클릭 시 DB 저장)
    setNodes((nds) =>
      nds.map((n) => {
        if (selectedNodes.find((sn) => sn.id === n.id)) {
          return { ...n, position: { x: maxX, y: n.position.y } };
        }
        return n;
      })
    );
    setHasChanges(true);
  }, [getSelectedNodes, setNodes]);

  // 상단 정렬
  const alignTop = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const minY = Math.min(...selectedNodes.map((node) => node.position.y));

    // 화면 업데이트 (저장 버튼 클릭 시 DB 저장)
    setNodes((nds) =>
      nds.map((n) => {
        if (selectedNodes.find((sn) => sn.id === n.id)) {
          return { ...n, position: { x: n.position.x, y: minY } };
        }
        return n;
      })
    );
    setHasChanges(true);
  }, [getSelectedNodes, setNodes]);

  // 하단 정렬
  const alignBottom = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return;

    const maxY = Math.max(...selectedNodes.map((node) => node.position.y));

    // 화면 업데이트 (저장 버튼 클릭 시 DB 저장)
    setNodes((nds) =>
      nds.map((n) => {
        if (selectedNodes.find((sn) => sn.id === n.id)) {
          return { ...n, position: { x: n.position.x, y: maxY } };
        }
        return n;
      })
    );
    setHasChanges(true);
  }, [getSelectedNodes, setNodes]);

  // 수평 균등 분배
  const distributeHorizontal = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return; // 2개 이상부터 작동

    const sortedNodes = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
    const MIN_GAP = 360; // 노드 너비(320px) + 여유 공간(40px)

    // 2개만 선택한 경우: 최소 간격으로 배치
    if (sortedNodes.length === 2) {
      const newPositions = [
        { id: sortedNodes[0].id, x: sortedNodes[0].position.x, y: sortedNodes[0].position.y },
        { id: sortedNodes[1].id, x: sortedNodes[0].position.x + MIN_GAP, y: sortedNodes[1].position.y },
      ];

      setNodes((nds) =>
        nds.map((n) => {
          const newPos = newPositions.find((np) => np.id === n.id);
          if (newPos) {
            return { ...n, position: { x: newPos.x, y: newPos.y } };
          }
          return n;
        })
      );
      setHasChanges(true);
      return;
    }

    // 3개 이상: 균등 분배
    const minX = sortedNodes[0].position.x;
    const maxX = sortedNodes[sortedNodes.length - 1].position.x;
    const currentRange = maxX - minX;
    const minRange = MIN_GAP * (sortedNodes.length - 1);

    // 간격이 너무 작으면 최소 간격으로 재계산
    const gap = currentRange < minRange
      ? MIN_GAP
      : currentRange / (sortedNodes.length - 1);

    // 새 위치 계산
    const newPositions = sortedNodes.map((node, index) => ({
      id: node.id,
      x: minX + gap * index,
      y: node.position.y,
    }));

    // 화면 업데이트 (저장 버튼 클릭 시 DB 저장)
    setNodes((nds) =>
      nds.map((n) => {
        const newPos = newPositions.find((np) => np.id === n.id);
        if (newPos) {
          return { ...n, position: { x: newPos.x, y: newPos.y } };
        }
        return n;
      })
    );
    setHasChanges(true);
  }, [getSelectedNodes, setNodes]);

  // 수직 균등 분배
  const distributeVertical = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length < 2) return; // 2개 이상부터 작동

    const sortedNodes = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
    const MIN_GAP = 200; // 노드 높이 + 여유 공간

    // 2개만 선택한 경우: 최소 간격으로 배치
    if (sortedNodes.length === 2) {
      const newPositions = [
        { id: sortedNodes[0].id, x: sortedNodes[0].position.x, y: sortedNodes[0].position.y },
        { id: sortedNodes[1].id, x: sortedNodes[1].position.x, y: sortedNodes[0].position.y + MIN_GAP },
      ];

      setNodes((nds) =>
        nds.map((n) => {
          const newPos = newPositions.find((np) => np.id === n.id);
          if (newPos) {
            return { ...n, position: { x: newPos.x, y: newPos.y } };
          }
          return n;
        })
      );
      setHasChanges(true);
      return;
    }

    // 3개 이상: 균등 분배
    const minY = sortedNodes[0].position.y;
    const maxY = sortedNodes[sortedNodes.length - 1].position.y;
    const currentRange = maxY - minY;
    const minRange = MIN_GAP * (sortedNodes.length - 1);

    // 간격이 너무 작으면 최소 간격으로 재계산
    const gap = currentRange < minRange
      ? MIN_GAP
      : currentRange / (sortedNodes.length - 1);

    // 새 위치 계산
    const newPositions = sortedNodes.map((node, index) => ({
      id: node.id,
      x: node.position.x,
      y: minY + gap * index,
    }));

    // 화면 업데이트 (저장 버튼 클릭 시 DB 저장)
    setNodes((nds) =>
      nds.map((n) => {
        const newPos = newPositions.find((np) => np.id === n.id);
        if (newPos) {
          return { ...n, position: { x: newPos.x, y: newPos.y } };
        }
        return n;
      })
    );
    setHasChanges(true);
  }, [getSelectedNodes, setNodes]);

  // ========== 저장/원복 기능 ==========

  // 위치 저장 (변경된 노드만 DB에 업데이트)
  const handleSavePositions = useCallback(() => {
    // 변경된 노드만 필터링
    const updates = nodes
      .filter((node) => {
        const original = originalPositionsRef.current.find((o) => o.id === node.id);
        if (!original) return true; // 새로 추가된 노드
        return original.positionX !== node.position.x || original.positionY !== node.position.y;
      })
      .map((node) => ({
        id: node.id,
        positionX: node.position.x,
        positionY: node.position.y,
      }));

    // 변경사항이 없으면 저장 안 함
    if (updates.length === 0) {
      setHasChanges(false);
      return;
    }

    console.log(`${updates.length}개 노드 위치 저장 중...`);

    bulkUpdateEquipment.mutate(updates, {
      onSuccess: () => {
        // 저장 성공 시 원본 위치 업데이트
        originalPositionsRef.current = nodes.map((node) => ({
          id: node.id,
          positionX: node.position.x,
          positionY: node.position.y,
        }));
        setHasChanges(false);
        console.log(`${updates.length}개 노드 위치 저장 완료!`);
      },
      onError: (error) => {
        console.error("위치 저장 실패:", error);
        alert("위치 저장에 실패했습니다. 다시 시도해주세요.");
      },
    });
  }, [nodes, bulkUpdateEquipment]);

  // 위치 원복 (원본 상태로 복원)
  const handleResetPositions = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const original = originalPositionsRef.current.find((o) => o.id === node.id);
        if (original) {
          return { ...node, position: { x: original.positionX, y: original.positionY } };
        }
        return node;
      })
    );
    setHasChanges(false);
  }, [setNodes]);

  // 변경된 노드 개수 계산
  const changedNodeCount = nodes.filter((node) => {
    const original = originalPositionsRef.current.find((o) => o.id === node.id);
    if (!original) return true; // 새로 추가된 노드
    return original.positionX !== node.position.x || original.positionY !== node.position.y;
  }).length;

  return (
    <div
      className="flex-1 bg-surface dark:bg-background-dark"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onContextMenu={(e) => e.preventDefault()}
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
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        connectionMode={ConnectionMode.Loose}
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
        <Panel position="top-center" className="flex gap-3 bg-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg p-2 whitespace-nowrap">
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

          {/* 저장/원복 버튼 */}
          <div className="flex items-center gap-1 pl-3 border-l border-border dark:border-border-dark">
            {hasChanges ? (
              <>
                <span className="text-[10px] text-warning font-medium px-1.5 py-0.5 bg-warning/10 rounded">
                  {changedNodeCount}
                </span>
                <button
                  onClick={handleResetPositions}
                  className="p-1.5 rounded hover:bg-slate-500/20 text-slate-500 transition-colors"
                  title="원복 (변경사항 취소)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    undo
                  </span>
                </button>
                <button
                  onClick={handleSavePositions}
                  disabled={bulkUpdateEquipment.isPending}
                  className="p-1.5 rounded bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-50"
                  title="저장 (DB에 반영)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {bulkUpdateEquipment.isPending ? "sync" : "save"}
                  </span>
                </button>
              </>
            ) : (
              <span className="material-symbols-outlined text-success" style={{ fontSize: 18 }} title="저장됨">
                check_circle
              </span>
            )}
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
