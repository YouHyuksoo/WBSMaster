/**
 * @file src/app/api/weekly-summaries/[id]/analyze/route.ts
 * @description
 * 주간보고 취합 LLM 분석 API 엔드포인트입니다.
 * 멤버별 주간보고 내용을 LLM으로 분석하여 요약과 인사이트를 생성합니다.
 *
 * 초보자 가이드:
 * 1. **POST**: 취합 보고서에 대해 LLM 분석 실행
 * 2. **분석 내용**: 전주실적/차주계획 요약, 리스크 분석, 인사이트 제공
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLLMClient, LLMConfig } from "@/lib/llm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** 멤버별 요약 타입 */
interface MemberSummary {
  memberId: string;
  memberName: string;
  previousResults: {
    category: string;
    title: string;
    description?: string;
    isCompleted: boolean;
    progress: number;
  }[];
  nextPlans: {
    category: string;
    title: string;
    description?: string;
    targetDate?: string;
  }[];
}

/** LLM 분석용 시스템 프롬프트 */
const SUMMARY_ANALYSIS_PROMPT = `당신은 프로젝트 관리 전문가입니다. 팀원들의 주간보고를 분석하여 관리자에게 유용한 요약과 인사이트를 제공합니다.

## 분석 요청
제공된 멤버별 주간보고 데이터를 분석하여 다음 형식으로 응답해주세요:

## 📊 주간 업무 요약
### 전주 실적 요약
- 팀 전체의 주요 성과를 3-5개 핵심 포인트로 정리
- 완료된 주요 업무와 진행률이 높은 업무 강조

### 차주 계획 요약
- 팀 전체의 차주 주요 계획을 3-5개 핵심 포인트로 정리
- 중요도가 높은 업무 우선 표시

## 💡 인사이트 및 제안
### 진행 상황 분석
- 전체적인 업무 진행 상황 평가
- 목표 대비 달성률 분석

### 리스크 요인
- 지연 가능성이 있는 업무 식별
- 주의가 필요한 영역 지적

### 개선 제안
- 팀 생산성 향상을 위한 제안
- 업무 우선순위 조정 권고 (필요시)

## 규칙
1. 한국어로 응답하세요
2. 마크다운 형식을 사용하세요
3. 구체적인 업무 제목을 언급하세요
4. 객관적이고 건설적인 피드백을 제공하세요
5. 300-500자 내외로 간결하게 정리하세요
`;

/**
 * POST /api/weekly-summaries/[id]/analyze
 * 취합 보고서 LLM 분석 실행
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 취합 보고서 조회
    const summary = await prisma.weeklySummary.findUnique({
      where: { id },
    });

    if (!summary) {
      return NextResponse.json(
        { error: "Weekly summary not found" },
        { status: 404 }
      );
    }

    // AI 설정 조회 (생성자의 설정 사용)
    const aiSetting = await prisma.aiSetting.findUnique({
      where: { userId: summary.createdById },
    });

    if (!aiSetting) {
      return NextResponse.json(
        { error: "AI settings not found. Please configure AI settings first." },
        { status: 400 }
      );
    }

    // API 키 확인
    const apiKey = aiSetting.provider === "gemini"
      ? aiSetting.geminiApiKey
      : aiSetting.mistralApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: `${aiSetting.provider} API key not configured` },
        { status: 400 }
      );
    }

    // LLM 클라이언트 생성
    const llmConfig: LLMConfig = {
      provider: aiSetting.provider as "gemini" | "mistral",
      apiKey,
      model: aiSetting.provider === "gemini"
        ? aiSetting.geminiModel
        : aiSetting.mistralModel,
    };

    const client = createLLMClient(llmConfig);

    // 멤버별 요약 데이터 준비
    const memberSummaries = summary.memberSummaries as MemberSummary[] | null;

    if (!memberSummaries || memberSummaries.length === 0) {
      return NextResponse.json(
        { error: "No member summaries found for analysis" },
        { status: 400 }
      );
    }

    // LLM에 전달할 데이터 포맷팅
    const analysisData = memberSummaries.map((member) => {
      const prevResults = member.previousResults
        .map((item) => `- [${item.category}] ${item.title} (진행률: ${item.progress}%, 완료: ${item.isCompleted ? "Y" : "N"})`)
        .join("\n");

      const nextPlans = member.nextPlans
        .map((item) => `- [${item.category}] ${item.title}${item.targetDate ? ` (목표일: ${item.targetDate})` : ""}`)
        .join("\n");

      return `### ${member.memberName}
**전주 실적:**
${prevResults || "- 등록된 실적 없음"}

**차주 계획:**
${nextPlans || "- 등록된 계획 없음"}
`;
    }).join("\n\n");

    const prompt = `## 주간보고 분석 요청
주차: ${summary.year}년 ${summary.weekNumber}주차

## 멤버별 주간보고 데이터
${analysisData}

위 데이터를 분석하여 요약과 인사이트를 제공해주세요.`;

    // LLM 분석 실행
    const llmResponse = await client.generate(prompt, SUMMARY_ANALYSIS_PROMPT);

    // 응답 파싱 (요약과 인사이트 분리)
    const summaryMatch = llmResponse.match(/## 📊 주간 업무 요약([\s\S]*?)(?=## 💡|$)/);
    const insightMatch = llmResponse.match(/## 💡 인사이트 및 제안([\s\S]*?)$/);

    const llmSummary = summaryMatch ? summaryMatch[1].trim() : llmResponse;
    const llmInsights = insightMatch ? insightMatch[1].trim() : null;

    // DB 업데이트
    const updatedSummary = await prisma.weeklySummary.update({
      where: { id },
      data: {
        llmSummary: llmResponse,  // 전체 응답 저장
        llmInsights,
        llmAnalyzedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSummary);
  } catch (error) {
    console.error("Failed to analyze weekly summary:", error);
    return NextResponse.json(
      { error: "Failed to analyze weekly summary" },
      { status: 500 }
    );
  }
}
