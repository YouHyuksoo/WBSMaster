/**
 * @file src/app/api/voice/speak/route.ts
 * @description
 * AI 어시스턴트 채팅 음성 출력: 답변 글자 → OpenAI 음성 합성 → mp3.
 *
 * 초보자 가이드:
 * - POST { text }: 마크다운 답변을 그대로 보내면 서버가 읽을 글자만 골라(toSpeakableText) 읽는다.
 * - 응답: audio/mpeg (본문 그대로 재생)
 * - 키: 기준 설정 > 음성 회의록 의 OpenAI 키
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { OPENAI_KEY_MISSING, speakWithOpenAI, toSpeakableText } from "@/lib/openai-voice";

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as { text?: unknown };
  const text = toSpeakableText(typeof body.text === "string" ? body.text : "");
  if (!text) return NextResponse.json({ error: "읽을 내용이 없습니다." }, { status: 400 });

  const setting = await prisma.aiSetting.findUnique({ where: { userId: user!.id }, select: { openaiApiKey: true } });
  if (!setting?.openaiApiKey) return NextResponse.json({ error: OPENAI_KEY_MISSING }, { status: 400 });

  try {
    const audio = await speakWithOpenAI(fetch, { apiKey: setting.openaiApiKey, text });
    return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
