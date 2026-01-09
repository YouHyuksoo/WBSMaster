/**
 * @file src/app/api/chat/feedback/route.ts
 * @description
 * 채팅 피드백 API 라우트입니다.
 * 사용자가 AI 응답에 대한 피드백을 제출하고 조회합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/chat/feedback**: 피드백 제출
 * 2. **GET /api/chat/feedback**: 피드백 목록 조회 (분석용)
 *
 * 수정 방법:
 * - 피드백 항목 추가: body에서 새 필드 처리
 * - 통계 추가: GET에서 집계 쿼리 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { FeedbackRating } from "@prisma/client";

/**
 * 피드백 제출
 * POST /api/chat/feedback
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      chatHistoryId,
      rating,
      comment,
      isSqlCorrect,
      isResponseHelpful,
      isChartUseful,
      tags,
    } = body;

    // 필수 필드 검증
    if (!chatHistoryId || !rating) {
      return NextResponse.json(
        { error: "chatHistoryId와 rating은 필수입니다." },
        { status: 400 }
      );
    }

    // rating 유효성 검증
    if (!Object.values(FeedbackRating).includes(rating)) {
      return NextResponse.json(
        { error: "유효하지 않은 rating 값입니다. POSITIVE, NEGATIVE, NEUTRAL 중 하나를 선택하세요." },
        { status: 400 }
      );
    }

    // 해당 채팅 기록이 존재하고 사용자의 것인지 확인 (프로젝트, 페르소나 정보 포함)
    const chatHistory = await prisma.chatHistory.findFirst({
      where: {
        id: chatHistoryId,
        userId: user!.id,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!chatHistory) {
      return NextResponse.json(
        { error: "채팅 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 페르소나 정보 조회 (있는 경우)
    let personaName: string | null = null;
    if (chatHistory.personaId) {
      const persona = await prisma.aiPersona.findUnique({
        where: { id: chatHistory.personaId },
        select: { name: true },
      });
      personaName = persona?.name || null;
    }

    // 기존 피드백이 있는지 확인
    const existingFeedback = await prisma.chatFeedback.findUnique({
      where: { chatHistoryId },
    });

    // 분석용 데이터 (ChatHistory에서 복사)
    const analysisData = {
      // 사용자 질의 & LLM 응답
      userQuery: chatHistory.userQuery,
      llmResponse: chatHistory.content,
      // SQL 관련
      sqlQuery: chatHistory.sqlQuery,
      // 차트/시각화
      chartType: chatHistory.chartType,
      chartData: chatHistory.chartData,
      mindmapData: chatHistory.mindmapData,
      // 성능 측정
      processingTimeMs: chatHistory.processingTimeMs,
      sqlGenTimeMs: chatHistory.sqlGenTimeMs,
      sqlExecTimeMs: chatHistory.sqlExecTimeMs,
      // 컨텍스트 정보
      projectId: chatHistory.projectId,
      projectName: chatHistory.project?.name || null,
      personaId: chatHistory.personaId,
      personaName,
    };

    let feedback;
    if (existingFeedback) {
      // 기존 피드백 업데이트 (분석 데이터도 최신화)
      feedback = await prisma.chatFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          rating,
          comment: comment || null,
          isSqlCorrect: isSqlCorrect ?? null,
          isResponseHelpful: isResponseHelpful ?? null,
          isChartUseful: isChartUseful ?? null,
          tags: tags || [],
          ...analysisData,
        },
      });
    } else {
      // 새 피드백 생성 (분석 데이터 포함)
      feedback = await prisma.chatFeedback.create({
        data: {
          chatHistoryId,
          rating,
          comment: comment || null,
          isSqlCorrect: isSqlCorrect ?? null,
          isResponseHelpful: isResponseHelpful ?? null,
          isChartUseful: isChartUseful ?? null,
          tags: tags || [],
          ...analysisData,
        },
      });
    }

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("피드백 제출 실패:", error);
    return NextResponse.json(
      { error: "피드백 제출에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 피드백 목록 조회 (분석용)
 * GET /api/chat/feedback
 *
 * Query Parameters:
 * - rating: 특정 rating만 필터링
 * - projectId: 특정 프로젝트만 필터링
 * - startDate: 시작일
 * - endDate: 종료일
 * - limit: 조회 개수 (기본 100)
 * - offset: 오프셋
 * - includeStats: true이면 통계 포함
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const rating = searchParams.get("rating") as FeedbackRating | null;
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeStats = searchParams.get("includeStats") === "true";

    // 필터 조건 구성
    const where: {
      chatHistory?: {
        userId?: string;
        projectId?: string;
        createdAt?: { gte?: Date; lte?: Date };
      };
      rating?: FeedbackRating;
    } = {
      chatHistory: {
        userId: user!.id,
      },
    };

    if (rating && Object.values(FeedbackRating).includes(rating)) {
      where.rating = rating;
    }

    if (projectId) {
      where.chatHistory!.projectId = projectId;
    }

    if (startDate || endDate) {
      where.chatHistory!.createdAt = {};
      if (startDate) {
        where.chatHistory!.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.chatHistory!.createdAt.lte = new Date(endDate);
      }
    }

    // 피드백 목록 조회
    const feedbacks = await prisma.chatFeedback.findMany({
      where,
      include: {
        chatHistory: {
          select: {
            id: true,
            role: true,
            content: true,
            sqlQuery: true,
            chartType: true,
            userQuery: true,
            processingTimeMs: true,
            sqlGenTimeMs: true,
            sqlExecTimeMs: true,
            errorMessage: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // 통계 포함 시
    let stats = null;
    if (includeStats) {
      const [totalCount, positiveCount, negativeCount, neutralCount] = await Promise.all([
        prisma.chatFeedback.count({ where }),
        prisma.chatFeedback.count({ where: { ...where, rating: "POSITIVE" } }),
        prisma.chatFeedback.count({ where: { ...where, rating: "NEGATIVE" } }),
        prisma.chatFeedback.count({ where: { ...where, rating: "NEUTRAL" } }),
      ]);

      // 평균 처리 시간 (피드백이 있는 채팅만)
      const avgProcessingTime = await prisma.chatHistory.aggregate({
        where: {
          userId: user!.id,
          feedback: { isNot: null },
          processingTimeMs: { not: null },
        },
        _avg: {
          processingTimeMs: true,
          sqlGenTimeMs: true,
          sqlExecTimeMs: true,
        },
      });

      stats = {
        total: totalCount,
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
        positiveRate: totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0,
        avgProcessingTimeMs: Math.round(avgProcessingTime._avg.processingTimeMs || 0),
        avgSqlGenTimeMs: Math.round(avgProcessingTime._avg.sqlGenTimeMs || 0),
        avgSqlExecTimeMs: Math.round(avgProcessingTime._avg.sqlExecTimeMs || 0),
      };
    }

    return NextResponse.json({
      feedbacks,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: feedbacks.length === limit,
      },
    });
  } catch (error) {
    console.error("피드백 조회 실패:", error);
    return NextResponse.json(
      { error: "피드백 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 피드백 삭제
 * DELETE /api/chat/feedback?id=xxx 또는 ?ids=xxx,yyy,zzz
 * (인증 필요)
 *
 * Query Parameters:
 * - id: 단일 피드백 ID
 * - ids: 여러 피드백 ID (쉼표 구분)
 * - all: "true"면 모든 피드백 삭제 (필터 조건 적용 가능)
 * - projectId: 특정 프로젝트만 (all과 함께 사용)
 * - rating: 특정 평점만 (all과 함께 사용)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");
    const deleteAll = searchParams.get("all") === "true";
    const projectId = searchParams.get("projectId");
    const rating = searchParams.get("rating") as FeedbackRating | null;

    // 삭제 조건 구성
    const where: {
      id?: string | { in: string[] };
      chatHistory?: {
        userId?: string;
        projectId?: string;
      };
      rating?: FeedbackRating;
    } = {};

    if (id) {
      // 단일 삭제
      where.id = id;
    } else if (ids) {
      // 다중 삭제
      where.id = { in: ids.split(",").map((s) => s.trim()) };
    } else if (deleteAll) {
      // 조건부 전체 삭제 (사용자 소유만)
      where.chatHistory = { userId: user!.id };
      if (projectId) {
        where.chatHistory.projectId = projectId;
      }
      if (rating && Object.values(FeedbackRating).includes(rating)) {
        where.rating = rating;
      }
    } else {
      return NextResponse.json(
        { error: "삭제할 피드백을 지정해주세요. (id, ids, 또는 all=true)" },
        { status: 400 }
      );
    }

    // 단일/다중 삭제 시 소유권 확인
    if (id || ids) {
      const feedbackIds = id ? [id] : ids!.split(",").map((s) => s.trim());
      const ownedFeedbacks = await prisma.chatFeedback.findMany({
        where: {
          id: { in: feedbackIds },
          chatHistory: { userId: user!.id },
        },
        select: { id: true },
      });

      const ownedIds = new Set(ownedFeedbacks.map((f) => f.id));
      const unauthorizedIds = feedbackIds.filter((fid) => !ownedIds.has(fid));

      if (unauthorizedIds.length > 0) {
        return NextResponse.json(
          { error: "삭제 권한이 없는 피드백이 포함되어 있습니다." },
          { status: 403 }
        );
      }
    }

    // 삭제 실행
    const result = await prisma.chatFeedback.deleteMany({ where });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("피드백 삭제 실패:", error);
    return NextResponse.json(
      { error: "피드백 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
