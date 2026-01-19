/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/SwimlaneProcessNode.tsx
 * @description
 * Swimlane 내 프로세스 노드 컴포넌트입니다.
 * 레인 내에서 사용되는 간소화된 프로세스 노드입니다.
 *
 * 초보자 가이드:
 * 1. **레인 귀속**: 특정 레인(담당자)에 속함
 * 2. **간소화 디자인**: 레인 내 가독성을 위해 작게
 * 3. **편집 기능**: 더블클릭으로 라벨과 설명 편집 가능
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import type { SwimlaneProcessNodeData } from "../../types";

/**
 * Swimlane 프로세스 노드 컴포넌트
 */
function SwimlaneProcessNodeComponent({ id, data, selected }: NodeProps<SwimlaneProcessNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label || "작업");
  const [editDescription, setEditDescription] = useState(data.description || "");
  const { setNodes } = useReactFlow();

  /**
   * 편집 모드 진입
   */
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label || "작업");
    setEditDescription(data.description || "");
  }, [data.label, data.description]);

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
              label: editLabel.trim() || "작업",
              description: editDescription.trim(),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editLabel, editDescription, setNodes]);

  /**
   * 편집 취소
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditLabel(data.label || "작업");
    setEditDescription(data.description || "");
  }, [data.label, data.description]);

  return (
    <div
      className={`
        min-w-[100px] px-3 py-2 rounded border-2 bg-white dark:bg-slate-800
        ${selected ? "border-primary shadow-md ring-2 ring-primary/20" : "border-blue-300 dark:border-blue-600"}
        transition-all duration-200
      `}
      onDoubleClick={handleDoubleClick}
    >
      {/* 입력 핸들 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white"
      />

      {/* 노드 내용 */}
      {isEditing ? (
        <div className="text-center space-y-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancel();
            }}
            autoFocus
            className="w-full px-1 py-0.5 text-xs font-medium text-text dark:text-white bg-blue-50 dark:bg-slate-700 border border-primary rounded text-center"
            placeholder="라벨"
          />
          <input
            type="text"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancel();
            }}
            className="w-full px-1 py-0.5 text-[8px] text-text-secondary bg-blue-50 dark:bg-slate-700 border border-primary/50 rounded text-center"
            placeholder="설명 (선택)"
          />
          {/* 저장/취소 버튼 */}
          <div className="flex items-center justify-center gap-1 pt-1">
            <button
              onClick={handleSave}
              className="px-2 py-0.5 text-[10px] font-medium text-white bg-primary hover:bg-primary-hover rounded transition-colors"
            >
              저장
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-0.5 text-[10px] font-medium text-text-secondary hover:text-text bg-slate-100 dark:bg-slate-700 rounded transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <span className="text-xs font-medium text-text dark:text-white truncate block max-w-[80px]">
            {data.label || "작업"}
          </span>
          {data.description && (
            <span className="text-[8px] text-text-secondary truncate block max-w-[80px]">
              {data.description}
            </span>
          )}
        </div>
      )}

      {/* 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  );
}

export const SwimlaneProcessNode = memo(SwimlaneProcessNodeComponent);
