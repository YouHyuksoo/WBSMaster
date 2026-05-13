/**
 * @file src/app/dashboard/progress-risk/components/AddTaskModal.tsx
 * @description task 추가 모달 — 필수 5필드 입력
 *
 * 초보자 가이드:
 * 1. **폼 필드**: 기능명(필수), 카테고리(선택), 시작일(필수), 종료일(필수), 선행 task(선택)
 * 2. **유효성**: name, startDate, endDate 모두 있어야 저장 버튼 활성화
 * 3. **선행 task**: 기존 task 목록에서 선택 가능
 */
"use client";

import { useState } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { useCreateProgressTask } from "@/hooks";
import type { ProgressTask } from "@/lib/api";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  existingTasks: ProgressTask[];
}

export function AddTaskModal({ isOpen, onClose, projectId, existingTasks }: AddTaskModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [predecessorId, setPredecessorId] = useState("");

  const create = useCreateProgressTask();

  const isFormValid = !!name && !!startDate && !!endDate;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    if (new Date(endDate) < new Date(startDate)) {
      alert("종료일이 시작일보다 빠를 수 없습니다.");
      return;
    }

    await create.mutateAsync({
      projectId,
      name,
      startDate,
      endDate,
      category: category || undefined,
      predecessorId: predecessorId || undefined,
    });

    // 폼 초기화
    setName("");
    setCategory("");
    setStartDate("");
    setEndDate("");
    setPredecessorId("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 task 추가" size="md">
      <div className="space-y-3">
        {/* 기능명 */}
        <div>
          <label className="block text-xs font-semibold text-text dark:text-white mb-1">
            기능명 <span className="text-error">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 주문등록"
            autoFocus
          />
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-xs font-semibold text-text dark:text-white mb-1">카테고리</label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예: 기준관리"
          />
        </div>

        {/* 시작일 / 종료일 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text dark:text-white mb-1">
              시작일 <span className="text-error">*</span>
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text dark:text-white mb-1">
              종료일 <span className="text-error">*</span>
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* 선행 task */}
        <div>
          <label className="block text-xs font-semibold text-text dark:text-white mb-1">선행 task (선택)</label>
          <select
            value={predecessorId}
            onChange={(e) => setPredecessorId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">(없음)</option>
            {existingTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.code} {task.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isFormValid || create.isPending}
        >
          {create.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </Modal>
  );
}
