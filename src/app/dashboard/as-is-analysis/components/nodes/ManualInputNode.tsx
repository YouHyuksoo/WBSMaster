/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/ManualInputNode.tsx
 * @description
 * 수동 입력 노드 컴포넌트입니다.
 * 사다리꼴 모양으로 사용자의 직접 데이터 입력을 표현합니다.
 *
 * 초보자 가이드:
 * 1. **사다리꼴**: 키보드/수동 입력
 * 2. **라벨**: 입력 항목명
 * 3. **편집 기능**: 더블클릭으로 라벨과 입력 타입 편집 가능
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Icon } from "@/components/ui";

interface ManualInputNodeData {
  label: string;
  inputType?: string;
}

/**
 * 수동 입력 노드 컴포넌트
 */
function ManualInputNodeComponent({ id, data, selected }: NodeProps<ManualInputNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label || "수동 입력");
  const [editInputType, setEditInputType] = useState(data.inputType || "");
  const { setNodes } = useReactFlow();

  /**
   * 편집 모드 진입
   */
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label || "수동 입력");
    setEditInputType(data.inputType || "");
  }, [data.label, data.inputType]);

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
              label: editLabel.trim() || "수동 입력",
              inputType: editInputType.trim(),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editLabel, editInputType, setNodes]);

  /**
   * 편집 취소
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditLabel(data.label || "수동 입력");
    setEditInputType(data.inputType || "");
  }, [data.label, data.inputType]);

  return (
    <div className="relative" onDoubleClick={handleDoubleClick}>
      {/* 입력 핸들 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-white"
      />

      {/* 사다리꼴 모양 (SVG) - 상단이 좁고 하단이 넓음 */}
      <svg
        width="130"
        height="60"
        viewBox="0 0 130 60"
        className={`
          ${selected ? "drop-shadow-lg" : ""}
          transition-all duration-200
        `}
      >
        <path
          d="M 20 0 L 110 0 L 130 60 L 0 60 Z"
          className={`
            fill-white dark:fill-slate-800
            ${selected ? "stroke-primary stroke-2" : "stroke-pink-400 dark:stroke-pink-500 stroke-2"}
          `}
        />
      </svg>

      {/* 노드 내용 */}
      <div className="absolute inset-0 flex items-center justify-center pt-1">
        {isEditing ? (
          <div className="text-center space-y-1 px-4" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              autoFocus
              className="w-[90px] px-1 py-0.5 text-xs font-medium text-text dark:text-white bg-pink-50 dark:bg-slate-700 border border-primary rounded text-center"
              placeholder="입력 항목"
            />
            <input
              type="text"
              value={editInputType}
              onChange={(e) => setEditInputType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className="w-[90px] px-1 py-0.5 text-[8px] text-text-secondary bg-pink-50 dark:bg-slate-700 border border-primary/50 rounded text-center"
              placeholder="입력 타입 (선택)"
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
          <div className="text-center px-4">
            <Icon name="keyboard" size="xs" className="text-pink-500 mb-0.5" />
            <span className="text-xs font-medium text-text dark:text-white block truncate max-w-[90px]">
              {data.label || "수동 입력"}
            </span>
            {data.inputType && (
              <span className="text-[8px] text-text-secondary block">
                {data.inputType}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-white"
      />
    </div>
  );
}

export const ManualInputNode = memo(ManualInputNodeComponent);
