/**
 * @file src/app/dashboard/chat/components/IntakePanel.tsx
 * @description 채팅에서 업무 초안·근거·질문과 등록 확인을 보여줍니다.
 * 초보자 가이드: 일반 대화로 나가도 초안은 서버에 남아 이어서 작성할 수 있습니다.
 */
import { INTAKE_POLICIES, displayValue } from "@/lib/chat-intake/policies";
import type { DraftSummary, IntakeReply } from "../hooks/useChatIntake";
import { ConfirmActionCard } from "./ConfirmActionCard";

interface Props {
  reply: IntakeReply | null; drafts: DraftSummary[]; busy: boolean;
  onAdopt: (id: string) => void; onLeave: () => void; onCommand: (message: string) => void;
}
const button = "rounded-lg border border-border dark:border-border-dark px-2 py-1 text-xs text-text dark:text-white hover:bg-slate-500/10 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50";
export function IntakePanel({ reply, drafts, busy, onAdopt, onLeave, onCommand }: Props) {
  if (!reply && !drafts.length) return null;
  return <section aria-label="업무 등록 초안" className="mx-4 mb-2 rounded-lg border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark p-3 text-sm text-text dark:text-white">
    <div className="flex flex-wrap items-center gap-2">
      <strong>{reply ? `${INTAKE_POLICIES[reply.intake.target].label} · ${reply.intake.items.length}건` : "이어서 작성할 초안"}</strong>
      <select aria-label="작성할 초안 선택" disabled={busy} value={reply?.intake.id ?? ""} onChange={(e) => { if (e.target.value) onAdopt(e.target.value); }} className="min-w-0 rounded border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark p-1 text-xs">
        <option value="">초안 선택</option>
        {drafts.map((d, i) => <option key={d.id} value={d.id}>{INTAKE_POLICIES[d.target]?.label} · {d.status === "PAUSED" ? "보류" : "작성 중"} {i + 1}</option>)}
      </select>
      {reply && <>
        <button type="button" className={button} disabled={busy} onClick={onLeave}>일반 채팅</button>
        {!["COMMITTED", "CANCELLED"].includes(reply.intake.status) && <>
          <button type="button" className={button} disabled={busy} onClick={() => onCommand("$pause")}>보류</button>
          <button type="button" className={button} disabled={busy} onClick={() => onCommand("$cancel")}>초안 취소</button>
          <button type="button" className={button} disabled={busy} onClick={() => onCommand("$prepare")}>다시 확인</button>
        </>}
      </>}
    </div>
    {reply && <>
      <div aria-live="polite" className="mt-2">
        {reply.intake.questions.slice(0, 3).map((q) => <p key={`${q.itemKey}:${q.field}`} className="my-1">{reply.intake.items.findIndex((i) => i.key === q.itemKey) + 1}번 · {q.message}</p>)}
        {reply.intake.status === "COMMITTED" && <p>등록했습니다. {reply.intake.result?.map((r) => <a key={r.id} className="mr-2 text-primary underline" href={r.link}>{r.label}</a>)}</p>}
        {reply.intake.status === "PAUSED" && <p>보류 중입니다. 답변을 입력하면 이어서 작성합니다.</p>}
      </div>
      <details className="mt-2 max-h-72 overflow-y-auto">
        <summary className="cursor-pointer text-text-secondary focus-visible:outline-2 focus-visible:outline-primary">컬럼별 값과 근거 보기</summary>
        {reply.intake.items.map((item, i) => <div key={item.key} className="mt-3 border-t border-border dark:border-border-dark pt-2">
          <strong>{i + 1}번 · {String(item.fields.title?.value ?? "제목 미확인")}</strong>
          <dl className="mt-2 space-y-2">
            {INTAKE_POLICIES[reply.intake.target].fields.map((p) => {
              const f = item.fields[p.key];
              return <div key={p.key} className="grid grid-cols-[7rem_1fr] gap-2 text-xs">
                <dt className="text-text-secondary">{p.label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words">
                  {f?.state === "NOT_APPLICABLE" ? "해당 없음" : displayValue(p, f?.value ?? p.default ?? null)}
                  {f?.note && <p className="text-amber-700 dark:text-amber-400">{f.note}</p>}
                  {f?.sources.map((s, index) => <details key={index} className="mt-1 text-text-secondary"><summary className="cursor-pointer">근거 · {s.location}</summary><blockquote>{s.quote}</blockquote>
                    {s.sourceId.match(/^[0-9a-f-]{36}$/i) && <a href={`/api/chat/attachments/${s.sourceId}`} className="text-primary underline">원본 다운로드</a>}
                  </details>)}
                </dd>
              </div>;
            })}
          </dl>
        </div>)}
      </details>
      {!!reply.intake.duplicates?.length && <p className="mt-2 text-amber-700 dark:text-amber-400">동일 제목의 기존 자료 {reply.intake.duplicates.length}건이 있습니다. 등록하면 새 항목을 추가합니다.</p>}
      {reply.pendingAction && <ConfirmActionCard key={reply.pendingAction.id} action={reply.pendingAction} onComplete={() => onAdopt(reply.intake.id)} />}
    </>}
  </section>;
}
