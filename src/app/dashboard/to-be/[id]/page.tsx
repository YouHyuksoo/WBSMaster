/**
 * @file src/app/dashboard/to-be/[id]/page.tsx
 * @description
 * TO-BE 단위업무 설계 (2단계): ① 개요 ② 개선 매핑 ③ TO-BE 흐름(AS-IS 와 나란히) ④ 프로세스 정의 ⑤ 구현 기능(SFR 진행).
 * 설계: docs/specs/2026-11-10-to-be-design.md
 *
 * 초보자 가이드:
 * 1. 총괄표의 "단위업무 설계" 아이콘으로 들어온다. 위쪽 ← 로 총괄표로 돌아간다
 * 2. 개요는 총괄표와 같은 수정 창(ToBeModal)으로 고친다
 * 3. 개선 매핑 · 프로세스 · 흐름도는 각자 저장한다 (한 섹션 저장이 다른 섹션 편집을 지우지 않는다)
 * 4. SFR 진행은 기능추적표의 세부 기능(L4) 적용 · 검증 수를 보여 준다
 */
"use client";

import { use, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button, Icon, useToast } from "@/components/ui";
import { useProject } from "@/contexts";
import { useSaveToBeDesign, useToBe, useToBeDesign, useUpdateToBeItem } from "@/hooks";
import type { ToBeDesignInput, ToBeItemInput } from "@/lib/api";
import { FixEditor, FlowCompare, ProcessEditor, ToBeModal } from "../components";
import { CHANGE_TYPE_CONFIG, MAJOR_CATEGORIES, PRIORITY_LABEL, STATUS_CONFIG, TARGET_METHOD_CONFIG } from "../types";

