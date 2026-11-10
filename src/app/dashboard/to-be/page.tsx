/**
 * @file src/app/dashboard/to-be/page.tsx
 * @description
 * TO-BE 설계 (1단계): 총괄표 + AS-IS 에서 초안 만들기 + 업무 추가 · 수정 · 삭제.
 * 설계: docs/specs/2026-11-10-to-be-design.md
 *
 * 초보자 가이드:
 * 1. "AS-IS에서 초안 만들기": 아직 TO-BE 에 연결되지 않은 AS-IS 업무를 1:1 로 복사한다 (다시 눌러도 중복 없음)
 * 2. 요약 줄: 전체 · 확정 · AS-IS 연결률 · SFR 미연결 건수
 * 3. 2단계(단위업무 설계 · 흐름도) · 3단계(Gap · 추적표)는 이후 추가한다
 */
"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, ConfirmModal, Icon, useToast } from "@/components/ui";
import { useProject } from "@/contexts";
import { useCreateToBeItem, useDeleteToBeItem, useDraftToBeFromAsIs, useToBe, useUpdateToBeItem } from "@/hooks";
import type { ToBeItemInput } from "@/lib/api";
import { ToBeModal, ToBeTable } from "./components";
import type { ToBeItem } from "./types";

export default function ToBePage() {
  const { selectedProjectId } = useProject();
  const toast = useToast();
  const { data, isLoading, error } = useToBe(selectedProjectId);
  const createItem = useCreateToBeItem();
  const updateItem = useUpdateToBeItem();
  const deleteItem = useDeleteToBeItem();
  const draft = useDraftToBeFromAsIs();
  const [editing, setEditing] = useState<ToBeItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<ToBeItem | null>(null);

  const items = useMemo(() => data?.items ?? [], [data]);
  const stats = useMemo(() => {
    const asIsTotal = data?.asIsOptions.length ?? 0;
    const linked = new Set(items.flatMap((i) => i.asIsItems.map((a) => a.id))).size;
    return {
      total: items.length,
      confirmed: items.filter((i) => i.status === "CONFIRMED").length,
      asIsTotal, linked,
      noSfr: items.filter((i) => i.sfrCodes.length === 0 && i.changeType !== "RETIRE").length,
    };
  }, [items, data]);

  const fail = (err: unknown) => toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.");
  const save = async (input: ToBeItemInput) => {
    try {
      if (editing === "new") await createItem.mutateAsync({ projectId: selectedProjectId!, data: input });
      else if (editing) await updateItem.mutateAsync({ id: editing.id, data: input });
      toast.success(editing === "new" ? "TO-BE 업무를 추가했습니다." : "TO-BE 업무를 저장했습니다.");
      setEditing(null);
    } catch (err) {
      fail(err);
    }
  };
  const runDraft = async () => {
    try {
      const r = await draft.mutateAsync(selectedProjectId!);
      toast.success(r.created > 0 ? `AS-IS ${r.created}건으로 TO-BE 초안을 만들었습니다.` : "새로 만들 AS-IS 업무가 없습니다. (모두 연결됨)");
    } catch (err) {
      fail(err);
    }
  };
  const onEdit = useCallback((item: ToBeItem) => setEditing(item), []);
  const onDelete = useCallback((item: ToBeItem) => setDeleting(item), []);

  if (!selectedProjectId) {
    return <div className="p-6"><p className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center text-text-secondary">상단 헤더에서 프로젝트를 선택해주세요.</p></div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text dark:text-white flex items-center gap-2">
            <Icon name="architecture" className="text-primary" />
            TO-BE 설계
          </h1>
          <p className="text-sm text-text-secondary mt-1">현행 업무(AS-IS)가 앞으로 어떻게 바뀌고 어떤 기능(SFR)으로 구현되는지 정리합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" leftIcon="content_copy" onClick={runDraft} disabled={draft.isPending}>
            {draft.isPending ? "만드는 중..." : "AS-IS에서 초안 만들기"}
          </Button>
          <Button variant="primary" leftIcon="add" onClick={() => setEditing("new")}>TO-BE 업무 추가</Button>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark px-4 py-2.5 text-sm">
        <div className="flex gap-1.5"><dt className="text-text-secondary">전체</dt><dd className="font-bold tabular-nums text-text dark:text-white">{stats.total}</dd></div>
        <div className="flex gap-1.5"><dt className="text-text-secondary">확정</dt><dd className="font-bold tabular-nums text-success">{stats.confirmed}</dd></div>
        <div className="flex gap-1.5"><dt className="text-text-secondary">AS-IS 연결</dt><dd className="font-bold tabular-nums text-text dark:text-white">{stats.linked} / {stats.asIsTotal}</dd></div>
        <div className="flex gap-1.5"><dt className="text-text-secondary">SFR 미연결</dt><dd className={`font-bold tabular-nums ${stats.noSfr > 0 ? "text-warning" : "text-text dark:text-white"}`}>{stats.noSfr}</dd></div>
      </dl>

      {error ? (
        <p className="rounded-lg bg-error/10 p-4 text-sm text-error">{error instanceof Error ? error.message : "TO-BE 설계를 불러오지 못했습니다."}</p>
      ) : isLoading ? (
        <p className="text-sm text-text-secondary">불러오는 중...</p>
      ) : (
        <ToBeTable items={items} onEdit={onEdit} onDelete={onDelete} />
      )}

      {editing && data && (
        <ToBeModal
          item={editing === "new" ? null : editing}
          asIsOptions={data.asIsOptions}
          sfrOptions={data.sfrOptions}
          busy={createItem.isPending || updateItem.isPending}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      )}

      <ConfirmModal
        isOpen={!!deleting}
        title="TO-BE 업무 삭제"
        message={deleting ? `${deleting.toBeManagementNo} "${deleting.taskName}" 을(를) 삭제할까요? 연결된 AS-IS 업무는 지워지지 않습니다.` : ""}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteItem.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          try {
            await deleteItem.mutateAsync(deleting!.id);
            toast.success("삭제했습니다.");
            setDeleting(null);
          } catch (err) {
            fail(err);
          }
        }}
      />
    </div>
  );
}
