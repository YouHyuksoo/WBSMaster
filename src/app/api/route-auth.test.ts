/**
 * @file src/app/api/route-auth.test.ts
 * @description
 * 모든 API 라우트 핸들러가 로그인을 확인(requireAuth)하는지 소스를 읽어 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: 설비 · 일정 · 이슈 · 요구사항 등 약 50개 라우트가 로그인 확인 없이 읽기 · 쓰기 · 삭제를 받았다.
 *   (DELETE /api/admin/cleanup-tasks 는 로그인 없이 전체 프로젝트의 태스크를 지울 수 있었다)
 * - 규칙: route.ts 에서 export 한 GET/POST/PUT/PATCH/DELETE 마다 본문에 requireAuth( 가 있어야 한다.
 * - 예외는 아래 PUBLIC 목록에만, 이유와 함께 적는다. 새 라우트를 만들면 이 테스트가 자동으로 검사한다.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const API_DIR = join(process.cwd(), "src", "app", "api");

/** 로그인 없이 열어 두는 핸들러 ("경로 METHOD": 이유) */
const PUBLIC: Record<string, string> = {
  "auth/login POST": "로그인 자체",
  "auth/logout POST": "쿠키 삭제만 한다",
  "auth/me GET": "로그인 여부를 묻는 곳 (비로그인이면 null/401 을 스스로 돌려준다)",
  "uploads/[...path] GET": "업로드 이미지 공개 조회 (AGENTS.md 예외)",
  "users POST": "로그인 화면 회원가입. role · id · 기본 비밀번호는 ADMIN 요청자만 지정 (아래 테스트가 검사)",
};

function findRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...findRoutes(full));
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

/** 파일 안 핸들러별 본문 (다음 export 핸들러 전까지) */
function handlers(src: string): Array<{ method: string; body: string }> {
  const re = /^export async function (GET|POST|PUT|PATCH|DELETE)\b/gm;
  const hits = [...src.matchAll(re)];
  return hits.map((m, i) => ({
    method: m[1],
    body: src.slice(m.index!, hits[i + 1]?.index ?? src.length),
  }));
}

