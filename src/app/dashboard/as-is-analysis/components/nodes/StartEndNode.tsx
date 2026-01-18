/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/StartEndNode.tsx
 * @description
 * 시작/종료 노드 컴포넌트입니다.
 * 타원형 모양으로 프로세스의 시작점과 종료점을 표현합니다.
 *
 * 초보자 가이드:
 * 1. **타원 모양**: 시작 또는 종료 지점
 * 2. **시작**: 초록색 테두리, 하단 출력만
 * 3. **종료**: 빨간색 테두리, 상단 입력만
 * 4. **편집 기능**: 더블클릭으로 라벨 편집 가능
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Icon } from "@/components/ui";
import type { StartEndNodeData } from "../../types";

/**
 * 시작/종료 노드 컴포넌트
 */
function StartEndNodeComponent({ id, data, selected }: NodeProps<StartEndNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label || (data.type === "start" ? "시작" : "종료"));
  const { setNodes } = useReactFlow();

  const isStart = data.type === "start";
  const borderColor = isStart ? "border-green-500" : "border-red-500";
  const iconColor = isStart ? "text-green-500" : "text-red-500";
  const handleColor = isStart ? "!bg-green-500" : "!bg-red-500";
  const bgColor = isStart ? "bg-green-50" : "bg-red-50";

  /**
   * 편집 모드 진입
   */
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label || (isStart ? "시작" : "종료"));
  }, [data.label, isStart]);

  /**
   * 편집 저장
   */
  const handleSave = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: editLabel.trim() || (isStart ? "시작" : "종료"),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editLabel, isStart, setNodes]);

  /**
   * 편집 취소
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditLabel(data.label || (isStart ? "시작" : "종료"));
  }, [data.label, isStart]);

  return (
    <div
      className={`
        min-w-[100px] px-6 py-3 rounded-full border-2 bg-white dark:bg-slate-800
        ${selected ? "border-primary shadow-lg ring-2 ring-primary/20" : borderColor}
        transition-all duration-200
      `}
      onDoubleClick={handleDoubleClick}
    >
      {/* 입력 핸들 (종료 노드만) */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className={`!w-3 !h-3 ${handleColor} !border-2 !border-white`}
        />
      )}

      {/* 노드 내용 */}
      {isEditing ? (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            onBlur={handleSave}
            autoFocus
            className={`px-2 py-1 text-sm font-medium text-text dark:text-white ${bgColor} dark:bg-slate-700 border border-primary rounded text-center min-w-[80px]`}
            placeholder={isStart ? "시작" : "종료"}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5">
          <Icon
            name={isStart ? "play_circle" : "stop_circle"}
            size="sm"
            className={iconColor}
          />
          <span className="text-sm font-medium text-text dark:text-white">
            {data.label || (isStart ? "시작" : "종료")}
          </span>
        </div>
      )}

      {/* 출력 핸들 (시작 노드만) */}
      {isStart && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={`!w-3 !h-3 ${handleColor} !border-2 !border-white`}
        />
      )}
    </div>
  );
}

export const StartEndNode = memo(StartEndNodeComponent);
