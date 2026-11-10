/**
 * @file src/lib/chat-tools/to-be.ts
 * @description 채팅 읽기 도구: TO-BE 설계 검색(search_to_be)과 Gap 요약(to_be_gap).
 *
 * 초보자 가이드:
 * 1. 프로젝트는 서버가 정한 ctx.projectId 만 쓴다 (모델이 고를 수 없다). DB 는 ctx.prisma
 * 2. search_to_be: 업무명 · 중분류 · 개선 요약 · 번호 · AS-IS · SFR 코드로 찾고, 한 줄에 AS-IS · SFR 적용 진행 · WBS · 개선 매핑을 모은다
 * 3. to_be_gap: TO-BE 화면의 Gap 분석 탭과 같은 계산 (유지 · 폐지는 SFR · WBS 미연결에서 뺀다)
 * 4. 긴 글은 잘라서 돌려준다 (채팅 응답 크기 제한)
 */
import { CHANGE_TYPE_LABEL, FIX_RESULT_LABEL, STATUS_LABEL, TARGET_METHOD_LABEL, WBS_STATUS_LABEL } from "@/lib/to-be/labels";
import { buildGap, buildTrace, loadSnapshot } from "@/lib/to-be/to-be-trace-service";
import type { ChatTool } from "./types";

interface SearchArgs { keyword: string | null; changeType: keyof typeof CHANGE_TYPE_LABEL | null; limit: number }

const cut = (t: string | null | undefined, n: number) => (!t ? "" : t.length > n ? `${t.slice(0, n)}…` : t);
const obj = (a: unknown) => (a && typeof a === "object" ? (a as Record<string, unknown>) : {});

