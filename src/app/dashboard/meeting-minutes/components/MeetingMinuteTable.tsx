/**
 * @file src/app/dashboard/meeting-minutes/components/MeetingMinuteTable.tsx
 * @description
 * 회의록 목록 그리드 테이블입니다. 행을 펼치면 참석자와 회의 내용(담당자 · 일정 · 추진현황)을 양식 형태로 보여 줍니다.
 *
 * 초보자 가이드:
 * - 열: 문서번호 · 일자 · 시간 · 회의 목적 · 장소 · 작성자 · 조치(완료/전체) · 관리
 * - 행 클릭: 상세 펼치기/접기. 수정·삭제 버튼은 클릭이 행으로 번지지 않게 막는다.
 */

"use client";

import { Fragment, useState } from "react";
import { Icon } from "@/components/ui";
import { ITEM_STATUS_CONFIG, formatDate, formatTimeRange, type MeetingMinute } from "../types";

interface MeetingMinuteTableProps {
  minutes: MeetingMinute[];
  isLoading: boolean;
  loadError?: string | null; // 조회 실패 메시지 (빈 목록과 구분)
  onEdit: (minute: MeetingMinute) => void;
  onDelete: (minute: MeetingMinute) => void;
}

const GRID = "120px 100px 110px 1fr 160px 110px 80px 80px";

export function MeetingMinuteTable({ minutes, isLoading, loadError, onEdit, onDelete }: MeetingMinuteTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-x-auto">
      <div className="min-w-[900px]">
        <div
          className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase"
          style={{ gridTemplateColumns: GRID }}
        >
          <div>문서번호</div>
          <div>일자</div>
          <div>시간</div>
          <div>회의 목적</div>
          <div>장소</div>
          <div>작성자</div>
          <div className="text-center">조치</div>
          <div className="text-center">관리</div>
        </div>

        {isLoading && <div className="p-8 text-center text-text-secondary">불러오는 중...</div>}

        {!isLoading && loadError && (
          <div className="p-8 text-center">
            <Icon name="error" size="xl" className="text-error mb-4 mx-auto" />
            <p className="text-error">{loadError}</p>
          </div>
        )}

        {!isLoading && !loadError && minutes.length === 0 && (
          <div className="p-8 text-center">
            <Icon name="inbox" size="xl" className="text-text-secondary mb-4 mx-auto" />
            <p className="text-text-secondary">등록된 회의록이 없습니다.</p>
          </div>
        )}

        {!isLoading &&
          minutes.map((minute) => {
            const done = minute.items.filter((i) => i.status === "DONE").length;
            const expanded = expandedId === minute.id;
            return (
              <Fragment key={minute.id}>
                <div
                  onClick={() => setExpandedId(expanded ? null : minute.id)}
                  className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center cursor-pointer"
                  style={{ gridTemplateColumns: GRID }}
                >
                  <div className="flex items-center gap-1 text-sm font-mono text-text dark:text-white">
                    <Icon name={expanded ? "expand_more" : "chevron_right"} size="xs" className="text-text-secondary" />
                    {minute.code}
                  </div>
                  <div className="text-sm text-text dark:text-white">{formatDate(minute.meetingDate)}</div>
                  <div className="text-sm text-text-secondary">{formatTimeRange(minute.startTime, minute.endTime)}</div>
                  <div className="text-sm font-medium text-text dark:text-white truncate" title={minute.title}>
                    {minute.title}
                  </div>
                  <div className="text-sm text-text-secondary truncate" title={minute.location ?? ""}>
                    {minute.location || "-"}
                  </div>
                  <div className="text-sm text-text-secondary truncate">{minute.author || "-"}</div>
                  <div className="text-sm text-center text-text dark:text-white">
                    {done}/{minute.items.length}
                  </div>
                  <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => onEdit(minute)} title="수정" className="p-1.5 rounded text-text-secondary hover:text-primary hover:bg-primary/10">
                      <Icon name="edit" size="xs" />
                    </button>
                    <button type="button" onClick={() => onDelete(minute)} title="삭제" className="p-1.5 rounded text-text-secondary hover:text-error hover:bg-error/10">
                      <Icon name="delete" size="xs" />
                    </button>
                  </div>
                </div>
                {expanded && <MinuteDetail minute={minute} />}
              </Fragment>
            );
          })}
      </div>
    </div>
  );
}

/** 펼친 행: 참석자 + 회의 내용 표 (양식의 내용/담당자/일정/추진현황) */
function MinuteDetail({ minute }: { minute: MeetingMinute }) {
  return (
    <div className="px-6 py-4 bg-surface dark:bg-background-dark/60 border-b border-border dark:border-border-dark space-y-3">
      <div className="text-sm">
        <span className="font-semibold text-text dark:text-white">참석자 : </span>
        <span className="whitespace-pre-line text-text-secondary">{minute.attendees || "-"}</span>
      </div>
      <div className="border border-border dark:border-border-dark rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_120px_90px] gap-2 px-3 py-2 bg-surface dark:bg-surface-dark text-xs font-semibold text-text-secondary">
          <div>내용</div>
          <div>담당자</div>
          <div>일정</div>
          <div>추진현황</div>
        </div>
        {minute.items.length === 0 && <div className="px-3 py-3 text-sm text-text-secondary">회의 내용이 없습니다.</div>}
        {minute.items.map((item, index) => {
          const status = ITEM_STATUS_CONFIG[item.status] ?? ITEM_STATUS_CONFIG.PLANNED;
          return (
            <div key={item.id} className="grid grid-cols-[1fr_120px_120px_90px] gap-2 px-3 py-2 border-t border-border dark:border-border-dark text-sm items-start bg-white dark:bg-surface-dark">
              <div className="whitespace-pre-wrap break-words text-text dark:text-white">
                <span className="font-mono text-text-secondary mr-1">{index + 1}.</span>
                {item.content}
              </div>
              <div className="text-text-secondary">{item.assignee || "-"}</div>
              <div className="text-text-secondary">{item.dueDate || "-"}</div>
              <div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                  <Icon name={status.icon} size="xs" />
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {minute.remarks && (
        <div className="text-sm">
          <span className="font-semibold text-text dark:text-white">비고 : </span>
          <span className="whitespace-pre-line text-text-secondary">{minute.remarks}</span>
        </div>
      )}
    </div>
  );
}
