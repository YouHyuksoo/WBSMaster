"use client";

import { useState } from "react";
import { Button, useToast } from "@/components/ui";
import { useProgressTaskStageDetails, useStageDefs, useUpdateProgressTaskStageDetail, useUsers } from "@/hooks";
import type { ProgressStageDef, ProgressTaskStageDetail, StageCategory } from "@/lib/api";

type StageDetailStatus = ProgressTaskStageDetail["status"];

const STAGE_DETAIL_STATUS_LABEL: Record<StageDetailStatus, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
};

const STAGE_DETAIL_STATUS_OPTIONS = Object.keys(STAGE_DETAIL_STATUS_LABEL) as StageDetailStatus[];

const STAGE_DETAIL_STATUS_CLASS: Record<StageDetailStatus, string> = {
  PENDING: "border-border bg-surface/50 dark:border-border-dark dark:bg-background-dark/50",
  IN_PROGRESS: "border-warning/40 bg-warning/10 dark:border-warning/40 dark:bg-warning/10",
  COMPLETED: "border-success/40 bg-success/10 dark:border-success/40 dark:bg-success/10",
};

interface Props {
  projectId: string;
  taskId: string;
  stageCategory: StageCategory;
}

interface StageDetailDraft {
  status: StageDetailStatus;
  description: string;
  issue: string;
  assigneeUserId: string;
}

export function buildStageDetailPayload(draft: StageDetailDraft) {
  return {
    description: nullable(draft.description),
    issue: nullable(draft.issue),
    assigneeUserId: draft.assigneeUserId || null,
    status: draft.status,
  };
}

export function StageDetailEditor({ projectId, taskId, stageCategory }: Props) {
  const { data: stages = [], isLoading: stagesLoading } = useStageDefs(projectId, stageCategory);
  const { data: details = [], isLoading: detailsLoading } = useProgressTaskStageDetails(taskId);
  const { data: users = [] } = useUsers();
  const detailsByStageId = new Map(details.map((detail) => [detail.stageId, detail]));
  const isLoading = stagesLoading || detailsLoading;

  return (
    <section className="border-t border-border pt-4 dark:border-border-dark">
      <div className="mb-2">
        <p className="text-sm font-semibold text-text dark:text-white">단계별 상세 상태</p>
        <p className="text-[11px] text-text-secondary">각 단계의 상세 설명, 이슈, 단계 담당자를 관리합니다.</p>
      </div>
      {isLoading ? (
        <div className="rounded border border-border bg-surface p-3 text-center text-xs text-text-secondary dark:border-border-dark dark:bg-background-dark">
          불러오는 중...
        </div>
      ) : stages.length === 0 ? (
        <div className="rounded border border-border bg-surface p-3 text-center text-xs text-text-secondary dark:border-border-dark dark:bg-background-dark">
          등록된 단계가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage) => (
            <StageDetailRow
              key={`${stage.id}:${detailsByStageId.get(stage.id)?.updatedAt ?? "new"}`}
              taskId={taskId}
              stage={stage}
              detail={detailsByStageId.get(stage.id) ?? null}
              users={users}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function StageDetailRow({
  taskId,
  stage,
  detail,
  users,
}: {
  taskId: string;
  stage: ProgressStageDef;
  detail: ProgressTaskStageDetail | null;
  users: Array<{ id: string; name?: string | null; email: string }>;
}) {
  const toast = useToast();
  const update = useUpdateProgressTaskStageDetail(taskId);
  const [draft, setDraft] = useState<StageDetailDraft>({
    status: detail?.status ?? "PENDING",
    description: detail?.description ?? "",
    issue: detail?.issue ?? "",
    assigneeUserId: detail?.assigneeUserId ?? "",
  });

  const set = (patch: Partial<StageDetailDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        stageId: stage.id,
        data: buildStageDetailPayload(draft),
      });
      toast.success(`'${stage.name}' 단계 상세가 저장되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "단계 상세 저장 실패");
    }
  };

  return (
    <div className={`rounded border p-2 ${STAGE_DETAIL_STATUS_CLASS[draft.status]}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-text dark:text-white">
          {stage.order + 1}. {stage.name}
        </p>
        <div className="flex items-center gap-1.5">
          <select
            value={draft.status}
            onChange={(event) => set({ status: event.target.value as StageDetailStatus })}
            aria-label={`${stage.name} 단계 상태`}
            className="h-7 rounded border border-border bg-background-white px-2 text-[11px] text-text focus:border-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-white"
          >
            {STAGE_DETAIL_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{STAGE_DETAIL_STATUS_LABEL[status]}</option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={handleSave} disabled={update.isPending} isLoading={update.isPending}>
            저장
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <textarea
          value={draft.description}
          onChange={(event) => set({ description: event.target.value })}
          rows={2}
          placeholder="단계 상세 설명"
          className="w-full resize-none rounded border border-border bg-background-white px-2 py-1.5 text-xs text-text focus:border-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-white"
        />
        <textarea
          value={draft.issue}
          onChange={(event) => set({ issue: event.target.value })}
          rows={2}
          placeholder="단계 이슈"
          className="w-full resize-none rounded border border-border bg-background-white px-2 py-1.5 text-xs text-text focus:border-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-white"
        />
        <select
          value={draft.assigneeUserId}
          onChange={(event) => set({ assigneeUserId: event.target.value })}
          aria-label={`${stage.name} 단계 담당자`}
          className="h-8 w-full rounded border border-border bg-background-white px-2 text-xs text-text focus:border-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-white"
        >
          <option value="">단계 담당자 선택</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.name ?? user.email}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}
