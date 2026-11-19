/**
 * @file src/lib/query-refresh.test.ts
 * @description
 * mutation 훅 밖에서 서버 데이터를 바꾼 뒤 화면 캐시를 새로 고치는지 확인합니다.
 *
 * 초보자 가이드:
 * - refreshAfterServerWrite: 떠 있지 않은 캐시는 지우고(다음에 열 때 새로 받음), 떠 있는 조회는 다시 받는다.
 * - 구조 검사: 화면 코드(src/app/dashboard, src/components)에서 직접 fetch 로 POST · PATCH · PUT · DELETE 하는 파일은
 *   refreshAfterServerWrite(또는 invalidateQueries · setQueryData)를 써야 한다.
 *   안 쓰면 새로고침 전까지 예전 목록이 보인다 (2026-11-19 AI 로 일정 등록 후 달력에 안 보인 사례).
 * - 예외는 React Query 캐시를 쓰지 않는 파일만 ALLOWED 에 이유와 함께 둔다.
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { refreshAfterServerWrite } from "./query-refresh";

describe("refreshAfterServerWrite", () => {
  it("떠 있지 않은 캐시는 지우고, 떠 있는 조회는 다시 받는다", async () => {
    const client = new QueryClient();
    // 지금 화면에 없는 일정 목록 캐시
    client.setQueryData(["holidays", "list"], [{ id: "old" }]);
    // 지금 화면에 떠 있는 조회 (관찰자가 붙어 있음)
    client.setQueryData(["projects"], ["old"]);
    const fetchActive = vi.fn(async () => ["new"]);
    const obs = new QueryObserver(client, { queryKey: ["projects"], queryFn: fetchActive, staleTime: Infinity });
    const stop = obs.subscribe(() => {});

    await refreshAfterServerWrite(client);

    expect(client.getQueryData(["holidays", "list"])).toBeUndefined();
    expect(fetchActive).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(["projects"])).toEqual(["new"]);
    stop();
  });
});

/** React Query 캐시를 쓰지 않아 새로 고칠 캐시가 없는 파일 (이유) */
const ALLOWED: Record<string, string> = {
  "src/app/dashboard/chat/history/page.tsx": "피드백 상태만 바꾼다, 자체 목록 상태",
  "src/app/dashboard/chat/hooks/realtime-speech.ts": "음성 합성 요청",
  "src/app/dashboard/chat/hooks/useChatSuggestions.ts": "추천 질문 조회",
  "src/app/dashboard/chat/hooks/useOpenAIVoice.ts": "음성 전사 요청",
  "src/app/dashboard/discussion-items/page.tsx": "자체 상태 + fetchItems 로 다시 읽는다",
  "src/app/dashboard/kanban/components/WorkloadAnalysis.tsx": "부하 분석 요청, 자체 상태",
  "src/app/dashboard/members/page.tsx": "아바타 파일 업로드만 한다",
  "src/app/dashboard/process-verification/page.tsx": "자체 상태 + 다시 읽기",
  "src/app/dashboard/settings/components/AudioMeetingSettings.tsx": "설정 화면 자체 상태",
  "src/app/dashboard/settings/components/ChatGptConnection.tsx": "설정 화면 자체 상태",
  "src/app/dashboard/settings/page.tsx": "설정 화면 자체 상태",
  "src/app/dashboard/slack/page.tsx": "설정 화면 자체 상태",
  "src/app/dashboard/users/components/UserFormModal.tsx": "아바타 파일 업로드만 한다",
  "src/app/dashboard/weekly-report/components/AiWriteModal.tsx": "AI 분류 요청만 한다 (저장은 대기 항목 확정 때 훅으로)",
};

const root = path.resolve(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("직접 fetch 로 데이터를 바꾸는 화면 코드", () => {
  const files = [...walk(path.join(root, "src", "app", "dashboard")), ...walk(path.join(root, "src", "components"))];
  const writers = files
    .map((f) => ({ rel: path.relative(root, f).replace(/\\/g, "/"), text: readFileSync(f, "utf8") }))
    .filter(({ text }) => /\bfetch\(/.test(text) && /method:\s*["'](POST|PATCH|PUT|DELETE)["']/.test(text));

  it("화면 캐시를 새로 고친다 (refreshAfterServerWrite · invalidateQueries · setQueryData)", () => {
    const missing = writers
      .filter(({ rel }) => !ALLOWED[rel])
      .filter(({ text }) => !/refreshAfterServerWrite|invalidateQueries|setQueryData/.test(text))
      .map(({ rel }) => rel);
    expect(missing).toEqual([]);
  });

  it("예외 목록에 지워진 파일이 남아 있지 않다", () => {
    const rels = new Set(files.map((f) => path.relative(root, f).replace(/\\/g, "/")));
    expect(Object.keys(ALLOWED).filter((rel) => !rels.has(rel))).toEqual([]);
  });

  it("AI 확인 카드 · 공통 엑셀 가져오기 · AI 채팅 엑셀 등록은 refreshAfterServerWrite 를 부른다", () => {
    for (const rel of [
      "src/app/dashboard/chat/components/ConfirmActionCard.tsx",
      "src/components/common/ImportExcelModal.tsx",
      "src/app/dashboard/chat/page.tsx",
    ]) {
      expect(readFileSync(path.join(root, rel), "utf8"), rel).toMatch(/refreshAfterServerWrite\(/);
    }
  });
});
