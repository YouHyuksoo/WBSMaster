/**
 * @file src/lib/chat-tools/entities/specs-meeting.ts
 * @description
 * AI 채팅 공통 등록·수정·삭제 메뉴 정의 (3): 회의록 머리 정보(목적·일자·시간·장소·작성자·참석자·비고).
 *
 * 초보자 가이드:
 * - 문서번호(code, YYYYMMDD-NNN)는 화면 API 가 회의 일자로 매긴다. 대상은 문서번호 또는 회의 목적(title)으로 찾는다.
 * - 등록 때만 contents(내용 줄 목록)를 받아 items 로 바꾼다. 등록 뒤 내용 항목 추가·변경·삭제는
 *   전용 도구 propose_update_meeting_items(chat-tools/meeting-items.ts)가 한다.
 * - 삭제하면 내용 항목도 함께 지워지므로 항목 수를 미리 알려 준다.
 */

import type { EntityCtx, EntityField, EntitySpec } from "./types";

const S = (key: string, label: string, required = false): EntityField => ({ key, label, type: "string", required });

type MeetingDb = { meetingMinuteItem: { count(a: unknown): Promise<number> } };

export const MEETING_SPECS: EntitySpec[] = [
  {
    key: "meeting_minute", label: "회의록", model: "meetingMinute", refFields: ["code", "title"], link: "/dashboard/meeting-minutes",
    ops: { create: true, update: true, delete: true },
    collectionRoute: () => import("@/app/api/meeting-minutes/route"), collectionPath: "/api/meeting-minutes",
    itemRoute: () => import("@/app/api/meeting-minutes/[id]/route"), itemPath: (id) => `/api/meeting-minutes/${id}`,
    fields: [
      S("title", "회의 목적", true), { key: "meetingDate", label: "일자", type: "date", required: true },
      S("startTime", "시작 시간(HH:mm)"), S("endTime", "종료 시간(HH:mm)"), S("location", "장소"), S("author", "작성자"),
      S("attendees", "참석자"), S("remarks", "비고"),
      { key: "contents", label: "내용", type: "list", createOnly: true },
    ],
    prepareCreate: async (_ctx: EntityCtx, data) => {
      const { contents, ...rest } = data as { contents?: string[] } & Record<string, unknown>;
      return contents?.length ? { ...rest, items: contents.map((content) => ({ content, status: "PLANNED" })) } : rest;
    },
    deleteImpact: async (ctx: EntityCtx, ids) => {
      const n = await (ctx.prisma as MeetingDb).meetingMinuteItem.count({ where: { minuteId: { in: ids } } });
      return n ? `회의 내용 항목 ${n}건` : undefined;
    },
  },
];
