/**
 * @file src/app/api/as-is-analysis/unit-analysis/[id]/route.ts
 * @description
 * AS-IS 단위업무 분석(UnitAnalysis) 개별 API 라우트입니다.
 * 단위업무 분석의 조회, 수정, 삭제를 처리합니다.
 *
 * 초보자 가이드:
 * - GET: 특정 단위업무 분석 조회
 * - PATCH: 단위업무 분석 수정 (다이어그램 데이터 등)
 * - DELETE: 단위업무 분석 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/as-is-analysis/unit-analysis/[id]
 * 특정 단위업무 분석 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const unitAnalysis = await prisma.asIsUnitAnalysis.findUnique({
      where: { id },
      include: {
        overviewItem: {
          select: {
            id: true,
            majorCategory: true,
            middleCategory: true,
            taskName: true,
            currentMethod: true,
          },
        },
        processDefinitions: { orderBy: { order: "asc" } },
        flowChartDetails: { orderBy: { order: "asc" } },
        responsibilities: { orderBy: { order: "asc" } },
        interviews: { orderBy: { order: "asc" } },
        issues: { orderBy: { order: "asc" } },
        documents: { orderBy: { order: "asc" } },
        documentAnalyses: { orderBy: { order: "asc" } },
        functions: { orderBy: { order: "asc" } },
        screens: { orderBy: { order: "asc" } },
        interfaces: { orderBy: { order: "asc" } },
        dataModels: { orderBy: { order: "asc" } },
        codeDefinitions: { orderBy: { order: "asc" } },
      },
    });

    if (!unitAnalysis) {
      return NextResponse.json(
        { error: "단위업무 분석을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(unitAnalysis);
  } catch (error) {
    console.error("단위업무 분석 조회 오류:", error);
    return NextResponse.json(
      { error: "단위업무 분석 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/as-is-analysis/unit-analysis/[id]
 * 단위업무 분석 수정
 * - flowChartData 저장 시 자동으로 flowChartDetails 동기화
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { flowChartData, swimlaneData } = body;

    // 존재 여부 확인
    const existing = await prisma.asIsUnitAnalysis.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "단위업무 분석을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 트랜잭션으로 처리 (flowChartData와 flowChartDetails 동기화)
    const unitAnalysis = await prisma.$transaction(async (tx) => {
      // 1. 단위업무 분석 업데이트
      const updated = await tx.asIsUnitAnalysis.update({
        where: { id },
        data: {
          ...(flowChartData !== undefined && { flowChartData }),
          ...(swimlaneData !== undefined && { swimlaneData }),
        },
      });

      // 2. flowChartData가 있으면 flowChartDetails 자동 동기화
      if (flowChartData && flowChartData.nodes) {
        // 기존 flowChartDetails 삭제
        await tx.asIsFlowChartDetail.deleteMany({
          where: { unitAnalysisId: id },
        });

        // 노드에서 프로세스 관련 노드만 추출 (시작/종료 제외)
        const processNodes = flowChartData.nodes.filter(
          (node: { type: string; data?: { type?: string } }) =>
            node.type !== "startEnd" ||
            (node.type === "startEnd" && node.data?.type !== "start" && node.data?.type !== "end")
        ).filter(
          (node: { type: string }) =>
            ["process", "subProcess", "manualInput", "decision", "document", "data", "interface", "database"].includes(node.type)
        );

        // flowChartDetails 생성
        if (processNodes.length > 0) {
          const flowChartDetails = processNodes.map(
            (node: { id: string; type: string; data?: { label?: string; description?: string; responsible?: string; systemUsed?: string; inputData?: string; outputData?: string } }, index: number) => ({
              unitAnalysisId: id,
              nodeId: node.id,
              stepNumber: index + 1,
              processName: node.data?.label || getNodeTypeName(node.type),
              description: node.data?.description || null,
              responsible: node.data?.responsible || null,
              systemUsed: node.data?.systemUsed || null,
              inputData: node.data?.inputData || null,
              outputData: node.data?.outputData || null,
              remarks: null,
              order: index,
            })
          );

          await tx.asIsFlowChartDetail.createMany({
            data: flowChartDetails,
          });
        }
      }

      // 3. 업데이트된 데이터 반환
      return tx.asIsUnitAnalysis.findUnique({
        where: { id },
        include: {
          overviewItem: {
            select: {
              id: true,
              majorCategory: true,
              middleCategory: true,
              taskName: true,
              currentMethod: true,
            },
          },
          flowChartDetails: { orderBy: { order: "asc" } },
        },
      });
    });

    return NextResponse.json(unitAnalysis);
  } catch (error) {
    console.error("단위업무 분석 수정 오류:", error);
    return NextResponse.json(
      { error: "단위업무 분석 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 노드 타입별 기본 이름 반환
 */
function getNodeTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    process: "프로세스",
    subProcess: "서브프로세스",
    manualInput: "수동 입력",
    decision: "판단",
    document: "문서",
    data: "데이터",
    interface: "인터페이스",
    database: "DB 저장",
  };
  return typeNames[type] || type;
}

/**
 * DELETE /api/as-is-analysis/unit-analysis/[id]
 * 단위업무 분석 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    // 존재 여부 확인
    const existing = await prisma.asIsUnitAnalysis.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "단위업무 분석을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 삭제 (Cascade로 모든 하위 데이터도 함께 삭제됨)
    await prisma.asIsUnitAnalysis.delete({
      where: { id },
    });

    return NextResponse.json({ message: "단위업무 분석이 삭제되었습니다." });
  } catch (error) {
    console.error("단위업무 분석 삭제 오류:", error);
    return NextResponse.json(
      { error: "단위업무 분석 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
