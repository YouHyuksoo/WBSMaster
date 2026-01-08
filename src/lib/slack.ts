/**
 * @file src/lib/slack.ts
 * @description
 * Slack 웹훅 연동 유틸리티입니다.
 * DB에 저장된 설정을 기반으로 Task 완료, 이슈 등록 등의 이벤트를 Slack으로 알림합니다.
 *
 * 초보자 가이드:
 * 1. **getSlackSettings**: DB에서 Slack 설정 조회
 * 2. **sendSlackNotification**: 기본 텍스트 메시지 전송
 * 3. **sendTaskCompletedNotification**: Task 완료 알림 전송
 * 4. **sendIssueCreatedNotification**: 이슈 등록 알림 전송
 *
 * 사용법:
 * ```typescript
 * import { sendTaskCompletedNotification } from '@/lib/slack';
 * await sendTaskCompletedNotification({
 *   taskTitle: 'API 개발',
 *   projectName: 'WBS Master',
 *   assigneeName: '홍길동',
 *   completedAt: new Date(),
 * });
 * ```
 */

import { prisma } from "@/lib/prisma";

/** Slack 설정 타입 */
interface SlackSettings {
  id: string;
  webhookUrl: string;
  channelName: string | null;
  isEnabled: boolean;
  notifyTaskCompleted: boolean;
  notifyTaskCreated: boolean;
  notifyTaskDelayed: boolean;
  notifyIssueCreated: boolean;
  notifyIssueResolved: boolean;
  notifyProjectProgress: boolean;
  mentionOnUrgent: boolean;
  dailyReportTime: string | null;
}

/** Task 완료 알림 데이터 */
interface TaskCompletedData {
  /** Task 제목 */
  taskTitle: string;
  /** 프로젝트 이름 */
  projectName?: string;
  /** 담당자 이름 */
  assigneeName?: string;
  /** 완료 시간 */
  completedAt?: Date;
}

/** 이슈 등록 알림 데이터 */
interface IssueCreatedData {
  /** 이슈 제목 */
  issueTitle: string;
  /** 이슈 코드 */
  issueCode?: string;
  /** 프로젝트 이름 */
  projectName?: string;
  /** 보고자 이름 */
  reporterName?: string;
  /** 우선순위 */
  priority?: string;
  /** 카테고리 */
  category?: string;
}

/** Task 지연 알림 데이터 */
interface TaskDelayedData {
  /** Task 제목 */
  taskTitle: string;
  /** 프로젝트 이름 */
  projectName?: string;
  /** 담당자 이름 */
  assigneeName?: string;
  /** 마감일 */
  dueDate?: Date;
}

/**
 * DB에서 Slack 설정 조회
 * 캐싱 없이 항상 최신 설정 반환
 */
async function getSlackSettings(): Promise<SlackSettings | null> {
  try {
    const settings = await prisma.slackSettings.findFirst({
      orderBy: { createdAt: "asc" },
    });
    return settings;
  } catch (error) {
    console.error("[Slack] 설정 조회 실패:", error);
    return null;
  }
}

/**
 * Slack으로 기본 메시지 전송
 * @param message - 전송할 메시지
 * @returns 성공 여부
 */
export async function sendSlackNotification(message: string): Promise<boolean> {
  const settings = await getSlackSettings();

  if (!settings || !settings.isEnabled || !settings.webhookUrl) {
    console.warn("[Slack] 설정이 없거나 비활성화 상태입니다.");
    return false;
  }

  try {
    const response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      console.error(`[Slack] 전송 실패: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log("[Slack] 메시지 전송 성공");
    return true;
  } catch (error) {
    console.error("[Slack] 전송 오류:", error);
    return false;
  }
}

/**
 * Slack으로 Block Kit 메시지 전송 (리치 포맷)
 * @param blocks - Slack Block Kit 블록 배열
 * @param text - 폴백 텍스트 (알림 미리보기용)
 * @param webhookUrl - 웹훅 URL (없으면 DB에서 조회)
 * @returns 성공 여부
 */
export async function sendSlackBlockMessage(
  blocks: any[],
  text: string,
  webhookUrl?: string
): Promise<boolean> {
  let url = webhookUrl;

  if (!url) {
    const settings = await getSlackSettings();
    if (!settings || !settings.isEnabled || !settings.webhookUrl) {
      console.warn("[Slack] 설정이 없거나 비활성화 상태입니다.");
      return false;
    }
    url = settings.webhookUrl;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks, text }),
    });

    if (!response.ok) {
      console.error(`[Slack] 전송 실패: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log("[Slack] Block 메시지 전송 성공");
    return true;
  } catch (error) {
    console.error("[Slack] 전송 오류:", error);
    return false;
  }
}

/**
 * Task 완료 알림 전송
 * DB 설정의 notifyTaskCompleted가 true일 때만 전송
 * @param data - Task 완료 정보
 * @returns 성공 여부
 */
export async function sendTaskCompletedNotification(
  data: TaskCompletedData
): Promise<boolean> {
  const settings = await getSlackSettings();

  // 설정 확인
  if (!settings || !settings.isEnabled || !settings.notifyTaskCompleted) {
    console.log("[Slack] Task 완료 알림이 비활성화되어 있습니다.");
    return false;
  }

  const { taskTitle, projectName, assigneeName, completedAt } = data;

  // 완료 시간 포맷
  const timeStr = completedAt
    ? completedAt.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("ko-KR");

  // Block Kit 형식의 리치 메시지
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Task 완료",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Task:*\n${taskTitle}`,
        },
        {
          type: "mrkdwn",
          text: `*프로젝트:*\n${projectName || "-"}`,
        },
        {
          type: "mrkdwn",
          text: `*담당자:*\n${assigneeName || "-"}`,
        },
        {
          type: "mrkdwn",
          text: `*완료 시간:*\n${timeStr}`,
        },
      ],
    },
    {
      type: "divider",
    },
  ];

  // 폴백 텍스트
  const fallbackText = `[Task 완료] ${taskTitle} - ${assigneeName || "담당자 미지정"} (${projectName || ""})`;

  return sendSlackBlockMessage(blocks, fallbackText, settings.webhookUrl);
}

