/**
 * @file src/app/dashboard/chat/hooks/useChatSuggestions.ts
 * @description 프로젝트별 제안 캐시·새로고침·오류 안내를 관리합니다.
 * 초보자 가이드:
 * - 캐시는 localStorage에 버전·프로젝트별로 저장해 재방문에도 유지합니다.
 * - 프로젝트 변경 시 늦게 도착한 이전 응답은 반영하지 않습니다.
 * - 생성 실패 시 기존 제안을 보존하고 이유를 알립니다.
 */
"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { EXAMPLE_GROUPS, normalizeSuggestions, type ExampleGroup } from "@/lib/chat-suggestions";

type Notice = { success(message: string): void; error(message: string): void };
export const suggestionStorageKey = (projectId: string) => `wbs-chat-suggestions:v2:${projectId}`;
const subscribe = (notify: () => void) => { window.addEventListener("storage", notify); return () => window.removeEventListener("storage", notify); };
export function useChatSuggestions(projectId: string, notice: Notice) {
  const [state, setState] = useState<{ projectId: string; groups: ExampleGroup[] } | null>(null);
  const saved = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(suggestionStorageKey(projectId)); } catch { return null; }
  }, () => null);
  const cached = useMemo(() => {
    try { return normalizeSuggestions(JSON.parse(saved ?? "null")) ?? EXAMPLE_GROUPS; } catch { return EXAMPLE_GROUPS; }
  }, [saved]);
  const [refreshingProject, setRefreshingProject] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  const notices = useRef(notice);
  useEffect(() => { notices.current = notice; });
  useEffect(() => () => { active.current?.abort(); active.current = null; setRefreshingProject(null); }, [projectId]);

  const refreshSuggestions = useCallback(async () => {
    if (!projectId || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setRefreshingProject(projectId);
    try {
      const response = await fetch("/api/chat/suggestions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }), signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(data.error || "제안을 불러오지 못했습니다.");
      const groups = normalizeSuggestions(data.suggestions);
      if (data.source !== "ai" || !groups) throw new Error(data.message || "생성된 제안을 확인하지 못했습니다. 기존 제안을 유지합니다.");
      setState({ projectId, groups });
      try { localStorage.setItem(suggestionStorageKey(projectId), JSON.stringify(groups)); } catch { /* 저장 차단 시 현재 화면은 정상 사용 */ }
      notices.current.success("새로운 제안이 생성되었습니다.");
    } catch (error) {
      if (!controller.signal.aborted) notices.current.error(error instanceof Error ? error.message : "제안 생성 중 오류가 발생했습니다.");
    } finally {
      if (active.current === controller) { active.current = null; setRefreshingProject(null); }
    }
  }, [projectId]);
  return { suggestions: state?.projectId === projectId ? state.groups : cached,
    isRefreshingSuggestions: refreshingProject === projectId, refreshSuggestions };
}
