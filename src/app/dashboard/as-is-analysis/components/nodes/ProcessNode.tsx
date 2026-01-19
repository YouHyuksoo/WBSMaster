/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/ProcessNode.tsx
 * @description
 * 프로세스(업무/처리) 노드 컴포넌트입니다.
 * 사각형 모양으로 일반적인 업무 단계를 표현합니다.
 *
 * 초보자 가이드:
 * 1. **사각형 모양**: 일반 업무/처리 단계
 * 2. **라벨**: 프로세스명
 * 3. **설명**: 상세 설명 (툴팁 또는 하단 표시)
 * 4. **편집 기능**: 더블클릭으로 라벨, 설명, 담당자 편집 가능
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Icon } from "@/components/ui";
import type { ProcessNodeData } from "../../types";

/**
 * 프로세스 노드 컴포넌트
 */
function ProcessNodeComponent({ id, data, selected }: NodeProps<ProcessNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label || "프로세스");
  const [editDescription, setEditDescription] = useState(data.description || "");
  const [editResponsible, setEditResponsible] = useState(data.responsible || "");
  const [editInputData, setEditInputData] = useState(data.inputData || "");
  const [editOutputData, setEditOutputData] = useState(data.outputData || "");
  const { setNodes } = useReactFlow();

  /**
   * 편집 모드 진입
   */
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label || "프로세스");
    setEditDescription(data.description || "");
    setEditResponsible(data.responsible || "");
    setEditInputData(data.inputData || "");
    setEditOutputData(data.outputData || "");
  }, [data.label, data.description, data.responsible, data.inputData, data.outputData]);

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
              label: editLabel.trim() || "프로세스",
              description: editDescription.trim(),
              responsible: editResponsible.trim(),
              inputData: editInputData.trim(),
              outputData: editOutputData.trim(),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editLabel, editDescription, editResponsible, editInputData, editOutputData, setNodes]);

  /**
   * 편집 취소
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditLabel(data.label || "프로세스");
    setEditDescription(data.description || "");
    setEditResponsible(data.responsible || "");
    setEditInputData(data.inputData || "");
    setEditOutputData(data.outputData || "");
  }, [data.label, data.description, data.responsible, data.inputData, data.outputData]);

  return (
    <div
      className={`
        min-w-[140px] px-4 py-3 rounded-lg border-2 bg-white dark:bg-slate-800
        ${selected ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-blue-400 dark:border-blue-500"}
        transition-all duration-200
      `}
      onDoubleClick={handleDoubleClick}
    >
      {/* 입력 핸들 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
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
            className="w-full px-2 py-1 text-sm font-medium text-text dark:text-white bg-blue-50 dark:bg-slate-700 border border-primary rounded text-center"
            placeholder="프로세스명"
          />
          <input
            type="text"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancel();
            }}
            className="w-full px-2 py-0.5 text-[10px] text-text-secondary bg-blue-50 dark:bg-slate-700 border border-primary/50 rounded text-center"
            placeholder="설명 (선택)"
          />
          <input
            type="text"
            value={editResponsible}
            onChange={(e) => setEditResponsible(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancel();
            }}
            className="w-full px-2 py-0.5 text-[10px] text-text-secondary bg-blue-50 dark:bg-slate-700 border border-primary/50 rounded text-center"
            placeholder="담당자 (선택)"
          />
          {/* 입력/출력 필드 */}
          <div className="flex gap-1">
            <input
              type="text"
              value={editInputData}
              onChange={(e) => setEditInputData(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className="flex-1 px-2 py-0.5 text-[10px] text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-center"
              placeholder="입력 데이터"
            />
            <input
              type="text"
              value={editOutputData}
              onChange={(e) => setEditOutputData(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className="flex-1 px-2 py-0.5 text-[10px] text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded text-center"
              placeholder="출력 데이터"
            />
          </div>
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
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Icon name="crop_square" size="xs" className="text-blue-500" />
            <span className="text-sm font-medium text-text dark:text-white truncate max-w-[120px]">
              {data.label || "프로세스"}
            </span>
          </div>
          {data.description && (
            <p className="text-[10px] text-text-secondary truncate max-w-[120px]">
              {data.description}
            </p>
          )}
          {data.responsible && (
            <div className="mt-0.5 flex items-center justify-center gap-1">
              <Icon name="person" size="xs" className="text-text-secondary" />
              <span className="text-[10px] text-text-secondary">{data.responsible}</span>
            </div>
          )}
          {/* 입력/출력 표시 */}
          {(data.inputData || data.outputData) && (
            <div className="mt-1 flex items-center justify-center gap-1 text-[8px]">
              {data.inputData && (
                <span className="px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                  →{data.inputData}
                </span>
              )}
              {data.outputData && (
                <span className="px-1 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                  {data.outputData}→
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
      />
    </div>
  );
}

export const ProcessNode = memo(ProcessNodeComponent);
