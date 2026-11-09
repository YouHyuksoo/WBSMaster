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
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { processChatMessage, resolveLLMConfig, createLLMClient, LLMConfig, SystemPromptConfig } from "@/lib/llm";
import { CHATGPT_DEFAULT_MODEL } from "@/lib/llm/chatgpt/constants";
import { answerWithAgent } from "@/lib/chat-agent/handle-agent-chat";
import { Prisma } from "@prisma/client";
import { runSafeSql } from "@/lib/llm/safe-sql";

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

    // 최근 limit 건을 가져와 시간순으로 돌려준다
    // (예전에는 오래된 순 limit 건이라 기록이 많으면 최근 대화가 보이지 않았다)
    const recent = await prisma.chatHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(recent.reverse());
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
 * (설정 화면 연결 테스트는 /api/ai-settings/test 를 쓴다. 이 API 는 항상 기록을 남긴다)
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

    // 다른 프로젝트 데이터를 묻지 못하게 프로젝트 멤버인지 확인
    if (projectId) {
      const denied = await assertProjectAccess(projectId, user!);
      if (denied) return denied;
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

    // 설정이 없으면 회사 ChatGPT(서버 공용 계정)를 기본으로 쓴다
    const effectiveSettings = aiSettings ?? {
      provider: "chatgpt", chatgptModel: CHATGPT_DEFAULT_MODEL,
      geminiApiKey: null, geminiModel: "", mistralApiKey: null, mistralModel: "",
      openaiApiKey: null, openaiModel: "", openrouterApiKey: null, openrouterModel: "",
      sqlSystemPrompt: null, analysisSystemPrompt: null,
    };

    // 현재 선택된 제공자의 API 키·모델
    const resolved = resolveLLMConfig(effectiveSettings);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const llmConfig: LLMConfig = resolved.config;

    // 시스템 프롬프트 설정 (DB 저장값 또는 undefined)
    const promptConfig: SystemPromptConfig = {
      sqlSystemPrompt: effectiveSettings.sqlSystemPrompt || undefined,
      analysisSystemPrompt: effectiveSettings.analysisSystemPrompt || undefined,
      personaSystemPrompt,
    };

    // 도구 호출을 지원하는 제공자(회사 ChatGPT · OpenAI · OpenRouter)는 에이전트 경로
    // (대화 맥락 · 조회/계산 도구 · 확인 후 쓰기). 그 밖에는 아래 기존 SQL 파이프라인.
    const client = createLLMClient(llmConfig);
    if (client.supportsTools && projectId) {
      return NextResponse.json(
        await answerWithAgent({ user: user!, projectId, message, personaId, client, promptConfig })
      );
    }

    // 처리 시간 측정 시작
    const startTime = Date.now();
    let sqlGenTime = 0;
    let sqlExecTime = 0;

    // 사용자 메시지 저장
    await prisma.chatHistory.create({
      data: {
        userId: user!.id,
        projectId: projectId || null,
        role: "user",
        content: message,
      },
    });

    /**
     * SQL 실행 함수 (시간 측정 포함)
     * 읽기 전용 트랜잭션에서만 실행한다. 등록·수정은 확인 카드를 거친 채팅 도구로 한다.
     */
    const executeQuery = async (sql: string): Promise<unknown[]> => {
      const execStart = Date.now();
      // 비밀번호 없는 users 뷰 위에서 READ ONLY 로 실행, 결과의 password 키 제거
      const results = await runSafeSql(prisma, sql);
      sqlExecTime = Date.now() - execStart;
      return results as unknown[];
    };

    // LLM 파이프라인 실행 (시스템 프롬프트 설정 전달, userId 추가)
    const sqlGenStart = Date.now();
    const response = await processChatMessage(
      llmConfig,
      message,
      projectId || undefined,
      user!.id,  // 현재 로그인한 사용자 ID 전달
      executeQuery,
      promptConfig
    );
    sqlGenTime = Date.now() - sqlGenStart - sqlExecTime; // SQL 실행 시간 제외

    // 전체 처리 시간
    const processingTime = Date.now() - startTime;

    // 어시스턴트 응답 저장 (처리 시간, 원본 질문 포함)
    const assistantMessage = await prisma.chatHistory.create({
      data: {
        userId: user!.id,
        projectId: projectId || null,
        role: "assistant",
        content: response.content,
        sqlQuery: response.sql || null,
        chartData: response.chartData ? JSON.parse(JSON.stringify(response.chartData)) : Prisma.JsonNull,
        chartType: response.chartType || null,
        mindmapData: response.mindmapData ? JSON.parse(JSON.stringify(response.mindmapData)) : Prisma.JsonNull,
        // 분석용 필드
        userQuery: message,
        processingTimeMs: processingTime,
        sqlGenTimeMs: sqlGenTime > 0 ? sqlGenTime : null,
        sqlExecTimeMs: sqlExecTime > 0 ? sqlExecTime : null,
        personaId: personaId || null,
      },
    });

    // 디버깅: 응답 데이터 확인
    console.log("[API Chat] Response:", {
      chartType: response.chartType,
      hasMindmapData: !!response.mindmapData,
      processingTime,
      sqlGenTime,
      sqlExecTime,
    });

    return NextResponse.json({
      id: assistantMessage.id, // 피드백 제출용 ID
      role: "assistant",
      content: response.content,
      sqlQuery: response.sql,
      chartType: response.chartType,
      chartData: response.chartData,
      mindmapData: response.mindmapData,
      processingTimeMs: processingTime,
      // 전체 건수 정보 (Excel 다운로드용)
      totalCount: response.totalCount,
      displayedCount: response.displayedCount,
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
