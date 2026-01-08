/**
 * @file src/app/api/slack-settings/test/route.ts
 * @description
 * Slack 웹훅 테스트 API입니다.
 * 설정된 웹훅 URL로 테스트 메시지를 전송합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

/**
 * Slack 웹훅 테스트
 * POST /api/slack-settings/test
 * (인증 필요)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { webhookUrl } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "웹훅 URL이 필요합니다." },
        { status: 400 }
      );
    }

    // 테스트 메시지 전송
    const testMessage = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "WBS Master 연동 테스트",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Slack 웹훅 연동이 정상적으로 설정되었습니다.\n\n이제 Task 완료, 이슈 등록 등의 알림을 받을 수 있습니다.",
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `테스트 시간: ${new Date().toLocaleString("ko-KR")}`,
            },
          ],
        },
      ],
      text: "[WBS Master] Slack 연동 테스트 메시지입니다.",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testMessage),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Slack 테스트 실패:", response.status, errorText);
      return NextResponse.json(
        { error: `Slack 전송 실패: ${errorText || response.statusText}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "테스트 메시지가 전송되었습니다." });
  } catch (error) {
    console.error("Slack 테스트 오류:", error);
    return NextResponse.json(
      { error: "테스트 메시지 전송에 실패했습니다." },
      { status: 500 }
    );
  }
}
