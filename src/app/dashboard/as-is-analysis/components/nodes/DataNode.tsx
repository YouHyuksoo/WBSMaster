/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/DataNode.tsx
 * @description
 * 데이터 노드 컴포넌트입니다.
 * 평행사변형 모양으로 데이터 입출력을 표현합니다.
 *
 * 초보자 가이드:
 * 1. **평행사변형**: 데이터 입력/출력
 * 2. **라벨**: 데이터명
 * 3. **편집 기능**: 더블클릭으로 라벨과 데이터 타입 편집 가능
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Icon } from "@/components/ui";

interface DataNodeData {
  label: string;
  dataType?: string;
}

/**
 * 데이터 노드 컴포넌트
 */
function DataNodeComponent({ id, data, selected }: NodeProps<DataNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label || "데이터");
  const [editDataType, setEditDataType] = useState(data.dataType || "");
  const { setNodes } = useReactFlow();

  /**
   * 편집 모드 진입
   */
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label || "데이터");
    setEditDataType(data.dataType || "");
  }, [data.label, data.dataType]);

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
              label: editLabel.trim() || "데이터",
              dataType: editDataType.trim(),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editLabel, editDataType, setNodes]);

  /**
   * 편집 취소
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditLabel(data.label || "데이터");
    setEditDataType(data.dataType || "");
  }, [data.label, data.dataType]);

  return (
    <div className="relative" onDoubleClick={handleDoubleClick}>
      {/* 입력 핸들 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white"
      />

      {/* 평행사변형 모양 (SVG) */}
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
          d="M 15 0 L 130 0 L 115 60 L 0 60 Z"
          className={`
            fill-white dark:fill-slate-800
            ${selected ? "stroke-primary stroke-2" : "stroke-teal-400 dark:stroke-teal-500 stroke-2"}
          `}
        />
      </svg>

      {/* 노드 내용 */}
      <div className="absolute inset-0 flex items-center justify-center">
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
              className="w-[90px] px-1 py-0.5 text-xs font-medium text-text dark:text-white bg-teal-50 dark:bg-slate-700 border border-primary rounded text-center"
              placeholder="라벨"
            />
            <input
              type="text"
              value={editDataType}
              onChange={(e) => setEditDataType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className="w-[90px] px-1 py-0.5 text-[8px] text-text-secondary bg-teal-50 dark:bg-slate-700 border border-primary/50 rounded text-center"
              placeholder="타입 (선택)"
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
            <Icon name="storage" size="xs" className="text-teal-500 mb-0.5" />
            <span className="text-xs font-medium text-text dark:text-white block truncate max-w-[90px]">
              {data.label || "데이터"}
            </span>
            {data.dataType && (
              <span className="text-[8px] text-text-secondary block">
                {data.dataType}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white"
      />
    </div>
  );
}

export const DataNode = memo(DataNodeComponent);
