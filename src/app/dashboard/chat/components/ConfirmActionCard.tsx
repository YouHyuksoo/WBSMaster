/**
 * @file src/app/dashboard/chat/components/ConfirmActionCard.tsx
 * @description
 * AI 채팅 쓰기 확인 카드입니다. AI 가 제안한 등록·수정 내용을 보여 주고, [등록]을 눌러야 실제로 실행됩니다.
 *
 * 초보자 가이드:
 * - [등록] → POST /api/chat/actions/{id}/confirm (한 번만, 누르는 즉시 버튼 잠금) → 성공하면 "결과 보기" 링크
 * - [취소] → POST /api/chat/actions/{id}/cancel
 * - 409(이미 처리됨)·410(시간 지남)·기타 오류는 문구로 보여 준다
 * - 색: bg-{색}-500/10 + text-{색}-600 dark:text-{색}-400 (파스텔 금지 규칙)
 */

"use client";

import { useRef, useState } from "react";
import Link from "next/link";

export interface PendingActionView {
  id: string;
  summary: string;
  fields: { label: string; value: string }[];
}

type State = { kind: "idle" | "busy" } | { kind: "done"; link: string } | { kind: "cancelled" } | { kind: "error"; message: string };

export function ConfirmActionCard({ action }: { action: PendingActionView }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const sent = useRef(false);

  const send = async (op: "confirm" | "cancel") => {
    if (sent.current) return;
    sent.current = true;
    setState({ kind: "busy" });
    try {
      const res = await fetch(`/api/chat/actions/${action.id}/${op}`, { method: "POST", credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) return setState(op === "confirm" ? { kind: "done", link: body.link ?? "/dashboard" } : { kind: "cancelled" });
      const message =
        res.status === 409 ? "이미 처리된 제안입니다." : res.status === 410 ? "확인 시간이 지났습니다. 다시 요청해 주세요." : body.error || "처리하지 못했습니다.";
      setState({ kind: "error", message });
    } catch {
      setState({ kind: "error", message: "네트워크 오류로 처리하지 못했습니다." });
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm">
      <p className="font-medium text-text dark:text-white">{action.summary}</p>
      {action.fields.length > 0 && (
        <table className="mt-2 w-full text-xs">
          <tbody>
            {action.fields.map((f) => (
              <tr key={f.label}>
                <td className="py-0.5 pr-3 text-text-secondary whitespace-nowrap">{f.label}</td>
                <td className="py-0.5 text-text dark:text-white">{f.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-3 flex items-center gap-2">
        {(state.kind === "idle" || state.kind === "busy") && (
          <>
            <button
              type="button"
              disabled={state.kind === "busy"}
              onClick={() => send("confirm")}
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              등록
            </button>
            <button
              type="button"
              disabled={state.kind === "busy"}
              onClick={() => send("cancel")}
              className="px-3 py-1.5 rounded-lg border border-border dark:border-border-dark text-text dark:text-white text-xs hover:bg-slate-500/10 disabled:opacity-50"
            >
              취소
            </button>
          </>
        )}
        {state.kind === "done" && (
          <span className="text-xs text-green-600 dark:text-green-400">
            등록했습니다.{" "}
            <Link href={state.link} className="underline">
              결과 보기
            </Link>
          </span>
        )}
        {state.kind === "cancelled" && <span className="text-xs text-text-secondary">취소했습니다.</span>}
        {state.kind === "error" && <span className="text-xs text-red-600 dark:text-red-400">{state.message}</span>}
      </div>
    </div>
  );
}
