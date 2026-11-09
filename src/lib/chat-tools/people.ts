/**
 * @file src/lib/chat-tools/people.ts
 * @description
 * 현재 프로젝트 구성원 안에서 사람을 이름으로 찾는 채팅 도구(find_people)와, 쓰기 제안이 쓰는 resolvePerson 입니다.
 *
 * 초보자 가이드:
 * - 조회 대상은 team_members 의 사용자뿐이다 (다른 프로젝트 사람은 후보가 되지 않는다).
 * - 오타·호칭은 fuzzy.ts 의 matchPeople 이 흡수한다.
 */

import { matchPeople, type PeopleMatch } from "./fuzzy";
import type { ChatTool, ToolContext } from "./types";

async function projectPeople(ctx: ToolContext): Promise<{ id: string; name: string; email: string }[]> {
  const members = await ctx.prisma.teamMember.findMany({
    where: { projectId: ctx.projectId },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  return members.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.email, email: m.user.email }));
}

/** 이름(오타 포함)으로 프로젝트 구성원을 찾는다 */
export async function resolvePerson(ctx: ToolContext, query: string): Promise<PeopleMatch> {
  return matchPeople(query, await projectPeople(ctx));
}

export const findPeopleTool: ChatTool<{ query: string }> = {
  name: "find_people",
  description:
    "프로젝트 구성원을 이름으로 찾는다. 오타·호칭(님, 맴버)이 있어도 비슷한 사람을 후보와 점수로 돌려준다. " +
    "질문에 사람 이름이 나오면 다른 도구를 쓰기 전에 이 도구로 정확한 사람(id)을 확인한다.",
  parameters: {
    type: "object",
    properties: { query: { type: "string", description: "사람 이름 또는 일부" } },
    required: ["query"],
    additionalProperties: false,
  },
  kind: "read",
  parse(args) {
    const query = typeof (args as { query?: unknown })?.query === "string" ? (args as { query: string }).query.trim() : "";
    if (!query) throw new Error("query(사람 이름)가 필요합니다.");
    return { query };
  },
  async execute(ctx, { query }) {
    const r = await resolvePerson(ctx, query);
    const list = r.matches.map((m) => `${m.name}(${Math.round(m.score * 100)}%)`).join(", ");
    const summary =
      r.status === "unique" ? `"${query}" → ${r.matches[0].name}` :
      r.status === "ambiguous" ? `"${query}" 후보 여러 명: ${list}` :
      `"${query}" 와 맞는 구성원 없음${list ? ` (비슷한 이름: ${list})` : ""}`;
    return { kind: "data", summary, rows: r.matches.map((m) => ({ id: m.id, name: m.name, score: m.score, status: r.status })) };
  },
};
