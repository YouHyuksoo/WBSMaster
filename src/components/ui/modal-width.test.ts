/**
 * @file src/components/ui/modal-width.test.ts
 * @description
 * 글 입력칸(textarea)이 있는 모달이 좁은 폭 · 고정 높이로 글자를 자르지 않는지 소스를 읽어 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: 일정 수정 · 이슈 수정 · AS-IS 항목 추가 등 많은 모달이 max-w-md/lg 폭에 rows={2} resize-none 설명칸이라
 *   긴 설명이 잘리고 칸 안에서만 겨우 스크롤됐다.
 * - 규칙 1: 직접 만든 모달(fixed inset-0 + 상자) 안에 textarea 가 있으면 상자 폭은 max-w-3xl 이상
 * - 규칙 2: 모달 안 textarea 는 field-sizing-content (내용만큼 늘어남, 최대 높이는 각자 지정)
 * - 규칙 3: 공용 <Modal> 을 쓰는 파일에 textarea 가 있으면 size 는 lg · xl · full
 * - 참고 구현: src/app/dashboard/holidays/components/HolidayModal.tsx
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const WIDE = /max-w-(3xl|4xl|5xl|6xl|7xl|full|screen|\[)/;
const ANY_MAX_W = /max-w-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|screen|\[[^\]]+\])/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((f) => ({ name: relative(process.cwd(), f).replace(/\\/g, "/"), src: readFileSync(f, "utf8") }));

/** 직접 만든 모달 덩어리: fixed inset-0 줄부터 다음 fixed inset-0 (최대 300줄) 까지 */
function handRolledModals(src: string) {
  const lines = src.split(/\r?\n/);
  const out: Array<{ line: number; width: string | null; body: string }> = [];
  lines.forEach((l, i) => {
    if (!l.includes("fixed inset-0")) return;
    // 오버레이 div · 주석이 끼어도 상자를 찾도록 12줄까지 본다 (5줄일 때 MilestoneModal 등이 빠졌다)
    const head = lines.slice(i, i + 12).join("\n");
    const width = head.match(ANY_MAX_W)?.[0] ?? null;
    let end = Math.min(i + 300, lines.length);
    for (let k = i + 1; k < end; k++) if (lines[k].includes("fixed inset-0")) { end = k; break; }
    out.push({ line: i + 1, width, body: lines.slice(i, end).join("\n") });
  });
  return out;
}

/** 덩어리 안 textarea 태그 전체 (onChange 의 => 에서 끊기지 않게 /> 또는 </textarea> 까지) */
const textareas = (body: string) => [...body.matchAll(/<textarea\b[\s\S]*?(?:\/>|<\/textarea>)/g)].map((m) => m[0]);

/** textarea 가 내용만큼 늘어나는가: 태그에 직접, 또는 태그가 쓰는 같은 파일 상수에 field-sizing-content */
function grows(tag: string, fileSrc: string): boolean {
  if (tag.includes("field-sizing-content")) return true;
  const names = [...tag.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}|className=\{([A-Z_][A-Z0-9_]*)\}/g)].map((m) => m[1] ?? m[2]);
  return names.some((n) => new RegExp(`const ${n}\\s*=\\s*[\`"][^\`"]*field-sizing-content`).test(fileSrc));
}

describe("모달 폭 · 글 입력칸", () => {
  it("textarea 가 있는 직접 만든 모달은 max-w-3xl 이상", () => {
    const bad = files.flatMap((f) =>
      handRolledModals(f.src)
        .filter((m) => m.width && textareas(m.body).length > 0 && !WIDE.test(m.width))
        .map((m) => `${f.name}:${m.line} (${m.width})`)
    );
    expect(bad, "모달 상자를 max-w-3xl 이상으로 넓힌다 (HolidayModal.tsx 참고)").toEqual([]);
  });

  it("모달 안 textarea 는 field-sizing-content 로 내용만큼 늘어난다", () => {
    const bad = files.flatMap((f) =>
      handRolledModals(f.src).flatMap((m) =>
        textareas(m.body).filter((t) => !grows(t, f.src)).map(() => `${f.name}:${m.line}`)
      )
    );
    expect([...new Set(bad)], "textarea className 에 field-sizing-content min-h-* max-h-[..vh] resize-y").toEqual([]);
  });

  it("공용 <Modal> 안에 textarea 가 있으면 size 는 lg · xl · full", () => {
    const bad = files
      .filter((f) => /<Modal\b/.test(f.src) && /<textarea\b/.test(f.src))
      .filter((f) => [...f.src.matchAll(/<Modal\b[\s\S]*?>/g)].some((m) => !/size="(lg|xl|full)"/.test(m[0])))
      .map((f) => f.name);
    expect(bad).toEqual([]);
  });

  it("공용 <Modal> 안 textarea 도 field-sizing-content", () => {
    const bad = files
      .filter((f) => /<Modal\b/.test(f.src))
      .filter((f) => textareas(f.src).some((t) => !grows(t, f.src)))
      .map((f) => f.name);
    expect(bad).toEqual([]);
  });
});
