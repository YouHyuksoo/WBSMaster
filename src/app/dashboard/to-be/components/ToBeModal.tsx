/**
 * @file src/app/dashboard/to-be/components/ToBeModal.tsx
 * @description TO-BE 업무 추가 · 수정 모달 (공용 Modal, 글 입력칸이 있어 lg 크기).
 *
 * 초보자 가이드:
 * 1. 필수: 대분류 · 중분류 · 업무명. 나머지는 나중에 채워도 된다
 * 2. 연결 AS-IS: 이 프로젝트 AS-IS 업무 중 여러 개를 고른다 (검색 가능)
 * 3. 연결 SFR: 기능추적표의 SFR 코드 중 고르거나 직접 입력 (SFR-012 형식)
 * 4. 저장은 부모가 한다 (onSubmit). 서버 오류 메시지는 부모가 보여 준다
 */
"use client";

import { useMemo, useState } from "react";
import { Button, Icon, Modal } from "@/components/ui";
import type { ToBeData, ToBeItemInput } from "@/lib/api";
import { CHANGE_TYPE_CONFIG, MAJOR_CATEGORY_OPTIONS, PRIORITY_LABEL, STATUS_CONFIG, TARGET_METHOD_CONFIG, type ToBeItem } from "../types";

interface Props {
  item: ToBeItem | null; // null = 새 업무
  asIsOptions: ToBeData["asIsOptions"];
  sfrOptions: ToBeData["sfrOptions"];
  busy: boolean;
  onClose: () => void;
  onSubmit: (data: ToBeItemInput) => void;
}

const field = "w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-sm text-text dark:text-white";
const label = "block text-xs font-medium text-text-secondary mb-1";

