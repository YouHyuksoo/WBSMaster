/**
 * @file src/app/api/ai-settings/route.ts
 * @description
 * AI 설정 API 라우트입니다.
 * LLM 제공자, API 키, 모델 설정을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/ai-settings**: 현재 사용자의 AI 설정 조회
 * 2. **POST /api/ai-settings**: AI 설정 생성/수정
 * 3. 제공자: chatgpt(회사 계정) · openai · openrouter (Kimi · Gemini · Mistral 은 2026-11-09 제거, DB 칼럼만 남음)
 *
 * 보안 주의사항:
 * - API 키는 서버 사이드에서만 저장/사용
 * - 클라이언트에는 마스킹된 키만 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { DEFAULT_SQL_SYSTEM_PROMPT, DEFAULT_ANALYSIS_SYSTEM_PROMPT, isLLMProvider } from "@/lib/llm";
import type { AiSetting } from "@prisma/client";
import { CHATGPT_DEFAULT_MODEL } from "@/lib/llm/chatgpt/constants";

const DEFAULTS = {
  chatgptModel: CHATGPT_DEFAULT_MODEL,
  openaiModel: "gpt-4.1-mini",
  openrouterModel: "openai/gpt-4.1-mini",
};

/**
 * API 키 마스킹 유틸리티
 * 앞 4자리와 뒤 4자리만 표시
 */
function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/** 클라이언트 응답 (키는 마스킹) */
function toResponse(settings: AiSetting) {
  return {
    provider: settings.provider,
    chatgptModel: settings.chatgptModel,
    openaiApiKey: maskApiKey(settings.openaiApiKey),
    openaiModel: settings.openaiModel,
    openrouterApiKey: maskApiKey(settings.openrouterApiKey),
    openrouterModel: settings.openrouterModel,
    hasOpenaiKey: !!settings.openaiApiKey,
    hasOpenrouterKey: !!settings.openrouterApiKey,
    sqlSystemPrompt: settings.sqlSystemPrompt || DEFAULT_SQL_SYSTEM_PROMPT,
    analysisSystemPrompt: settings.analysisSystemPrompt || DEFAULT_ANALYSIS_SYSTEM_PROMPT,
  };
}

/** 마스킹된 값("abcd...wxyz")이 아닌 새 키만 저장 대상 */
const newKey = (key: unknown): string | undefined =>
  typeof key === "string" && key.trim() && !key.includes("...") ? key.trim() : undefined;

/** 비어 있지 않은 모델명만 저장 대상 */
const modelName = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/**
 * AI 설정 조회
 * GET /api/ai-settings
 * (인증 필요)
 */
export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const settings = await prisma.aiSetting.findUnique({
      where: { userId: user!.id },
    });

    if (!settings) {
      // 설정이 없으면 기본값 반환 (시스템 프롬프트도 기본값 포함)
      return NextResponse.json({
        provider: "chatgpt",
        openaiApiKey: null,
        openrouterApiKey: null,
        ...DEFAULTS,
        hasOpenaiKey: false,
        hasOpenrouterKey: false,
        sqlSystemPrompt: DEFAULT_SQL_SYSTEM_PROMPT,
        analysisSystemPrompt: DEFAULT_ANALYSIS_SYSTEM_PROMPT,
      });
    }

    return NextResponse.json(toResponse(settings));
  } catch (error) {
    console.error("AI 설정 조회 실패:", error);
    return NextResponse.json(
      { error: "AI 설정을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * AI 설정 생성/수정
 * POST /api/ai-settings
 * (인증 필요)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { provider, sqlSystemPrompt, analysisSystemPrompt } = body;

    // 유효성 검증
    if (provider && !isLLMProvider(provider)) {
      return NextResponse.json(
        { error: "지원하지 않는 LLM 제공자입니다." },
        { status: 400 }
      );
    }

    // 제공자별 키(새로 입력한 값만) · 모델
    const keys = {
      openaiApiKey: newKey(body.openaiApiKey),
      openrouterApiKey: newKey(body.openrouterApiKey),
    };
    const models = {
      chatgptModel: modelName(body.chatgptModel),
      openaiModel: modelName(body.openaiModel),
      openrouterModel: modelName(body.openrouterModel),
    };
    const prompts = {
      ...(sqlSystemPrompt !== undefined && { sqlSystemPrompt: String(sqlSystemPrompt).trim() || null }),
      ...(analysisSystemPrompt !== undefined && { analysisSystemPrompt: String(analysisSystemPrompt).trim() || null }),
    };
    const defined = <T extends Record<string, unknown>>(o: T) =>
      Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

    const settings = await prisma.aiSetting.upsert({
      where: { userId: user!.id },
      update: {
        ...(provider && { provider }),
        ...defined(keys),
        ...defined(models),
        ...prompts,
      },
      create: {
        userId: user!.id,
        provider: provider || "chatgpt",
        chatgptModel: models.chatgptModel ?? DEFAULTS.chatgptModel,
        openaiApiKey: keys.openaiApiKey ?? null,
        openrouterApiKey: keys.openrouterApiKey ?? null,
        openaiModel: models.openaiModel ?? DEFAULTS.openaiModel,
        openrouterModel: models.openrouterModel ?? DEFAULTS.openrouterModel,
        sqlSystemPrompt: prompts.sqlSystemPrompt ?? null,
        analysisSystemPrompt: prompts.analysisSystemPrompt ?? null,
      },
    });

    return NextResponse.json(toResponse(settings));
  } catch (error) {
    console.error("AI 설정 저장 실패:", error);
    return NextResponse.json(
      { error: "AI 설정을 저장할 수 없습니다." },
      { status: 500 }
    );
  }
}
