/**
 * @file src/app/dashboard/wbs/components/WbsTreeAlignment.test.ts
 * @description WBS 표의 머리 칸과 행 칸 너비가 같은지, 크기조절 바를 움직여도 칸이 밀리지 않는 조건을 소스로 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀(2026-11-10): 항목명 칸이 flex-1 에 min-w-0 이 없어 이름 길이만큼 뒤 칸을 밀었고, 패널을 줄이면 칸이 제각각 움직였다.
 * - 규칙: 머리 · 행의 고정 칸 너비 순서가 같다, 항목명은 flex-1 min-w-0, 표는 최소 너비 + 가로 스크롤, 머리 · 목록 모두 스크롤바 자리 확보.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "src", "app", "dashboard", "wbs", "components");
const panel = readFileSync(join(dir, "WbsTreePanel.tsx"), "utf8");
const item = readFileSync(join(dir, "WbsTreeItem.tsx"), "utf8");

const widths = (src: string) => [...src.matchAll(/className="(w-\d+)\b[^"]*(?:flex-shrink-0|flex justify-center)[^"]*"/g)].map((m) => m[1]);

describe("WBS 표 칸 정렬", () => {
  it("머리 칸과 행 칸의 고정 너비가 같은 순서 · 같은 값이다", () => {
    const header = panel.slice(panel.indexOf("{/* 헤더 */}"), panel.indexOf("{/* WBS 트리 목록 */}"));
    const row = item.slice(item.indexOf("{/* 계획 기간 */}"));
    const h = widths(header);
    expect(h).toEqual(["w-40", "w-32", "w-16", "w-16", "w-14", "w-14", "w-24"]);
    expect(widths(row).filter((w) => w !== "w-10").slice(0, h.length)).toEqual(h);
  });

  it("항목명 칸은 줄어들 수 있고(min-w-0) 표는 최소 너비 + 가로 스크롤로 칸을 지킨다", () => {
    expect(item).toContain("flex-1 min-w-0 text-sm font-medium");
    expect(panel).toMatch(/overflow-x-auto[\s\S]*min-w-\[\d+px\]/);
    expect(panel.match(/\[scrollbar-gutter:stable\]/g)?.length).toBeGreaterThanOrEqual(2);
    expect(item).toContain("flex items-center pr-3");
  });
});
