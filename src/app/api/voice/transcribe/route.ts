/**
 * @file src/app/api/voice/transcribe/route.ts
 * @description
 * AI 어시스턴트 채팅 음성 입력: 브라우저 녹음 → OpenAI 전사 → 글자.
 *
 * 초보자 가이드:
 * - POST FormData: audio (MediaRecorder 녹음, webm/ogg/mp4/wav, 25MB 이하)
 * - 응답: { text }
 * - 키 · 모델: src/lib/openai-voice.ts chatVoiceConfig (기준 설정 > 음성 회의록 의 OpenAI 키)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { OPENAI_AUDIO_MAX_BYTES, transcribeWithOpenAI } from "@/lib/meeting-minutes-audio";
import { chatVoiceConfig } from "@/lib/openai-voice";

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: "녹음된 음성이 없습니다." }, { status: 400 });
  if (audio.size > OPENAI_AUDIO_MAX_BYTES) return NextResponse.json({ error: "녹음이 너무 깁니다 (25MB 초과)." }, { status: 400 });

  const setting = await prisma.aiSetting.findUnique({
    where: { userId: user!.id },
    select: { openaiApiKey: true, audioTranscribeModel: true },
  });
  const config = chatVoiceConfig(setting);
  if (!config.ok) return NextResponse.json({ error: config.error }, { status: 400 });

  const mimeType = (audio.type || "audio/webm").split(";")[0];
  const ext = mimeType.split("/")[1]?.replace("mpeg", "mp3") || "webm";
  try {
    const text = await transcribeWithOpenAI(fetch, {
      apiKey: config.apiKey,
      model: config.transcribeModel,
      data: Buffer.from(await audio.arrayBuffer()),
      fileName: `voice.${ext}`,
      mimeType,
    });
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
