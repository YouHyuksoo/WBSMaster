/**
 * @file src/lib/design-rules/pastel-ratchet.test.ts
 * @description
 * 파스텔 단색 배경(bg-{색}-50/100/200)이 새로 늘어나지 못하게 막는 검사입니다.
 * 사용자 지시: "AI 티 나는 파스텔 색을 쓰지 않는다". 규칙 문서: docs/design/list-page-style.md 7-1.
 *
 * 초보자 가이드:
 * - 배지 · 칩 배경은 반투명 토큰 `bg-{색}-500/10` + 글자 `text-{색}-600 dark:text-{색}-400` 을 쓴다.
 * - 기존 코드에 남은 파스텔은 pastel-baseline.json 에 파일별 개수로 기록돼 있다 (2026-11-09 기준).
 *   어떤 파일이든 그 개수보다 늘거나, 기록에 없는 파일에 새로 생기면 실패한다.
 * - 파스텔을 지워 개수가 줄었으면 baseline 의 숫자도 줄인다 (늘리면 안 된다).
 */

import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import baseline from "./pastel-baseline.json";

const PASTEL =
  /\bbg-(red|rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|slate|gray|zinc|neutral|stone)-(50|100|200)\b/g;

describe("디자인 규칙: 파스텔 단색 배경 금지", () => {
  it("파스텔 단색 배경이 기준선보다 늘지 않는다", () => {
    const root = path.resolve(__dirname, "../..");
    const allowed = baseline as Record<string, number>;
    const over: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
          const rel = path.relative(root, p).replace(/\\/g, "/");
          const n = (fs.readFileSync(p, "utf8").match(PASTEL) || []).length;
          if (n > (allowed[rel] ?? 0)) over.push(`${rel} (${allowed[rel] ?? 0} → ${n})`);
        }
      }
    };
    walk(root);
    expect(over, `파스텔(bg-색-50/100/200) 대신 bg-{색}-500/10 + text-{색}-600 dark:text-{색}-400 을 쓰세요: ${over.join(", ")}`).toEqual([]);
  });
});
