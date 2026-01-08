/**
 * @file src/app/api/slack-settings/route.ts
 * @description
 * Slack 설정 API 라우트입니다.
 * Slack 웹훅 설정의 조회(GET), 생성/수정(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/slack-settings**: 현재 Slack 설정 조회
 * 2. **POST /api/slack-settings**: Slack 설정 생성 또는 수정
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * Slack 설정 조회
 * GET /api/slack-settings
 */
export async function GET(request: NextRequest) {
  try {
    // 설정은 하나만 존재 (첫 번째 레코드 조회)
    const settings = await prisma.slackSettings.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!settings) {
      // 설정이 없으면 기본값 반환
      return NextResponse.json({
        id: null,
        webhookUrl: "",
        channelName: "",
        isEnabled: false,
        notifyTaskCompleted: true,
        notifyTaskCreated: false,
        notifyTaskDelayed: true,
        notifyIssueCreated: true,
        notifyIssueResolved: false,
        notifyProjectProgress: false,
        mentionOnUrgent: false,
        dailyReportTime: null,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Slack 설정 조회 실패:", error);
    return NextResponse.json(
      { error: "Slack 설정을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * Slack 설정 생성/수정
 * POST /api/slack-settings
 * (인증 필요)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      webhookUrl,
      channelName,
      isEnabled,
      notifyTaskCompleted,
      notifyTaskCreated,
      notifyTaskDelayed,
      notifyIssueCreated,
      notifyIssueResolved,
      notifyProjectProgress,
      mentionOnUrgent,
      dailyReportTime,
    } = body;

    // 웹훅 URL 필수 검증
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "웹훅 URL은 필수입니다." },
        { status: 400 }
      );
    }

    // 웹훅 URL 형식 검증
    if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        { error: "유효하지 않은 Slack 웹훅 URL입니다." },
        { status: 400 }
      );
    }

    // 기존 설정 확인
    const existing = await prisma.slackSettings.findFirst({
      orderBy: { createdAt: "asc" },
    });

    let settings;

    if (existing) {
      // 기존 설정 업데이트
      settings = await prisma.slackSettings.update({
        where: { id: existing.id },
        data: {
          webhookUrl,
          channelName: channelName || null,
          isEnabled: isEnabled ?? true,
          notifyTaskCompleted: notifyTaskCompleted ?? true,
          notifyTaskCreated: notifyTaskCreated ?? false,
          notifyTaskDelayed: notifyTaskDelayed ?? true,
          notifyIssueCreated: notifyIssueCreated ?? true,
          notifyIssueResolved: notifyIssueResolved ?? false,
          notifyProjectProgress: notifyProjectProgress ?? false,
          mentionOnUrgent: mentionOnUrgent ?? false,
          dailyReportTime: dailyReportTime || null,
        },
      });
    } else {
      // 새 설정 생성
      settings = await prisma.slackSettings.create({
        data: {
          webhookUrl,
          channelName: channelName || null,
          isEnabled: isEnabled ?? true,
          notifyTaskCompleted: notifyTaskCompleted ?? true,
          notifyTaskCreated: notifyTaskCreated ?? false,
          notifyTaskDelayed: notifyTaskDelayed ?? true,
          notifyIssueCreated: notifyIssueCreated ?? true,
          notifyIssueResolved: notifyIssueResolved ?? false,
          notifyProjectProgress: notifyProjectProgress ?? false,
          mentionOnUrgent: mentionOnUrgent ?? false,
          dailyReportTime: dailyReportTime || null,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Slack 설정 저장 실패:", error);
    return NextResponse.json(
      { error: "Slack 설정을 저장할 수 없습니다." },
      { status: 500 }
    );
  }
}