/**
 * 이슈 등록 알림 전송
 * DB 설정의 notifyIssueCreated가 true일 때만 전송
 * @param data - 이슈 정보
 * @returns 성공 여부
 */
export async function sendIssueCreatedNotification(
  data: IssueCreatedData
): Promise<boolean> {
  const settings = await getSlackSettings();

  // 설정 확인
  if (!settings || !settings.isEnabled || !settings.notifyIssueCreated) {
    console.log("[Slack] 이슈 등록 알림이 비활성화되어 있습니다.");
    return false;
  }

  const { issueTitle, issueCode, projectName, reporterName, priority, category } = data;

  // 우선순위 색상
  const priorityColor = priority === "CRITICAL" ? "🔴" :
                       priority === "HIGH" ? "🟠" :
                       priority === "MEDIUM" ? "🟡" : "🟢";

  // 긴급 시 멘션 추가
  const mention = settings.mentionOnUrgent && (priority === "CRITICAL" || priority === "HIGH")
    ? "<!channel> "
    : "";

  // Block Kit 형식의 리치 메시지
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${priorityColor} 새 이슈 등록`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*이슈:*\n${issueCode ? `[${issueCode}] ` : ""}${issueTitle}`,
        },
        {
          type: "mrkdwn",
          text: `*프로젝트:*\n${projectName || "-"}`,
        },
        {
          type: "mrkdwn",
          text: `*보고자:*\n${reporterName || "-"}`,
        },
        {
          type: "mrkdwn",
          text: `*우선순위:*\n${priority || "-"}`,
        },
      ],
    },
    ...(category ? [{
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `카테고리: ${category}`,
      }],
    }] : []),
    {
      type: "divider",
    },
  ];

  // 폴백 텍스트
  const fallbackText = `${mention}[새 이슈] ${issueCode ? `[${issueCode}] ` : ""}${issueTitle} - ${priority || "보통"} (${projectName || ""})`;

  return sendSlackBlockMessage(blocks, fallbackText, settings.webhookUrl);
}

/**
 * Task 지연 알림 전송
 * DB 설정의 notifyTaskDelayed가 true일 때만 전송
 * @param data - Task 지연 정보
 * @returns 성공 여부
 */
export async function sendTaskDelayedNotification(
  data: TaskDelayedData
): Promise<boolean> {
  const settings = await getSlackSettings();

  // 설정 확인
  if (!settings || !settings.isEnabled || !settings.notifyTaskDelayed) {
    console.log("[Slack] Task 지연 알림이 비활성화되어 있습니다.");
    return false;
  }

  const { taskTitle, projectName, assigneeName, dueDate } = data;

  // 마감일 포맷
  const dueDateStr = dueDate
    ? dueDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "-";

  // Block Kit 형식의 리치 메시지
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "⚠️ Task 지연",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Task:*\n${taskTitle}`,
        },
        {
          type: "mrkdwn",
          text: `*프로젝트:*\n${projectName || "-"}`,
        },
        {
          type: "mrkdwn",
          text: `*담당자:*\n${assigneeName || "-"}`,
        },
        {
          type: "mrkdwn",
          text: `*마감일:*\n${dueDateStr}`,
        },
      ],
    },
    {
      type: "divider",
    },
  ];

  // 폴백 텍스트
  const fallbackText = `[Task 지연] ${taskTitle} - ${assigneeName || "담당자 미지정"} (마감: ${dueDateStr})`;

  return sendSlackBlockMessage(blocks, fallbackText, settings.webhookUrl);
}
