/**
 * @file src/app/api/chat/suggestions/route.ts
 * @description
 * AI 제안 질문 생성 API입니다.
 * LLM을 사용하여 현재 프로젝트 컨텍스트에 맞는 제안 질문을 생성합니다.
 *
 * 초보자 가이드:
 * - POST: 새로운 제안 질문 생성 요청
 * - 프로젝트별 컨텍스트 기반 제안
 * - 응답이 없으면 기본 제안 유지
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { createLLMClient, resolveLLMConfig, LLMConfig } from "@/lib/llm";
import { CHATGPT_DEFAULT_MODEL } from "@/lib/llm/chatgpt/constants";
import { EXAMPLE_GROUPS, normalizeSuggestions, SUGGESTION_SYSTEM_PROMPT } from "@/lib/chat-suggestions";

/**
 * 제안 질문 생성
 * POST /api/chat/suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json().catch(() => null);
    const projectId = body?.projectId;
    if (typeof projectId !== "string" || !projectId.trim()) {
      return NextResponse.json({ error: "프로젝트를 먼저 선택해 주세요." }, { status: 400 });
    }
    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;
    const aiSettings = await prisma.aiSetting.findFirst({ where: { userId: user!.id } });
    const resolved = resolveLLMConfig(aiSettings ?? {
      provider: "chatgpt", chatgptModel: CHATGPT_DEFAULT_MODEL,
      openaiApiKey: null, openaiModel: "", openrouterApiKey: null, openrouterModel: "",
    });
    if (!resolved.ok) {
      return NextResponse.json({ suggestions: EXAMPLE_GROUPS, source: "default",
        message: "AI 연결 설정을 확인해 주세요. 기존 제안을 유지합니다." });
    }
    const llmConfig: LLMConfig = resolved.config;

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
              fieldIssues: true,
              customerRequirements: true,
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

        const recentIssues = await prisma.fieldIssue.findMany({
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
- 고객이슈 수: ${project._count.fieldIssues}개
- 고객요구사항 수: ${project._count.customerRequirements}개

## 최근 태스크
${recentTasks.map((t) => `- ${t.title} (${t.status})`).join("\n")}

## 최근 고객이슈
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

      const suggestions = normalizeSuggestions(JSON.parse(jsonStr));
      if (suggestions) return NextResponse.json({ suggestions, source: "ai" });
    } catch {
      // JSON 파싱 실패 시 기본 제안 반환
      // AI 원문에는 업무 데이터가 있을 수 있어 로그에 출력하지 않는다.
    }

    // 파싱 실패 시 기본 제안 반환
    return NextResponse.json({ suggestions: EXAMPLE_GROUPS, source: "default", message: "생성된 제안 형식을 확인하지 못했습니다. 기존 제안을 유지합니다." });
  } catch {
    // 오류 시에도 기본 제안 반환 (서비스 중단 방지)
    return NextResponse.json({ suggestions: EXAMPLE_GROUPS, source: "error", message: "제안을 생성하지 못했습니다. 기존 제안을 유지합니다. 잠시 후 다시 시도해 주세요." });
  }
}
