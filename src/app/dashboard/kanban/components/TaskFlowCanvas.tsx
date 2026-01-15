/**
 * @file src/app/dashboard/kanban/components/TaskFlowCanvas.tsx
 * @description
 * React Flow 캔버스 컴포넌트 (태스크용)
 * 태스크 노드와 연결선을 표시하고 드래그/연결 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **ReactFlow**: 노드 기반 다이어그램 라이브러리
 * 2. **nodes**: 태스크 목록을 노드로 변환 (flowX/flowY가 0이 아닌 것만 표시)
 * 3. **edges**: 연결 정보를 엣지로 변환 (id, source, target)
 * 4. **저장/원복 모드**: 드래그/정렬 시 로컬 상태만 변경, 저장 버튼으로 일괄 DB 저장
 * 5. **onConnect**: 핸들 드래그로 연결 생성 시 DB 저장
 * 6. **onNodesDelete**: 노드 삭제 시 위치를 (0, 0)으로 초기화 (캔버스에서만 제거)
 */

"use client";

import { useEffect, useCallback, useRef, useState, useMemo } from "react";
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
import { Task, TaskConnection } from "@/lib/api";
import { nodeTypes } from "./nodeTypes";
import { useUpdateTask } from "@/hooks/useTasks";
import { useCreateTaskConnection, useDeleteTaskConnection } from "../hooks/useTaskConnections";

/** 연결 타입별 색상 설정 */
const CONNECTION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  FLOW: { label: "플로우", color: "#3B82F6" },
  DEPENDENCY: { label: "의존성", color: "#F59E0B" },
  RELATED: { label: "관련", color: "#6B7280" },
};

/** 원본 위치 타입 */
interface OriginalPosition {
  id: string;
  flowX: number;
  flowY: number;
}

/** Props 타입 */
interface TaskFlowCanvasProps {
  tasks: Task[];
  connections: TaskConnection[];
  projectId: string;
  selectedId: string | null;
  onSelectNode: (id: string) => void;
  /** 사이드바 열기 콜백 (속성보기 버튼 클릭 시) */
  onOpenSidebar?: (id: string) => void;
  /** 포커스할 태스크 ID (찾기 기능용) */
  focusTaskId?: string | null;
  /** 포커스 완료 후 호출되는 콜백 */
  onFocusComplete?: () => void;
  /** 변경사항 상태 변경 시 호출되는 콜백 (탭 전환 시 확인용) */
  onHasChangesChange?: (hasChanges: boolean) => void;
}

/**
 * 내부 캔버스 컴포넌트 (useReactFlow 사용)
 */
