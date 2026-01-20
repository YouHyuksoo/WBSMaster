/**
 * @file src/app/api/weekly-reports/ai-generate/route.ts
 * @description
 * AI 주간보고 자동 생성 API입니다.
 * 사용자의 자연어 입력을 받아 업무 항목으로 분류/파싱합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/weekly-reports/ai-generate**: 자연어 → 업무 항목 파싱
 * 2. **LLM 프롬프트**: 업무 카테고리 분류 + JSON 출력 유도
 * 3. **기존 채팅 API의 LLM 연동 방식 참고**
 *
 * @example
 * POST /api/weekly-reports/ai-generate
 * Body: { message: "이번주 개발 완료하고 회의 3번 함" }
 * Response: { items: [{ category: "DEVELOPMENT", title: "개발 완료", ... }] }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createLLMClient, LLMConfig } from "@/lib/llm";

/** 업무 카테고리 타입 */
type WorkCategory = "DOCUMENT" | "ANALYSIS" | "DEVELOPMENT" | "DESIGN" | "SUPPORT" | "MEETING" | "REVIEW" | "OTHER";

/** 업무 항목 타입 */
type ReportItemType = "PREVIOUS_RESULT" | "NEXT_PLAN";

/** 파싱된 업무 항목 */
interface ParsedReportItem {
  type: ReportItemType;
  category: WorkCategory;
  title: string;
  description?: string;
  progress?: number;
  isCompleted?: boolean;
}

/** AI 응답 타입 */
interface AIGenerateResponse {
  items: ParsedReportItem[];
  message?: string;
}

/**
 * 주간보고 AI 생성 시스템 프롬프트
 */
const WEEKLY_REPORT_SYSTEM_PROMPT = `당신은 주간 업무보고서 작성을 도와주는 AI 어시스턴트입니다.
사용자가 자연어로 업무 내용을 설명하면, 이를 구조화된 업무 항목으로 분류해주세요.

## 업무 카테고리 (반드시 아래 중 하나 선택)
- DOCUMENT: 문서작업 (보고서, 산출물, 문서화 등)
- ANALYSIS: 분석 (요구사항 분석, 데이터 분석, 현행 분석 등)
- DEVELOPMENT: 개발 (코딩, 구현, 기능 개발 등)
- DESIGN: 설계 (화면 설계, DB 설계, 아키텍처 설계 등)
- SUPPORT: 지원 (기술 지원, 고객 지원, 테스트 지원 등)
- MEETING: 회의 (미팅, 협의, 논의, 킥오프, 보고 등)
- REVIEW: 검토 (코드 리뷰, 문서 검토, 테스트 검토 등)
- OTHER: 기타 (위 분류에 해당하지 않는 업무)

## 업무 유형
- PREVIOUS_RESULT: 전주 실적 (이미 완료했거나 진행한 업무)
- NEXT_PLAN: 차주 계획 (앞으로 할 예정인 업무)

## 응답 규칙
1. 사용자 메시지에서 업무 항목을 추출하세요
2. 각 항목에 적절한 카테고리를 지정하세요
3. 완료 여부와 진행률을 추정하세요 ("완료", "끝남" → isCompleted: true, progress: 100)
4. **반드시 JSON 형식으로만 응답하세요** (마크다운, 설명 없이 순수 JSON만)

## 응답 형식 (JSON)
{
  "items": [
    {
      "type": "PREVIOUS_RESULT",
      "category": "DEVELOPMENT",
      "title": "로그인 기능 개발",
      "description": "JWT 인증 방식으로 구현",
      "progress": 100,
      "isCompleted": true
    },
    {
      "type": "NEXT_PLAN",
      "category": "MEETING",
      "title": "고객사 킥오프 미팅",
      "description": "프로젝트 착수 보고",
      "progress": 0,
      "isCompleted": false
    }
  ],
  "message": "3건의 업무를 분류했습니다."
}

## 주의사항
- "했다", "완료", "마무리" 등의 표현 → PREVIOUS_RESULT (전주 실적)
- "할 예정", "계획", "진행할" 등의 표현 → NEXT_PLAN (차주 계획)
- 명확하지 않으면 PREVIOUS_RESULT로 분류
- 업무 내용이 명확하지 않으면 title에 원문 그대로 사용
- 반드시 valid JSON만 출력하세요 (설명 텍스트 금지)`;

/**
 * POST /api/weekly-reports/ai-generate
 * 자연어 입력을 업무 항목으로 변환
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { message, targetType } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "메시지를 입력해주세요." },
        { status: 400 }
      );
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

    // LLM 클라이언트 생성
    const client = createLLMClient(llmConfig);

    // 사용자 메시지에 대상 유형 힌트 추가
    let userPrompt = message;
    if (targetType === "PREVIOUS_RESULT") {
      userPrompt = `[전주 실적 작성 모드] ${message}`;
    } else if (targetType === "NEXT_PLAN") {
      userPrompt = `[차주 계획 작성 모드] ${message}`;
    }

    // LLM 호출 (generate 메서드 사용: prompt, systemPrompt 순서)
    const response = await client.generate(userPrompt, WEEKLY_REPORT_SYSTEM_PROMPT);

    // JSON 파싱
    let parsedResponse: AIGenerateResponse;
    try {
      // JSON 블록 추출 (```json ... ``` 형태 처리)
      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // JSON 파싱
      parsedResponse = JSON.parse(jsonStr);

      // 유효성 검증
      if (!parsedResponse.items || !Array.isArray(parsedResponse.items)) {
        throw new Error("Invalid response format");
      }

      // 각 항목 유효성 검증 및 기본값 설정
      parsedResponse.items = parsedResponse.items.map((item) => ({
        type: (item.type === "PREVIOUS_RESULT" || item.type === "NEXT_PLAN")
          ? item.type
          : (targetType || "PREVIOUS_RESULT"),
        category: isValidCategory(item.category) ? item.category : "OTHER",
        title: item.title || "업무",
        description: item.description || undefined,
        progress: typeof item.progress === "number" ? item.progress : 0,
        isCompleted: item.isCompleted ?? false,
      }));

    } catch (parseError) {
      console.error("[AI Generate] JSON 파싱 실패:", parseError);
      console.error("[AI Generate] LLM 응답:", response);

      // 파싱 실패 시 기본 항목 생성
      parsedResponse = {
        items: [{
          type: targetType || "PREVIOUS_RESULT",
          category: "OTHER",
          title: message.slice(0, 100),
          description: message.length > 100 ? message : undefined,
          progress: 0,
          isCompleted: false,
        }],
        message: "AI가 업무를 자동 분류하지 못했습니다. 내용을 확인해주세요."
      };
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error("[AI Generate] 오류:", error);

    let errorMessage = "AI 생성에 실패했습니다.";
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "API 키가 유효하지 않습니다.";
      } else if (error.message.includes("quota")) {
        errorMessage = "API 사용량 한도에 도달했습니다.";
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 카테고리 유효성 검증
 */
function isValidCategory(category: string): category is WorkCategory {
  const validCategories: WorkCategory[] = [
    "DOCUMENT", "ANALYSIS", "DEVELOPMENT", "DESIGN",
    "SUPPORT", "MEETING", "REVIEW", "OTHER"
  ];
  return validCategories.includes(category as WorkCategory);
}
