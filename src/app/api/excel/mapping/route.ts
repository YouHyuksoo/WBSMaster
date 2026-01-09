/**
 * @file src/app/api/excel/mapping/route.ts
 * @description
 * LLM을 사용하여 엑셀 컬럼을 타겟 모델 필드에 자동 매핑하는 API입니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/excel/mapping**: 헤더와 샘플 데이터를 받아 LLM이 매핑 추천
 * 2. **반환 데이터**: mappings(컬럼→필드 매핑), confidence(신뢰도), warnings(경고)
 *
 * @example
 * const res = await fetch("/api/excel/mapping", {
 *   method: "POST",
 *   body: JSON.stringify({ headers: [...], sampleData: [...], targetType: "task" })
 * });
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLLMClient, LLMConfig } from "@/lib/llm";

/**
 * 타겟 타입별 필드 정의
 */
const TARGET_FIELDS = {
  task: {
    required: ["title"],
    optional: ["description", "priority", "status", "startDate", "dueDate", "assignee"],
    descriptions: {
      title: "태스크 제목",
      description: "상세 설명",
      priority: "우선순위 (LOW, MEDIUM, HIGH)",
      status: "상태 (PENDING, IN_PROGRESS, COMPLETED 등)",
      startDate: "시작일",
      dueDate: "마감일",
      assignee: "담당자 이름",
    },
  },
  issue: {
    required: ["title"],
    optional: ["description", "priority", "category", "status", "dueDate", "assignee"],
    descriptions: {
      title: "이슈 제목",
      description: "상세 설명",
      priority: "우선순위 (CRITICAL, HIGH, MEDIUM, LOW)",
      category: "카테고리 (BUG, IMPROVEMENT, QUESTION, FEATURE 등)",
      status: "상태 (OPEN, IN_PROGRESS, RESOLVED, CLOSED)",
      dueDate: "목표 해결일",
      assignee: "담당자 이름",
    },
  },
  requirement: {
    required: ["title"],
    optional: ["description", "priority", "category", "status", "dueDate", "assignee"],
    descriptions: {
      title: "요구사항 제목",
      description: "상세 설명",
      priority: "우선순위 (MUST, SHOULD, COULD, WONT)",
      category: "카테고리",
      status: "상태 (DRAFT, APPROVED, REJECTED, IMPLEMENTED)",
      dueDate: "마감일",
      assignee: "담당자 이름",
    },
  },
};

/**
 * POST /api/excel/mapping
 * LLM을 사용하여 엑셀 컬럼을 자동 매핑합니다.
 */
