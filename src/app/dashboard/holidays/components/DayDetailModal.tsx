/**
 * @file src/app/dashboard/holidays/components/DayDetailModal.tsx
 * @description
 * 달력 날짜 칸을 클릭하면 그날 등록된 일정을 크게 보여 주는 상세 모달입니다.
 *
 * 초보자 가이드:
 * 1. **열기**: 월간·주간 달력의 날짜 칸 빈 공간을 클릭하면 page.tsx 가 date 를 넘겨 연다
 * 2. **내용**: 유형·제목·기간(여러 날이면 며칠째인지)·시간·담당자·설명 전체를 줄임 없이 보여 준다
 * 3. **동작**: 일정마다 수정·삭제, 아래쪽에서 이 날짜로 새 일정 등록
 * 4. **정렬**: 종일 일정 먼저, 그다음 시작 시간 순
 */

"use client";

import { Button, Icon, Modal } from "@/components/ui";
import type { Holiday } from "@/lib/api";
import { dayNames, holidayTypeConfig } from "../types";

interface DayDetailModalProps {
  /** 보여 줄 날짜 (null 이면 닫힘) */
  date: Date | null;
  /** 그날 표시할 일정 (유형 필터가 적용된 목록) */
  holidays: Holiday[];
  onClose: () => void;
  onEdit: (holiday: Holiday) => void;
  onDelete: (id: string) => void;
  /** 이 날짜로 새 일정 등록 (YYYY-MM-DD) */
  onAdd?: (dateStr: string) => void;
}

const DAY_MS = 86400000;

/** 날짜만 남긴 로컬 자정 */
function startOfDay(value: string | Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shortDate(value: string | Date) {
  const d = new Date(value);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})`;
}

/** 기간 문구: 하루면 null, 여러 날이면 "11월 1일 (일) ~ 11월 5일 (목) · 5일 중 2일째" */
export function periodLabel(holiday: Holiday, date: Date) {
  if (!holiday.endDate) return null;
  const start = startOfDay(holiday.date);
  const end = startOfDay(holiday.endDate);
  const total = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (total <= 1) return null;
  const nth = Math.round((startOfDay(date).getTime() - start.getTime()) / DAY_MS) + 1;
  return `${shortDate(start)} ~ ${shortDate(end)} · ${total}일 중 ${nth}일째`;
}

function timeLabel(holiday: Holiday) {
  if (holiday.isAllDay || !holiday.startTime) return "종일";
  return holiday.endTime ? `${holiday.startTime} ~ ${holiday.endTime}` : `${holiday.startTime} 시작`;
}

/** 종일 먼저, 그다음 시작 시간 순 */
export function sortDayHolidays(list: Holiday[]) {
  return [...list].sort((a, b) => {
    const aKey = a.isAllDay || !a.startTime ? "" : a.startTime;
    const bKey = b.isAllDay || !b.startTime ? "" : b.startTime;
    return aKey.localeCompare(bKey) || a.title.localeCompare(b.title);
  });
}

export function DayDetailModal({ date, holidays, onClose, onEdit, onDelete, onAdd }: DayDetailModalProps) {
  if (!date) return null;
  const items = sortDayHolidays(holidays);
  const title = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]}) · 일정 ${items.length}건`;

  return (
    <Modal isOpen onClose={onClose} title={title} size="xl">
      <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Icon name="event_available" size="xl" className="text-text-secondary" />
            <p className="text-sm text-text-secondary">이 날 등록된 일정이 없습니다.</p>
          </div>
        )}

        {items.map((holiday) => {
          const config = holidayTypeConfig[holiday.type] || holidayTypeConfig.OTHER;
          const period = periodLabel(holiday, date);
          return (
            <article
              key={holiday.id}
              className="flex gap-3 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-background-dark p-4"
            >
              {/* 유형 색 띠: 유형 색은 띠·아이콘·라벨에만 쓴다 */}
              <div className={`w-1 shrink-0 rounded-full ${config.bgColor}`} aria-hidden="true" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`flex items-center gap-1 text-xs font-semibold ${config.color}`}>
                      <Icon name={config.icon} size="xs" />
                      {config.label}
                    </p>
                    <h3 className="mt-0.5 text-base font-bold text-text dark:text-white break-words">{holiday.title}</h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(holiday)}
                      aria-label={`${holiday.title} 수정`}
                      title="수정"
                      className="size-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Icon name="edit" size="sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(holiday.id)}
                      aria-label={`${holiday.title} 삭제`}
                      title="삭제"
                      className="size-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-error hover:bg-error/10 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Icon name="delete" size="sm" />
                    </button>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-text-secondary">시간</dt>
                  <dd className="text-text dark:text-white tabular-nums">{timeLabel(holiday)}</dd>
                  {period && (
                    <>
                      <dt className="text-text-secondary">기간</dt>
                      <dd className="text-text dark:text-white tabular-nums">{period}</dd>
                    </>
                  )}
                  {holiday.user && (
                    <>
                      <dt className="text-text-secondary">담당자</dt>
                      <dd className="flex items-center gap-2 text-text dark:text-white">
                        {holiday.user.avatar ? (
                          <img src={holiday.user.avatar} alt="" className="size-5 rounded-full object-cover" />
                        ) : (
                          <Icon name="person" size="xs" className="text-text-secondary" />
                        )}
                        {holiday.user.name || holiday.user.email}
                      </dd>
                    </>
                  )}
                </dl>

                {holiday.description ? (
                  <p className="whitespace-pre-wrap break-words rounded-lg bg-surface dark:bg-surface-dark p-3 text-sm leading-relaxed text-text dark:text-white">
                    {holiday.description}
                  </p>
                ) : (
                  <p className="text-xs text-text-secondary">설명 없음</p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {onAdd && (
        <div className="mt-4 flex justify-end border-t border-border dark:border-border-dark pt-4">
          <Button variant="primary" leftIcon="add" onClick={() => onAdd(toDateStr(date))}>
            이 날 일정 등록
          </Button>
        </div>
      )}
    </Modal>
  );
}
