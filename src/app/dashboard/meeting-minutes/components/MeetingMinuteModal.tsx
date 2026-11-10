/**
 * @file src/app/dashboard/meeting-minutes/components/MeetingMinuteModal.tsx
 * @description
 * 회의록 등록/수정 모달입니다.
 *
 * 초보자 가이드:
 * - 머리 항목: 회의 목적(필수) · 일자(필수) · 시간(시작~종료) · 장소 · 작성자 · 참석자 · 비고
 * - 회의 내용 항목은 MeetingItemsEditor 가 편집한다.
 * - 문서번호는 저장 시 서버가 회의 일자로 부여하며 이후 바뀌지 않는다 (수정 모드에서 읽기 전용 표시).
 */

"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Icon, Button } from "@/components/ui";
import { MeetingItemsEditor } from "./MeetingItemsEditor";
import { toFormData, type MeetingMinute, type MeetingMinuteFormData } from "../types";

interface MeetingMinuteModalProps {
  isOpen: boolean;
  minute: MeetingMinute | null; // null 이면 신규
  draft?: MeetingMinuteFormData | null; // 신규일 때 미리 채울 값 (음성 회의록 초안)
  onClose: () => void;
  onSubmit: (data: MeetingMinuteFormData) => Promise<void>;
}

const inputClass =
  "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white";
/** 글 입력칸: 내용만큼 늘어난다 (src/components/ui/modal-width.test.ts 규칙) */
const TEXTAREA_CLASS = `${inputClass} field-sizing-content min-h-16 max-h-[30vh] resize-y`;

function Field({ label, required, children, className }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label} {required && <span className="text-error">*</span>}
      </span>
      {children}
    </label>
  );
}

/** 열려 있을 때만 본문을 그린다. 열 때마다(대상이 바뀌면) 본문을 새로 만들어 폼이 초기화된다 */
export function MeetingMinuteModal(props: MeetingMinuteModalProps) {
  if (!props.isOpen) return null;
  return <ModalBody key={props.minute?.id ?? (props.draft ? "draft" : "new")} {...props} />;
}

function ModalBody({ minute, draft, onClose, onSubmit }: MeetingMinuteModalProps) {
  const [form, setForm] = useState<MeetingMinuteFormData>(() => (!minute && draft ? draft : toFormData(minute)));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = <K extends keyof MeetingMinuteFormData>(field: K, value: MeetingMinuteFormData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("회의 목적을 입력하세요.");
    if (!form.meetingDate) return setError("회의 일자를 입력하세요.");
    setIsSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {minute ? `회의록 수정 · ${minute.code}` : draft ? "회의록 등록 (음성 초안 — 내용을 확인하세요)" : "회의록 등록"}
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-surface dark:hover:bg-slate-700">
            <Icon name="close" size="sm" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Field label="회의 목적 (Title)" required>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} placeholder="예: MES v2.0 및 v2.1 진행 협의" />
          </Field>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="일자" required>
              <input type="date" value={form.meetingDate} onChange={(e) => set("meetingDate", e.target.value)} className={inputClass} />
            </Field>
            <Field label="시작 시간">
              <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className={inputClass} />
            </Field>
            <Field label="종료 시간">
              <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} className={inputClass} />
            </Field>
            <Field label="작성자">
              <input value={form.author} onChange={(e) => set("author", e.target.value)} className={inputClass} placeholder="예: 신민서 주임" />
            </Field>
          </div>

          <Field label="장소">
            <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputClass} placeholder="예: 화상회의실, 회의실 1" />
          </Field>

          <Field label="참석자">
            <textarea value={form.attendees} onChange={(e) => set("attendees", e.target.value)} rows={2} className={TEXTAREA_CLASS} placeholder={"소속별로 한 줄씩\n예: 행성사 오창 김재옥 책임, 신민서 선임"} />
          </Field>

          <MeetingItemsEditor items={form.items} onChange={(items) => set("items", items)} />

          <Field label="비고">
            <textarea value={form.remarks} onChange={(e) => set("remarks", e.target.value)} rows={2} className={TEXTAREA_CLASS} />
          </Field>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
