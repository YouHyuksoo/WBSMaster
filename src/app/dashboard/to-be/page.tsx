/**
 * @file src/app/dashboard/to-be/page.tsx
 * @description
 * TO-BE 설계: [총괄표] [Gap 분석] [추적표] 탭 + AS-IS 에서 초안 만들기 + 업무 추가 · 수정 · 삭제.
 * 설계: docs/specs/2026-11-10-to-be-design.md
 *
 * 초보자 가이드:
 * 1. "AS-IS에서 초안 만들기": 아직 TO-BE 에 연결되지 않은 AS-IS 업무를 1:1 로 복사한다 (다시 눌러도 중복 없음)
 * 2. 요약 줄: 전체 · 확정 · AS-IS 연결률 · SFR · WBS 미연결 건수 (미연결은 유지 · 폐지 제외, needsImplementation)
 * 3. 단위업무 설계(2단계)는 총괄표의 "단위업무 설계" 아이콘으로 들어간다
 * 4. Gap 분석 · 추적표(3단계)는 /api/to-be/analysis 를 한 번 받아 두 탭이 같이 쓴다. 엑셀은 추적표 탭에서 내려받는다
 */
"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, ConfirmModal, Icon, useToast } from "@/components/ui";
import { useProject } from "@/contexts";
import { useCreateToBeItem, useDeleteToBeItem, useDraftToBeFromAsIs, useToBe, useToBeAnalysis, useUpdateToBeItem } from "@/hooks";
import type { ToBeItemInput } from "@/lib/api";
import { GapPanel, ToBeModal, ToBeTable, TraceTable } from "./components";
import { needsImplementation, type ToBeItem } from "./types";

type Tab = "list" | "gap" | "trace";
const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: "list", label: "총괄표", icon: "table_rows" },
  { key: "gap", label: "Gap 분석", icon: "difference" },
  { key: "trace", label: "추적표", icon: "account_tree" },
];

export default function ToBePage() {
  const { selectedProjectId } = useProject();
  const toast = useToast();
  const { data, isLoading, error } = useToBe(selectedProjectId);
  const analysis = useToBeAnalysis(selectedProjectId);
  const [tab, setTab] = useState<Tab>("list");
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
      noSfr: items.filter((i) => i.sfrCodes.length === 0 && needsImplementation(i.changeType)).length,
      noWbs: items.filter((i) => i.wbsItems.length === 0 && needsImplementation(i.changeType)).length,
    };
  }, [items, data]);
  const gap = analysis.data?.gap;
  const tabCount: Record<Tab, number | undefined> = {
    list: items.length,
    gap: gap && gap.asIsWithoutToBe.length + gap.unresolvedIssues.length + gap.toBeWithoutSfr.length + gap.toBeWithoutWbs.length,
    trace: analysis.data?.trace.length,
  };

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
        <div className="flex gap-1.5"><dt className="text-text-secondary">WBS 미연결</dt><dd className={`font-bold tabular-nums ${stats.noWbs > 0 ? "text-warning" : "text-text dark:text-white"}`}>{stats.noWbs}</dd></div>
        <p className="text-xs text-text-secondary self-center">미연결은 유지 · 폐지 업무 제외</p>
      </dl>

      <div role="tablist" aria-label="TO-BE 보기" className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg w-fit">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm" : "text-text-secondary hover:text-text dark:hover:text-white"}`}>
            <Icon name={t.icon} size="xs" />
            <span>{t.label}</span>
            {tabCount[t.key] !== undefined && (
              <span className={`px-1.5 py-0.5 rounded text-xs tabular-nums ${tab === t.key ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"}`}>{tabCount[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "list" ? (
        error ? (
          <p className="rounded-lg bg-error/10 p-4 text-sm text-error">{error instanceof Error ? error.message : "TO-BE 설계를 불러오지 못했습니다."}</p>
        ) : isLoading ? (
          <p className="text-sm text-text-secondary">불러오는 중...</p>
        ) : (
          <ToBeTable items={items} onEdit={onEdit} onDelete={onDelete} />
        )
      ) : analysis.error ? (
        <p className="rounded-lg bg-error/10 p-4 text-sm text-error">{analysis.error instanceof Error ? analysis.error.message : "Gap 분석 · 추적표를 불러오지 못했습니다."}</p>
      ) : !analysis.data ? (
        <p className="text-sm text-text-secondary">불러오는 중...</p>
      ) : tab === "gap" ? (
        <GapPanel gap={analysis.data.gap} />
      ) : (
        <TraceTable projectId={selectedProjectId} rows={analysis.data.trace} />
      )}

      {editing && data && (
        <ToBeModal
          item={editing === "new" ? null : editing}
          asIsOptions={data.asIsOptions}
          sfrOptions={data.sfrOptions}
          wbsOptions={data.wbsOptions}
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
