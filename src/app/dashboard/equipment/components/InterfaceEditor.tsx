/**
 * @file src/app/dashboard/equipment/components/InterfaceEditor.tsx
 * @description PLC·TAG·알람의 등록·수정 대화상자입니다.
 * 초보자 가이드: 원본 출처와 원본 셀은 조회 전용입니다.
 */
"use client";
import { useEffect, useRef, useState } from "react";
import { interfaceFields, InterfaceKind } from "@/lib/equipment-interface-fields";
import { InterfaceRow, inputClass, buttonClass } from "./interface-types";
export function InterfaceEditor({ kind, row, onClose, onSave }: {
  kind: InterfaceKind; row: InterfaceRow | null; onClose: () => void;
  onSave: (data: Record<string, string>) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<Record<string, string>>(() => Object.fromEntries(Object.keys(interfaceFields[kind]).map(key => [key, String(row?.[key] ?? "")])));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const name = { plc: "PLC", tag: "TAG", alarm: "알람" }[kind];
  return <dialog ref={dialog} aria-labelledby="interface-editor-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto w-[min(900px,95vw)] max-h-[90vh] rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark p-5 text-text dark:text-white backdrop:bg-black/50">
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try { await onSave(data); onClose(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
    }}>
      <h2 id="interface-editor-title" className="mb-4 text-lg font-bold">{name} {row ? "수정" : "등록"}</h2>
      <fieldset disabled={busy} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.entries(interfaceFields[kind]).map(([key, label]) => {
          const required = kind === "plc" ? key === "name" : kind === "tag" ? ["name", "address"].includes(key) : ["address", "message"].includes(key);
          return <label key={key} className="flex flex-col gap-1 text-xs">{label}{required ? " *" : ""}
            {["notes", "description", "message", "legacyMessage"].includes(key)
              ? <textarea className={inputClass} rows={3} maxLength={10000} required={required} value={data[key]} onChange={e => setData({ ...data, [key]: e.target.value })} />
              : <input className={inputClass} maxLength={10000} type={key === "port" ? "number" : "text"} min={key === "port" ? 1 : undefined} max={key === "port" ? 65535 : undefined} required={required} value={data[key]} onChange={e => setData({ ...data, [key]: e.target.value })} />}
          </label>;
        })}
      </fieldset>
      {row?.sourceSheet != null && <details className="mt-4 text-xs"><summary>원본 출처: {String(row.sourceSheet)} · {String(row.sourceRow)}행</summary><pre className="mt-2 whitespace-pre-wrap break-all">{String(row.sourceFile ?? "")}\n{JSON.stringify(row.sourceData, null, 2)}</pre></details>}
      {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className={buttonClass}>취소</button><button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "저장 중..." : "저장"}</button></div>
    </form>
  </dialog>;
}