export async function POST(request: NextRequest) {
  // 인증 확인
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { headers, sampleData, targetType } = body;

    // 입력 검증
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json(
        { error: "헤더 정보가 없습니다." },
        { status: 400 }
      );
    }

    if (!["task", "issue", "requirement"].includes(targetType)) {
      return NextResponse.json(
        { error: "유효하지 않은 타겟 타입입니다." },
        { status: 400 }
      );
    }

    // AI 설정 조회
    const aiSettings = await prisma.aiSettings.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!aiSettings) {
      // LLM 없이 기본 매핑 시도
      return NextResponse.json(fallbackMapping(headers, targetType));
    }

    // LLM 클라이언트 생성
    const config: LLMConfig = {
      provider: aiSettings.provider as "gemini" | "mistral",
      apiKey: aiSettings.apiKey,
      model: aiSettings.model,
    };

    const client = createLLMClient(config);

    // 타겟 필드 정보
    const targetInfo = TARGET_FIELDS[targetType as keyof typeof TARGET_FIELDS];

    // 프롬프트 생성
    const prompt = `당신은 엑셀 데이터를 분석하는 전문가입니다.

## 엑셀 헤더
${headers.join(", ")}

## 샘플 데이터 (처음 ${sampleData?.length || 0}행)
${JSON.stringify(sampleData || [], null, 2)}

## 타겟 모델: ${targetType.toUpperCase()}
- 필수 필드: ${targetInfo.required.join(", ")}
- 선택 필드: ${targetInfo.optional.join(", ")}

## 필드 설명
${Object.entries(targetInfo.descriptions).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

## 작업
엑셀 컬럼을 타겟 모델의 필드에 매핑하세요.
컬럼 이름의 의미와 샘플 데이터의 패턴을 분석하여 가장 적절한 매핑을 제안하세요.

## 매핑 규칙
1. "제목", "이름", "작업명", "Task", "Title", "Name" → title
2. "설명", "내용", "Description", "상세", "비고" → description
3. "우선순위", "Priority", "중요도", "긴급" → priority
4. "상태", "Status", "진행", "진행률" → status
5. "시작일", "Start", "시작", "착수일" → startDate
6. "마감일", "종료일", "Due", "End", "완료예정", "목표일" → dueDate
7. "담당자", "담당", "Assignee", "Owner", "책임자" → assignee
8. "카테고리", "분류", "구분", "유형", "타입", "종류" → category
9. 매핑할 수 없거나 관련 없는 컬럼은 무시

## 응답 형식 (JSON만 반환, 다른 텍스트 없이)
{
  "mappings": {
    "엑셀컬럼명": "타겟필드명"
  },
  "confidence": 0.95,
  "warnings": ["경고 메시지"]
}`;

    // LLM 호출
    const response = await client.generate(prompt);

    // JSON 추출
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // JSON 파싱 실패 시 기본 매핑 반환
      console.warn("[Excel Mapping] LLM 응답에서 JSON 추출 실패, 기본 매핑 사용");
      return NextResponse.json(fallbackMapping(headers, targetType));
    }

    try {
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        mappings: result.mappings || {},
        confidence: result.confidence || 0.5,
        warnings: result.warnings || [],
      });
    } catch {
      // JSON 파싱 실패 시 기본 매핑 반환
      console.warn("[Excel Mapping] JSON 파싱 실패, 기본 매핑 사용");
      return NextResponse.json(fallbackMapping(headers, targetType));
    }

  } catch (error) {
    console.error("[Excel Mapping] 매핑 오류:", error);
    return NextResponse.json(
      { error: "매핑 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * LLM 없이 기본 규칙으로 매핑 시도
 */
function fallbackMapping(headers: string[], targetType: string): {
  mappings: Record<string, string>;
  confidence: number;
  warnings: string[];
} {
  const mappings: Record<string, string> = {};
  const warnings: string[] = [];

  // 매핑 규칙 (대소문자 무시, 부분 일치)
  const rules: Record<string, string[]> = {
    title: ["제목", "이름", "작업명", "task", "title", "name", "항목", "업무"],
    description: ["설명", "내용", "description", "상세", "비고", "메모", "note"],
    priority: ["우선순위", "priority", "중요도", "긴급", "중요"],
    status: ["상태", "status", "진행", "완료여부"],
    startDate: ["시작일", "start", "시작", "착수일", "착수"],
    dueDate: ["마감일", "종료일", "due", "end", "완료예정", "목표일", "마감", "종료"],
    assignee: ["담당자", "담당", "assignee", "owner", "책임자", "수행자"],
    category: ["카테고리", "분류", "구분", "유형", "타입", "종류", "type", "category"],
  };

  // 타겟 타입에 맞는 필드만 사용
  const targetInfo = TARGET_FIELDS[targetType as keyof typeof TARGET_FIELDS];
  const allowedFields = [...targetInfo.required, ...targetInfo.optional];

  for (const header of headers) {
    const headerLower = header.toLowerCase();

    for (const [field, keywords] of Object.entries(rules)) {
      // 허용된 필드인지 확인
      if (!allowedFields.includes(field)) continue;

      // 이미 매핑된 필드는 건너뛰기
      if (Object.values(mappings).includes(field)) continue;

      // 키워드 매칭
      if (keywords.some(keyword => headerLower.includes(keyword.toLowerCase()))) {
        mappings[header] = field;
        break;
      }
    }
  }

  // title 매핑 확인
  if (!Object.values(mappings).includes("title")) {
    warnings.push("'title' 필드 매핑을 찾지 못했습니다. 수동으로 지정해주세요.");
  }

  // 매핑되지 않은 컬럼 경고
  const unmapped = headers.filter(h => !mappings[h]);
  if (unmapped.length > 0) {
    warnings.push(`매핑되지 않은 컬럼: ${unmapped.join(", ")}`);
  }

  return {
    mappings,
    confidence: 0.6, // 규칙 기반이므로 낮은 신뢰도
    warnings,
  };
}
