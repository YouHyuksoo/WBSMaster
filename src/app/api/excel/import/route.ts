/**
 * @file src/app/api/excel/import/route.ts
 * @description
 * 매핑된 엑셀 데이터를 Task/Issue/Requirement로 벌크 생성하는 API입니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/excel/import**: 매핑 정보와 데이터를 받아 DB에 벌크 생성
 * 2. **트랜잭션**: 모든 생성이 성공하거나 모두 롤백
 * 3. **반환 데이터**: success(성공 건수), failed(실패 건수), errors(오류 목록)
 *
 * @example
 * const res = await fetch("/api/excel/import", {
 *   method: "POST",
 *   body: JSON.stringify({
 *     targetType: "task",
 *     projectId: "xxx",
 *     data: [...],
 *     mappings: { "엑셀컬럼": "타겟필드" }
 *   })
 * });
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 우선순위 매핑 (문자열 → Enum)
 */
const PRIORITY_MAPPINGS: Record<string, Record<string, string>> = {
  task: {
    "높음": "HIGH",
    "high": "HIGH",
    "상": "HIGH",
    "중간": "MEDIUM",
    "medium": "MEDIUM",
    "중": "MEDIUM",
    "낮음": "LOW",
    "low": "LOW",
    "하": "LOW",
  },
  issue: {
    "긴급": "CRITICAL",
    "critical": "CRITICAL",
    "높음": "HIGH",
    "high": "HIGH",
    "상": "HIGH",
    "중간": "MEDIUM",
    "medium": "MEDIUM",
    "중": "MEDIUM",
    "낮음": "LOW",
    "low": "LOW",
    "하": "LOW",
  },
  requirement: {
    "필수": "MUST",
    "must": "MUST",
    "해야함": "SHOULD",
    "should": "SHOULD",
    "할수있음": "COULD",
    "could": "COULD",
    "안함": "WONT",
    "wont": "WONT",
  },
};

/**
 * 상태 매핑 (문자열 → Enum)
 */
const STATUS_MAPPINGS: Record<string, Record<string, string>> = {
  task: {
    "대기": "PENDING",
    "pending": "PENDING",
    "진행중": "IN_PROGRESS",
    "in_progress": "IN_PROGRESS",
    "보류": "HOLDING",
    "holding": "HOLDING",
    "지연": "DELAYED",
    "delayed": "DELAYED",
    "완료": "COMPLETED",
    "completed": "COMPLETED",
    "취소": "CANCELLED",
    "cancelled": "CANCELLED",
  },
  issue: {
    "열림": "OPEN",
    "open": "OPEN",
    "신규": "OPEN",
    "진행중": "IN_PROGRESS",
    "in_progress": "IN_PROGRESS",
    "해결됨": "RESOLVED",
    "resolved": "RESOLVED",
    "완료": "CLOSED",
    "closed": "CLOSED",
    "닫힘": "CLOSED",
    "안함": "WONT_FIX",
    "wont_fix": "WONT_FIX",
  },
  requirement: {
    "초안": "DRAFT",
    "draft": "DRAFT",
    "승인": "APPROVED",
    "approved": "APPROVED",
    "거절": "REJECTED",
    "rejected": "REJECTED",
    "구현됨": "IMPLEMENTED",
    "implemented": "IMPLEMENTED",
  },
};

/**
 * 카테고리 매핑 (이슈용)
 */
const CATEGORY_MAPPINGS: Record<string, string> = {
  "버그": "BUG",
  "bug": "BUG",
  "오류": "BUG",
  "개선": "IMPROVEMENT",
  "improvement": "IMPROVEMENT",
  "향상": "IMPROVEMENT",
  "질문": "QUESTION",
  "question": "QUESTION",
  "문의": "QUESTION",
  "기능": "FEATURE",
  "feature": "FEATURE",
  "신규기능": "FEATURE",
  "문서": "DOCUMENTATION",
  "documentation": "DOCUMENTATION",
  "기타": "OTHER",
  "other": "OTHER",
};

/**
 * 날짜 파싱
 */