/** 멤버 · 소유자 · ADMIN 확인 흔적 */
const RECORD_GUARD = /assertProjectAccess\(|teamMembers:\s*\{\s*some|role !== "ADMIN"|userId:\s*user!?\.id|userId !== user!?\.id|createdById !== user/;

/** 파일 안(export 아닌) 도우미 함수 중 pattern(기본 RECORD_GUARD)을 품은 것의 이름 */
function guardHelpers(src: string, pattern: RegExp = RECORD_GUARD): string[] {
  const defs = [...src.matchAll(/^(?:async )?function (\w+)\s*\(/gm)];
  return defs
    .filter((m) => {
      const rest = src.slice(m.index!);
      const end = rest.slice(1).search(/^(?:export |async function |function )/m);
      return pattern.test(end < 0 ? rest : rest.slice(0, end + 1));
    })
    .map((m) => m[1]);
}

const cases = findRoutes(API_DIR).flatMap((file) => {
  const route = relative(API_DIR, file).split(sep).slice(0, -1).join("/");
  const src = readFileSync(file, "utf8");
  const helpers = guardHelpers(src);
  const authHelpers = guardHelpers(src, /requireAuth\(/);
  return handlers(src).map((h) => ({ key: `${route} ${h.method}`, body: h.body, dynamic: route.includes("["), helpers, authHelpers }));
});

describe("API 라우트 로그인 확인", () => {
  it("검사 대상 핸들러가 있다", () => {
    expect(cases.length).toBeGreaterThan(100);
  });

  it("PUBLIC 목록의 핸들러가 실제로 있다 (지운 라우트가 예외로 남지 않게)", () => {
    const keys = new Set(cases.map((c) => c.key));
    expect(Object.keys(PUBLIC).filter((k) => !keys.has(k))).toEqual([]);
  });

  it("회원가입(users POST)은 요청 본문의 role 을 관리자 요청일 때만 쓴다", () => {
    const body = cases.find((c) => c.key === "users POST")!.body;
    expect(body).toMatch(/isAdmin \? role \|\| "USER" : "USER"/);
    expect(body).not.toMatch(/role: role \|\| "USER"/);
  });

  it("projectId 를 다루는 핸들러는 프로젝트 멤버를 확인한다 (assertProjectAccess · 멤버 범위 제한 · ADMIN 전용)", () => {
    // 프로젝트를 새로 만드는 곳처럼 멤버 확인 대상이 아닌 핸들러 ("경로 METHOD": 이유)
    const NO_PROJECT_SCOPE: Record<string, string> = {
      "projects POST": "새 프로젝트 생성 (만든 사람이 OWNER 가 된다)",
      "chat GET": "본인 채팅 기록만 (where.userId = user.id)",
      "chat DELETE": "본인 채팅 기록만 (where.userId = user.id)",
      "chat/feedback GET": "본인 피드백만 (userId = user.id)",
      "chat/feedback POST": "본인 채팅 기록에만 피드백 (chatHistory.userId = user.id)",
      "chat/feedback DELETE": "본인 피드백만 (chatHistory.userId = user.id, id 지정 시 소유 확인 403)",
      "notifications GET": "본인 알림 + 내가 멤버인 프로젝트 마일스톤만",
      "stage-defs/[id] PATCH": "파일 안 도우미가 ADMIN 또는 프로젝트 OWNER · MANAGER 확인",
      "stage-defs/[id] DELETE": "파일 안 도우미가 ADMIN 또는 프로젝트 OWNER · MANAGER 확인",
    };
    const guarded = /assertProjectAccess\(|teamMembers:\s*\{\s*some|role !== "ADMIN"/;
    const missing = cases
      .filter((c) => c.body.includes("requireAuth(") && c.body.includes("projectId"))
      .filter((c) => !NO_PROJECT_SCOPE[c.key] && !guarded.test(c.body))
      .map((c) => c.key);
    expect(missing, "assertProjectAccess(projectId, user) 를 넣거나, 목록이면 teamMembers: { some: { userId } } 로 좁힌다").toEqual([]);
  });

  it("동적 경로([id] 등) 핸들러는 그 레코드의 프로젝트 멤버 · 소유자 · ADMIN 을 확인한다", () => {
    // 회귀: id 만 알면 다른 프로젝트 AS-IS 항목 · 태스크 연결 · DB 백업을 읽고 지울 수 있었다
    const NO_RECORD_SCOPE: Record<string, string> = {
      "users/[id] GET": "로그인 사용자 누구나 다른 사용자 프로필(이름 · 소속)을 본다 (비밀번호 미포함)",
      "users/[id] PATCH": "본인 또는 ADMIN 만 (isAdmin · me.id !== id 403), 역할 · 소속은 ADMIN 만",
    };
    const missing = cases
      .filter((c) => c.dynamic && c.body.includes("requireAuth(") && !NO_RECORD_SCOPE[c.key])
      .filter((c) => !RECORD_GUARD.test(c.body) && !c.helpers.some((h) => c.body.includes(`${h}(`)))
      .map((c) => c.key);
    expect(missing, "레코드를 찾은 뒤 assertProjectAccess(record.projectId, user) — 파일 안 도우미로 묶어도 된다").toEqual([]);
  });

  it("요청 본문을 읽기 전에 로그인부터 확인한다 (비로그인이 400 · 404 로 내부를 엿보지 못하게)", () => {
    const late = cases
      .filter((c) => !PUBLIC[c.key] && c.body.includes("requireAuth("))
      .filter((c) => {
        const read = c.body.search(/request\.(json|formData|text)\(\)/);
        return read >= 0 && read < c.body.indexOf("requireAuth(");
      })
      .map((c) => c.key);
    expect(late).toEqual([]);
  });

  it("PUBLIC 이 아닌 모든 핸들러는 requireAuth( 를 부른다", () => {
    // 파일 안 도우미(authorize 등)가 requireAuth 를 먼저 부르는 핸들러도 인정한다
    const missing = cases
      .filter((c) => !PUBLIC[c.key] && !c.body.includes("requireAuth("))
      .filter((c) => !c.authHelpers.some((h) => c.body.includes(`${h}(`)))
      .map((c) => c.key);
    expect(missing, "requireAuth 없는 핸들러 — @/lib/auth 의 requireAuth + assertProjectAccess 를 넣는다").toEqual([]);
  });
});
