/**
 * @file src/app/api/as-is-analysis/items/copy/route.ts
 * @description
 * AS-IS 항목을 다른 사업부로 복사하는 API 라우트입니다.
 * 선택한 항목과 연결된 모든 하위 데이터(단위업무 분석 포함)를 딥카피합니다.
 *
 * 초보자 가이드:
 * 1. **소스 사업부**: 복사할 항목이 있는 현재 사업부
 * 2. **목적지 사업부**: 항목을 복사할 대상 사업부
 * 3. **딥카피**: AsIsOverviewItem + AsIsUnitAnalysis + 모든 하위 테이블 복사
 *
 * POST 요청 본문:
 * {
 *   sourceOverviewId: string,      // 소스 Overview ID
 *   targetBusinessUnit: string,    // 목적지 사업부 코드
 *   projectId: string,             // 프로젝트 ID
 *   itemIds?: string[]             // 복사할 항목 ID 배열 (없으면 전체 복사)
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/as-is-analysis/items/copy
 * AS-IS 항목을 다른 사업부로 복사
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { sourceOverviewId, targetBusinessUnit, projectId, itemIds } = body;

    // 필수 필드 확인
    if (!sourceOverviewId || !targetBusinessUnit || !projectId) {
      return NextResponse.json(
        { error: "sourceOverviewId, targetBusinessUnit, projectId는 필수입니다." },
        { status: 400 }
      );
    }

    // 소스 Overview 확인
    const sourceOverview = await prisma.asIsOverview.findUnique({
      where: { id: sourceOverviewId },
      include: {
        items: {
          include: {
            unitAnalysis: {
              include: {
                processDefinitions: true,
                flowChartDetails: true,
                responsibilities: true,
                interviews: true,
                issues: true,
                documents: true,
                documentAnalyses: true,
                functions: true,
                screens: true,
                interfaces: true,
                dataModels: true,
                codeDefinitions: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!sourceOverview) {
      return NextResponse.json(
        { error: "소스 AS-IS 총괄을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 같은 사업부로 복사 방지
    if (sourceOverview.businessUnit === targetBusinessUnit) {
      return NextResponse.json(
        { error: "같은 사업부로는 복사할 수 없습니다." },
        { status: 400 }
      );
    }

    // 복사할 항목 필터링 (itemIds가 있으면 해당 항목만, 없으면 전체)
    const itemsToCopy = itemIds && itemIds.length > 0
      ? sourceOverview.items.filter((item) => itemIds.includes(item.id))
      : sourceOverview.items;

    if (itemsToCopy.length === 0) {
      return NextResponse.json(
        { error: "복사할 항목이 없습니다." },
        { status: 400 }
      );
    }

    // 트랜잭션으로 복사 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 목적지 Overview 확인 또는 생성
      let targetOverview = await tx.asIsOverview.findUnique({
        where: {
          projectId_businessUnit: {
            projectId,
            businessUnit: targetBusinessUnit,
          },
        },
      });

      if (!targetOverview) {
        // 목적지 Overview 생성
        targetOverview = await tx.asIsOverview.create({
          data: {
            projectId,
            businessUnit: targetBusinessUnit,
            customerName: sourceOverview.customerName,
            author: sourceOverview.author,
            createdDate: new Date(),
          },
        });
      }

      // 2. 기존 항목들의 최대 order 값 조회
      const maxOrderResult = await tx.asIsOverviewItem.aggregate({
        where: { overviewId: targetOverview.id },
        _max: { order: true },
      });
      let currentOrder = (maxOrderResult._max.order ?? -1) + 1;

      // 3. 각 항목 복사
      const copiedItems = [];
      for (const item of itemsToCopy) {
        // 3-1. AsIsOverviewItem 복사
        const newItem = await tx.asIsOverviewItem.create({
          data: {
            overviewId: targetOverview.id,
            asIsManagementNo: null, // 관리번호는 목적지에서 새로 발급 (자동 또는 수동)
            majorCategory: item.majorCategory,
            middleCategory: item.middleCategory,
            taskName: item.taskName,
            currentMethod: item.currentMethod,
            issueSummary: item.issueSummary,
            details: item.details,
            remarks: item.remarks,
            order: currentOrder++,
          },
        });

        // 3-2. 단위업무 분석이 있으면 복사
        if (item.unitAnalysis) {
          const ua = item.unitAnalysis;

          // AsIsUnitAnalysis 복사
          const newUnitAnalysis = await tx.asIsUnitAnalysis.create({
            data: {
              overviewItemId: newItem.id,
              flowChartData: ua.flowChartData || undefined,
              swimlaneData: ua.swimlaneData || undefined,
            },
          });

          // 프로세스 정의서 복사
          if (ua.processDefinitions && ua.processDefinitions.length > 0) {
            await tx.asIsProcessDefinition.createMany({
              data: ua.processDefinitions.map((pd) => ({
                unitAnalysisId: newUnitAnalysis.id,
                stepNumber: pd.stepNumber,
                processName: pd.processName,
                description: pd.description,
                input: pd.input,
                output: pd.output,
                relatedSystem: pd.relatedSystem,
                remarks: pd.remarks,
                order: pd.order,
              })),
            });
          }

          // Flow Chart 상세 복사
          if (ua.flowChartDetails && ua.flowChartDetails.length > 0) {
            await tx.asIsFlowChartDetail.createMany({
              data: ua.flowChartDetails.map((fcd) => ({
                unitAnalysisId: newUnitAnalysis.id,
                nodeId: fcd.nodeId,
                stepNumber: fcd.stepNumber,
                processName: fcd.processName,
                description: fcd.description,
                responsible: fcd.responsible,
                systemUsed: fcd.systemUsed,
                inputData: fcd.inputData,
                outputData: fcd.outputData,
                remarks: fcd.remarks,
                order: fcd.order,
              })),
            });
          }

          // R&R 복사
          if (ua.responsibilities && ua.responsibilities.length > 0) {
            await tx.asIsResponsibility.createMany({
              data: ua.responsibilities.map((r) => ({
                unitAnalysisId: newUnitAnalysis.id,
                role: r.role,
                department: r.department,
                responsibility: r.responsibility,
                authority: r.authority,
                remarks: r.remarks,
                order: r.order,
              })),
            });
          }

          // 인터뷰 복사
          if (ua.interviews && ua.interviews.length > 0) {
            await tx.asIsInterview.createMany({
              data: ua.interviews.map((i) => ({
                unitAnalysisId: newUnitAnalysis.id,
                interviewee: i.interviewee,
                department: i.department,
                position: i.position,
                interviewDate: i.interviewDate,
                topic: i.topic,
                content: i.content,
                keyFindings: i.keyFindings,
                suggestions: i.suggestions,
                remarks: i.remarks,
                order: i.order,
              })),
            });
          }

          // 이슈/Pain Point 복사
          if (ua.issues && ua.issues.length > 0) {
            await tx.asIsIssue.createMany({
              data: ua.issues.map((issue) => ({
                unitAnalysisId: newUnitAnalysis.id,
                issueType: issue.issueType,
                title: issue.title,
                description: issue.description,
                impact: issue.impact,
                frequency: issue.frequency,
                priority: issue.priority,
                suggestedFix: issue.suggestedFix,
                remarks: issue.remarks,
                order: issue.order,
              })),
            });
          }

          // 문서 목록 복사 (수기/엑셀용)
          if (ua.documents && ua.documents.length > 0) {
            await tx.asIsDocument.createMany({
              data: ua.documents.map((d) => ({
                unitAnalysisId: newUnitAnalysis.id,
                documentName: d.documentName,
                documentType: d.documentType,
                purpose: d.purpose,
                creator: d.creator,
                frequency: d.frequency,
                storageLocation: d.storageLocation,
                retentionPeriod: d.retentionPeriod,
                remarks: d.remarks,
                order: d.order,
              })),
            });
          }

          // 문서 구조 분석 복사
          if (ua.documentAnalyses && ua.documentAnalyses.length > 0) {
            await tx.asIsDocumentAnalysis.createMany({
              data: ua.documentAnalyses.map((da) => ({
                unitAnalysisId: newUnitAnalysis.id,
                documentName: da.documentName,
                fieldName: da.fieldName,
                dataType: da.dataType,
                sampleData: da.sampleData,
                isMandatory: da.isMandatory,
                validationRule: da.validationRule,
                remarks: da.remarks,
                order: da.order,
              })),
            });
          }

          // 기능 목록 복사 (시스템용)
          if (ua.functions && ua.functions.length > 0) {
            await tx.asIsFunction.createMany({
              data: ua.functions.map((f) => ({
                unitAnalysisId: newUnitAnalysis.id,
                functionId: f.functionId,
                functionName: f.functionName,
                description: f.description,
                module: f.module,
                usageFrequency: f.usageFrequency,
                userCount: f.userCount,
                importance: f.importance,
                remarks: f.remarks,
                order: f.order,
              })),
            });
          }

          // 화면 목록 복사
          if (ua.screens && ua.screens.length > 0) {
            await tx.asIsScreen.createMany({
              data: ua.screens.map((s) => ({
                unitAnalysisId: newUnitAnalysis.id,
                screenId: s.screenId,
                screenName: s.screenName,
                description: s.description,
                menuPath: s.menuPath,
                screenType: s.screenType,
                relatedFunction: s.relatedFunction,
                remarks: s.remarks,
                order: s.order,
              })),
            });
          }

          // 인터페이스 목록 복사
          if (ua.interfaces && ua.interfaces.length > 0) {
            await tx.asIsInterface.createMany({
              data: ua.interfaces.map((inf) => ({
                unitAnalysisId: newUnitAnalysis.id,
                interfaceId: inf.interfaceId,
                interfaceName: inf.interfaceName,
                description: inf.description,
                sourceSystem: inf.sourceSystem,
                targetSystem: inf.targetSystem,
                interfaceType: inf.interfaceType,
                protocol: inf.protocol,
                frequency: inf.frequency,
                dataVolume: inf.dataVolume,
                remarks: inf.remarks,
                order: inf.order,
              })),
            });
          }

          // 데이터 모델 복사
          if (ua.dataModels && ua.dataModels.length > 0) {
            await tx.asIsDataModel.createMany({
              data: ua.dataModels.map((dm) => ({
                unitAnalysisId: newUnitAnalysis.id,
                tableName: dm.tableName,
                tableNameKr: dm.tableNameKr,
                description: dm.description,
                columnName: dm.columnName,
                columnNameKr: dm.columnNameKr,
                dataType: dm.dataType,
                length: dm.length,
                isPrimaryKey: dm.isPrimaryKey,
                isForeignKey: dm.isForeignKey,
                isNullable: dm.isNullable,
                defaultValue: dm.defaultValue,
                remarks: dm.remarks,
                order: dm.order,
              })),
            });
          }

          // 코드 정의서 복사
          if (ua.codeDefinitions && ua.codeDefinitions.length > 0) {
            await tx.asIsCodeDefinition.createMany({
              data: ua.codeDefinitions.map((cd) => ({
                unitAnalysisId: newUnitAnalysis.id,
                codeGroup: cd.codeGroup,
                codeGroupName: cd.codeGroupName,
                codeValue: cd.codeValue,
                codeName: cd.codeName,
                description: cd.description,
                isActive: cd.isActive,
                remarks: cd.remarks,
                order: cd.order,
              })),
            });
          }
        }

        copiedItems.push(newItem);
      }

      return {
        targetOverview,
        copiedCount: copiedItems.length,
        copiedItems,
      };
    });

    return NextResponse.json({
      success: true,
      message: `${result.copiedCount}개의 항목이 ${targetBusinessUnit}(으)로 복사되었습니다.`,
      targetOverviewId: result.targetOverview.id,
      copiedCount: result.copiedCount,
    });
  } catch (error) {
    console.error("AS-IS 항목 복사 오류:", error);
    return NextResponse.json(
      { error: "AS-IS 항목 복사에 실패했습니다." },
      { status: 500 }
    );
  }
}
