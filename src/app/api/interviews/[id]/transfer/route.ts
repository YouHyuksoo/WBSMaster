/**
 * @file src/app/api/interviews/[id]/transfer/route.ts
 * @description
 * 인터뷰를 고객요구사항/현업이슈/협의요청으로 이관하는 API입니다.
 *
 * 초보자 가이드:
 * - POST /api/interviews/[id]/transfer: 인터뷰 이관
 *   - transferType: "CUSTOMER_REQUIREMENT" | "FIELD_ISSUE" | "DISCUSSION_ITEM"
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Route 파라미터 타입 */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 인터뷰 이관
 * POST /api/interviews/[id]/transfer
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { transferType } = body;

    // 유효성 검사
    if (!transferType) {
      return NextResponse.json(
        { error: "이관 유형을 선택해주세요." },
        { status: 400 }
      );
    }

    if (!["CUSTOMER_REQUIREMENT", "FIELD_ISSUE", "DISCUSSION_ITEM"].includes(transferType)) {
      return NextResponse.json(
        { error: "올바른 이관 유형이 아닙니다." },
        { status: 400 }
      );
    }

    // 인터뷰 조회
    const interview = await prisma.interview.findUnique({
      where: { id },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "인터뷰를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 이관된 경우 확인
    if (interview.transferStatus === "TRANSFERRED") {
      return NextResponse.json(
        { error: "이미 이관된 인터뷰입니다." },
        { status: 400 }
      );
    }

    let createdCode = "";

    // 5가지 카테고리 내용을 하나의 상세 설명으로 통합
    const detailedDescription = [
      interview.currentProcess ? `【현재 운영 방식 (AS-IS)】\n${interview.currentProcess}` : null,
      interview.painPoints ? `【문제점 (Pain Points)】\n${interview.painPoints}` : null,
      interview.desiredResults ? `【원하는 결과 (TO-BE)】\n${interview.desiredResults}` : null,
      interview.technicalConstraints ? `【기술적 제약 (Technical Limits)】\n${interview.technicalConstraints}` : null,
      interview.questions ? `【궁금한 점 (Questions)】\n${interview.questions}` : null,
    ]
      .filter((x): x is string => Boolean(x))
      .join("\n\n");

    const fullDescription = `${interview.title}\n\n${detailedDescription}\n\n[인터뷰에서 이관: ${interview.code}]`;

    // 이관 유형에 따라 새 항목 생성
    if (transferType === "CUSTOMER_REQUIREMENT") {
      // 고객요구사항으로 이관
      const lastRequirement = await prisma.customerRequirement.findFirst({
        where: { projectId: interview.projectId },
        orderBy: { sequence: "desc" },
      });

      const nextSequence = lastRequirement ? lastRequirement.sequence + 1 : 1;
      createdCode = `RQIT_${String(nextSequence).padStart(5, "0")}`;

      await prisma.customerRequirement.create({
        data: {
          projectId: interview.projectId,
          sequence: nextSequence,
          code: createdCode,
          businessUnit: interview.businessUnit,
          functionName: interview.title,
          content: fullDescription,
          requester: interview.interviewee || null,
          applyStatus: "REVIEWING",
          remarks: interview.remarks || null,
        },
      });
    } else if (transferType === "FIELD_ISSUE") {
      // 현업이슈로 이관
      const lastIssue = await prisma.fieldIssue.findFirst({
        where: { projectId: interview.projectId },
        orderBy: { sequence: "desc" },
      });

      const nextSequence = lastIssue ? lastIssue.sequence + 1 : 1;
      createdCode = `IS${String(nextSequence).padStart(4, "0")}`;

      await prisma.fieldIssue.create({
        data: {
          projectId: interview.projectId,
          sequence: nextSequence,
          code: createdCode,
          businessUnit: interview.businessUnit,
          title: interview.title,
          description: fullDescription,
          registeredDate: interview.interviewDate,
          issuer: interview.interviewee || null,
          status: "OPEN",
          remarks: interview.remarks || null,
        },
      });
    } else if (transferType === "DISCUSSION_ITEM") {
      // 협의요청으로 이관
      const lastDiscussion = await prisma.discussionItem.findFirst({
        where: { projectId: interview.projectId },
        orderBy: { code: "desc" },
      });

      // DIS-001 형식으로 코드 생성
      const lastNumber = lastDiscussion?.code
        ? parseInt(lastDiscussion.code.split("-")[1] || "0")
        : 0;
      createdCode = `DIS-${String(lastNumber + 1).padStart(3, "0")}`;

      // 협의 선택지 생성 (desiredResults를 기반으로)
      const options = interview.desiredResults
        ? [
            {
              label: "A안",
              description: interview.desiredResults,
            },
            {
              label: "B안",
              description: "대안 B 검토 필요",
            },
          ]
        : [
            {
              label: "A안",
              description: "대안 A 검토 필요",
            },
            {
              label: "B안",
              description: "대안 B 검토 필요",
            },
          ];

      await prisma.discussionItem.create({
        data: {
          projectId: interview.projectId,
          code: createdCode,
          businessUnit: interview.businessUnit,
          title: interview.title,
          description: fullDescription,
          status: "DISCUSSING",
          stage: "ANALYSIS",
          priority: "MEDIUM",
          options: options,
          requesterName: interview.interviewee || null,
        },
      });
    }

    // 인터뷰 상태 업데이트
    const updatedInterview = await prisma.interview.update({
      where: { id: id },
      data: {
        transferStatus: "TRANSFERRED",
        transferredType: transferType,
        transferredTo: createdCode,
        transferredAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "이관이 완료되었습니다.",
      interview: updatedInterview,
      transferredCode: createdCode,
    });
  } catch (error) {
    console.error("인터뷰 이관 실패:", error);
    return NextResponse.json(
      { error: "인터뷰 이관에 실패했습니다." },
      { status: 500 }
    );
  }
}
