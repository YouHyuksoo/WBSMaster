/**
 * @file src/app/api/ai-settings/test/route.ts
 * @description
 * AI 설정 연결 테스트 API 입니다. 저장된 현재 제공자 · 키 · 모델로 짧은 질문 하나를 보내 응답이 오는지만 확인합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/ai-settings/test** (인증 필요)
 * 2. SQL 생성 · 실행을 하지 않고 채팅 기록도 남기지 않습니다.
 *    (예전에는 /api/chat 으로 보내서 누를 때마다 채팅 기록이 쌓였다)
 * 3. 성공: { ok: true, provider, model, reply } / 실패: { error } (400: 설정 없음, 502: 제공자 호출 실패)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createLLMClient, resolveLLMConfig, providerLabel } from "@/lib/llm";

export async function POST() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const aiSetting = await prisma.aiSetting.findUnique({ where: { userId: user!.id } });
  if (!aiSetting) {
    return NextResponse.json({ error: "AI 설정이 필요합니다. 설정을 먼저 저장해주세요." }, { status: 400 });
  }

  const resolved = resolveLLMConfig(aiSetting);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  try {
    const client = createLLMClient(resolved.config);
    const reply = await client.generate("연결 테스트입니다. '확인' 한 단어로만 답하세요.");
    return NextResponse.json({
      ok: true,
      provider: resolved.config.provider,
      model: resolved.config.model,
      reply: reply.slice(0, 200),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message.slice(0, 300) : "알 수 없는 오류";
    console.error("[AI 연결 테스트] 실패:", detail);
    return NextResponse.json(
      { error: `${providerLabel(resolved.config.provider)} 호출 실패: ${detail}` },
      { status: 502 }
    );
  }
}
