/**
 * @file src/app/api/ai-personas/route.ts
 * @description
 * AI 페르소나 API 라우트입니다.
 * 페르소나(시스템 프롬프트) CRUD를 관리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/ai-personas**: 사용자의 페르소나 목록 조회
 * 2. **POST /api/ai-personas**: 새 페르소나 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * 기본 페르소나 템플릿
 * 사용자가 처음 접속 시 생성됨
 */
const DEFAULT_PERSONAS = [
  {
    name: "기본 어시스턴트",
    description: "프로젝트 데이터를 분석하고 질문에 답변합니다.",
    icon: "smart_toy",
    systemPrompt: `당신은 WBS Master 프로젝트의 데이터 분석 AI 어시스턴트입니다.
사용자의 질문에 친절하고 정확하게 답변합니다.
프로젝트 현황, 태스크 분석, 진행률 통계 등 데이터 기반의 질문에 답변합니다.
한국어로 답변하세요.`,
    isDefault: true,
  },
  {
    name: "PM 어시스턴트",
    description: "프로젝트 관리 관점에서 조언합니다.",
    icon: "account_tree",
    systemPrompt: `당신은 숙련된 프로젝트 매니저(PM)입니다.
프로젝트 관리 관점에서 조언하고, 리스크를 식별하고, 일정 관리를 도와줍니다.
데이터를 분석할 때는 일정 지연, 리소스 병목, 우선순위 조정 등을 고려합니다.
건설적이고 실용적인 조언을 제공하세요.
한국어로 답변하세요.`,
    isDefault: false,
  },
  {
    name: "보고서 작성기",
    description: "경영진 보고용 요약 보고서를 작성합니다.",
    icon: "description",
    systemPrompt: `당신은 프로젝트 보고서 작성 전문가입니다.
데이터를 분석하여 경영진에게 보고할 수 있는 형식으로 요약합니다.
핵심 지표, 진행 상황, 이슈 사항, 향후 계획을 포함합니다.
간결하고 명확한 표현을 사용하세요. 마크다운 형식으로 작성합니다.
한국어로 답변하세요.`,
    isDefault: false,
  },
];

/**
 * 페르소나 목록 조회
 * GET /api/ai-personas
 */
export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    // 사용자의 페르소나 조회
    let personas = await prisma.aiPersona.findMany({
      where: { userId: user!.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    // 페르소나가 없으면 기본 템플릿 생성
    if (personas.length === 0) {
      const createdPersonas = await Promise.all(
        DEFAULT_PERSONAS.map((persona) =>
          prisma.aiPersona.create({
            data: {
              ...persona,
              userId: user!.id,
            },
          })
        )
      );
      personas = createdPersonas;
    }

    return NextResponse.json(personas);
  } catch (error) {
    console.error("페르소나 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "페르소나 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 새 페르소나 생성
 * POST /api/ai-personas
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { name, description, icon, systemPrompt } = body;

    // 유효성 검증
    if (!name || !systemPrompt) {
      return NextResponse.json(
        { error: "이름과 시스템 프롬프트는 필수입니다." },
        { status: 400 }
      );
    }

    // 페르소나 생성
    const persona = await prisma.aiPersona.create({
      data: {
        userId: user!.id,
        name,
        description: description || null,
        icon: icon || "smart_toy",
        systemPrompt,
        isDefault: false,
        isActive: true,
      },
    });

    return NextResponse.json(persona);
  } catch (error) {
    console.error("페르소나 생성 실패:", error);
    return NextResponse.json(
      { error: "페르소나를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
