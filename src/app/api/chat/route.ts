/**
 * @file src/app/api/chat/route.ts
 * @description
 * AI 채팅 API 라우트입니다.
 * 사용자 메시지를 받아 LLM으로 SQL 생성/실행/분석 파이프라인을 수행합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/chat**: 채팅 메시지 처리
 *    - 메시지 → LLM(SQL 생성) → SQL 실행 → LLM(결과 분석) → 응답
 * 2. **GET /api/chat**: 채팅 기록 조회
 *
 * 파이프라인:
 * 1. 사용자 질문 수신
 * 2. 스키마 정보 + 질문 → LLM
 * 3. LLM이 SQL 생성
 * 4. SQL 검증 (SELECT만 허용)
 * 5. Prisma로 SQL 실행
 * 6. 결과 + 질문 → LLM (분석)
 * 7. 마크다운 + 차트 데이터 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { processChatMessage, LLMConfig, SystemPromptConfig } from "@/lib/llm";
import { Prisma } from "@prisma/client";

/**
 * 채팅 기록 조회
 * GET /api/chat?projectId=xxx&limit=50
 * (인증 필요)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: Prisma.ChatHistoryWhereInput = {
      userId: user!.id,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const chatHistory = await prisma.chatHistory.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return NextResponse.json(chatHistory);
  } catch (error) {
    console.error("채팅 기록 조회 실패:", error);
    return NextResponse.json(
      { error: "채팅 기록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 채팅 메시지 처리
 * POST /api/chat
 * (인증 필요)
 *
 * Request Body:
 * - message: 사용자 메시지
 * - projectId: 프로젝트 ID (선택)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { message, projectId, personaId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "메시지를 입력해주세요." },
        { status: 400 }
      );
    }

    // 페르소나 조회 (선택된 경우)
    let personaSystemPrompt: string | undefined;
    if (personaId) {
      const persona = await prisma.aiPersona.findFirst({
        where: { id: personaId, userId: user!.id },
      });
      if (persona) {
        personaSystemPrompt = persona.systemPrompt;
      }
    }

    // AI 설정 조회
    const aiSettings = await prisma.aiSetting.findUnique({
      where: { userId: user!.id },
    });

    if (!aiSettings) {
      return NextResponse.json(
        { error: "AI 설정이 필요합니다. 설정 페이지에서 API 키를 등록해주세요." },
        { status: 400 }
      );
    }

    // 현재 선택된 제공자의 API 키 확인
    const provider = aiSettings.provider as "gemini" | "mistral";
    const apiKey = provider === "gemini" ? aiSettings.geminiApiKey : aiSettings.mistralApiKey;
    const model = provider === "gemini" ? aiSettings.geminiModel : aiSettings.mistralModel;

    if (!apiKey) {
      return NextResponse.json(
        { error: `${provider === "gemini" ? "Gemini" : "Mistral"} API 키가 설정되지 않았습니다.` },
        { status: 400 }
      );
    }

    // LLM 설정
    const llmConfig: LLMConfig = {
      provider,
      apiKey,
      model,
    };

    // 시스템 프롬프트 설정 (DB 저장값 또는 undefined)
    const promptConfig: SystemPromptConfig = {
      sqlSystemPrompt: aiSettings.sqlSystemPrompt || undefined,
      analysisSystemPrompt: aiSettings.analysisSystemPrompt || undefined,
      personaSystemPrompt,
    };

    // 사용자 메시지 저장
    await prisma.chatHistory.create({
      data: {
        userId: user!.id,
        projectId: projectId || null,
        role: "user",
        content: message,
      },
    });

    // SQL 실행 함수
    const executeQuery = async (sql: string): Promise<unknown[]> => {
      // Prisma의 $queryRawUnsafe 사용
      const results = await prisma.$queryRawUnsafe(sql);
      return results as unknown[];
    };

    // LLM 파이프라인 실행 (시스템 프롬프트 설정 전달)
    const response = await processChatMessage(
      llmConfig,
      message,
      projectId || undefined,
      executeQuery,
      promptConfig
    );

    // 어시스턴트 응답 저장
    await prisma.chatHistory.create({
      data: {
        userId: user!.id,
        projectId: projectId || null,
        role: "assistant",
        content: response.content,
        sqlQuery: response.sql || null,
        chartData: response.chartData ? JSON.parse(JSON.stringify(response.chartData)) : Prisma.JsonNull,
        chartType: response.chartType || null,
      },
    });

    return NextResponse.json({
      role: "assistant",
      content: response.content,
      sqlQuery: response.sql,
      chartType: response.chartType,
      chartData: response.chartData,
    });
  } catch (error) {
    console.error("채팅 처리 실패:", error);

    // 에러 메시지 상세화
    let errorMessage = "채팅을 처리할 수 없습니다.";
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "API 키가 유효하지 않습니다. 설정을 확인해주세요.";
      } else if (error.message.includes("quota")) {
        errorMessage = "API 사용량 한도에 도달했습니다.";
      } else if (error.message.includes("network")) {
        errorMessage = "네트워크 오류가 발생했습니다.";
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 채팅 기록 삭제
 * DELETE /api/chat?projectId=xxx
 * (인증 필요)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where: Prisma.ChatHistoryWhereInput = {
      userId: user!.id,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    await prisma.chatHistory.deleteMany({ where });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("채팅 기록 삭제 실패:", error);
    return NextResponse.json(
      { error: "채팅 기록을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