export function ToBeModal({ item, asIsOptions, sfrOptions, busy, onClose, onSubmit }: Props) {
  const [form, setForm] = useState({
    majorCategory: item?.majorCategory ?? "PRODUCTION",
    middleCategory: item?.middleCategory ?? "",
    taskName: item?.taskName ?? "",
    changeType: item?.changeType ?? "IMPROVE",
    targetMethod: item?.targetMethod ?? "SYSTEM",
    summary: item?.summary ?? "",
    priority: item?.priority ?? "",
    status: item?.status ?? "DRAFT",
  });
  const [asIsIds, setAsIsIds] = useState<string[]>(item?.asIsItems.map((a) => a.id) ?? []);
  const [sfrCodes, setSfrCodes] = useState<string[]>(item?.sfrCodes ?? []);
  const [asIsQuery, setAsIsQuery] = useState("");
  const [sfrInput, setSfrInput] = useState("");

  const filteredAsIs = useMemo(() => {
    const q = asIsQuery.trim().toLowerCase();
    return asIsOptions.filter((a) => !q || `${a.asIsManagementNo ?? ""} ${a.middleCategory} ${a.taskName}`.toLowerCase().includes(q));
  }, [asIsOptions, asIsQuery]);
  const sfrLabel = useMemo(() => new Map(sfrOptions.map((s) => [s.code, s.label])), [sfrOptions]);

  const addSfr = (raw: string) => {
    const code = raw.trim().toUpperCase().split(" ")[0];
    if (code && !sfrCodes.includes(code)) setSfrCodes([...sfrCodes, code]);
    setSfrInput("");
  };

  const submit = () =>
    onSubmit({
      majorCategory: form.majorCategory,
      middleCategory: form.middleCategory,
      taskName: form.taskName,
      changeType: form.changeType as ToBeItem["changeType"],
      targetMethod: form.targetMethod as ToBeItem["targetMethod"],
      summary: form.summary,
      priority: (form.priority || null) as ToBeItem["priority"],
      status: form.status as ToBeItem["status"],
      sfrCodes,
      asIsItemIds: asIsIds,
    });

  return (
    <Modal isOpen onClose={onClose} title={item ? `TO-BE 업무 수정 · ${item.toBeManagementNo}` : "TO-BE 업무 추가"} size="lg">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className={label}>대분류 *</span>
            <select className={field} value={form.majorCategory} onChange={(e) => setForm({ ...form, majorCategory: e.target.value })}>
              {MAJOR_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={label}>중분류 *</span>
            <input className={field} required maxLength={100} value={form.middleCategory} onChange={(e) => setForm({ ...form, middleCategory: e.target.value })} />
          </label>
          <label className="block">
            <span className={label}>업무명 *</span>
            <input className={field} required maxLength={200} value={form.taskName} onChange={(e) => setForm({ ...form, taskName: e.target.value })} />
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ["변화 유형", "changeType", CHANGE_TYPE_CONFIG],
            ["목표 방식", "targetMethod", TARGET_METHOD_CONFIG],
            ["상태", "status", STATUS_CONFIG],
          ] as const).map(([text, key, config]) => (
            <label key={key} className="block">
              <span className={label}>{text}</span>
              <select className={field} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
                {Object.entries(config).map(([value, c]) => <option key={value} value={value}>{c.label}</option>)}
              </select>
            </label>
          ))}
          <label className="block">
            <span className={label}>우선순위</span>
            <select className={field} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="">-</option>
              {Object.entries(PRIORITY_LABEL).map(([value, l]) => <option key={value} value={value}>{l}</option>)}
            </select>
          </label>
        </div>

        <label className="block">
          <span className={label}>개선 요약 (무엇이 달라지는가)</span>
          <textarea className={`${field} field-sizing-content min-h-20 max-h-60`} maxLength={2000} value={form.summary}
            placeholder="예: 절곡 실적을 설비 TAG 로 자동 수집하고 수기 입력을 없앤다"
            onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </label>

        <section>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={label}>연결 AS-IS 업무 ({asIsIds.length}건 선택)</span>
            <input className="w-48 px-2 py-1 rounded-md border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-xs text-text dark:text-white"
              placeholder="AS-IS 검색" aria-label="AS-IS 검색" value={asIsQuery} onChange={(e) => setAsIsQuery(e.target.value)} />
          </div>
          <ul className="max-h-40 overflow-y-auto rounded-lg border border-border dark:border-border-dark p-1">
            {filteredAsIs.length === 0 && <li className="px-2 py-2 text-xs text-text-secondary">AS-IS 업무가 없습니다.</li>}
            {filteredAsIs.map((a) => (
              <li key={a.id}>
                <label className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface dark:hover:bg-surface-hover">
                  <input type="checkbox" checked={asIsIds.includes(a.id)}
                    onChange={(e) => setAsIsIds(e.target.checked ? [...asIsIds, a.id] : asIsIds.filter((x) => x !== a.id))} />
                  <span className="tabular-nums text-xs text-text-secondary w-16 shrink-0">{a.asIsManagementNo ?? "-"}</span>
                  <span className="truncate text-text dark:text-white">{a.middleCategory} · {a.taskName}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <span className={label}>연결 SFR (기능추적표 기능 요구사항)</span>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {sfrCodes.length === 0 && <span className="text-xs text-text-secondary">연결된 SFR 이 없습니다.</span>}
            {sfrCodes.map((code) => (
              <span key={code} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                <span className="tabular-nums font-semibold">{code}</span>{sfrLabel.get(code) && <span className="text-text-secondary">{sfrLabel.get(code)}</span>}
                <button type="button" aria-label={`${code} 빼기`} onClick={() => setSfrCodes(sfrCodes.filter((c) => c !== code))} className="hover:text-error"><Icon name="close" size="xs" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={field} list="to-be-sfr-options" placeholder="SFR 코드 입력 또는 목록에서 선택 (예: SFR-012)" value={sfrInput}
              onChange={(e) => setSfrInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSfr(sfrInput); } }} />
            <datalist id="to-be-sfr-options">
              {sfrOptions.map((s) => <option key={s.code} value={`${s.code} ${s.label}`} />)}
            </datalist>
            <Button type="button" variant="outline" className="shrink-0 whitespace-nowrap" onClick={() => addSfr(sfrInput)} disabled={!sfrInput.trim()}>추가</Button>
          </div>
        </section>

        <div className="flex justify-end gap-2 border-t border-border dark:border-border-dark pt-4">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="submit" variant="primary" disabled={busy || !form.middleCategory.trim() || !form.taskName.trim()}>
            {busy ? "저장 중..." : item ? "저장" : "추가"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