export const searchToBeTool: ChatTool<SearchArgs> = {
  name: "search_to_be",
  description: "현재 프로젝트의 TO-BE 설계(미래 업무)를 찾는다. 업무명 · 중분류 · 개선 요약 · TO-BE 번호(TB-012) · AS-IS 번호 · SFR 코드로 검색하고, 각 업무의 변화 유형 · 목표 방식 · 개선 요약 · 연결 AS-IS · SFR 적용 진행 · 구현 WBS · 개선 매핑(AS-IS 문제점 → 해결)을 돌려준다. '절곡 실적 TO-BE 가 뭐야?' 같은 질문에 쓴다. 비어 있는 곳(Gap)은 to_be_gap 을 쓴다.",
  parameters: {
    type: "object",
    properties: {
      keyword: { type: ["string", "null"], description: "검색어. 없으면 null (전체)" },
      changeType: { type: ["string", "null"], enum: ["NEW", "IMPROVE", "KEEP", "RETIRE", null], description: "변화 유형 필터. 지정하지 않으면 null" },
      limit: { type: "integer", description: "최대 행 수 (기본 15, 최대 40)" },
    },
    additionalProperties: false,
  },
  kind: "read",
  parse(args) {
    const a = obj(args);
    const keyword = typeof a.keyword === "string" && a.keyword.trim() ? a.keyword.trim().slice(0, 100) : null;
    const changeType = a.changeType == null ? null : String(a.changeType);
    if (changeType && !(changeType in CHANGE_TYPE_LABEL)) throw new Error("변화 유형은 NEW · IMPROVE · KEEP · RETIRE 중 하나입니다.");
    const n = Number(a.limit ?? 15);
    return { keyword, changeType: changeType as SearchArgs["changeType"], limit: Number.isFinite(n) ? Math.min(40, Math.max(1, Math.trunc(n))) : 15 };
  },
  async execute(ctx, a) {
    const snapshot = await loadSnapshot(ctx.projectId, ctx.prisma);
    const byId = new Map(snapshot.items.map((t) => [t.id, t]));
    const words = (a.keyword ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const rows = buildTrace(snapshot).filter((r) => r.toBe).filter((r) => {
      const t = byId.get(r.toBe!.id)!;
      if (a.changeType && t.changeType !== a.changeType) return false;
      const text = [t.toBeManagementNo, t.taskName, t.middleCategory, t.summary, ...t.sfrCodes, ...r.asIs.map((x) => `${x.no ?? ""} ${x.taskName}`)].join(" ").toLowerCase();
      return words.every((w) => text.includes(w));
    });
    if (snapshot.items.length === 0) return { kind: "data", summary: "이 프로젝트에는 아직 TO-BE 설계가 없습니다.", rows: [] };
    const shown = rows.slice(0, a.limit);
    return {
      kind: "data",
      summary: `TO-BE ${snapshot.items.length}건 중 조건에 맞는 ${rows.length}건${rows.length > shown.length ? `, ${shown.length}건 표시` : ""}`,
      rows: shown.map((r) => {
        const t = byId.get(r.toBe!.id)!;
        return {
          번호: t.toBeManagementNo, 업무명: t.taskName, 중분류: t.middleCategory,
          변화유형: CHANGE_TYPE_LABEL[t.changeType], 목표방식: TARGET_METHOD_LABEL[t.targetMethod], 상태: STATUS_LABEL[t.status],
          개선요약: cut(t.summary, 300),
          AS_IS: r.asIs.map((x) => `${x.no ?? ""} ${x.taskName}`.trim()).join(", "),
          SFR: r.sfr.map((f) => `${f.code} ${f.label}${f.total ? ` (적용 ${f.applied}/${f.total}, 검증 ${f.verified})` : " (기능추적표에 없음)"}`).join("; "),
          WBS: r.wbs.map((w) => `${w.code} ${w.name} (${WBS_STATUS_LABEL[w.status] ?? w.status} ${w.progress}%)`).join("; "),
          개선매핑: t.fixes.map((f) => `${cut(f.issueTitle, 80)} → ${cut(f.solution, 120)} [${FIX_RESULT_LABEL[f.result]}]`).join("; "),
        };
      }),
    };
  },
};

export const toBeGapTool: ChatTool<Record<string, never>> = {
  name: "to_be_gap",
  description: "현재 프로젝트 TO-BE 설계의 빈 곳(Gap)을 요약한다: ① TO-BE 가 없는 AS-IS 업무 ② 해결 안 된 AS-IS 문제점 ③ SFR 이 없는 TO-BE ④ WBS 가 없는 TO-BE (③ · ④ 는 유지 · 폐지 제외). 'TO-BE 에서 빠진 게 뭐야?' 같은 질문에 쓴다.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  kind: "read",
  parse: () => ({}),
  async execute(ctx) {
    const gap = buildGap(await loadSnapshot(ctx.projectId, ctx.prisma));
    const ref = (x: { no: string | null; taskName: string }) => `${x.no ?? ""} ${x.taskName}`.trim();
    const rows = [
      ...gap.asIsWithoutToBe.map((x) => ({ 구분: "① TO-BE 없는 AS-IS", 대상: ref(x), 내용: x.middleCategory })),
      ...gap.unresolvedIssues.map((u) => ({
        구분: "② 해결 안 된 문제점", 대상: u.toBe ? ref(u.toBe) : u.asIs.map(ref).join(", "),
        내용: `${cut(u.title, 120)} [${u.state === "NO_FIX" ? "해결 방안 없음" : FIX_RESULT_LABEL[u.state]}]`,
      })),
      ...gap.toBeWithoutSfr.map((x) => ({ 구분: "③ SFR 없는 TO-BE", 대상: ref(x), 내용: CHANGE_TYPE_LABEL[x.changeType] })),
      ...gap.toBeWithoutWbs.map((x) => ({ 구분: "④ WBS 없는 TO-BE", 대상: ref(x), 내용: CHANGE_TYPE_LABEL[x.changeType] })),
    ];
    return {
      kind: "data",
      summary: `AS-IS ${gap.totals.asIs}건 · TO-BE ${gap.totals.toBe}건(구현 대상 ${gap.totals.target}건). ① ${gap.asIsWithoutToBe.length}건 ② ${gap.unresolvedIssues.length}건 ③ ${gap.toBeWithoutSfr.length}건 ④ ${gap.toBeWithoutWbs.length}건`,
      rows: rows.slice(0, 60),
    };
  },
};

export const TO_BE_TOOLS = [searchToBeTool, toBeGapTool];
