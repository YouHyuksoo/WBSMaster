/**
 * @file src/app/dashboard/settings/components/ChatGptConnection.tsx
 * @description
 * 관리자용 회사 ChatGPT 구독 계정 연결 패널과, 제공자 선택 버튼(ChatGptProviderButton)입니다.
 *
 * 초보자 가이드:
 * - 상태: GET /api/admin/chatgpt-auth → 연결됨(계정·만료일) / 끊김
 * - [연결]: POST {action:"start"} → URL·코드 표시 → intervalSec 마다 POST {action:"poll"} → connected 면 상태 다시 읽기
 * - [연결 해제]: DELETE. 회사 계정 하나를 서버가 모든 사용자 채팅에 같이 쓴다.
 * - 색: 파스텔 단색 배경 대신 bg-{색}-500/10 + text-{색}-600 dark:text-{색}-400 (list-page-style 7-1)
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";

type Status = { connected: boolean; accountEmail?: string; expiresAt?: string; error?: string };
type Login = { verificationUri: string; userCode: string; deviceCode: string; intervalSec: number };

const API = "/api/admin/chatgpt-auth";

export function ChatGptConnection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [login, setLogin] = useState<Login | null>(null);
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch(API);
    setStatus(res.ok ? await res.json() : { connected: false, error: "상태를 읽지 못했습니다." });
  }, []);

  useEffect(() => {
    void loadStatus();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [loadStatus]);

  const poll = useCallback(
    (l: Login) => {
      timer.current = setTimeout(async () => {
        const res = await fetch(API, { method: "POST", body: JSON.stringify({ action: "poll", deviceCode: l.deviceCode }) });
        const { state } = (await res.json()) as { state: string };
        if (state === "pending") return poll(l);
        setLogin(null);
        setMessage(state === "connected" ? "연결되었습니다." : state === "expired" ? "코드가 만료되었습니다. 다시 연결하세요." : "연결이 거부되었습니다.");
        await loadStatus();
      }, l.intervalSec * 1000);
    },
    [loadStatus]
  );

  const start = async () => {
    setMessage("");
    const res = await fetch(API, { method: "POST", body: JSON.stringify({ action: "start" }) });
    if (!res.ok) return setMessage("연결을 시작하지 못했습니다.");
    const l = (await res.json()) as Login;
    setLogin(l);
    poll(l);
  };

  const disconnect = async () => {
    await fetch(API, { method: "DELETE" });
    setMessage("연결을 해제했습니다.");
    await loadStatus();
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border dark:border-border-dark">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text dark:text-white">회사 ChatGPT 계정 연결 (관리자)</p>
          <p className="text-xs text-text-secondary">서버가 이 계정 하나를 모든 사용자의 AI 채팅에 같이 씁니다.</p>
        </div>
        {status?.connected ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-600 dark:text-green-400">
            <Icon name="check_circle" size="xs" /> 연결됨
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-600 dark:text-red-400">
            <Icon name="link_off" size="xs" /> 끊김
          </span>
        )}
      </div>

      {status?.connected && (
        <p className="text-xs text-text-secondary">
          계정 {status.accountEmail ?? "(알 수 없음)"}
          {status.expiresAt ? ` · 토큰 만료 ${new Date(status.expiresAt).toLocaleString("ko-KR")} (자동 갱신)` : ""}
        </p>
      )}
      {status?.error && <p className="text-xs text-red-600 dark:text-red-400">{status.error}</p>}

      {login && (
        <div className="p-3 rounded-lg bg-blue-500/10 text-sm text-text dark:text-white space-y-1">
          <p>
            1) 회사 계정으로{" "}
            <a href={login.verificationUri} target="_blank" rel="noreferrer" className="underline text-blue-600 dark:text-blue-400">
              {login.verificationUri}
            </a>{" "}
            을 열어 로그인합니다.
          </p>
          <p>
            2) 코드 입력: <span className="font-mono font-bold">{login.userCode}</span> (15분 안에)
          </p>
          <p className="text-xs text-text-secondary">승인되면 자동으로 연결됩니다.</p>
        </div>
      )}

      {message && <p className="text-xs text-text-secondary">{message}</p>}

      <div className="flex gap-2">
        {!login && (
          <button type="button" onClick={start} className="px-3 py-1.5 rounded-lg text-sm bg-primary text-white hover:opacity-90">
            {status?.connected ? "다시 연결" : "연결"}
          </button>
        )}
        {status?.connected && !login && (
          <button
            type="button"
            onClick={disconnect}
            className="px-3 py-1.5 rounded-lg text-sm border border-border dark:border-border-dark text-text dark:text-white hover:bg-red-500/10"
          >
            연결 해제
          </button>
        )}
      </div>
    </div>
  );
}

/** 제공자 선택 줄의 "회사 ChatGPT" 버튼 */
export function ChatGptProviderButton({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
        selected ? "border-emerald-500 bg-emerald-500/10" : "border-border dark:border-border-dark hover:border-emerald-300"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-emerald-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <div className="text-left">
          <p className="font-medium text-text dark:text-white">회사 ChatGPT</p>
          <p className="text-xs text-text-secondary">회사 구독 계정 (키 불필요)</p>
        </div>
      </div>
    </button>
  );
}
