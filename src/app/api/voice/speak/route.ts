/**
 * @file src/app/api/voice/speak/route.ts
 * @description
 * AI 어시스턴트 채팅 음성 출력: WebRTC SDP → OpenAI Realtime 연결.
 *
 * 초보자 가이드:
 * - POST { text, sdp }: 읽을 답변과 브라우저의 수신 전용 SDP offer.
 * - 응답: application/sdp. 실제 음성은 WebRTC로 브라우저에 직접 스트리밍됩니다.
 * - 키: 기준 설정 > 음성 인식 의 OpenAI 키
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { OPENAI_KEY_MISSING, toSpeakableText } from "@/lib/openai-voice";
import { createRealtimeSpeechCall } from "@/lib/openai-realtime";

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as { text?: unknown; sdp?: unknown } | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "잘못된 음성 연결 요청입니다." }, { status: 400 });
  const text = toSpeakableText(typeof body.text === "string" ? body.text : "");
  if (!text) return NextResponse.json({ error: "읽을 내용이 없습니다." }, { status: 400 });
  if (typeof body.sdp !== "string" || body.sdp.length > 65536 || !/^v=0\r?\n/.test(body.sdp) || !/^m=audio /m.test(body.sdp)) {
    return NextResponse.json({ error: "올바른 WebRTC SDP가 필요합니다." }, { status: 400 });
  }

  const setting = await prisma.aiSetting.findUnique({ where: { userId: user!.id }, select: { openaiApiKey: true } });
  if (!setting?.openaiApiKey) return NextResponse.json({ error: OPENAI_KEY_MISSING }, { status: 400 });

  try {
    const sdp = await createRealtimeSpeechCall(fetch, {
      apiKey: setting.openaiApiKey, text, sdp: body.sdp,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(25000)]),
    });
    return new NextResponse(sdp, { headers: { "Content-Type": "application/sdp", "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
