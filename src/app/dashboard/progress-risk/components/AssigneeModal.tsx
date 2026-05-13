/**
 * @file src/app/dashboard/progress-risk/components/AssigneeModal.tsx
 * @description 담당자 관리 모달 — 추가/수정/삭제 + 역할/참여율
 *
 * 초보자 가이드:
 * 1. **기존 담당자**: 목록 표시 + 역할/참여율 dropdown/input으로 편집
 * 2. **삭제 버튼**: ✕ 버튼으로 담당자 제거
 * 3. **신규 담당자**: 드롭다운에서 미할당 사용자만 표시
 * 4. **역할/참여율**: 새 담당자 추가 시 함께 입력
 * 5. **Add 버튼**: newUserId가 선택되면 활성화
 */
"use client";

import { useState } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { useUsers, useAddAssignee, useUpdateAssignee, useRemoveAssignee } from "@/hooks";
import type { ProgressTask } from "@/lib/api";
import { ROLE_OPTIONS } from "../constants";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  task: ProgressTask;
  projectId: string;
}

export function AssigneeModal({ isOpen, onClose, task, projectId }: Props) {
  const { data: users = [] } = useUsers();
  const add = useAddAssignee(projectId);
  const updateA = useUpdateAssignee(projectId);
  const remove = useRemoveAssignee(projectId);

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPct, setNewPct] = useState(100);

  const availableUsers = users.filter(u => !task.assignees.some(a => a.userId === u.id));

  const handleAdd = async () => {
    if (!newUserId) return;
    await add.mutateAsync({
      taskId: task.id,
      data: { userId: newUserId, role: newRole || undefined, allocationPct: newPct },
    });
    setNewUserId("");
    setNewRole("");
    setNewPct(100);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`담당자 — ${task.code} ${task.name}`} size="md">
      <div className="space-y-2">
        {task.assignees.map(a => (
          <div
            key={a.id}
            className="grid grid-cols-[1.4fr_0.9fr_60px_30px] gap-2 items-center p-2 bg-surface dark:bg-background-dark rounded"
          >
            <div className="text-sm text-text dark:text-white">{a.user.name}</div>
            <select
              defaultValue={a.role ?? ""}
              onChange={e =>
                updateA.mutate({ taskId: task.id, userId: a.userId, data: { role: e.target.value || undefined } })
              }
              className="text-xs bg-transparent border border-border dark:border-border-dark rounded px-2 py-1 text-text dark:text-white"
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
              defaultValue={a.allocationPct}
              onBlur={e =>
                updateA.mutate({
                  taskId: task.id,
                  userId: a.userId,
                  data: { allocationPct: Number(e.target.value) },
                })
              }
              className="text-xs text-center"
            />
            <button
              onClick={() => remove.mutate({ taskId: task.id, userId: a.userId })}
              className="text-text-secondary hover:text-error transition-colors"
              aria-label="담당자 제거"
            >
              ✕
            </button>
          </div>
        ))}

        <div className="grid grid-cols-[1.4fr_0.9fr_60px_30px] gap-2 items-center p-2 bg-white/5 dark:bg-white/5 rounded border border-dashed border-white/10">
          <select
            value={newUserId}
            onChange={e => setNewUserId(e.target.value)}
            className="text-xs bg-transparent border border-border dark:border-border-dark rounded px-2 py-1 text-text dark:text-white"
          >
            <option value="">+ 담당자 선택</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            className="text-xs bg-transparent border border-border dark:border-border-dark rounded px-2 py-1 text-text dark:text-white"
          >
            <option value="">역할</option>
            {ROLE_OPTIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <Input
            type="number"
            min={1}
            max={100}
            value={newPct}
            onChange={e => setNewPct(Number(e.target.value))}
            className="text-xs text-center"
          />
          <button
            onClick={handleAdd}
            disabled={!newUserId}
            className="text-primary disabled:opacity-30 hover:text-primary/80 transition-colors"
            aria-label="담당자 추가"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button variant="primary" onClick={onClose}>닫기</Button>
      </div>
    </Modal>
  );
}
