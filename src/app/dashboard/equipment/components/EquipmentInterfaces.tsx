/**
 * @file src/app/dashboard/equipment/components/EquipmentInterfaces.tsx
 * @description 설비별 PLC 연결정보·TAG·알람 정의를 관리합니다.
 * 초보자 가이드: 설비와 PLC를 선택한 뒤 종류별 항목을 편집합니다. 출처별 검색을 지원합니다.
 */
"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Equipment } from "@/lib/api";
import { interfaceFields, InterfaceKind } from "@/lib/equipment-interface-fields";
import { InterfaceEditor } from "./InterfaceEditor";
import { InterfaceRow, PlcRow, inputClass, buttonClass } from "./interface-types";
const names = { tag: "TAG", alarm: "알람", plc: "PLC 연결정보" };
export function EquipmentInterfaces({ equipments, projectId }: { equipments: Equipment[]; projectId: string }) {
  const [equipmentId, setEquipmentId] = useState("");
  const equipment = equipments.find(item => item.id === equipmentId) ?? equipments[0];
  return <section aria-label="TAG·알람·PLC 관리" className="flex min-h-0 flex-1 flex-col gap-3 p-4 text-text dark:text-white">
    <label className="flex items-center gap-3 text-sm">설비<select aria-label="TAG 관리 설비" className={`${inputClass} max-w-xl`} value={equipment?.id ?? ""} onChange={e => setEquipmentId(e.target.value)}>
      {!equipments.length && <option value="">설비를 먼저 등록해주세요</option>}
      {equipments.map(item => <option key={item.id} value={item.id}>{item.lineCode || "미분류"} · {item.code} · {item.name}</option>)}
    </select></label>
    {equipment && <InterfaceWorkspace key={`${projectId}:${equipment.id}`} equipmentId={equipment.id} />}
  </section>;
}
function InterfaceWorkspace({ equipmentId }: { equipmentId: string }) {
  const client = useQueryClient();
  const [plcId, setPlcId] = useState("");
  const [kind, setKind] = useState<InterfaceKind>("tag");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ kind: InterfaceKind; row: InterfaceRow | null } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const url = `/api/equipment/${equipmentId}/interfaces`;
  const queryKey = ["equipment-interfaces", equipmentId];
  const query = useQuery<PlcRow[]>({ queryKey, queryFn: async () => {
    const response = await fetch(url); const data = await response.json();
    if (!response.ok) throw new Error(data.error || "조회에 실패했습니다."); return data;
  } });
  const plcs = query.data ?? [];
  const selected = plcs.find(row => row.id === plcId) ?? plcs[0];
  const rows: InterfaceRow[] = kind === "plc" ? plcs : kind === "tag" ? selected?.tags ?? [] : selected?.alarms ?? [];
  const filtered = rows.filter(row => Object.entries(row).some(([key, value]) => key !== "sourceData" && typeof value === "string" && value.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 25)));
  const fields = Object.entries(interfaceFields[kind]);
  async function mutate(method: string, mutationKind: InterfaceKind, row: InterfaceRow | null, data?: Record<string, string>) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: mutationKind, id: row?.id, plcId: selected?.id, data }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "저장에 실패했습니다.");
    await client.invalidateQueries({ queryKey });
  }
  return <>
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm">PLC<select aria-label="PLC 선택" className={`${inputClass} max-w-sm`} value={selected?.id ?? ""} onChange={e => { setPlcId(e.target.value); setPage(1); }}>
        {!plcs.length && <option value="">등록된 PLC 없음</option>}{plcs.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      <button className={buttonClass} onClick={() => setEditor({ kind: "plc", row: null })}>PLC 등록</button>
    </div>
    <div role="tablist" aria-label="인터페이스 종류" className="flex gap-2 border-b border-border dark:border-border-dark">
      {(["tag", "alarm", "plc"] as const).map(value => <button key={value} role="tab" aria-selected={kind === value} onClick={() => { setKind(value); setSearch(""); setPage(1); }} className={`px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary ${kind === value ? "border-b-2 border-primary font-bold text-primary" : "text-text-secondary"}`}>{names[value]}</button>)}
    </div>
    <div className="flex flex-wrap gap-2"><input aria-label="TAG·알람·PLC 검색" className={`${inputClass} max-w-md`} placeholder="이름·주소·내용·출처 검색" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      <button disabled={query.isPending || query.isError || (kind !== "plc" && !selected)} onClick={() => setEditor({ kind, row: null })} className={buttonClass}>{names[kind]} 등록</button>
    </div>
    {(error || query.error) && <p role="alert" className="text-sm text-error">{error || query.error?.message}<button className={buttonClass} onClick={() => { setError(""); void query.refetch(); }}>다시 조회</button></p>}
    <div role="tabpanel" className="min-h-0 flex-1 overflow-auto rounded-lg border border-border dark:border-border-dark">
      <table className="w-full whitespace-nowrap text-left text-xs"><thead className="sticky top-0 bg-surface dark:bg-surface-dark"><tr>{fields.map(([key, label]) => <th key={key} className="p-3 font-medium">{label}</th>)}{kind !== "plc" && <th className="p-3">출처</th>}<th className="p-3">관리</th></tr></thead>
        <tbody>{query.isPending ? <tr><td colSpan={fields.length + 2} className="p-6">불러오는 중...</td></tr> : filtered.slice((current - 1) * 25, current * 25).map(row => <tr key={row.id} className="border-t border-border dark:border-border-dark hover:bg-surface dark:hover:bg-surface-dark">
          {fields.map(([key]) => <td key={key} className="max-w-[28rem] whitespace-pre-wrap break-words p-3 align-top">{String(row[key] ?? "—")}</td>)}
          {kind !== "plc" && <td className="p-3">{row.sourceSheet ? `${row.sourceSheet} · ${row.sourceRow}행` : "직접 등록"}</td>}
          <td className="p-2"><div className="flex gap-1"><button disabled={busy} className={buttonClass} onClick={() => setEditor({ kind, row })}>수정</button><button disabled={busy} className={buttonClass} onClick={async () => {
            if (!confirm(kind === "plc" ? `PLC와 연결된 TAG·알람을 모두 삭제하시겠습니까?` : "이 항목을 삭제하시겠습니까?")) return;
            setBusy(true); setError(""); try { await mutate("DELETE", kind, row); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
          }}>삭제</button></div></td>
        </tr>)}{!query.isPending && !query.isError && !filtered.length && <tr><td colSpan={fields.length + 2} className="p-6 text-text-secondary">{!plcs.length ? "PLC를 등록한 뒤 TAG와 알람을 등록해주세요." : "등록된 항목이 없습니다."}</td></tr>}</tbody>
      </table>
    </div>
    <footer className="flex shrink-0 items-center justify-between text-xs"><span>전체 {rows.length}건 · 검색 {filtered.length}건</span><div className="flex items-center gap-2"><button className={buttonClass} disabled={current <= 1} onClick={() => setPage(current - 1)}>이전</button><span>{current} / {Math.max(1, Math.ceil(filtered.length / 25))}</span><button className={buttonClass} disabled={current * 25 >= filtered.length} onClick={() => setPage(current + 1)}>다음</button></div></footer>
    {editor && <InterfaceEditor kind={editor.kind} row={editor.row} onClose={() => setEditor(null)} onSave={data => mutate(editor.row ? "PATCH" : "POST", editor.kind, editor.row, data)} />}
  </>;
}
