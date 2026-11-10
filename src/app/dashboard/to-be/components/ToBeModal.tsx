/**
 * @file src/app/dashboard/to-be/components/ToBeModal.tsx
 * @description TO-BE 업무 추가 · 수정 모달 (공용 Modal, 글 입력칸이 있어 lg 크기).
 *
 * 초보자 가이드:
 * 1. 필수: 대분류 · 중분류 · 업무명. 나머지는 나중에 채워도 된다
 * 2. 연결 AS-IS: 이 프로젝트 AS-IS 업무 중 여러 개를 고른다 (검색 가능)
 * 3. 연결 SFR: 기능추적표의 SFR 코드 중 고르거나 직접 입력 (SFR-012 형식)
 * 3-1. 연결 WBS: 이 TO-BE 를 구현하는 WBS 작업 (3단계 추적표 AS-IS → TO-BE → SFR → WBS)
 * 4. 저장은 부모가 한다 (onSubmit). 서버 오류 메시지는 부모가 보여 준다
 */
"use client";

import { useMemo, useState } from "react";
import { Button, Icon, Modal } from "@/components/ui";
import type { ToBeData, ToBeItemInput } from "@/lib/api";
import { CHANGE_TYPE_CONFIG, MAJOR_CATEGORY_OPTIONS, PRIORITY_LABEL, STATUS_CONFIG, TARGET_METHOD_CONFIG, type ToBeItem } from "../types";
import { LinkChecklist } from "./LinkChecklist";

interface Props {
  item: ToBeItem | null; // null = 새 업무
  asIsOptions: ToBeData["asIsOptions"];
  sfrOptions: ToBeData["sfrOptions"];
  wbsOptions: ToBeData["wbsOptions"];
  busy: boolean;
  onClose: () => void;
  onSubmit: (data: ToBeItemInput) => void;
}

const field = "w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-sm text-text dark:text-white";
const label = "block text-xs font-medium text-text-secondary mb-1";

const WBS_INDENT: Record<string, number> = { LEVEL1: 0, LEVEL2: 1, LEVEL3: 2, LEVEL4: 3 };

export function ToBeModal({ item, asIsOptions, sfrOptions, wbsOptions, busy, onClose, onSubmit }: Props) {
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
  const [wbsIds, setWbsIds] = useState<string[]>(item?.wbsItems.map((w) => w.id) ?? []);
  const [sfrCodes, setSfrCodes] = useState<string[]>(item?.sfrCodes ?? []);
  const [sfrInput, setSfrInput] = useState("");

  const asIsList = useMemo(() => asIsOptions.map((a) => ({ id: a.id, code: a.asIsManagementNo ?? "-", text: `${a.middleCategory} · ${a.taskName}` })), [asIsOptions]);
  const wbsList = useMemo(() => wbsOptions.map((w) => ({ id: w.id, code: w.code, text: w.name, indent: WBS_INDENT[w.level] ?? 0 })), [wbsOptions]);
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
      wbsItemIds: wbsIds,
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

        <LinkChecklist title="연결 AS-IS 업무" searchLabel="AS-IS 검색" emptyText="AS-IS 업무가 없습니다." options={asIsList} selected={asIsIds} onChange={setAsIsIds} />

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

        <LinkChecklist title="연결 WBS 작업 (이 업무를 구현하는 작업)" searchLabel="WBS 검색" emptyText="WBS 작업이 없습니다." options={wbsList} selected={wbsIds} onChange={setWbsIds} />

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
