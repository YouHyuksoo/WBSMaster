/**
 * @file src/app/api/ai-settings/audio/test/route.ts
 * @description
 * 음성 회의록용 OpenAI API 키 연결 테스트 API입니다.
 *
 * 초보자 가이드:
 * - POST { apiKey?, transcribeModel?, summaryModel? }: apiKey 가 없으면 저장된 키로 시험한다.
 * - OpenAI GET /v1/models (과금 없음)로 키가 유효한지, 고른 모델을 쓸 수 있는지 확인한다.
 * - 키 값은 응답 · 로그에 남기지 않는다.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as { apiKey?: string; transcribeModel?: string; summaryModel?: string };
  let apiKey = body.apiKey?.trim();
  if (!apiKey) {
    const s = await prisma.aiSetting.findUnique({ where: { userId: user!.id }, select: { openaiApiKey: true } });
    apiKey = s?.openaiApiKey ?? undefined;
  }
  if (!apiKey) return NextResponse.json({ ok: false, message: "OpenAI API 키를 입력하거나 먼저 저장하세요." }, { status: 400 });

  try {
    const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
    if (res.status === 401) return NextResponse.json({ ok: false, message: "OpenAI 가 키를 거절했습니다 (올바르지 않은 키)." });
    if (!res.ok) return NextResponse.json({ ok: false, message: `OpenAI 응답 오류 (${res.status})` });
    const ids = new Set(((await res.json()) as { data?: Array<{ id: string }> }).data?.map((m) => m.id) ?? []);
    const missing = [body.transcribeModel, body.summaryModel].filter((m): m is string => !!m && !ids.has(m));
    return NextResponse.json({
      ok: missing.length === 0,
      message: missing.length ? `키는 유효하지만 이 키로 쓸 수 없는 모델: ${missing.join(", ")}` : "연결 성공: 키와 모델을 쓸 수 있습니다.",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, message: `OpenAI 에 연결하지 못했습니다: ${err instanceof Error ? err.message : String(err)}` });
  }
}
