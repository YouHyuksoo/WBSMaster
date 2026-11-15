/**
 * @file scripts/no-hardcoded-input-files.test.ts
 * @description
 * scripts/ 의 가져오기 스크립트가 엑셀·CSV 입력 파일을 코드에 박아 두지 못하게 막는 검사입니다.
 * 2026-11-16 에 `D:/Download/...xlsx`, 바탕화면 경로, 저장소에 커밋된 원본 엑셀을 읽던
 * 일회성 스크립트 10개를 지웠고, 같은 유형이 다시 들어오면 이 테스트가 실패합니다.
 *
 * 초보자 가이드:
 * 1. **올바른 방식**: 파일 경로·프로젝트 ID 는 실행 인자로 받고, `--apply` 없이는 미리보기만 한다
 *    (참고: `scripts/import-pole-equipment.ts`).
 * 2. **금지**: 코드 안의 `"<이름>.xlsx"` 같은 파일명, `"Desktop"`·`"Downloads"` 경로,
 *    저장소 루트·scripts/ 에 둔 원본 엑셀·CSV (공개 저장소라 고객 자료가 노출된다).
 * 3. 주석과 `*.test.*` 파일은 검사하지 않는다(사용 예시·가짜 파일명 허용).
 * 4. 이 검사를 느슨하게 하지 말고 스크립트를 인자 방식으로 고친다.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");
const SCRIPTS = join(ROOT, "scripts");
const CODE_FILE = /\.(ts|mjs|js|cjs)$/;
const DATA_FILE = /\.(xlsx|xls|csv)$/i;

const RULES: { name: string; pattern: RegExp }[] = [
  { name: "엑셀·CSV 파일명 고정", pattern: /["'`][^"'`\n]+\.(xlsx|xls|csv)["'`]/i },
  { name: "바탕화면·다운로드 폴더 고정", pattern: /["'`](Desktop|Downloads?)["'`]/ },
  { name: "드라이브 경로의 다운로드·바탕화면 폴더", pattern: /[A-Za-z]:[\\/]+(Downloads?|Desktop)\b/i },
];

/** 주석 줄을 빼고 규칙에 걸리는 줄을 "줄번호: 규칙" 형태로 돌려준다. */
export function findHardcodedInputs(source: string): string[] {
  return source.split(/\r?\n/).flatMap((line, i) => {
    if (/^\s*(\*|\/\/|\/\*)/.test(line)) return [];
    return RULES.filter((r) => r.pattern.test(line)).map((r) => `${i + 1}: ${r.name}`);
  });
}

describe("scripts 입력 파일 하드코딩 금지", () => {
  it("지운 스크립트의 예전 패턴을 잡아낸다", () => {
    const old = [
      'const excelPath = "D:/Download/2_1_4.이슈리스트.xlsx";',
      'const xlsxPath = path.join(process.cwd(), "11.xlsx");',
      'const filePath = path.join(os.homedir(), "Desktop", source.fileName);',
      'const FILE_PATH = "D:\\\\Download\\\\요청사항정의.xlsx";',
    ].join("\n");
    // 1·4번 줄은 파일명과 다운로드 경로 두 규칙에 모두 걸린다.
    expect(findHardcodedInputs(old)).toEqual([
      "1: 엑셀·CSV 파일명 고정",
      "1: 드라이브 경로의 다운로드·바탕화면 폴더",
      "2: 엑셀·CSV 파일명 고정",
      "3: 바탕화면·다운로드 폴더 고정",
      "4: 엑셀·CSV 파일명 고정",
      "4: 드라이브 경로의 다운로드·바탕화면 폴더",
    ]);
  });

  it("인자 방식과 주석은 허용한다", () => {
    const ok = [
      ' * npx tsx scripts/import-x.ts "D:\\\\Download\\\\설비정보.xlsx"',
      'const source = process.argv.find(arg => arg.endsWith(".xlsx"));',
    ].join("\n");
    expect(findHardcodedInputs(ok)).toEqual([]);
  });

  it("scripts/ 코드에 입력 파일 하드코딩이 없다", () => {
    const hits = readdirSync(SCRIPTS)
      .filter((f) => CODE_FILE.test(f) && !/\.test\./.test(f))
      .flatMap((f) =>
        findHardcodedInputs(readFileSync(join(SCRIPTS, f), "utf8")).map((h) => `scripts/${f}:${h}`),
      );
    expect(hits).toEqual([]);
  });

  it("저장소 루트와 scripts/ 에 원본 엑셀·CSV 를 두지 않는다", () => {
    const files = [
      ...readdirSync(ROOT).filter((f) => DATA_FILE.test(f)),
      ...readdirSync(SCRIPTS).filter((f) => DATA_FILE.test(f)).map((f) => `scripts/${f}`),
    ];
    expect(files).toEqual([]);
  });
});
