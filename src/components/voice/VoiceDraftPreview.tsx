/**
 * @file src/components/voice/VoiceDraftPreview.tsx
 * @description
 * 음성 공통 모달에서 AI 정리 결과를 종류별로 미리 보여 줍니다 (회의록 · 인터뷰 · 요구사항 · 참고자료).
 *
 * 초보자 가이드:
 * - 요구사항은 여러 건이라 체크박스로 고르게 한다 (selected/onToggle 은 모달이 가진다).
 * - 녹음에서 확인되지 않은 항목은 "녹음에서 확인되지 않음" 으로 흐리게 보인다.
 * - 면은 무채색, 강조는 글자색만 (DESIGN.md 파스텔 금지).
 */

"use client";

import type { VoiceDraft } from "@/lib/api";

const BOX = "space-y-3 rounded-xl border border-border dark:border-border-dark p-4";
const LABEL = "text-xs font-semibold text-text-secondary";
const BODY = "text-sm text-text dark:text-white whitespace-pre-wrap break-words";
const NONE = <span className="text-text-secondary">녹음에서 확인되지 않음</span>;

const INTERVIEW_SECTIONS = [
  ["currentProcess", "1. 현재 운영 방식 (AS-IS)"],
  ["painPoints", "2. 문제점"],
  ["desiredResults", "3. 원하는 결과 (TO-BE)"],
  ["technicalConstraints", "4. 기술적 제약"],
  ["questions", "5. 궁금한 점"],
] as const;

interface Props {
  draft: VoiceDraft;
  selected: Set<number>;
  onToggle: (index: number) => void;
}

export function VoiceDraftPreview({ draft, selected, onToggle }: Props) {
  if (draft.kind === "meeting") {
    const m = draft.minute;
    return (
      <section className={BOX}>
        <div>
          <h3 className="text-base font-bold text-text dark:text-white">{m.title}</h3>
          <p className="text-xs text-text-secondary mt-0.5 tabular-nums">
            {[m.meetingDate, m.location, m.author].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div>
          <p className={LABEL}>참석자</p>
          <p className={BODY}>{m.attendees || NONE}</p>
        </div>
        <div>
          <p className={LABEL}>회의 내용 {m.items.length}건</p>
          <ol className="mt-1 space-y-1.5">
            {m.items.map((it, i) => (
              <li key={i} className={BODY}>
                <span className="tabular-nums text-text-secondary">{i + 1}. </span>
                {it.content}
                {(it.assignee || it.dueDate) && (
                  <span className="block text-xs text-text-secondary">
                    {[it.assignee && `담당 ${it.assignee}`, it.dueDate && `일정 ${it.dueDate}`].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  if (draft.kind === "interview") {
    const v = draft.interview;
    return (
      <section className={BOX}>
        <div>
          <h3 className="text-base font-bold text-text dark:text-white">{v.title}</h3>
          <p className="text-xs text-text-secondary mt-0.5 tabular-nums">
            {v.interviewDate}
            {v.category && ` · ${v.category}`}
            {v.interviewer && ` · 진행 ${v.interviewer}`}
            {v.interviewee && ` · 대상 ${v.interviewee}`}
          </p>
        </div>
        {INTERVIEW_SECTIONS.map(([key, label]) => (
          <div key={key}>
            <p className={LABEL}>{label}</p>
            <p className={BODY}>{v[key] || NONE}</p>
          </div>
        ))}
      </section>
    );
  }

  if (draft.kind === "requirement") {
    return (
      <section className={BOX}>
        <p className={LABEL}>
          녹음에서 찾은 요구사항 {draft.requirements.length}건 · 등록할 것을 고르세요 ({selected.size}건 선택)
        </p>
        <ul className="space-y-2">
          {draft.requirements.map((r, i) => (
            <li key={i}>
              <label className="flex items-start gap-3 rounded-lg border border-border dark:border-border-dark px-3 py-2 cursor-pointer hover:border-primary">
                <input type="checkbox" className="mt-1 accent-primary" checked={selected.has(i)} onChange={() => onToggle(i)} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-text dark:text-white">
                    {r.functionName}
                    {r.category && <span className="ml-2 text-xs font-normal text-text-secondary">{r.category}</span>}
                  </span>
                  <span className={`block ${BODY}`}>{r.content}</span>
                  {(r.requester || r.solution) && (
                    <span className="block mt-1 text-xs text-text-secondary">
                      {[r.requester && `요청 ${r.requester}`, r.solution && `적용방안 ${r.solution}`].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const ref = draft.reference;
  return (
    <section className={BOX}>
      <h3 className="text-base font-bold text-text dark:text-white">{ref.title}</h3>
      <div>
        <p className={LABEL}>요약</p>
        <p className={BODY}>{ref.summary}</p>
      </div>
      {ref.keyPoints.length > 0 && (
        <div>
          <p className={LABEL}>핵심 내용</p>
          <ul className="mt-1 space-y-1 list-disc pl-5">
            {ref.keyPoints.map((k, i) => (
              <li key={i} className={BODY}>
                {k}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
