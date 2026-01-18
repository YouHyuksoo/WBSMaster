/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/DocumentNode.tsx
 * @description
 * 문서 노드 컴포넌트입니다.
 * 물결 모양 하단을 가진 사각형으로 문서/데이터를 표현합니다.
 *
 * 초보자 가이드:
 * 1. **물결 사각형**: 문서, 보고서, 데이터
 * 2. **라벨**: 문서명
 * 3. **편집 기능**: 더블클릭으로 라벨과 문서명 편집 가능
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Icon } from "@/components/ui";
import type { DocumentNodeData } from "../../types";

/**
 * 문서 노드 컴포넌트
 */
function DocumentNodeComponent({ id, data, selected }: NodeProps<DocumentNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label || "문서");
  const [editDocumentName, setEditDocumentName] = useState(data.documentName || "");
  const { setNodes } = useReactFlow();

  /**
   * 편집 모드 진입
   */
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label || "문서");
    setEditDocumentName(data.documentName || "");
  }, [data.label, data.documentName]);

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
              label: editLabel.trim() || "문서",
              documentName: editDocumentName.trim(),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editLabel, editDocumentName, setNodes]);

  /**
   * 편집 취소
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditLabel(data.label || "문서");
    setEditDocumentName(data.documentName || "");
  }, [data.label, data.documentName]);

  return (
    <div className="relative" onDoubleClick={handleDoubleClick}>
      {/* 입력 핸들 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
      />

      {/* 문서 모양 (SVG) */}
      <svg
        width="120"
        height="80"
        viewBox="0 0 120 80"
        className={`
          ${selected ? "drop-shadow-lg" : ""}
          transition-all duration-200
        `}
      >
        {/* 문서 배경 */}
        <path
          d="M 0 0 L 120 0 L 120 65 Q 90 55 60 65 Q 30 75 0 65 Z"
          className={`
            fill-white dark:fill-slate-800
            ${selected ? "stroke-primary stroke-2" : "stroke-purple-400 dark:stroke-purple-500 stroke-2"}
          `}
        />
      </svg>

      {/* 노드 내용 */}
      <div className="absolute inset-0 flex items-center justify-center pb-3">
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
              className="w-[100px] px-1 py-0.5 text-xs font-medium text-text dark:text-white bg-purple-50 dark:bg-slate-700 border border-primary rounded text-center"
              placeholder="라벨"
            />
            <input
              type="text"
              value={editDocumentName}
              onChange={(e) => setEditDocumentName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              className="w-[100px] px-1 py-0.5 text-[8px] text-text-secondary bg-purple-50 dark:bg-slate-700 border border-primary/50 rounded text-center"
              placeholder="문서명 (선택)"
            />
          </div>
        ) : (
          <div className="text-center px-2">
            <Icon name="description" size="sm" className="text-purple-500 mb-1" />
            <span className="text-xs font-medium text-text dark:text-white block truncate max-w-[100px]">
              {data.label || "문서"}
            </span>
            {data.documentName && (
              <span className="text-[8px] text-text-secondary block truncate max-w-[100px]">
                {data.documentName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white !bottom-4"
      />
    </div>
  );
}

export const DocumentNode = memo(DocumentNodeComponent);
