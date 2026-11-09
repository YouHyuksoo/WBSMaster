/**
 * @file src/app/api/workload-analysis/route.ts
 * @description
 * 부하분석 AI API 라우트입니다.
 * 멤버별 태스크 할당 데이터를 기반으로 AI가 부하 분석 및 조언을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/workload-analysis?projectId=xxx**: 마지막 분석 결과 조회
 * 2. **POST /api/workload-analysis**: 부하분석 요청 및 저장
 *    - projectId: 프로젝트 ID (필수)
 *    - members: 멤버별 태스크 할당 정보
 *    - dateRange: 분석 기간
 * 3. **하루 8시간 기준**: 업무 부하를 8시간 근무 기준으로 분석
 */

import { NextRequest, NextResponse } from "next/server";
import { createLLMClient, resolveLLMConfig, LLMConfig } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/** 멤버별 부하 데이터 타입 */
interface MemberWorkload {
  memberId: string;
  memberName: string;
  pendingTasks: number;
  inProgressTasks: number;
  totalTasks: number;
  taskDetails: {
    title: string;
    status: string;
    priority: string;
    startDate?: string;
    dueDate?: string;
  }[];
}

/** 요청 바디 타입 */
interface RequestBody {
  projectId: string;
  members: MemberWorkload[];
  dateRange: {
    start: string;
    end: string;
  };
  projectName?: string;
}

/**
 * 부하분석 시스템 프롬프트
 */
const WORKLOAD_ANALYSIS_PROMPT = `당신은 프로젝트 관리 전문가입니다. 팀원들의 업무 부하를 분석하고 조언을 제공합니다.

## 분석 기준
- 하루 8시간 근무 기준
- 일반적으로 1개 태스크 = 평균 4시간 (반나절) 작업량으로 추정
- 따라서 하루 2개 태스크가 적정 부하
- 하루 3개 이상 = 과부하
- 하루 1개 이하 = 여유

## 부하 수준 판단
- 🟢 여유: 하루 평균 1개 이하
- 🟡 적정: 하루 평균 1.5~2.5개
- 🟠 주의: 하루 평균 2.5~3.5개
- 🔴 과부하: 하루 평균 3.5개 이상

## 응답 형식
마크다운 형식으로 응답하세요:

### 📊 전체 요약
[전체적인 팀 부하 상태 요약 - 2~3문장]

### 👥 멤버별 분석
[각 멤버별 부하 상태와 조언]

### 💡 권장 사항
[업무 재분배 제안, 우선순위 조정 등 구체적인 조언]

## 주의사항
- 한국어로 친절하게 응답
- 구체적인 숫자와 함께 분석
- 실행 가능한 조언 제공
- 긍정적인 톤 유지
`;

/**
 * 마지막 부하분석 결과 조회
 * GET /api/workload-analysis?projectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    // projectId 쿼리 파라미터 확인
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 마지막 분석 결과 조회
    const lastAnalysis = await prisma.workloadAnalysis.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        dateStart: true,
        dateEnd: true,
        analysis: true,
        memberCount: true,
        memberSnapshot: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 분석 결과가 없으면 null 반환
    if (!lastAnalysis) {
      return NextResponse.json({ analysis: null });
    }

    return NextResponse.json({
      analysis: lastAnalysis.analysis,
      metadata: {
        id: lastAnalysis.id,
        memberCount: lastAnalysis.memberCount,
        dateRange: {
          start: lastAnalysis.dateStart.toISOString().split("T")[0],
          end: lastAnalysis.dateEnd.toISOString().split("T")[0],
        },
        memberSnapshot: lastAnalysis.memberSnapshot,
        analyzedAt: lastAnalysis.createdAt.toISOString(),
        analyzedBy: lastAnalysis.createdBy?.name || "알 수 없음",
      },
    });
  } catch (error) {
    console.error("부하분석 조회 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 부하분석 AI 요청 및 결과 저장
 * POST /api/workload-analysis
 */
export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const body: RequestBody = await request.json();
    const { projectId, members, dateRange, projectName } = body;

    // 필수 데이터 검증
    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: "분석할 멤버 데이터가 없습니다." },
        { status: 400 }
      );
    }

    // AI 설정 조회 (현재 사용자의 설정)
    const aiSettings = await prisma.aiSetting.findUnique({
      where: { userId: user!.id },
    });

    if (!aiSettings) {
      return NextResponse.json(
        { error: "AI 설정이 없습니다. 설정 페이지에서 API 키를 설정해주세요." },
        { status: 400 }
      );
    }

    // 현재 선택된 제공자의 API 키·모델
    const resolved = resolveLLMConfig(aiSettings);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const config: LLMConfig = resolved.config;

    const client = createLLMClient(config);

    // 분석 기간 계산 (일 수)
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 프롬프트 생성
    const memberSummary = members.map((m) => {
      const dailyAvg = daysDiff > 0 ? (m.totalTasks / daysDiff).toFixed(1) : "0";
      const taskList = m.taskDetails.slice(0, 5).map((t) => {
        const period = t.startDate && t.dueDate
          ? `${t.startDate.split("T")[0]} ~ ${t.dueDate.split("T")[0]}`
          : "기간 미정";
        return `  - [${t.status === "PENDING" ? "대기" : "진행"}] ${t.title} (${t.priority}, ${period})`;
      }).join("\n");

      return `
### ${m.memberName}
- 대기 중: ${m.pendingTasks}건
- 진행 중: ${m.inProgressTasks}건
- 총 태스크: ${m.totalTasks}건
- 일 평균: ${dailyAvg}건/일
${m.taskDetails.length > 0 ? `- 주요 태스크:\n${taskList}` : "- 할당된 태스크 없음"}
`;
    }).join("\n");

    const userPrompt = `## 분석 요청 정보
- 프로젝트: ${projectName || "미지정"}
- 분석 기간: ${dateRange.start} ~ ${dateRange.end} (${daysDiff}일)
- 멤버 수: ${members.length}명

## 멤버별 현황
${memberSummary}

위 데이터를 바탕으로 팀의 업무 부하를 분석하고 조언해주세요.
하루 8시간 근무 기준으로, 각 멤버의 부하 상태와 개선 방안을 제안해주세요.`;

    // LLM 호출
    const analysisResult = await client.generate(userPrompt, WORKLOAD_ANALYSIS_PROMPT);

    // 멤버 스냅샷 데이터 생성 (taskDetails 제외)
    const memberSnapshot = members.map((m) => ({
      memberId: m.memberId,
      memberName: m.memberName,
      pendingTasks: m.pendingTasks,
      inProgressTasks: m.inProgressTasks,
      totalTasks: m.totalTasks,
    }));

    // 분석 결과 DB에 저장
    const savedAnalysis = await prisma.workloadAnalysis.create({
      data: {
        projectId,
        createdById: user!.id,
        dateStart: startDate,
        dateEnd: endDate,
        analysis: analysisResult,
        memberCount: members.length,
        memberSnapshot,
      },
    });

    return NextResponse.json({
      analysis: analysisResult,
      metadata: {
        id: savedAnalysis.id,
        memberCount: members.length,
        dateRange,
        analyzedAt: savedAnalysis.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("부하분석 API 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
