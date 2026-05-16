"use client";

import { useMemo, useState } from "react";
import { Button, Icon, Input, Modal } from "@/components/ui";
import type { ProgressStageDef, ProgressTask } from "@/lib/api";
import { STAGE_CATEGORY_LABEL } from "@/lib/stage-categories";
import { PROGRESS_TASK_STATUS_LABEL } from "./taskStatusOptions";

interface Props {
  value: string | null;
  taskId: string;
  allTasks: ProgressTask[];
  stages: ProgressStageDef[];
  onChange: (predecessorId: string | null) => void;
}

function getInvalidPredecessors(taskId: string, allTasks: ProgressTask[]): Set<string> {
  const invalid = new Set<string>([taskId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const task of allTasks) {
      if (!invalid.has(task.id) && task.predecessorId && invalid.has(task.predecessorId)) {
        invalid.add(task.id);
        changed = true;
      }
    }
  }

  return invalid;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return value.slice(0, 10);
}

function getStageName(task: ProgressTask, stages: ProgressStageDef[]): string {
  return stages.find((stage) => stage.id === task.currentStageId)?.name ?? "-";
}

function getTaskLabel(task: ProgressTask | undefined): string {
  if (!task) return "선행 없음";
  return [task.code, task.name].filter(Boolean).join(" ");
}

export function PredecessorSelect({ value, taskId, allTasks, stages, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current = allTasks.find((task) => task.id === value);
  const invalid = useMemo(() => getInvalidPredecessors(taskId, allTasks), [taskId, allTasks]);

  const candidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return allTasks
      .filter((task) => !invalid.has(task.id))
      .filter((task) => {
        if (!normalized) return true;
        return [
          task.code,
          task.name,
          task.businessUnit,
          STAGE_CATEGORY_LABEL[task.stageCategory],
          task.category,
          task.endDate?.slice(0, 10),
          getStageName(task, stages),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      })
      .sort((a, b) => {
        const byBusinessUnit = (a.businessUnit ?? "").localeCompare(b.businessUnit ?? "");
        if (byBusinessUnit !== 0) return byBusinessUnit;
        const byCategory = STAGE_CATEGORY_LABEL[a.stageCategory].localeCompare(STAGE_CATEGORY_LABEL[b.stageCategory]);
        if (byCategory !== 0) return byCategory;
        const byMajor = (a.category ?? "").localeCompare(b.category ?? "");
        if (byMajor !== 0) return byMajor;
        return (a.code ?? "").localeCompare(b.code ?? "");
      });
  }, [allTasks, invalid, query, stages]);

  const handleSelect = (predecessorId: string | null) => {
    onChange(predecessorId);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-7 w-full min-w-0 items-center justify-between gap-1 rounded border border-transparent px-2 text-left text-[11px] text-text-secondary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
        title={getTaskLabel(current)}
        aria-label="선행 task 선택"
      >
        <span className="min-w-0 truncate">{current ? getTaskLabel(current) : "-"}</span>
        <Icon name="search" size="xs" className="shrink-0" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="선행 task 선택"
        size="full"
        closeOnOverlayClick={false}
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="코드, 기능명, 사업부, 카테고리, 대분류, 목표일자 검색"
              className="md:max-w-xl"
              autoFocus
            />
            <Button variant="outline" onClick={() => handleSelect(null)}>
              선행 없음
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border dark:border-border-dark">
            <div className="min-w-[1030px]">
              <div className="grid grid-cols-[86px_82px_110px_130px_minmax(220px,1fr)_86px_104px_104px_72px] gap-2 border-b border-border bg-surface px-3 py-2 text-[11px] font-semibold text-text-secondary dark:border-border-dark dark:bg-background-dark">
                <div>코드</div>
                <div>사업부</div>
                <div>카테고리</div>
                <div>대분류</div>
                <div>기능명</div>
                <div>상태</div>
                <div>목표일자</div>
                <div>단계</div>
                <div className="text-center">선택</div>
              </div>

              <div className="max-h-[56vh] overflow-y-auto">
                {candidates.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-text-secondary">
                    선택 가능한 선행 task가 없습니다.
                  </div>
                ) : (
                  candidates.map((candidate) => {
                    const selected = candidate.id === value;

                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => handleSelect(candidate.id)}
                        className={`grid w-full grid-cols-[86px_82px_110px_130px_minmax(220px,1fr)_86px_104px_104px_72px] gap-2 border-b border-border px-3 py-2 text-left text-xs transition-colors last:border-b-0 dark:border-border-dark ${
                          selected
                            ? "bg-primary/12 text-primary"
                            : "text-text hover:bg-surface dark:text-white dark:hover:bg-background-dark"
                        }`}
                      >
                        <div className="truncate font-medium">{candidate.code ?? "-"}</div>
                        <div className="truncate text-text-secondary">{candidate.businessUnit ?? "-"}</div>
                        <div className="truncate text-text-secondary">{STAGE_CATEGORY_LABEL[candidate.stageCategory]}</div>
                        <div className="truncate text-text-secondary" title={candidate.category ?? ""}>
                          {candidate.category ?? "-"}
                        </div>
                        <div className="truncate font-medium" title={candidate.name}>{candidate.name}</div>
                        <div className="truncate text-text-secondary">{PROGRESS_TASK_STATUS_LABEL[candidate.status]}</div>
                        <div className="truncate text-text-secondary">{formatDate(candidate.endDate)}</div>
                        <div className="truncate text-text-secondary" title={getStageName(candidate, stages)}>
                          {getStageName(candidate, stages)}
                        </div>
                        <div className="text-center text-[11px] font-semibold">
                          {selected ? "선택됨" : "선택"}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
