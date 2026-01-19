/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/DecisionNode.tsx
 * @description
 * 판단(분기) 노드 컴포넌트입니다.
 * 마름모 모양으로 조건 분기를 표현합니다.
 *
 * 초보자 가이드:
 * 1. **마름모 모양**: 조건/판단 분기점
 * 2. **Yes/No**: 좌우로 분기
 * 3. **조건**: 판단 기준
 * 4. **편집 기능**: 더블클릭으로 라벨과 조건 편집 가능
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Icon } from "@/components/ui";
import type { DecisionNodeData } from "../../types";

/**
 * 판단 노드 컴포넌트
 */
function DecisionNodeComponent({ id, data, selected }: NodeProps<DecisionNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label || "판단");
  const [editCondition, setEditCondition] = useState(data.condition || "");
  const { setNodes } = useReactFlow();

  /**
   * 편집 모드 진입
   */
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label || "판단");
    setEditCondition(data.condition || "");
  }, [data.label, data.condition]);

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
              label: editLabel.trim() || "판단",
              condition: editCondition.trim(),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editLabel, editCondition, setNodes]);

  /**
   * 편집 취소
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditLabel(data.label || "판단");
    setEditCondition(data.condition || "");
  }, [data.label, data.condition]);

  return (
    <div className="relative" onDoubleClick={handleDoubleClick}>
      {/* 마름모 모양 컨테이너 */}
      <div
        className={`
          w-[100px] h-[100px] rotate-45 rounded-lg border-2 bg-white dark:bg-slate-800
          ${selected ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-orange-400 dark:border-orange-500"}
          transition-all duration-200
        `}
      />

      {/* 입력 핸들 (상단) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white !top-0"
      />

      {/* 노드 내용 (회전 보정) */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isEditing ? (
          <div className="text-center space-y-1 px-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              autoFocus
              className="w-[70px] px-1 py-0.5 text-xs font-medium text-text dark:text-white bg-orange-50 dark:bg-slate-700 border border-primary rounded text-center"
              placeholder="라벨"
            />
            <input
              type="text"
              value={editCondition}
              onChange={(e) => setEditCondition(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className="w-[70px] px-1 py-0.5 text-[8px] text-text-secondary bg-orange-50 dark:bg-slate-700 border border-primary/50 rounded text-center"
              placeholder="조건 (선택)"
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
          <div className="text-center px-2">
            <Icon name="change_history" size="xs" className="text-orange-500 mb-0.5" />
            <span className="text-xs font-medium text-text dark:text-white block truncate max-w-[70px]">
              {data.label || "판단"}
            </span>
            {data.condition && (
              <span className="text-[8px] text-text-secondary block truncate max-w-[70px]">
                {data.condition}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 출력 핸들 - Yes (하단) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white !bottom-0"
      />

      {/* 출력 핸들 - No (우측) */}
      <Handle
        type="source"
        position={Position.Right}
        id="no"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-white !right-0"
      />

      {/* Yes/No 라벨 */}
      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-green-600 font-medium">
        Yes
      </span>
      <span className="absolute top-1/2 -right-4 -translate-y-1/2 text-[8px] text-red-600 font-medium">
        No
      </span>
    </div>
  );
}

export const DecisionNode = memo(DecisionNodeComponent);
