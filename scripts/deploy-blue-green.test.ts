/**
 * @file scripts/deploy-blue-green.test.ts
 * @description
 * 운영 배포 스크립트 · 워크플로의 깨지기 쉬운 약속을 검사합니다.
 *
 * 초보자 가이드:
 * - 서버의 Windows PowerShell 5.1 은 BOM 없는 .ps1 을 CP949 로 읽어 한글 문자열이 깨지고 문법 오류가 난다 → BOM 필수.
 * - 워크플로는 배포할 커밋에서 스크립트를 꺼내 실행하고, 서비스 중인 폴더를 git reset 하거나 서버를 먼저 멈추지 않아야 한다.
 * - 스크립트의 외부 명령은 Invoke-Native(종료 코드 확인)로 불러야 한다. 실패가 전환까지 흘러가면 장애가 난다.
 * - npm ci 는 package-lock · node 버전이 지난 설치와 같으면 건너뛴다 (2026-11-19 A 폴더 설치 12분).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");
const script = readFileSync(path.join(root, "scripts", "deploy-blue-green.ps1"));
const text = script.toString("utf8");
const workflow = readFileSync(path.join(root, ".github", "workflows", "deploy.yml"), "utf8");

describe("배포 스크립트", () => {
  it("UTF-8 BOM 으로 저장되어 있다 (PowerShell 5.1 한글)", () => {
    expect([...script.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("npm · npx · git · pm2 start/save 는 종료 코드를 확인하는 Invoke-Native 로 부른다", () => {
    const raw = text.split("\n").filter((l) => /^\s*&?\s*(npm|npx|git)\s/.test(l) || /^\s*&?\s*pm2\s+(start|save)/.test(l));
    expect(raw).toEqual([]);
    expect(text).toMatch(/Invoke-Native npm @\('ci', '--no-audit', '--no-fund'\)/);
    expect(text).toMatch(/Invoke-Native npx @\('prisma', 'migrate', 'status'\)/);
  });

  it("전환 전에 사전 점검을 하고, 실패하면 이전 폴더로 되돌린다", () => {
    expect(text.indexOf("사전 점검")).toBeLessThan(text.indexOf("pm2 delete"));
    expect(text).toContain("이전 폴더($active)로 되돌립니다");
  });
});

describe("배포 스크립트 의존성 설치", () => {
  it("package-lock · node 버전이 지난 설치와 같으면 npm ci 를 건너뛰고, 표시는 설치 성공 뒤에만 쓴다", () => {
    const ci = text.indexOf("Invoke-Native npm @('ci'");
    const stampWrite = text.indexOf("Set-Content -Path $depsStamp");
    expect(text).toContain("ReadAllBytes((Join-Path $target 'package-lock.json'))");
    expect(text).not.toMatch(/^\s*[^#\s].*Get-FileHash/m); // 5.1 에서 모듈을 못 찾는 경우가 있다
    expect(text).toContain("node $(& node --version)");
    expect(text.indexOf("Test-Path $depsStamp")).toBeLessThan(ci);
    expect(ci).toBeLessThan(stampWrite);
    // 표시는 npm ci 가 지우는 node_modules 안에 둔다 (실패한 설치에 표시가 남지 않게)
    expect(text).toContain("$depsStamp = 'node_modules\\.wbs-deps-stamp'");
  });
});

describe("배포 워크플로", () => {
  it("배포할 커밋에서 스크립트를 꺼내 실행하고 서비스 폴더를 먼저 멈추거나 reset 하지 않는다", () => {
    expect(workflow).toContain("git show ${{ github.sha }}:scripts/deploy-blue-green.ps1");
    expect(workflow).not.toMatch(/git reset --hard/);
    expect(workflow).not.toMatch(/pm2 stop/);
    expect(workflow).toMatch(/concurrency:/);
  });
});
