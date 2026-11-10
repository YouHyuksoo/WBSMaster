/**
 * @file src/app/api/to-be/items/[id]/suggest/route.ts
 * @description TO-BE AI 초안 제안 API (4단계). 저장하지 않고 제안만 돌려준다.
 * 초보자 가이드:
 * - POST → { suggestion } — 변화 유형 · 목표 방식 · 우선순위 · 개선 요약 · 연결 SFR · 개선 매핑 후보 · 근거
 * - AI 는 사용자 AI 설정을 쓰고, 설정이 없으면 채팅과 같이 회사 ChatGPT(서버 공용 계정)를 쓴다
 * - 인증: requireAuth + 그 업무가 속한 프로젝트에 assertProjectAccess
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { createLLMClient, resolveLLMConfig } from "@/lib/llm";
import { CHATGPT_DEFAULT_MODEL } from "@/lib/llm/chatgpt/constants";
import { ToBeError, projectOfItem } from "@/lib/to-be/to-be-service";
import { loadSuggestContext, suggestToBe } from "@/lib/to-be/to-be-suggest";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await context.params;
    const projectId = await projectOfItem(id);
    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;

    const setting = await prisma.aiSetting.findUnique({ where: { userId: user!.id } });
    const resolved = resolveLLMConfig(setting ?? {
      provider: "chatgpt", chatgptModel: CHATGPT_DEFAULT_MODEL,
      openaiApiKey: null, openaiModel: "", openrouterApiKey: null, openrouterModel: "",
    });
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 });
    const client = createLLMClient(resolved.config);

    const { ctx } = await loadSuggestContext(id);
    const suggestion = await suggestToBe((prompt, system) => client.generate(prompt, system), ctx);
    return NextResponse.json({ suggestion });
  } catch (err) {
    if (err instanceof ToBeError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("TO-BE AI 제안 실패:", err);
    return NextResponse.json({ error: "AI 제안을 받지 못했습니다. AI 설정과 연결 상태를 확인하세요." }, { status: 502 });
  }
}
