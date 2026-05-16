/**
 * @file src/app/dashboard/progress-risk/components/AssigneeChips.tsx
 * @description task 담당자 칩 + add 버튼. 클릭 시 모달 오픈.
 *
 * 초보자 가이드:
 * 1. **AssigneeChips**: task의 담당자 목록을 칩으로 표시
 * 2. **Add 버튼**: 담당자 추가 모달 오픈
 * 3. **Hover 상태**: 클릭 가능함을 표시 (hover:bg-white/5)
 * 4. **Tooltip**: 각 담당자의 역할 + 참여율 표시
 */
"use client";

import { useState } from "react";
import type { ProgressTask } from "@/lib/api";
import { AssigneeModal } from "./AssigneeModal";

interface Props {
  task: ProgressTask;
  projectId: string;
}

export function AssigneeChips({ task, projectId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full min-w-0 flex-nowrap gap-1 overflow-hidden items-center text-left hover:bg-white/5 dark:hover:bg-white/5 rounded px-1 py-0.5"
        aria-label="담당자 관리"
      >
        {task.assignees.length === 0 ? (
          <span className="text-xs text-text-secondary">+ 담당자 추가</span>
        ) : (
          task.assignees.map(a => (
            <span
              key={a.id}
              className="shrink-0 px-2 py-0.5 bg-purple-500/15 border border-purple-500/30 rounded-full text-[10px] text-purple-700 dark:text-purple-300"
              title={`${a.role ?? "역할 미지정"} · ${a.allocationPct}%`}
            >
              {a.user.name}
            </span>
          ))
        )}
      </button>

      <AssigneeModal
        isOpen={open}
        onClose={() => setOpen(false)}
        task={task}
        projectId={projectId}
      />
    </>
  );
}
