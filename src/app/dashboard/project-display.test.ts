/**
 * @file src/app/dashboard/project-display.test.ts
 * @description
 * 프로젝트는 상단 내비게이션(DashboardHeader)에만 표시 · 선택하고, 화면들은 그 선택을 따라가는지 소스를 읽어 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: 고객요구사항 · 이슈 · WBS · 칸반 등 16개 화면 머리에 상단 내비와 같은 프로젝트 배지가 또 있었고,
 *   AI 어시스턴트는 화면 안에 따로 프로젝트 선택 상자가 있어 상단 선택과 어긋날 수 있었다 (2026-11-09 제거).
 * - 규칙 1: 화면 JSX 에 {selectedProject.name} 을 글자로 그리지 않는다 (projectName={...} 처럼 넘기는 값은 허용)
 * - 규칙 2: 화면 안에서 projects.map 으로 프로젝트 선택 상자를 만들지 않는다
 * - 예외는 아래 목록에 이유와 함께 적는다.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const DASHBOARD = join(process.cwd(), "src", "app", "dashboard");

/** 프로젝트 목록을 다뤄도 되는 화면: 이유 */
const PROJECT_LIST_ALLOWED: Record<string, string> = {
  "chat/history/page.tsx": "관리자 채팅 분석: 여러 프로젝트 기록을 거르는 필터",
  "projects/page.tsx": "프로젝트 관리 화면 자체",
  "users/page.tsx": "사용자/프로젝트 관리 화면 자체",
  "page.tsx": "대시보드 홈: 프로젝트 카드 목록",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".tsx") && !name.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

const files = walk(DASHBOARD).map((f) => ({
  name: relative(DASHBOARD, f).replace(/\\/g, "/"),
  src: readFileSync(f, "utf8"),
}));

describe("프로젝트 표시는 상단 내비게이션만", () => {
  it("화면이 선택 프로젝트 이름을 따로 그리지 않는다", () => {
    const bad = files.flatMap((f) =>
      f.src
        .split(/\r?\n/)
        .map((line, i) => ({ line, no: i + 1 }))
        .filter(({ line }) => /\{\s*(page\.)?selectedProject\??\.name\s*\}/.test(line) && !/\w+=\{\s*(page\.)?selectedProject/.test(line))
        .map(({ no }) => `${f.name}:${no}`)
    );
    expect(bad, "프로젝트 배지를 지운다 (상단 내비게이션이 기준)").toEqual([]);
  });

  it("화면 안에 프로젝트 선택 상자를 만들지 않는다", () => {
    const bad = files
      .filter((f) => !PROJECT_LIST_ALLOWED[f.name] && !f.name.startsWith("projects/") && !f.name.startsWith("users/"))
      .filter((f) => /projects\??\.map\(/.test(f.src))
      .map((f) => f.name);
    expect(bad, "useProject() 의 selectedProjectId 를 쓴다").toEqual([]);
  });
});
