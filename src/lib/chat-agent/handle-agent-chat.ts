/**
 * @file src/lib/chat-agent/handle-agent-chat.ts
 * @description
 * POST /api/chat 의 에이전트 경로입니다 (도구 호출을 지원하는 제공자 + 프로젝트가 선택된 경우).
 *
 * 초보자 가이드:
 * 1. 이전 대화(최근 6턴)를 읽는다 — 이번 질문을 저장하기 전에 (중복 방지)
 * 2. 질문 저장 → runAgent (도구 선택·실행) → 답 저장 (도구 요약 toolSummary, 확인 카드 pendingActionId 포함)
 * 3. 응답: 기존 채팅 응답 필드 + pendingAction · candidates · usedFallback
 * - 권한 확인(assertProjectAccess)은 라우트가 먼저 한다.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth";
import type { LLMClient } from "@/lib/llm/client-base";
import "@/lib/chat-tools";
import { loadConversation } from "./context";
import { runAgent } from "./run-agent";
import { buildSystemPrompt } from "./system-prompt";

export async function answerWithAgent(opts: {
  user: AuthUser;
  projectId: string;
  message: string;
  personaId?: string | null;
  client: LLMClient;
  promptConfig: { sqlSystemPrompt?: string; analysisSystemPrompt?: string; personaSystemPrompt?: string };
}) {
  const { user, projectId, message, client, promptConfig } = opts;
  const startTime = Date.now();

  const [project, history] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
    loadConversation(prisma, user.id, projectId),
  ]);

  await prisma.chatHistory.create({ data: { userId: user.id, projectId, role: "user", content: message } });

  const result = await runAgent({
    client,
    history,
    userMessage: message,
    ctx: { projectId, user, prisma, llm: client, promptConfig: { sqlSystemPrompt: promptConfig.sqlSystemPrompt } },
    systemPrompt: buildSystemPrompt({
      projectName: project?.name ?? projectId,
      today: new Date().toISOString().slice(0, 10),
      analysisSystemPrompt: promptConfig.analysisSystemPrompt,
      personaSystemPrompt: promptConfig.personaSystemPrompt,
    }),
  });

  const processingTime = Date.now() - startTime;
  const json = (v: unknown) => (v ? JSON.parse(JSON.stringify(v)) : Prisma.JsonNull);
  const saved = await prisma.chatHistory.create({
    data: {
      userId: user.id,
      projectId,
      role: "assistant",
      content: result.content,
      chartData: json(result.chartData),
      chartType: result.chartType || null,
      mindmapData: json(result.mindmapData),
      userQuery: message,
      processingTimeMs: processingTime,
      personaId: opts.personaId || null,
      toolSummary: json(result.toolSummary.length ? result.toolSummary : null),
      pendingActionId: result.pendingAction?.id ?? null,
    },
  });

  return {
    id: saved.id,
    role: "assistant",
    content: result.content,
    chartType: result.chartType,
    chartData: result.chartData,
    mindmapData: result.mindmapData,
    processingTimeMs: processingTime,
    pendingAction: result.pendingAction,
    candidates: result.candidates,
    usedFallback: result.usedFallback,
  };
}
