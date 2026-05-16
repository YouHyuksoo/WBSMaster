/**
 * @file StageList.tsx
 * @description 카테고리의 단계 리스트 + 추가 폼 (헤더 카드화)
 *
 * 초보자 가이드:
 * 1. **헤더 카드**: 카테고리 아이콘 + 제목 + 오픈일자 + 단계 추가
 * 2. **테이블 헤더**: bg-surface 줄무늬 + 컬럼 라벨
 * 3. **빈 상태**: 카테고리 아이콘 + 안내 + 즉시 입력 가능
 */
"use client";

import { useState } from "react";
import { Icon, Button, useToast } from "@/components/ui";
import { useCreateStageDef, useProgressCategoryPlans, useUpdateProgressCategoryPlan } from "@/hooks";
import type { ProgressStageDef, ProgressTask } from "@/lib/api";
import { STAGE_CATEGORY_LABEL, type StageCategory } from "@/lib/stage-categories";
import { CategoryOpenDateField } from "./CategoryOpenDateField";
import { StageListRow } from "./StageListRow";

interface Props {
  projectId: string;
  category: StageCategory;
  stages: ProgressStageDef[];
  tasks: ProgressTask[];
  onRequestMerge: (sourceId: string) => void;
}

export function StageList({ projectId, category, stages, tasks, onRequestMerge }: Props) {
  const toast = useToast();
  const create = useCreateStageDef(projectId);
  const { data: categoryPlans = [] } = useProgressCategoryPlans(projectId);
  const updatePlan = useUpdateProgressCategoryPlan(projectId);
  const [newName, setNewName] = useState("");
  const categoryPlan = categoryPlans.find((plan) => plan.category === category);
  const openDateValue = categoryPlan?.openDate ? categoryPlan.openDate.slice(0, 10) : "";

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync({ category, name: trimmed });
      setNewName("");
      toast.success(`'${trimmed}' 단계가 추가되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가 실패");
    }
  };

  const taskCountsByStage = tasks.reduce((map, task) => {
    if (!task.currentStageId) return map;
    map.set(task.currentStageId, (map.get(task.currentStageId) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const handleOpenDateChange = async (openDate: string) => {
    try {
      await updatePlan.mutateAsync({ category, openDate: openDate || null });
      toast.success("카테고리 최종 오픈일자가 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    }
  };

  const totalTasks = stages.reduce((sum, s) => sum + (taskCountsByStage.get(s.id) ?? 0), 0);

  return (
    <div className="flex h-full flex-col bg-background-white dark:bg-surface-dark">
      <div className="border-b border-border bg-gradient-to-br from-primary/[0.03] to-transparent px-5 py-3 dark:border-border-dark">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon name="account_tree" size="sm" className="text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-text dark:text-white">
                {STAGE_CATEGORY_LABEL[category]} 단계
              </h3>
              <p className="text-[11px] text-text-secondary">
                단계 <span className="font-semibold text-text dark:text-white">{stages.length}</span>개
                <span className="mx-1 opacity-50">·</span>
                작업 <span className="font-semibold text-text dark:text-white">{totalTasks}</span>건
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">오픈일자</span>
              <CategoryOpenDateField
                key={`${category}:${openDateValue}`}
                value={openDateValue}
                disabled={updatePlan.isPending}
                onSave={handleOpenDateChange}
              />
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background-white p-1 shadow-sm dark:border-border-dark dark:bg-surface-dark">
              <input
                type="text"
                placeholder="새 단계 이름"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                aria-label="새 단계 이름"
                className="h-8 w-[200px] bg-transparent px-2 text-xs text-text placeholder:text-text-secondary focus:outline-none dark:text-white"
              />
              <Button
                variant="primary"
                size="sm"
                leftIcon="add"
                onClick={handleAdd}
                disabled={!newName.trim() || create.isPending}
                isLoading={create.isPending}
              >
                추가
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[48px_72px_minmax(220px,1fr)_96px_44px_36px] items-center gap-2 border-t border-border pt-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:border-border-dark">
          <span className="text-center">순서</span>
          <span className="text-center">이동</span>
          <span>단계명</span>
          <span className="text-center">작업대상</span>
          <span className="text-center">합치기</span>
          <span className="text-center">삭제</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {stages.length === 0 ? (
          <div className="m-3 rounded-xl border border-dashed border-border bg-surface/30 p-10 text-center dark:border-border-dark dark:bg-background-dark/30">
            <Icon name="layers_clear" size="xl" className="mb-2 text-text-secondary" />
            <p className="text-sm font-semibold text-text dark:text-white">등록된 단계가 없습니다.</p>
            <p className="mt-1 text-xs text-text-secondary">상단 &quot;새 단계 이름&quot;에 입력 후 추가하세요.</p>
          </div>
        ) : (
          <div className="divide-y divide-border dark:divide-border-dark">
            {stages.map((s, index) => (
              <StageListRow
                key={`${s.id}:${s.name}`}
                projectId={projectId}
                stage={s}
                previousStage={stages[index - 1]}
                nextStage={stages[index + 1]}
                taskCount={taskCountsByStage.get(s.id) ?? 0}
                onRequestMerge={onRequestMerge}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
