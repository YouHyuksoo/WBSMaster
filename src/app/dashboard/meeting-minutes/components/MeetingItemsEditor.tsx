/**
 * @file src/app/dashboard/meeting-minutes/components/MeetingItemsEditor.tsx
 * @description
 * 회의록 모달 안의 "회의 내용" 항목 편집기입니다 (내용 · 담당자 · 일정 · 추진현황).
 *
 * 초보자 가이드:
 * - 행 추가/삭제/위·아래 이동이 가능하다. 내용이 빈 행은 저장 시 버려진다.
 * - 내용은 여러 줄 입력 (양식의 "1. / 1) / -" 들여쓰기 그대로 적는다).
 * - 일정은 자유 입력 ("11/2", "12월 말" 등).
 */

"use client";

import { Icon } from "@/components/ui";
import { ITEM_STATUS_CONFIG, emptyItem, type MeetingItemForm, type MeetingItemStatus } from "../types";

interface MeetingItemsEditorProps {
  items: MeetingItemForm[];
  onChange: (items: MeetingItemForm[]) => void;
}

const inputClass =
  "w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white";
/** 내용 입력칸: 내용만큼 늘어난다 (src/components/ui/modal-width.test.ts 규칙) */
const TEXTAREA_CLASS = `${inputClass} field-sizing-content min-h-20 max-h-[40vh] resize-y`;

export function MeetingItemsEditor({ items, onChange }: MeetingItemsEditorProps) {
  const update = (index: number, field: keyof MeetingItemForm, value: string) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const remove = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length ? next : [emptyItem()]);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">회의 내용</label>
        <button
          type="button"
          onClick={() => onChange([...items, emptyItem()])}
          className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:text-primary-hover"
        >
          <Icon name="add" size="xs" />
          <span>항목 추가</span>
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-surface dark:bg-background-dark/50"
          >
            <div className="flex items-start gap-2">
              <span className="mt-1.5 w-6 text-xs font-mono text-slate-500 dark:text-slate-400">{index + 1}.</span>
              <div className="flex-1 space-y-2">
                <textarea
                  value={item.content}
                  onChange={(e) => update(index, "content", e.target.value)}
                  rows={3}
                  className={TEXTAREA_CLASS}
                  placeholder={"예: 개발 일정 변경 요청\n  1) 목표 : 12월 말 Audit 진행 가능한 수준"}
                  aria-label={`${index + 1}번 내용`}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={item.assignee}
                    onChange={(e) => update(index, "assignee", e.target.value)}
                    className={inputClass}
                    placeholder="담당자"
                    aria-label={`${index + 1}번 담당자`}
                  />
                  <input
                    value={item.dueDate}
                    onChange={(e) => update(index, "dueDate", e.target.value)}
                    className={inputClass}
                    placeholder="일정 (예: 11/2)"
                    aria-label={`${index + 1}번 일정`}
                  />
                  <select
                    value={item.status}
                    onChange={(e) => update(index, "status", e.target.value as MeetingItemStatus)}
                    className={inputClass}
                    aria-label={`${index + 1}번 추진현황`}
                  >
                    {Object.entries(ITEM_STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => move(index, -1)} title="위로" className="p-1 text-slate-400 hover:text-primary">
                  <Icon name="arrow_upward" size="xs" />
                </button>
                <button type="button" onClick={() => move(index, 1)} title="아래로" className="p-1 text-slate-400 hover:text-primary">
                  <Icon name="arrow_downward" size="xs" />
                </button>
                <button type="button" onClick={() => remove(index)} title="삭제" className="p-1 text-slate-400 hover:text-error">
                  <Icon name="delete" size="xs" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