function Section({ no, title, icon, children, action }: { no: string; title: string; icon: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-text dark:text-white">
          <span className="text-xs font-semibold text-primary tabular-nums">{no}</span>
          <Icon name={icon} size="sm" className="text-text-secondary" />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

const badge = (c: { label: string; className: string; icon: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${c.className}`}><Icon name={c.icon} size="xs" />{c.label}</span>
);

export default function ToBeDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const { selectedProjectId } = useProject();
  const { data, isLoading, error } = useToBeDesign(id);
  const { data: list } = useToBe(data?.item.projectId ?? selectedProjectId);
  const save = useSaveToBeDesign(id);
  const updateItem = useUpdateToBeItem();
  const [editing, setEditing] = useState(false);
  const [savingPart, setSavingPart] = useState<keyof ToBeDesignInput | null>(null);

  const saveDesign = async (input: ToBeDesignInput, label: string) => {
    setSavingPart(Object.keys(input)[0] as keyof ToBeDesignInput);
    try {
      await save.mutateAsync(input);
      toast.success(`${label}을(를) 저장했습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setSavingPart(null);
    }
  };
  const saveOverview = async (input: ToBeItemInput) => {
    try {
      await updateItem.mutateAsync({ id, data: input });
      toast.success("개요를 저장했습니다.");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.");
    }
  };

  if (isLoading) return <p className="p-6 text-sm text-text-secondary">불러오는 중...</p>;
  if (error || !data) {
    return (
      <div className="p-6 space-y-3">
        <p className="rounded-lg bg-error/10 p-4 text-sm text-error">{error instanceof Error ? error.message : "TO-BE 업무를 불러오지 못했습니다."}</p>
        <Link href="/dashboard/to-be" className="text-sm text-primary hover:underline">TO-BE 총괄표로</Link>
      </div>
    );
  }

  const { item, issueCandidates, asIsFlows, sfrProgress } = data;
  const category = MAJOR_CATEGORIES[item.majorCategory as keyof typeof MAJOR_CATEGORIES]?.label ?? item.majorCategory;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/dashboard/to-be" className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-primary"><Icon name="arrow_back" size="xs" />TO-BE 총괄표</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-bold text-text dark:text-white">
            <span className="tabular-nums text-primary">{item.toBeManagementNo}</span>
            <span className="min-w-0 break-words">{item.taskName}</span>
          </h1>
          <p className="text-sm text-text-secondary">{category} · {item.middleCategory}</p>
        </div>
        <Button variant="outline" leftIcon="edit" onClick={() => setEditing(true)} disabled={!list}>개요 수정</Button>
      </div>

      <Section no="①" title="개요" icon="info">
        <dl className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-text-secondary">변화 · 방식 · 상태</dt>
          <dd className="flex flex-wrap gap-1.5">
            {badge(CHANGE_TYPE_CONFIG[item.changeType])}{badge(TARGET_METHOD_CONFIG[item.targetMethod])}{badge(STATUS_CONFIG[item.status])}
            {item.priority && <span className="text-xs text-text-secondary self-center">우선순위 {PRIORITY_LABEL[item.priority]}</span>}
          </dd>
          <dt className="text-text-secondary">연결 AS-IS</dt>
          <dd className="text-text dark:text-white">
            {item.asIsItems.length === 0 ? <span className="text-warning">연결된 AS-IS 업무가 없습니다</span> :
              item.asIsItems.map((a) => <span key={a.id} className="mr-3 inline-block"><span className="tabular-nums text-text-secondary">{a.asIsManagementNo}</span> {a.taskName}</span>)}
          </dd>
          <dt className="text-text-secondary">개선 요약</dt>
          <dd className="whitespace-pre-wrap text-text dark:text-white">{item.summary || <span className="text-text-secondary">아직 없습니다. 개요 수정에서 무엇이 달라지는지 적으세요.</span>}</dd>
        </dl>
      </Section>

      <Section no="②" title="개선 매핑 (AS-IS 문제점 → 해결)" icon="sync_alt">
        <FixEditor key={JSON.stringify(item.fixes)} initial={item.fixes.map(({ asIsIssueId, issueTitle, solution, result }) => ({ asIsIssueId, issueTitle, solution, result }))}
          candidates={issueCandidates} saving={savingPart === "fixes"} onSave={(fixes) => saveDesign({ fixes }, "개선 매핑")} />
      </Section>

      <Section no="③" title="TO-BE 흐름 (AS-IS 와 비교)" icon="account_tree">
        <FlowCompare asIsFlows={asIsFlows} flowChartData={item.flowChartData} swimlaneData={item.swimlaneData}
          saving={savingPart === "flowChartData" || savingPart === "swimlaneData"} onSave={(patch) => saveDesign(patch, "흐름도")} />
      </Section>

      <Section no="④" title="프로세스 정의" icon="format_list_numbered">
        <ProcessEditor key={JSON.stringify(item.processes)} initial={item.processes} saving={savingPart === "processes"} onSave={(processes) => saveDesign({ processes }, "프로세스")} />
      </Section>

      <Section no="⑤" title="구현 기능 (기능추적표 SFR)" icon="fact_check"
        action={<Link href="/dashboard/process-verification" className="text-xs text-primary hover:underline">업무기능추적표</Link>}>
        {sfrProgress.length === 0 ? (
          <p className="text-sm text-warning">연결된 SFR 이 없습니다. 개요 수정에서 기능 요구사항(SFR)을 연결하세요.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sfrProgress.map((s) => {
              const pct = s.total ? Math.round((s.applied / s.total) * 100) : 0;
              return (
                <li key={s.code} className="rounded-lg border border-border dark:border-border-dark p-3">
                  <p className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate"><span className="font-semibold tabular-nums text-primary">{s.code}</span> <span className="text-text dark:text-white">{s.label}</span></span>
                    <span className="shrink-0 text-xs tabular-nums text-text-secondary">{s.total ? `적용 ${s.applied}/${s.total} · 검증 ${s.verified}` : "기능추적표에 없음"}</span>
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-surface dark:bg-background-dark" role="img" aria-label={`${s.code} 적용 ${pct}%`}>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {editing && list && (
        <ToBeModal item={item} asIsOptions={list.asIsOptions} sfrOptions={list.sfrOptions} busy={updateItem.isPending}
          onClose={() => setEditing(false)} onSubmit={saveOverview} />
      )}
    </div>
  );
}
