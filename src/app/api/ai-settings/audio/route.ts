/**
 * @file src/app/api/ai-settings/audio/route.ts
 * @description
 * 기준 설정 > 음성 회의록 설정 API (전사 모델 · 정리 모델 · OpenAI API 키). 음성은 OpenAI 만 쓴다.
 *
 * 초보자 가이드:
 * - GET: 현재 설정 + 키 등록 여부 (키 값은 돌려주지 않고 끝 4자리만)
 * - PATCH: { audioProvider?, audioTranscribeModel?, audioSummaryModel?, openaiApiKey? }
 *   · openaiApiKey: 문자열이면 저장, null 이면 삭제, 없으면 그대로 (AI 어시스턴트의 OpenAI 키와 같은 칸)
 * - 로그인 사용자 본인 설정만 다룬다 (ai_settings 가 없으면 만든다).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { AUDIO_PROVIDERS } from "@/lib/meeting-minutes-audio-models";

const MODEL_PATTERN = /^[\w.\-:/]{1,100}$/;

/** 키 끝 4자리 표시 */
const hint = (key: string | null | undefined) => (key ? `••••${key.slice(-4)}` : null);

async function load(userId: string) {
  const s = await prisma.aiSetting.findUnique({
    where: { userId },
    select: { audioTranscribeModel: true, audioSummaryModel: true, openaiApiKey: true },
  });
  return {
    audioProvider: "openai" as const,
    audioTranscribeModel: s?.audioTranscribeModel ?? "gpt-4o-transcribe",
    audioSummaryModel: s?.audioSummaryModel ?? "gpt-4.1-mini",
    hasOpenaiKey: !!s?.openaiApiKey,
    openaiKeyHint: hint(s?.openaiApiKey),
  };
}

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  return NextResponse.json(await load(user!.id));
}

export async function PATCH(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = (await request.json()) as Record<string, unknown>;
  const data: Record<string, string | null> = {};

  if ("audioProvider" in body) {
    if (!AUDIO_PROVIDERS.includes(body.audioProvider as never)) {
      return NextResponse.json({ error: "음성 인식 제공자는 openai 만 쓸 수 있습니다." }, { status: 400 });
    }
    data.audioProvider = String(body.audioProvider);
  }
  for (const field of ["audioTranscribeModel", "audioSummaryModel"] as const) {
    if (field in body) {
      const value = String(body[field] ?? "").trim();
      if (!MODEL_PATTERN.test(value)) return NextResponse.json({ error: `모델 이름이 올바르지 않습니다: ${value || "(비어 있음)"}` }, { status: 400 });
      data[field] = value;
    }
  }
  if ("openaiApiKey" in body) {
    if (body.openaiApiKey === null) data.openaiApiKey = null;
    else {
      const key = String(body.openaiApiKey ?? "").trim();
      if (!/^\S{20,300}$/.test(key)) return NextResponse.json({ error: "OpenAI API 키 형식이 올바르지 않습니다." }, { status: 400 });
      data.openaiApiKey = key;
    }
  }

  await prisma.aiSetting.upsert({
    where: { userId: user!.id },
    update: data,
    create: { userId: user!.id, ...data },
  });
  return NextResponse.json(await load(user!.id));
}
