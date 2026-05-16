/**
 * @file src/app/dashboard/progress-risk/components/AddTaskModal.tsx
 * @description task 추가 모달 — 기능명/일정/선행/병렬·순차/담당자 입력
 *
 * 초보자 가이드:
 * 1. **폼 필드**: 기능명(필수), 카테고리(선택), 목표일자(필수), 선행 task(선택)
 * 2. **병렬/순차**: isParallel 토글 — 다른 task와 동시 진행 가능 여부
 * 3. **담당자**: 사용자 + 역할 + 참여율을 칩으로 누적, 저장 시 일괄 추가
 * 4. **저장 흐름**: 1) task 생성 → 2) 각 담당자 순차 추가 API 호출
 */
"use client";

import { useState } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { useCreateProgressTask, useAddAssignee, useUsers } from "@/hooks";
import type { ProgressTask, StageCategory } from "@/lib/api";
import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER } from "@/lib/stage-categories";
import { ROLE_OPTIONS } from "../constants";
import { BUSINESS_UNITS } from "@/constants/business-units";
import { toProgressTaskDateRange } from "./taskDateFields";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  existingTasks: ProgressTask[];
}

interface DraftAssignee {
  userId: string;
  userName: string;
  role: string;
  allocationPct: number;
}

export function AddTaskModal({ isOpen, onClose, projectId, existingTasks }: AddTaskModalProps) {
  const [name, setName] = useState("");
  const [stageCategory, setStageCategory] = useState<StageCategory>("MES_SYSTEM");
  const [businessUnit, setBusinessUnit] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [predecessorId, setPredecessorId] = useState("");
  const [isParallel, setIsParallel] = useState(true);
  const [assignees, setAssignees] = useState<DraftAssignee[]>([]);

  // 신규 담당자 임시 입력
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPct, setNewPct] = useState(100);

  const { data: users = [] } = useUsers();
  const create = useCreateProgressTask();
  const addAssignee = useAddAssignee(projectId);

  const isFormValid = !!name && !!targetDate;
  const availableUsers = users.filter(u => !assignees.some(a => a.userId === u.id));

  const handleAddAssignee = () => {
    if (!newUserId) return;
    const user = users.find(u => u.id === newUserId);
    if (!user) return;
    setAssignees(prev => [
      ...prev,
      {
        userId: user.id,
        userName: user.name ?? user.email,
        role: newRole,
        allocationPct: Math.max(1, Math.min(100, Number(newPct) || 100)),
      },
    ]);
    setNewUserId("");
    setNewRole("");
    setNewPct(100);
  };

  const handleRemoveAssignee = (userId: string) => {
    setAssignees(prev => prev.filter(a => a.userId !== userId));
  };

  const reset = () => {
    setName("");
    setStageCategory("MES_SYSTEM");
    setBusinessUnit("");
    setTargetDate("");
    setPredecessorId("");
    setIsParallel(true);
    setAssignees([]);
    setNewUserId("");
    setNewRole("");
    setNewPct(100);
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    const { startDate, endDate } = toProgressTaskDateRange(targetDate);

    const created = await create.mutateAsync({
      projectId,
      name,
      startDate,
      endDate,
      stageCategory,
      businessUnit: businessUnit || undefined,
      predecessorId: predecessorId || undefined,
      isParallel,
    });

    // 담당자들 순차 추가
    for (const a of assignees) {
      await addAssignee.mutateAsync({
        taskId: created.id,
        data: { userId: a.userId, role: a.role || undefined, allocationPct: a.allocationPct },
      });
    }

    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="DATA 추가" size="md">
      <div className="space-y-3">
        {/* 기능명 */}
        <div>
          <label className="block text-xs font-semibold text-text dark:text-white mb-1">
            기능명 <span className="text-error">*</span>
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 주문등록" autoFocus />
        </div>

        {/* 사업부 / 카테고리 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text dark:text-white mb-1">사업부</label>
            <select
              value={businessUnit}
              onChange={(e) => setBusinessUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">(미지정)</option>
              {BUSINESS_UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text dark:text-white mb-1">카테고리</label>
            <select
              value={stageCategory}
              onChange={(e) => setStageCategory(e.target.value as StageCategory)}
              className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STAGE_CATEGORY_ORDER.map((category) => (
                <option key={category} value={category}>
                  {STAGE_CATEGORY_LABEL[category]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 목표일자 */}
        <div>
          <label className="block text-xs font-semibold text-text dark:text-white mb-1">
            목표일자 <span className="text-error">*</span>
          </label>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
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

        {/* 병렬 / 순차 토글 */}
        <div>
          <label className="block text-xs font-semibold text-text dark:text-white mb-1">진행 방식</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsParallel(true)}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                isParallel
                  ? "bg-success/15 border-success/40 text-success"
                  : "bg-background-white dark:bg-surface-dark border-border dark:border-border-dark text-text-secondary"
              }`}
            >
              🟢 병렬 (다른 task와 동시 가능)
            </button>
            <button
              type="button"
              onClick={() => setIsParallel(false)}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                !isParallel
                  ? "bg-warning/15 border-warning/40 text-warning"
                  : "bg-background-white dark:bg-surface-dark border-border dark:border-border-dark text-text-secondary"
              }`}
            >
              🟠 순차 (선행 완료 후 진행)
            </button>
          </div>
        </div>

        {/* 담당자 */}
        <div>
          <label className="block text-xs font-semibold text-text dark:text-white mb-1">담당자 (선택)</label>

          {/* 추가된 담당자 칩 */}
          {assignees.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {assignees.map(a => (
                <span
                  key={a.userId}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-700 dark:text-purple-300"
                >
                  <b>{a.userName}</b>
                  {a.role && <span className="opacity-70">· {a.role}</span>}
                  {a.allocationPct !== 100 && <span className="opacity-70">· {a.allocationPct}%</span>}
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignee(a.userId)}
                    className="ml-0.5 text-purple-700/60 dark:text-purple-300/60 hover:text-error"
                    aria-label="제거"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 신규 담당자 입력 행 */}
          <div className="grid grid-cols-[1.4fr_0.9fr_60px_30px] gap-2 items-center">
            <select
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="text-xs px-2 py-1.5 rounded bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
            >
              <option value="">+ 사용자 선택</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </select>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="text-xs px-2 py-1.5 rounded bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
            >
              <option value="">역할 선택</option>
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Input
              type="number"
              min={1}
              max={100}
              value={newPct}
              onChange={(e) => setNewPct(Number(e.target.value))}
              className="text-xs text-center"
            />
            <button
              type="button"
              onClick={handleAddAssignee}
              disabled={!newUserId}
              className="text-primary text-lg disabled:opacity-30 hover:text-primary/80"
              aria-label="담당자 추가"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" onClick={onClose}>취소</Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isFormValid || create.isPending || addAssignee.isPending}
        >
          {create.isPending || addAssignee.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </Modal>
  );
}
