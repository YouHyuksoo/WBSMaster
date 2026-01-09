/**
 * @file src/app/api/chat/suggestions/route.ts
 * @description
 * AI 제안 질문 생성 API입니다.
 * LLM을 사용하여 현재 프로젝트 컨텍스트에 맞는 제안 질문을 생성합니다.
 *
 * 기능:
 * - POST: 새로운 제안 질문 생성 요청
 * - 프로젝트별 컨텍스트 기반 제안
 * - 응답이 없으면 기본 제안 유지
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createLLMClient, LLMConfig } from "@/lib/llm";
import { EXAMPLE_GROUPS, ExampleGroup } from "@/app/dashboard/chat/components/constants";

/**
 * 제안 질문 생성 시스템 프롬프트
 */
const SUGGESTION_SYSTEM_PROMPT = `당신은 WBS Master 프로젝트 관리 도구의 AI 어시스턴트입니다.
사용자에게 유용한 질문 제안을 생성해야 합니다.

## 규칙
1. 반드시 JSON 형식으로만 응답하세요
2. 5개의 카테고리로 질문을 분류하세요: WBS, 태스크, 이슈, 요구사항, 도움말
3. 각 카테고리마다 4개의 질문을 생성하세요
4. 질문은 구체적이고 실행 가능해야 합니다
5. 프로젝트 데이터가 있으면 해당 데이터를 기반으로 맞춤형 질문을 생성하세요

## 응답 형식 (JSON만 반환, 마크다운 코드블록 없이)
[
  {
    "title": "WBS",
    "icon": "account_tree",
    "color": "text-blue-500",
    "questions": ["질문1", "질문2", "질문3", "질문4"]
  },
  {
    "title": "태스크",
    "icon": "task_alt",
    "color": "text-emerald-500",
    "questions": ["질문1", "질문2", "질문3", "질문4"]
  },
  {
    "title": "이슈",
    "icon": "bug_report",
    "color": "text-rose-500",
    "questions": ["질문1", "질문2", "질문3", "질문4"]
  },
  {
    "title": "요구사항",
    "icon": "description",
    "color": "text-amber-500",
    "questions": ["질문1", "질문2", "질문3", "질문4"]
  },
  {
    "title": "도움말",
    "icon": "help",
    "color": "text-purple-500",
    "questions": ["질문1", "질문2", "질문3", "질문4"]
  }
]`;

/**
 * 제안 질문 생성
 * POST /api/chat/suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { projectId } = body;

    // AI 설정 조회
    const aiSettings = await prisma.aiSetting.findFirst({
      where: { userId: user!.id },
    });

    if (!aiSettings) {
      // 설정이 없으면 기본 제안 반환
      return NextResponse.json({ suggestions: EXAMPLE_GROUPS, source: "default" });
    }

    // LLM 설정 구성
    const llmConfig: LLMConfig = {
      provider: aiSettings.provider as "gemini" | "mistral",
      apiKey:
        aiSettings.provider === "gemini"
          ? aiSettings.geminiApiKey!
          : aiSettings.mistralApiKey!,
      model:
        aiSettings.provider === "gemini"
          ? aiSettings.geminiModel
          : aiSettings.mistralModel,
    };

    // API 키가 없으면 기본 제안 반환
    if (!llmConfig.apiKey) {
      return NextResponse.json({ suggestions: EXAMPLE_GROUPS, source: "default" });
    }

    // 프로젝트 컨텍스트 정보 수집
    let contextInfo = "";
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          name: true,
          _count: {
            select: {
              wbsItems: true,
              tasks: true,
              issues: true,
              requirements: true,
            },
          },
        },
      });

      if (project) {
        // 최근 활동 정보 조회
        const recentTasks = await prisma.task.findMany({
          where: { projectId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { title: true, status: true },
        });

        const recentIssues = await prisma.issue.findMany({
          where: { projectId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { title: true, status: true },
        });

        contextInfo = `
## 현재 프로젝트 정보
- 프로젝트명: ${project.name}
- WBS 항목 수: ${project._count.wbsItems}개
- 태스크 수: ${project._count.tasks}개
- 이슈 수: ${project._count.issues}개
- 요구사항 수: ${project._count.requirements}개

## 최근 태스크
${recentTasks.map((t) => `- ${t.title} (${t.status})`).join("\n")}

## 최근 이슈
${recentIssues.map((i) => `- ${i.title} (${i.status})`).join("\n")}

위 정보를 참고하여 이 프로젝트에 유용한 질문들을 생성해주세요.
`;
      }
    }

    // LLM에게 제안 질문 생성 요청
    const client = createLLMClient(llmConfig);
    const prompt = contextInfo
      ? `${contextInfo}\n\n새로운 제안 질문을 생성해주세요.`
      : "WBS Master 프로젝트 관리 도구 사용자를 위한 유용한 질문 제안을 생성해주세요.";

    const response = await client.generate(prompt, SUGGESTION_SYSTEM_PROMPT);

    // JSON 파싱 시도
    try {
      // 마크다운 코드블록 제거
      let jsonStr = response.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const suggestions = JSON.parse(jsonStr) as ExampleGroup[];

      // 유효성 검증
      if (
        Array.isArray(suggestions) &&
        suggestions.length === 5 &&
        suggestions.every(
          (s) =>
            s.title &&
            s.icon &&
            s.color &&
            Array.isArray(s.questions) &&
            s.questions.length >= 4
        )
      ) {
        return NextResponse.json({ suggestions, source: "ai" });
      }
    } catch {
      // JSON 파싱 실패 시 기본 제안 반환
      console.error("[Suggestions] JSON 파싱 실패:", response.slice(0, 200));
    }

    // 파싱 실패 시 기본 제안 반환
    return NextResponse.json({ suggestions: EXAMPLE_GROUPS, source: "default" });
  } catch (error) {
    console.error("제안 질문 생성 실패:", error);
    // 오류 시에도 기본 제안 반환 (서비스 중단 방지)
    return NextResponse.json({ suggestions: EXAMPLE_GROUPS, source: "error" });
  }
}