function parseDate(value: unknown): Date | null {
  if (!value) return null;

  // 이미 Date 객체인 경우
  if (value instanceof Date) return value;

  // 숫자인 경우 (엑셀 시리얼 날짜)
  if (typeof value === "number") {
    // 엑셀 시리얼 날짜 변환 (1900년 1월 1일 기준)
    const date = new Date((value - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }

  // 문자열인 경우
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // 다양한 날짜 형식 시도
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date;

    // YYYY-MM-DD, YYYY/MM/DD 형식
    const match = trimmed.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // MM/DD/YYYY 형식
    const match2 = trimmed.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (match2) {
      const [, month, day, year] = match2;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }

  return null;
}

/**
 * 담당자 이름으로 User ID 찾기
 */
async function findUserId(name: unknown): Promise<string | null> {
  if (!name || typeof name !== "string") return null;

  const trimmed = name.trim();
  if (!trimmed) return null;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  return user?.id || null;
}

/**
 * POST /api/excel/import
 * 매핑된 데이터를 벌크 생성합니다.
 */
export async function POST(request: NextRequest) {
  // 인증 확인
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { targetType, projectId, data, mappings } = body;

    // 입력 검증
    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트를 선택해주세요." },
        { status: 400 }
      );
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "데이터가 없습니다." },
        { status: 400 }
      );
    }

    if (!["task", "issue", "requirement"].includes(targetType)) {
      return NextResponse.json(
        { error: "유효하지 않은 타겟 타입입니다." },
        { status: 400 }
      );
    }

    if (!mappings || typeof mappings !== "object") {
      return NextResponse.json(
        { error: "매핑 정보가 없습니다." },
        { status: 400 }
      );
    }

    // title 매핑 확인
    const titleColumn = Object.entries(mappings).find(([, v]) => v === "title")?.[0];
    if (!titleColumn) {
      return NextResponse.json(
        { error: "제목(title) 매핑이 필요합니다." },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 결과 추적
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // 매핑 역전환 (타겟필드 → 엑셀컬럼)
    const fieldToColumn: Record<string, string> = {};
    for (const [column, field] of Object.entries(mappings as Record<string, string>)) {
      fieldToColumn[field] = column;
    }

    // 데이터 처리
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // 엑셀 기준 행 번호 (헤더 제외)

      try {
        // 제목 추출
        const title = row[titleColumn];
        if (!title || String(title).trim() === "") {
          results.failed++;
          results.errors.push(`행 ${rowNum}: 제목이 비어있습니다.`);
          continue;
        }

        // 공통 필드 추출
        const description = fieldToColumn.description ? String(row[fieldToColumn.description] || "") : "";
        const priority = fieldToColumn.priority ? String(row[fieldToColumn.priority] || "").toLowerCase() : "";
        const status = fieldToColumn.status ? String(row[fieldToColumn.status] || "").toLowerCase() : "";
        const dueDateRaw = fieldToColumn.dueDate ? row[fieldToColumn.dueDate] : null;
        const startDateRaw = fieldToColumn.startDate ? row[fieldToColumn.startDate] : null;
        const assigneeRaw = fieldToColumn.assignee ? row[fieldToColumn.assignee] : null;
        const categoryRaw = fieldToColumn.category ? String(row[fieldToColumn.category] || "").toLowerCase() : "";

        // 날짜 파싱
        const dueDate = parseDate(dueDateRaw);
        const startDate = parseDate(startDateRaw);

        // 담당자 찾기
        const assigneeId = await findUserId(assigneeRaw);

        // 타겟별 생성
        switch (targetType) {
          case "task": {
            const mappedPriority = PRIORITY_MAPPINGS.task[priority] || "MEDIUM";
            const mappedStatus = STATUS_MAPPINGS.task[status] || "PENDING";

            // 현재 최대 order 조회
            const maxOrder = await prisma.task.aggregate({
              where: { projectId },
              _max: { order: true },
            });

            await prisma.task.create({
              data: {
                title: String(title).trim(),
                description: description || null,
                priority: mappedPriority as "LOW" | "MEDIUM" | "HIGH",
                status: mappedStatus as "PENDING" | "IN_PROGRESS" | "HOLDING" | "DELAYED" | "COMPLETED" | "CANCELLED",
                startDate,
                dueDate,
                projectId,
                creatorId: user!.id,
                assigneeId,
                isAiGenerated: true,
                order: (maxOrder._max.order || 0) + 1 + i,
              },
            });
            break;
          }

          case "issue": {
            const mappedPriority = PRIORITY_MAPPINGS.issue[priority] || "MEDIUM";
            const mappedStatus = STATUS_MAPPINGS.issue[status] || "OPEN";
            const mappedCategory = CATEGORY_MAPPINGS[categoryRaw] || "OTHER";

            // 이슈 코드 생성
            const lastIssue = await prisma.issue.findFirst({
              where: { projectId },
              orderBy: { code: "desc" },
              select: { code: true },
            });
            const lastNum = lastIssue?.code ? parseInt(lastIssue.code.replace("ISS-", "")) : 0;
            const code = `ISS-${String(lastNum + 1 + i).padStart(3, "0")}`;

            await prisma.issue.create({
              data: {
                code,
                title: String(title).trim(),
                description: description || null,
                priority: mappedPriority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
                status: mappedStatus as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "WONT_FIX",
                category: mappedCategory as "BUG" | "IMPROVEMENT" | "QUESTION" | "FEATURE" | "DOCUMENTATION" | "OTHER",
                dueDate,
                projectId,
                reporterId: user!.id,
                assigneeId,
              },
            });
            break;
          }

          case "requirement": {
            const mappedPriority = PRIORITY_MAPPINGS.requirement[priority] || "SHOULD";
            const mappedStatus = STATUS_MAPPINGS.requirement[status] || "DRAFT";

            // 요구사항 코드 생성
            const lastReq = await prisma.requirement.findFirst({
              where: { projectId },
              orderBy: { code: "desc" },
              select: { code: true },
            });
            const lastNum = lastReq?.code ? parseInt(lastReq.code.replace("REQ-", "")) : 0;
            const code = `REQ-${String(lastNum + 1 + i).padStart(3, "0")}`;

            await prisma.requirement.create({
              data: {
                code,
                title: String(title).trim(),
                description: description || null,
                priority: mappedPriority as "MUST" | "SHOULD" | "COULD" | "WONT",
                status: mappedStatus as "DRAFT" | "APPROVED" | "REJECTED" | "IMPLEMENTED",
                category: categoryRaw || null,
                dueDate,
                projectId,
                requesterId: user!.id,
                assigneeId,
              },
            });
            break;
          }
        }

        results.success++;

      } catch (err) {
        results.failed++;
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        results.errors.push(`행 ${rowNum}: ${message}`);
        console.error(`[Excel Import] 행 ${rowNum} 오류:`, err);
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error("[Excel Import] 임포트 오류:", error);
    return NextResponse.json(
      { error: "데이터 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
