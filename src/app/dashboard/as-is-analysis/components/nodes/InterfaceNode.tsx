/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/InterfaceNode.tsx
 * @description
 * 인터페이스 노드 컴포넌트입니다.
 * 외부 시스템 연동/API 호출을 표현합니다.
 *
 * 초보자 가이드:
 * 1. **인터페이스 모양**: 양쪽이 뾰족한 육각형
 * 2. **라벨**: 인터페이스명
 * 3. **편집 기능**: 더블클릭으로 라벨과 시스템명 편집 가능
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Icon } from "@/components/ui";

interface InterfaceNodeData {
  label: string;
  systemName?: string;
}

/**
 * 인터페이스 노드 컴포넌트
 */
function InterfaceNodeComponent({ id, data, selected }: NodeProps<InterfaceNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label || "인터페이스");
  const [editSystemName, setEditSystemName] = useState(data.systemName || "");
  const { setNodes } = useReactFlow();

  /**
   * 편집 모드 진입
   */
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label || "인터페이스");
    setEditSystemName(data.systemName || "");
  }, [data.label, data.systemName]);

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
              label: editLabel.trim() || "인터페이스",
              systemName: editSystemName.trim(),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editLabel, editSystemName, setNodes]);

  /**
   * 편집 취소
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditLabel(data.label || "인터페이스");
    setEditSystemName(data.systemName || "");
  }, [data.label, data.systemName]);

  return (
    <div className="relative" onDoubleClick={handleDoubleClick}>
      {/* 입력 핸들 (좌측) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
      />

      {/* 육각형 모양 (SVG) - 양쪽이 뾰족한 형태 */}
      <svg
        width="140"
        height="60"
        viewBox="0 0 140 60"
        className={`
          ${selected ? "drop-shadow-lg" : ""}
          transition-all duration-200
        `}
      >
        <path
          d="M 15 0 L 125 0 L 140 30 L 125 60 L 15 60 L 0 30 Z"
          className={`
            fill-white dark:fill-slate-800
            ${selected ? "stroke-primary stroke-2" : "stroke-indigo-400 dark:stroke-indigo-500 stroke-2"}
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
              className="w-[100px] px-1 py-0.5 text-xs font-medium text-text dark:text-white bg-indigo-50 dark:bg-slate-700 border border-primary rounded text-center"
              placeholder="인터페이스명"
            />
            <input
              type="text"
              value={editSystemName}
              onChange={(e) => setEditSystemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className="w-[100px] px-1 py-0.5 text-[8px] text-text-secondary bg-indigo-50 dark:bg-slate-700 border border-primary/50 rounded text-center"
              placeholder="시스템명 (선택)"
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
            <Icon name="swap_horiz" size="xs" className="text-indigo-500 mb-0.5" />
            <span className="text-xs font-medium text-text dark:text-white block truncate max-w-[100px]">
              {data.label || "인터페이스"}
            </span>
            {data.systemName && (
              <span className="text-[8px] text-text-secondary block">
                {data.systemName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 출력 핸들 (우측) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
      />
    </div>
  );
}

export const InterfaceNode = memo(InterfaceNodeComponent);
