/**
 * @file src/lib/chat-agent/context.ts
 * @description
 * AI 채팅의 최근 대화 맥락을 불러옵니다. "그중 긴급한 것만", "아까 그 이슈" 같은 이어지는 질문을 이해하게 합니다.
 *
 * 초보자 가이드:
 * - loadConversation(db, userId, projectId, turns=6): 같은 사용자·프로젝트의 최근 turns 턴(질문+답 = 2메시지)을 오래된 순으로
 * - 이전 답에 도구 요약(toolSummary)이 있으면 "[이전 조회: 이슈 6건: ISS-008, ...]" 를 앞에 붙인다
 * - 긴 답은 1,500자로 자른다 (토큰 절약)
 */

import type { prisma as PrismaInstance } from "@/lib/prisma";
import type { ChatMessage } from "@/lib/llm/tool-calling";

type Db = Pick<typeof PrismaInstance, "chatHistory">;
const MAX_CHARS = 1500;

export async function loadConversation(db: Db, userId: string, projectId: string | null, turns = 6): Promise<ChatMessage[]> {
  const rows = await db.chatHistory.findMany({
    where: { userId, projectId },
    orderBy: { createdAt: "desc" },
    take: turns * 2,
    select: { role: true, content: true, toolSummary: true, createdAt: true },
  });
  return rows.reverse().map((r) => {
    if (r.role !== "assistant") return { role: "user" as const, content: r.content };
    const summaries = Array.isArray(r.toolSummary)
      ? (r.toolSummary as { summary?: string }[]).map((s) => s.summary).filter(Boolean)
      : [];
    const body = r.content.length > MAX_CHARS ? `${r.content.slice(0, MAX_CHARS)}…` : r.content;
    return { role: "assistant" as const, content: summaries.length ? `[이전 조회: ${summaries.join(" / ")}]\n${body}` : body };
  });
}
