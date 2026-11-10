/**
 * @file src/app/dashboard/to-be/components/FlowCompare.tsx
 * @description TO-BE 흐름도: 왼쪽 AS-IS(읽기 전용) · 오른쪽 TO-BE(편집)를 나란히 보여 줍니다. Flow Chart · Swimlane 탭.
 *
 * 초보자 가이드:
 * 1. 캔버스는 AS-IS 분석 화면의 FlowChartCanvas · SwimlaneCanvas 를 그대로 쓴다 (저장 버튼은 캔버스 안)
 * 2. 연결된 AS-IS 업무가 여러 개면 위에서 고른다. AS-IS 흐름도가 없으면 안내만 보여 준다
 * 3. TO-BE 가 비어 있고 AS-IS 흐름도가 있으면 "AS-IS 흐름 복사해 시작" 으로 출발점을 만든다
 * 4. 넓은 화면(xl)에서 좌우, 좁으면 위아래
 */
"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import type { ToBeDesign } from "@/lib/api";
import { FlowChartCanvas } from "../../as-is-analysis/components/FlowChartCanvas";
import { SwimlaneCanvas } from "../../as-is-analysis/components/SwimlaneCanvas";
import type { FlowChartData, SwimlaneData } from "../../as-is-analysis/types";

interface Props {
  asIsFlows: ToBeDesign["asIsFlows"];
  flowChartData: unknown;
  swimlaneData: unknown;
  saving: boolean;
  onSave: (patch: { flowChartData?: unknown; swimlaneData?: unknown }) => void;
}

type Tab = "flow" | "swimlane";

export function FlowCompare({ asIsFlows, flowChartData, swimlaneData, saving, onSave }: Props) {
  const [tab, setTab] = useState<Tab>("flow");
  const [asIsId, setAsIsId] = useState(asIsFlows[0]?.asIsItemId ?? "");
  const asIs = asIsFlows.find((f) => f.asIsItemId === asIsId);
  const key = tab === "flow" ? "flowChartData" : "swimlaneData";
  const toBeData = tab === "flow" ? flowChartData : swimlaneData;
  const asIsData = asIs?.[key];
  const isEmpty = (d: unknown) => !d || !Array.isArray((d as { nodes?: unknown[] }).nodes) || (d as { nodes: unknown[] }).nodes.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="흐름도 종류" className="inline-flex rounded-lg border border-border dark:border-border-dark p-0.5">
          {([["flow", "Flow Chart"], ["swimlane", "Swimlane"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
              className={`px-3 py-1 rounded-md text-sm ${tab === v ? "bg-primary/10 text-primary font-semibold" : "text-text-secondary hover:text-text dark:hover:text-white"}`}>{l}</button>
          ))}
        </div>
        {asIsFlows.length > 1 && (
          <select value={asIsId} onChange={(e) => setAsIsId(e.target.value)} aria-label="비교할 AS-IS 업무"
            className="px-2 py-1 rounded-md border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-sm text-text dark:text-white">
            {asIsFlows.map((f) => <option key={f.asIsItemId} value={f.asIsItemId}>AS-IS: {f.asIsLabel}</option>)}
          </select>
        )}
        {isEmpty(toBeData) && !isEmpty(asIsData) && (
          <Button type="button" variant="outline" size="sm" leftIcon="content_copy" disabled={saving}
            onClick={() => onSave({ [key]: asIsData })}>AS-IS 흐름 복사해 시작</Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <section aria-label="AS-IS 흐름 (읽기 전용)" className="rounded-xl border border-border dark:border-border-dark overflow-hidden">
          <p className="px-3 py-2 text-xs font-semibold text-text-secondary border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
            AS-IS {asIs ? `· ${asIs.asIsLabel}` : ""} <span className="font-normal">(읽기 전용)</span>
          </p>
          <div className="h-[460px]">
            {isEmpty(asIsData) ? (
              <p className="flex h-full flex-col items-center justify-center gap-2 text-sm text-text-secondary">
                <Icon name="account_tree" size="lg" />
                {asIsFlows.length === 0 ? "연결된 AS-IS 업무에 흐름도가 없습니다. (AS-IS 분석에서 작성)" : "이 AS-IS 업무에는 이 종류의 흐름도가 없습니다."}
              </p>
            ) : tab === "flow" ? (
              <FlowChartCanvas key={`asis-flow-${asIsId}`} initialData={asIsData as FlowChartData} readOnly />
            ) : (
              <SwimlaneCanvas key={`asis-swim-${asIsId}`} initialData={asIsData as SwimlaneData} readOnly />
            )}
          </div>
        </section>
        <section aria-label="TO-BE 흐름 (편집)" className="rounded-xl border-2 border-primary/40 overflow-hidden">
          <p className="px-3 py-2 text-xs font-semibold text-primary border-b border-border dark:border-border-dark bg-primary/5">TO-BE <span className="font-normal text-text-secondary">(편집 후 캔버스의 저장을 누르세요)</span></p>
          <div className="h-[460px]">
            {tab === "flow" ? (
              <FlowChartCanvas key={`tobe-flow-${JSON.stringify(flowChartData ?? null).length}`} initialData={(flowChartData ?? null) as FlowChartData | null}
                isSaving={saving} onSave={(data) => onSave({ flowChartData: data })} />
            ) : (
              <SwimlaneCanvas key={`tobe-swim-${JSON.stringify(swimlaneData ?? null).length}`} initialData={(swimlaneData ?? null) as SwimlaneData | null}
                isSaving={saving} onSave={(data) => onSave({ swimlaneData: data })} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
