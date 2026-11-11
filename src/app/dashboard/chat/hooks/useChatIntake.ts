/**
 * @file src/app/dashboard/chat/hooks/useChatIntake.ts
 * @description 업무 등록 초안을 프로젝트별로 복구하고 후속 답변에 연결합니다.
 * 초보자 가이드: 프로젝트가 바뀌면 이전 요청 결과와 초안을 버립니다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { IntakeTarget, IntakeView } from "@/lib/chat-intake/types";
import type { PendingActionView } from "../components/ConfirmActionCard";
export interface IntakeReply { intake: IntakeView; pendingAction?: PendingActionView; content: string }
export interface DraftSummary { id: string; target: IntakeTarget; status: string; revision: number }
export function useChatIntake(projectId: string, onError: (message: string) => void) {
  const [replyState, setReply] = useState<{ projectId: string; reply: IntakeReply | null }>({ projectId, reply: null });
  const reply = replyState.projectId === projectId ? replyState.reply : null;
  const [draftState, setDrafts] = useState<{ projectId: string; drafts: DraftSummary[] }>({ projectId, drafts: [] });
  const drafts = draftState.projectId === projectId ? draftState.drafts : [];
  const projectRef = useRef(projectId);
  const errorRef = useRef(onError);
  useEffect(() => { errorRef.current = onError; }, [onError]);
  const adopt = useCallback(async (id: string) => {
    const project = projectRef.current;
    const res = await fetch(`/api/chat/intakes/${id}`, { cache: "no-store" });
    const body = await res.json();
    if (project !== projectRef.current) return;
    if (!res.ok) { errorRef.current(body.error || "초안을 불러오지 못했습니다."); return; }
    setReply({ projectId: project, reply: body });
  }, []);
  const refresh = useCallback(async () => {
    const project = projectRef.current;
    if (!project) return;
    const res = await fetch(`/api/chat/intakes?projectId=${encodeURIComponent(project)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("초안 목록을 불러오지 못했습니다.");
    const data = await res.json();
    if (project !== projectRef.current) return;
    setDrafts({ projectId: project, drafts: data });
  }, []);
  useEffect(() => {
    projectRef.current = projectId;
    if (projectId) void refresh().catch((e) => errorRef.current(e.message));
  }, [projectId, refresh]);
  const accept = useCallback((data: IntakeReply) => {
    setReply({ projectId: projectRef.current, reply: data });
    void refresh().catch((e) => errorRef.current(e.message));
  }, [refresh]);
  return { reply, drafts, adopt, accept, refresh, leave: () => setReply({ projectId: projectRef.current, reply: null }) };
}
