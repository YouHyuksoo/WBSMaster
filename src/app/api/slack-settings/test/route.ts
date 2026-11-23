/**
 * @file src/app/api/slack-settings/test/route.ts
 * @description
 * Slack 웹훅 테스트 API입니다.
 * 설정된 웹훅 URL로 테스트 메시지를 전송합니다.
 *
 * 초보자 가이드:
 * - 인증: ADMIN 만 (아니면 403)
 * - 주소는 Slack 수신 웹훅(https://hooks.slack.com/...)만 받는다 (isSlackWebhookUrl). 다른 주소는 400.
 *   회귀: 로그인 사용자가 준 아무 주소로 서버가 요청을 보내고 실패 응답 본문까지 돌려줘, 내부망을 찔러 볼 수 있었다.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isSlackWebhookUrl } from "@/lib/slack";

/**
 * Slack 웹훅 테스트
 * POST /api/slack-settings/test
 * (ADMIN 전용)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;
    if (user!.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { webhookUrl } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "웹훅 URL이 필요합니다." },
        { status: 400 }
      );
    }
    if (!isSlackWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        { error: "유효하지 않은 Slack 웹훅 URL입니다." },
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
      redirect: "error", // 다른 주소로 넘기는 응답은 따라가지 않는다
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Slack 테스트 실패:", response.status, errorText);
      return NextResponse.json(
        { error: `Slack 전송 실패: ${(errorText || response.statusText).slice(0, 200)}` },
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