function TaskFlowCanvasInner({
  tasks,
  connections,
  projectId,
  selectedId,
  onSelectNode,
  onOpenSidebar,
  focusTaskId,
  onFocusComplete,
  onHasChangesChange,
}: TaskFlowCanvasProps) {
  const [nodes, setNodes, defaultOnNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 노드 변경 이벤트 처리 (영역 선택 드래그 시 위치 변경 감지)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 기본 핸들러 호출 (노드 상태 업데이트)
      defaultOnNodesChange(changes);

      // 드래그 종료된 위치 변경이 있으면 변경사항 플래그 설정
      const hasPositionChangeEnd = changes.some(
        (change) => change.type === "position" && change.dragging === false
      );
      if (hasPositionChangeEnd) {
        setHasChanges(true);
      }
    },
    [defaultOnNodesChange]
  );

  const [edgeType, setEdgeType] = useState<"smoothstep" | "straight" | "step" | "bezier">("smoothstep");
  const reactFlowInstance = useReactFlow();

  // 원본 위치 저장 (저장/원복 기능용)
  const originalPositionsRef = useRef<OriginalPosition[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 토스트 메시지 상태
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // 토스트 표시 함수
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // hasChanges 변경 시 부모에게 알림
  useEffect(() => {
    onHasChangesChange?.(hasChanges);
  }, [hasChanges, onHasChangesChange]);

  // 브라우저 이탈 감지 (새로고침, 창 닫기)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "저장하지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const updateTask = useUpdateTask();
  const createConnection = useCreateTaskConnection();
  const deleteConnection = useDeleteTaskConnection();

  // 핸들러를 useRef로 안정적으로 관리 (재렌더링 방지)
  const updateTaskRef = useRef(updateTask);
  updateTaskRef.current = updateTask;

  const onOpenSidebarRef = useRef(onOpenSidebar);
  onOpenSidebarRef.current = onOpenSidebar;

  // DB 데이터 → React Flow 노드 변환 (캔버스에 배치된 것만)
  // 🔑 로컬에서 추가한 노드가 DB refetch로 사라지지 않도록 병합 처리
  useEffect(() => {
    const canvasTasks = tasks.filter((task) => task.flowX !== 0 || task.flowY !== 0);

    // 원본 위치 저장 (최초 로드 시 또는 데이터 변경 시)
    originalPositionsRef.current = canvasTasks.map((task) => ({
      id: task.id,
      flowX: task.flowX,
      flowY: task.flowY,
    }));
    setHasChanges(false); // 데이터 로드 시 변경사항 초기화

    setNodes((prevNodes) => {
      // 1. DB에서 가져온 태스크들로 노드 생성
      const flowNodes: Node[] = canvasTasks.map((task) => {
        // 기존 노드가 있으면 위치 유지 (드래그 중인 경우 대비)
        const existingNode = prevNodes.find((n) => n.id === task.id);
        return {
          id: task.id,
          type: "task",
          position: existingNode
            ? existingNode.position
            : { x: task.flowX, y: task.flowY },
          selected: existingNode?.selected || false,
          data: {
            task: task,
            isSelected: selectedId === task.id,
            onRemove: (nodeId: string) => {
              // 🚀 즉시 화면에서 제거 (낙관적 업데이트)
              setNodes((prevNodes) => prevNodes.filter((node) => node.id !== nodeId));

              // 백그라운드에서 DB 업데이트 (위치를 (0, 0)으로 초기화)
              updateTaskRef.current.mutate(
                {
                  id: nodeId,
                  data: {
                    flowX: 0,
                    flowY: 0,
                  },
                },
                {
                  onError: (error) => {
                    console.error("캔버스에서 제거 실패:", error);
                    alert("캔버스에서 제거하는데 실패했습니다. 페이지를 새로고침해주세요.");
                  },
                }
              );
            },
            onOpenSidebar: (nodeId: string) => {
              onOpenSidebarRef.current?.(nodeId);
            },
          },
        };
      });

      // 2. 로컬에서만 추가된 노드들 유지 (아직 DB에 반영 안 된 것)
      // tasks에 flowX/flowY가 0인 상태로 존재하는데, prevNodes에는 있는 경우
      const localOnlyNodes = prevNodes.filter((node) => {
        // DB에서 가져온 canvasTasks에 없는 노드
        const isInCanvas = canvasTasks.find((task) => task.id === node.id);
        if (isInCanvas) return false;

        // tasks 전체에서 찾아서, flowX/flowY가 0이면 로컬 전용 노드
        const taskData = tasks.find((task) => task.id === node.id);
        return taskData && taskData.flowX === 0 && taskData.flowY === 0;
      });

      return [...flowNodes, ...localOnlyNodes];
    });
  }, [tasks, selectedId]);

  // 태스크 찾기: focusTaskId가 변경되면 해당 노드로 이동
  useEffect(() => {
    if (!focusTaskId) return;

    // 해당 노드 찾기
    const targetNode = nodes.find((node) => node.id === focusTaskId);
    if (!targetNode) {
      console.warn(`[찾기] 캔버스에 없는 태스크입니다: ${focusTaskId}`);
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
      onSelectNode(focusTaskId);

      // 포커스 완료 콜백
      onFocusComplete?.();
    }, 100);
  }, [focusTaskId, nodes, reactFlowInstance, onSelectNode, onFocusComplete]);

  // DB 데이터 → React Flow 엣지 변환
  useEffect(() => {
    const flowEdges: Edge[] = connections.map((conn) => ({
      id: conn.id,
      source: conn.fromTaskId,
      sourceHandle: conn.sourceHandle || "right",
      target: conn.toTaskId,
      targetHandle: conn.targetHandle || "left",
      label: conn.label || undefined,
      animated: conn.animated,
      style: {
        stroke: conn.color || CONNECTION_TYPE_CONFIG[conn.type]?.color || "#94A3B8",
        strokeWidth: 3,
      },
      type: edgeType,
      className: "react-flow__edge-path",
    }));
    setEdges(flowEdges);
  }, [connections, setEdges, edgeType]);

  // 노드 드래그 종료 → 로컬 상태만 변경 (저장 버튼 클릭 시 DB 저장)
  const handleNodeDragStop: NodeDragHandler = useCallback(
    (event, node) => {
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
    return true;
  }, []);

  // 연결선 생성 (핸들 드래그) → DB 저장
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // ✋ 같은 태스크끼리 연결 방지
      if (connection.source === connection.target) {
        showToast("같은 태스크끼리는 연결할 수 없습니다.", "error");
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
        type: edgeType,
      };
      setEdges((prevEdges) => [...prevEdges, newEdge]);

      // 백그라운드에서 DB 저장
      createConnection.mutate(
        {
          fromTaskId: connection.source,
          toTaskId: connection.target,
          projectId: projectId,
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
            showToast("연결선이 저장되었습니다.", "success");
          },
          onError: (error) => {
            console.error("연결선 생성 실패:", error);
            // 실패 시 임시 연결선 제거
            setEdges((prevEdges) => prevEdges.filter((edge) => edge.id !== tempId));

            // 에러 메시지 파싱
            const errorMessage = error instanceof Error ? error.message : "연결선 생성에 실패했습니다.";
            showToast(errorMessage, "error");
          },
        }
      );
    },
    [createConnection, edgeType, projectId, showToast]
  );

  // 노드 클릭 이벤트
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  // 드래그 엔터 (드래그 타입 확인)
  const onDragEnter = useCallback((event: React.DragEvent) => {
    // HTML5 DnD 보안: dragenter에서 getData()는 빈 문자열 반환
    // types 배열로 드래그 타입만 확인
    if (event.dataTransfer.types.includes("application/task")) {
      event.preventDefault();
    }
  }, []);

  // 드래그 오버 (드롭 허용)
  // HTML5 DnD 보안: dragover에서 getData()는 빈 문자열 반환
  // 프리뷰 없이 드롭만 허용
  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      // application/task 타입이 있을 때만 드롭 허용
      if (event.dataTransfer.types.includes("application/task")) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }
    },
    []
  );

  // 드래그 리브 (간소화)
  const onDragLeave = useCallback(() => {
    // 프리뷰 미사용으로 별도 처리 없음
  }, []);

  // 드롭 (태스크 위치 업데이트)
  // HTML5 DnD: drop 이벤트에서만 getData() 작동
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // drop 이벤트에서 getData() 호출 (여기서만 작동!)
      const taskId = event.dataTransfer.getData("application/task");
      if (!taskId) return;

      // 마우스 위치를 캔버스 좌표로 변환
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 이미 캔버스에 있는 노드인지 확인
      const existingNode = nodes.find((node) => node.id === taskId);
      if (existingNode) return;

      // 🚀 즉시 화면에 노드 추가 (낙관적 업데이트)
      const droppedTask = tasks.find((task) => task.id === taskId);
      if (droppedTask) {
        const newNode: Node = {
          id: taskId,
          type: "task",
          position: { x: position.x, y: position.y },
          data: {
            task: { ...droppedTask, flowX: position.x, flowY: position.y },
            isSelected: false,
            onRemove: (nodeId: string) => {
              setNodes((prevNodes) => prevNodes.filter((node) => node.id !== nodeId));
              updateTaskRef.current.mutate(
                {
                  id: nodeId,
                  data: { flowX: 0, flowY: 0 },
                },
                {
                  onError: (error) => {
                    console.error("캔버스에서 제거 실패:", error);
                    alert("캔버스에서 제거하는데 실패했습니다. 페이지를 새로고침해주세요.");
                  },
                }
              );
            },
            onOpenSidebar: (nodeId: string) => {
              onOpenSidebarRef.current?.(nodeId);
            },
          },
        };
        setNodes((prevNodes) => [...prevNodes, newNode]);

        // 🚀 드롭 즉시 DB에 위치 저장 (refetch 후에도 노드 유지)
        updateTaskRef.current.mutate({
          id: taskId,
          data: { flowX: position.x, flowY: position.y },
        });
        // 드롭 시 자동으로 사이드바 열지 않음 (사용자가 속성보기 버튼 클릭 시에만 열림)
      }
    },
    [reactFlowInstance, tasks, nodes]
  );

  // 노드 삭제 (캔버스에서만 제거, DB 삭제 X)
  const handleNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        // 위치를 (0, 0)으로 초기화하여 캔버스에서 제거
        updateTask.mutate({
          id: node.id,
          data: {
            flowX: 0,
            flowY: 0,
          },
        });
      });
    },
    [updateTask]
  );

  // 연결선 삭제 (Delete 키 누르면 호출됨)
  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        deleteConnection.mutate(edge.id, {
          onSuccess: () => {
            showToast("연결선이 삭제되었습니다.", "success");
          },
          onError: (error) => {
            console.error("연결선 삭제 실패:", error);
            showToast("연결선 삭제에 실패했습니다.", "error");
          },
        });
      });
    },
    [deleteConnection, showToast]
  );


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
    if (selectedNodes.length < 2) return;

    const sortedNodes = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
    const MIN_GAP = 360;

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

    const minX = sortedNodes[0].position.x;
    const maxX = sortedNodes[sortedNodes.length - 1].position.x;
    const currentRange = maxX - minX;
    const minRange = MIN_GAP * (sortedNodes.length - 1);

    const gap = currentRange < minRange
      ? MIN_GAP
      : currentRange / (sortedNodes.length - 1);

    const newPositions = sortedNodes.map((node, index) => ({
      id: node.id,
      x: minX + gap * index,
      y: node.position.y,
    }));

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
    if (selectedNodes.length < 2) return;

    const sortedNodes = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
    const MIN_GAP = 200;

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

    const minY = sortedNodes[0].position.y;
    const maxY = sortedNodes[sortedNodes.length - 1].position.y;
    const currentRange = maxY - minY;
    const minRange = MIN_GAP * (sortedNodes.length - 1);

    const gap = currentRange < minRange
      ? MIN_GAP
      : currentRange / (sortedNodes.length - 1);

    const newPositions = sortedNodes.map((node, index) => ({
      id: node.id,
      x: node.position.x,
      y: minY + gap * index,
    }));

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
        return original.flowX !== node.position.x || original.flowY !== node.position.y;
      })
      .map((node) => ({
        id: node.id,
        flowX: node.position.x,
        flowY: node.position.y,
      }));

    if (updates.length === 0) {
      setHasChanges(false);
      return;
    }

    console.log(`${updates.length}개 노드 위치 저장 중...`);

    // 각 태스크 업데이트
    Promise.all(
      updates.map((update) =>
        updateTask.mutateAsync({
          id: update.id,
          data: {
            flowX: update.flowX,
            flowY: update.flowY,
          },
        })
      )
    ).then(() => {
      // 저장 성공 시 원본 위치 업데이트
      originalPositionsRef.current = nodes.map((node) => ({
        id: node.id,
        flowX: node.position.x,
        flowY: node.position.y,
      }));
      setHasChanges(false);
      console.log(`${updates.length}개 노드 위치 저장 완료!`);
    }).catch((error) => {
      console.error("위치 저장 실패:", error);
      alert("위치 저장에 실패했습니다. 다시 시도해주세요.");
    });
  }, [nodes, updateTask]);

  // 위치 원복 (원본 상태로 복원)
  const handleResetPositions = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const original = originalPositionsRef.current.find((o) => o.id === node.id);
        if (original) {
          return { ...node, position: { x: original.flowX, y: original.flowY } };
        }
        return node;
      })
    );
    setHasChanges(false);
  }, [setNodes]);

  // 변경된 노드 개수 계산
  const changedNodeCount = nodes.filter((node) => {
    const original = originalPositionsRef.current.find((o) => o.id === node.id);
    if (!original) return true;
    return original.flowX !== node.position.x || original.flowY !== node.position.y;
  }).length;

  // 기본 엣지 옵션 (메모이제이션)
  const defaultEdgeOptions = useMemo(() => ({
    type: edgeType,
    animated: false,
    style: { strokeWidth: 2 },
  }), [edgeType]);

  // MiniMap 노드 색상 함수 (메모이제이션)
  const miniMapNodeColor = useCallback((node: Node) => {
    const task = (node.data as { task: Task }).task;
    const statusConfig: Record<string, string> = {
      PENDING: "#6b7280",
      IN_PROGRESS: "#3b82f6",
      HOLDING: "#f59e0b",
      DELAYED: "#f97316",
      COMPLETED: "#10b981",
      CANCELLED: "#ef4444",
    };
    return statusConfig[task.status] || "#6b7280";
  }, []);

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
        nodes={nodes}
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
        defaultEdgeOptions={defaultEdgeOptions}
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
          nodeColor={miniMapNodeColor}
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
                  disabled={updateTask.isPending}
                  className="p-1.5 rounded bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-50"
                  title="저장 (DB에 반영)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {updateTask.isPending ? "sync" : "save"}
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

      {/* 토스트 메시지 */}
      {toast && (
        <div
          className={`
            fixed bottom-6 left-1/2 -translate-x-1/2 z-50
            px-4 py-3 rounded-lg shadow-lg
            flex items-center gap-2
            animate-in fade-in slide-in-from-bottom-4 duration-300
            ${toast.type === "success" ? "bg-success text-white" : ""}
            ${toast.type === "error" ? "bg-error text-white" : ""}
            ${toast.type === "info" ? "bg-primary text-white" : ""}
          `}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {toast.type === "success" && "check_circle"}
            {toast.type === "error" && "error"}
            {toast.type === "info" && "info"}
          </span>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

/**
 * 태스크 플로우 캔버스 컴포넌트 (ReactFlowProvider 래퍼)
 */
export function TaskFlowCanvas(props: TaskFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <TaskFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
