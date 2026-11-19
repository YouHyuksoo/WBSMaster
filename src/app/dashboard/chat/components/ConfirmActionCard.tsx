/**
 * @file src/app/dashboard/chat/components/ConfirmActionCard.tsx
 * @description
 * AI 채팅 쓰기 확인 카드입니다. AI 가 제안한 등록·수정 내용을 보여 주고, [등록]을 눌러야 실제로 실행됩니다.
 *
 * 초보자 가이드:
 * - [등록] → POST /api/chat/actions/{id}/confirm (한 번만, 누르는 즉시 버튼 잠금) → 성공하면 "결과 보기" 링크
 * - [취소] → POST /api/chat/actions/{id}/cancel
 * - 등록이 끝나면 refreshAfterServerWrite 로 화면 캐시를 새로 고친다 (안 하면 결과 화면에 새로고침 전까지 안 보인다)
 * - 409(이미 처리됨)·410(시간 지남)·기타 오류는 문구로 보여 준다
 * - 기록에서 다시 불러온 카드는 status(처리함 · 취소함 · 시간 지남 · 실패)로 시작한다. 처리한 카드에 다시 [등록] 버튼을 띄우지 않는다
 * - 색: bg-{색}-500/10 + text-{색}-600 dark:text-{색}-400 (파스텔 금지 규칙)
 */

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { refreshAfterServerWrite } from "@/lib/query-refresh";

export interface PendingActionView {
  id: string;
  summary: string;
  fields: { label: string; value: string }[];
  /** 등록·수정·삭제 구분 (버튼 문구). 예전 기록에는 없을 수 있다 */
  op?: "create" | "update" | "delete";
  /** 삭제 제안 (빨간 카드·[삭제] 버튼) */
  danger?: boolean;
  /** 기록에서 불러온 카드의 처리 상태 (GET /api/chat). 방금 받은 카드에는 없다 */
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "FAILED";
  /** 처리한 카드의 결과 화면 주소 */
  link?: string;
  /** 실패한 카드의 오류 */
  error?: string;
}

type State = { kind: "idle" | "busy" } | { kind: "done"; link: string } | { kind: "cancelled" } | { kind: "error"; message: string };

/** 기록에서 불러온 카드의 처음 상태 */
export function initialCardState(action: PendingActionView): State {
  switch (action.status) {
    case "CONFIRMED":
      return { kind: "done", link: action.link ?? "/dashboard" };
    case "CANCELLED":
      return { kind: "cancelled" };
    case "EXPIRED":
      return { kind: "error", message: "확인 시간이 지났습니다. 다시 요청해 주세요." };
    case "FAILED":
      return { kind: "error", message: action.error ? `처리하지 못했습니다: ${action.error}` : "처리하지 못했습니다." };
    default:
      return { kind: "idle" };
  }
}

export function ConfirmActionCard({ action, onComplete }: { action: PendingActionView; onComplete?: () => void }) {
  const [state, setState] = useState<State>(() => initialCardState(action));
  const sent = useRef(action.status !== undefined && action.status !== "PENDING");
  const queryClient = useQueryClient();

  const send = async (op: "confirm" | "cancel") => {
    if (sent.current) return;
    sent.current = true;
    setState({ kind: "busy" });
    try {
      const res = await fetch(`/api/chat/actions/${action.id}/${op}`, { method: "POST", credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setState(op === "confirm" ? { kind: "done", link: body.link ?? "/dashboard" } : { kind: "cancelled" });
        // 서버에서 등록 · 수정 · 삭제됐으니 다른 화면(일정 달력 등)의 캐시를 새로 고친다
        if (op === "confirm") await refreshAfterServerWrite(queryClient);
        onComplete?.();
        return;
      }
      const message =
        res.status === 409 ? "이미 처리된 제안입니다." : res.status === 410 ? "확인 시간이 지났습니다. 다시 요청해 주세요." : body.error || "처리하지 못했습니다.";
      setState({ kind: "error", message });
    } catch {
      setState({ kind: "error", message: "네트워크 오류로 처리하지 못했습니다." });
    }
  };

  return (
    <div className={`mt-3 rounded-lg border p-3 text-sm ${action.danger ? "border-red-500/40 bg-red-500/10" : "border-blue-500/30 bg-blue-500/10"}`}>
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
              className={`px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 ${action.danger ? "bg-red-600" : "bg-primary"}`}
            >
              {action.danger || action.op === "delete" ? "삭제" : action.op === "update" ? "수정" : "등록"}
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
            {action.danger ? "삭제했습니다." : "처리했습니다."}{" "}
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
