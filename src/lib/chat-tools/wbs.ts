/**
 * @file src/lib/chat-tools/wbs.ts
 * @description
 * WBS 채팅 도구입니다. list_wbs(항목 조회)와 wbs_schedule_stats(계획·실적 진척률, 지연율)를 제공합니다.
 *
 * 초보자 가이드:
 * - wbs_schedule_stats 는 화면(WBS 통계 바)과 같은 함수(src/lib/wbs/schedule-stats.ts)를 쓴다.
 *   진도율·지연율을 LLM 이 SQL 로 지어내지 않게 한다.
 * - 담당자로 거를 때는 find_people 로 얻은 사용자 id 를 assigneeId 로 넘긴다.
 */

import { loadWbsScheduleStats } from "@/lib/wbs/schedule-stats";
import { enumList, limit, obj, optBool, optString, summarize } from "./args";
import { termGuide } from "./term-dictionary";
import type { ChatTool } from "./types";

type ListWbsArgs = { level?: 1 | 2 | 3 | 4; status?: string[]; assigneeId?: string; delayedOnly?: boolean; keyword?: string; limit: number };

const fmt = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : null);

export const listWbsTool: ChatTool<ListWbsArgs> = {
  name: "list_wbs",
  description:
    "WBS 항목(일정 계획)을 조회한다. 레벨(1 대분류~4 단위업무), 상태, 담당자, 지연 여부, 이름 키워드로 거른다. " +
    "level 은 사용자가 레벨(대분류·중분류 등)을 말했을 때만 넣는다. 없으면 전체 레벨을 조회한다. " +
    `상태 값: ${termGuide("taskStatus")}`,
  parameters: {
    type: "object",
    properties: {
      level: { type: "integer", enum: [1, 2, 3, 4] },
      status: { type: "array", items: { type: "string" } },
      assigneeId: { type: "string", description: "find_people 로 찾은 사용자 id" },
      delayedOnly: { type: "boolean", description: "마감일이 지났는데 진행률 100 미만인 항목만" },
      keyword: { type: "string" },
      limit: { type: "integer" },
    },
    additionalProperties: false,
  },
  kind: "read",
  parse(args) {
    const a = obj(args);
    const level = a.level;
    if (level !== undefined && ![1, 2, 3, 4].includes(level as number)) throw new Error("level 은 1~4 입니다.");
    return {
      level: level as ListWbsArgs["level"],
      status: enumList(a.status, "taskStatus", "status"),
      assigneeId: optString(a.assigneeId),
      delayedOnly: optBool(a.delayedOnly),
      keyword: optString(a.keyword),
      limit: limit(a.limit),
    };
  },
  async execute(ctx, a) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await ctx.prisma.wbsItem.findMany({
      where: {
        projectId: ctx.projectId,
        ...(a.level ? { level: `LEVEL${a.level}` as "LEVEL1" } : {}),
        ...(a.status ? { status: { in: a.status as never[] } } : {}),
        ...(a.assigneeId ? { assignees: { some: { userId: a.assigneeId } } } : {}),
        ...(a.keyword ? { name: { contains: a.keyword, mode: "insensitive" as const } } : {}),
        ...(a.delayedOnly ? { endDate: { lt: today }, progress: { lt: 100 } } : {}),
        ...(a.delayedOnly && !a.status ? { status: { notIn: ["CANCELLED", "COMPLETED"] as never[] } } : {}),
      },
      select: {
        code: true, name: true, level: true, status: true, progress: true, startDate: true, endDate: true,
        assignees: { select: { user: { select: { name: true } } } },
      },
      orderBy: { code: "asc" },
      take: a.limit,
    });
    const out = rows.map((r) => ({
      code: r.code, name: r.name, level: r.level, status: r.status, progress: r.progress,
      startDate: fmt(r.startDate), endDate: fmt(r.endDate),
      assignees: r.assignees.map((x) => x.user.name).filter(Boolean).join(", "),
    }));
    return { kind: "data", summary: summarize(a.delayedOnly ? "지연 WBS" : "WBS", out), rows: out };
  },
};

export const wbsScheduleStatsTool: ChatTool<Record<string, never>> = {
  name: "wbs_schedule_stats",
  description: "프로젝트 WBS 의 계획 진척률, 실적 진척률, 지연율, 달성률, 작업일(경과/남은)을 화면과 같은 산식으로 계산한다. 진도율·지연율 질문에는 반드시 이 도구를 쓴다.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  kind: "read",
  parse: () => ({}),
  async execute(ctx) {
    const s = await loadWbsScheduleStats(ctx.prisma, ctx.projectId);
    if (!s) return { kind: "error", message: "프로젝트를 찾을 수 없습니다." };
    if (!s.wbs) return { kind: "error", message: s.message };
    const w = s.wbs;
    const summary =
      `계획 진척률 ${w.plannedProgress}%, 실적 진척률 ${w.actualProgress}%, 지연율 ${w.delayRate}%p, 달성률 ${w.achievementRate}% ` +
      `(말단 ${w.total}건 중 완료 ${w.completed}, 진행 ${w.inProgress}, 지연 ${w.delayed}; 작업일 ${s.schedule.elapsedWorkingDays}/${s.schedule.workingDays})`;
    return { kind: "data", summary, rows: [{ ...w, ...s.schedule }] };
  },
};
