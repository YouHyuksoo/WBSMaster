/**
 * @file src/app/api/ai-settings/route.ts
 * @description
 * AI 설정 API 라우트입니다.
 * LLM 제공자, API 키, 모델 설정을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/ai-settings**: 현재 사용자의 AI 설정 조회
 * 2. **POST /api/ai-settings**: AI 설정 생성/수정
 *
 * 보안 주의사항:
 * - API 키는 서버 사이드에서만 저장/사용
 * - 클라이언트에는 마스킹된 키만 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { DEFAULT_SQL_SYSTEM_PROMPT, DEFAULT_ANALYSIS_SYSTEM_PROMPT } from "@/lib/llm";

/**
 * API 키 마스킹 유틸리티
 * 앞 4자리와 뒤 4자리만 표시
 */
function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/**
 * AI 설정 조회
 * GET /api/ai-settings
 * (인증 필요)
 */
export async function GET() {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const settings = await prisma.aiSetting.findUnique({
      where: { userId: user!.id },
    });

    if (!settings) {
      // 설정이 없으면 기본값 반환 (시스템 프롬프트도 기본값 포함)
      return NextResponse.json({
        provider: "gemini",
        geminiApiKey: null,
        geminiModel: "gemini-1.5-flash",
        mistralApiKey: null,
        mistralModel: "mistral-small-latest",
        hasGeminiKey: false,
        hasMistralKey: false,
        sqlSystemPrompt: DEFAULT_SQL_SYSTEM_PROMPT,
        analysisSystemPrompt: DEFAULT_ANALYSIS_SYSTEM_PROMPT,
      });
    }

    // API 키는 마스킹하여 반환, 시스템 프롬프트는 DB 값 또는 기본값
    return NextResponse.json({
      provider: settings.provider,
      geminiApiKey: maskApiKey(settings.geminiApiKey),
      geminiModel: settings.geminiModel,
      mistralApiKey: maskApiKey(settings.mistralApiKey),
      mistralModel: settings.mistralModel,
      hasGeminiKey: !!settings.geminiApiKey,
      hasMistralKey: !!settings.mistralApiKey,
      sqlSystemPrompt: settings.sqlSystemPrompt || DEFAULT_SQL_SYSTEM_PROMPT,
      analysisSystemPrompt: settings.analysisSystemPrompt || DEFAULT_ANALYSIS_SYSTEM_PROMPT,
    });
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
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      provider,
      geminiApiKey,
      geminiModel,
      mistralApiKey,
      mistralModel,
      sqlSystemPrompt,
      analysisSystemPrompt,
    } = body;

    // 유효성 검증
    if (provider && !["gemini", "mistral"].includes(provider)) {
      return NextResponse.json(
        { error: "지원하지 않는 LLM 제공자입니다." },
        { status: 400 }
      );
    }

    // 사용자가 users 테이블에 없으면 먼저 생성
    await prisma.user.upsert({
      where: { id: user!.id },
      update: {},
      create: {
        id: user!.id,
        email: user!.email,
        name: user!.name || null,
        avatar: user!.avatar || null,
      },
    });

    // 기존 설정 조회
    const existingSettings = await prisma.aiSetting.findUnique({
      where: { userId: user!.id },
    });

    // 업데이트할 데이터 구성 (null이 아닌 값만 업데이트)
    const updateData: {
      provider?: string;
      geminiApiKey?: string;
      geminiModel?: string;
      mistralApiKey?: string;
      mistralModel?: string;
      sqlSystemPrompt?: string | null;
      analysisSystemPrompt?: string | null;
    } = {};

    if (provider !== undefined) updateData.provider = provider;
    if (geminiModel !== undefined) updateData.geminiModel = geminiModel;
    if (mistralModel !== undefined) updateData.mistralModel = mistralModel;

    // API 키는 마스킹된 값이 아닌 경우에만 업데이트
    if (geminiApiKey && !geminiApiKey.includes("...")) {
      updateData.geminiApiKey = geminiApiKey;
    }
    if (mistralApiKey && !mistralApiKey.includes("...")) {
      updateData.mistralApiKey = mistralApiKey;
    }

    // 시스템 프롬프트 업데이트 (빈 문자열이면 null로 저장하여 기본값 사용)
    if (sqlSystemPrompt !== undefined) {
      updateData.sqlSystemPrompt = sqlSystemPrompt.trim() || null;
    }
    if (analysisSystemPrompt !== undefined) {
      updateData.analysisSystemPrompt = analysisSystemPrompt.trim() || null;
    }

    // upsert로 생성 또는 수정
    const settings = await prisma.aiSetting.upsert({
      where: { userId: user!.id },
      update: updateData,
      create: {
        userId: user!.id,
        provider: provider || "gemini",
        geminiApiKey: geminiApiKey && !geminiApiKey.includes("...") ? geminiApiKey : null,
        geminiModel: geminiModel || "gemini-1.5-flash",
        mistralApiKey: mistralApiKey && !mistralApiKey.includes("...") ? mistralApiKey : null,
        mistralModel: mistralModel || "mistral-small-latest",
        sqlSystemPrompt: sqlSystemPrompt?.trim() || null,
        analysisSystemPrompt: analysisSystemPrompt?.trim() || null,
      },
    });

    // API 키는 마스킹하여 반환, 시스템 프롬프트는 DB 값 또는 기본값
    return NextResponse.json({
      provider: settings.provider,
      geminiApiKey: maskApiKey(settings.geminiApiKey),
      geminiModel: settings.geminiModel,
      mistralApiKey: maskApiKey(settings.mistralApiKey),
      mistralModel: settings.mistralModel,
      hasGeminiKey: !!settings.geminiApiKey,
      hasMistralKey: !!settings.mistralApiKey,
      sqlSystemPrompt: settings.sqlSystemPrompt || DEFAULT_SQL_SYSTEM_PROMPT,
      analysisSystemPrompt: settings.analysisSystemPrompt || DEFAULT_ANALYSIS_SYSTEM_PROMPT,
    });
  } catch (error) {
    console.error("AI 설정 저장 실패:", error);
    return NextResponse.json(
      { error: "AI 설정을 저장할 수 없습니다." },
      { status: 500 }
    );
  }
}
