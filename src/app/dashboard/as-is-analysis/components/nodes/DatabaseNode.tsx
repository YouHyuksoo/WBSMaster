/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/DatabaseNode.tsx
 * @description
 * 데이터베이스 저장 노드 컴포넌트입니다.
 * 원통형 모양으로 DB 저장/조회를 표현합니다.
 *
 * 초보자 가이드:
 * 1. **원통형**: 데이터베이스
 * 2. **라벨**: 테이블명 또는 DB명
 * 3. **편집 기능**: 더블클릭으로 라벨과 테이블명 편집 가능
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Icon } from "@/components/ui";

interface DatabaseNodeData {
  label: string;
  tableName?: string;
}

/**
 * 데이터베이스 노드 컴포넌트
 */
function DatabaseNodeComponent({ id, data, selected }: NodeProps<DatabaseNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label || "DB");
  const [editTableName, setEditTableName] = useState(data.tableName || "");
  const { setNodes } = useReactFlow();

  /**
   * 편집 모드 진입
   */
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label || "DB");
    setEditTableName(data.tableName || "");
  }, [data.label, data.tableName]);

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
              label: editLabel.trim() || "DB",
              tableName: editTableName.trim(),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editLabel, editTableName, setNodes]);

  /**
   * 편집 취소
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditLabel(data.label || "DB");
    setEditTableName(data.tableName || "");
  }, [data.label, data.tableName]);

  return (
    <div className="relative" onDoubleClick={handleDoubleClick}>
      {/* 입력 핸들 (상단) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
      />

      {/* 원통형 모양 (SVG) - DB 심볼 */}
      <svg
        width="100"
        height="80"
        viewBox="0 0 100 80"
        className={`
          ${selected ? "drop-shadow-lg" : ""}
          transition-all duration-200
        `}
      >
        {/* 원통 몸체 */}
        <path
          d="M 5 15 L 5 65 A 45 10 0 0 0 95 65 L 95 15"
          className={`
            fill-white dark:fill-slate-800
            ${selected ? "stroke-primary stroke-2" : "stroke-amber-400 dark:stroke-amber-500 stroke-2"}
          `}
        />
        {/* 원통 상단 타원 */}
        <ellipse
          cx="50"
          cy="15"
          rx="45"
          ry="10"
          className={`
            fill-amber-50 dark:fill-slate-700
            ${selected ? "stroke-primary stroke-2" : "stroke-amber-400 dark:stroke-amber-500 stroke-2"}
          `}
        />
        {/* 원통 하단 타원 (보이는 부분만) */}
        <path
          d="M 5 65 A 45 10 0 0 0 95 65"
          className={`
            fill-none
            ${selected ? "stroke-primary stroke-2" : "stroke-amber-400 dark:stroke-amber-500 stroke-2"}
          `}
        />
      </svg>

      {/* 노드 내용 */}
      <div className="absolute inset-0 flex items-center justify-center pt-2">
        {isEditing ? (
          <div className="text-center space-y-1 px-2" onClick={(e) => e.stopPropagation()}>
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
              className="w-[70px] px-1 py-0.5 text-xs font-medium text-text dark:text-white bg-amber-50 dark:bg-slate-700 border border-primary rounded text-center"
              placeholder="DB명"
            />
            <input
              type="text"
              value={editTableName}
              onChange={(e) => setEditTableName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              className="w-[70px] px-1 py-0.5 text-[8px] text-text-secondary bg-amber-50 dark:bg-slate-700 border border-primary/50 rounded text-center"
              placeholder="테이블명"
            />
          </div>
        ) : (
          <div className="text-center px-2">
            <Icon name="database" size="xs" className="text-amber-500 mb-0.5" />
            <span className="text-xs font-medium text-text dark:text-white block truncate max-w-[70px]">
              {data.label || "DB"}
            </span>
            {data.tableName && (
              <span className="text-[8px] text-text-secondary block truncate max-w-[70px]">
                {data.tableName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 출력 핸들 (하단) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
      />
    </div>
  );
}

export const DatabaseNode = memo(DatabaseNodeComponent);
