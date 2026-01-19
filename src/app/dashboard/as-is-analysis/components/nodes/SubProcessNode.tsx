/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/SubProcessNode.tsx
 * @description
 * 서브프로세스(미리 정의된 프로세스) 노드 컴포넌트입니다.
 * 양쪽에 세로선이 있는 직사각형으로 하위 프로세스를 표현합니다.
 *
 * 초보자 가이드:
 * 1. **서브프로세스**: 별도로 정의된 하위 프로세스 호출
 * 2. **라벨**: 서브프로세스명
 * 3. **편집 기능**: 더블클릭으로 라벨과 참조 프로세스 편집 가능
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Icon } from "@/components/ui";

interface SubProcessNodeData {
  label: string;
  processRef?: string;
}

/**
 * 서브프로세스 노드 컴포넌트
 */
function SubProcessNodeComponent({ id, data, selected }: NodeProps<SubProcessNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label || "서브프로세스");
  const [editProcessRef, setEditProcessRef] = useState(data.processRef || "");
  const { setNodes } = useReactFlow();

  /**
   * 편집 모드 진입
   */
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label || "서브프로세스");
    setEditProcessRef(data.processRef || "");
  }, [data.label, data.processRef]);

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
              label: editLabel.trim() || "서브프로세스",
              processRef: editProcessRef.trim(),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editLabel, editProcessRef, setNodes]);

  /**
   * 편집 취소
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditLabel(data.label || "서브프로세스");
    setEditProcessRef(data.processRef || "");
  }, [data.label, data.processRef]);

  return (
    <div className="relative" onDoubleClick={handleDoubleClick}>
      {/* 입력 핸들 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-white"
      />

      {/* 서브프로세스 모양 (양쪽 세로선 직사각형) */}
      <div
        className={`
          relative w-[140px] h-[60px] bg-white dark:bg-slate-800
          border-2 ${selected ? "border-primary" : "border-cyan-400 dark:border-cyan-500"}
          rounded-md flex items-center justify-center
          ${selected ? "shadow-lg" : ""}
          transition-all duration-200
        `}
      >
        {/* 좌측 세로선 */}
        <div className={`absolute left-3 top-0 bottom-0 w-0.5 ${selected ? "bg-primary" : "bg-cyan-400 dark:bg-cyan-500"}`} />
        {/* 우측 세로선 */}
        <div className={`absolute right-3 top-0 bottom-0 w-0.5 ${selected ? "bg-primary" : "bg-cyan-400 dark:bg-cyan-500"}`} />

        {/* 노드 내용 */}
        {isEditing ? (
          <div className="text-center space-y-1 px-5" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              autoFocus
              className="w-[90px] px-1 py-0.5 text-xs font-medium text-text dark:text-white bg-cyan-50 dark:bg-slate-700 border border-primary rounded text-center"
              placeholder="프로세스명"
            />
            <input
              type="text"
              value={editProcessRef}
              onChange={(e) => setEditProcessRef(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className="w-[90px] px-1 py-0.5 text-[8px] text-text-secondary bg-cyan-50 dark:bg-slate-700 border border-primary/50 rounded text-center"
              placeholder="참조 (선택)"
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
          <div className="text-center px-5">
            <Icon name="account_tree" size="xs" className="text-cyan-500 mb-0.5" />
            <span className="text-xs font-medium text-text dark:text-white block truncate max-w-[90px]">
              {data.label || "서브프로세스"}
            </span>
            {data.processRef && (
              <span className="text-[8px] text-text-secondary block truncate max-w-[90px]">
                → {data.processRef}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-white"
      />
    </div>
  );
}

export const SubProcessNode = memo(SubProcessNodeComponent);
