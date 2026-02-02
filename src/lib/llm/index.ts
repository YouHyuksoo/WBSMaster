/**
 * @file src/lib/llm/index.ts
 * @description
 * LLM (Large Language Model) 클라이언트 통합 모듈입니다.
 * Google Gemini, Mistral AI, Kimi AI (Moonshot)를 모두 지원합니다.
 *
 * 초보자 가이드:
 * 1. **LLMClient**: LLM 추상화 클래스 (Gemini/Mistral/Kimi 공통 인터페이스)
 * 2. **createLLMClient()**: 설정에 따라 적절한 LLM 클라이언트 생성
 * 3. **generateSQL()**: 사용자 질문을 SQL로 변환
 * 4. **analyzeResults()**: SQL 실행 결과를 분석하여 응답 생성
 *
 * 지원 LLM:
 * - Google Gemini: @google/generative-ai SDK 사용
 * - Mistral AI: @mistralai/mistralai SDK 사용
 * - Kimi AI (Moonshot): OpenAI 호환 API 직접 호출 (https://api.moonshot.ai/v1)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";
import {
  getSchemaInfo,
  getProjectFilterInfo,
  getTableSummariesForLLM,
  getDynamicSchemaInfo,
} from "./schema-info";

/**
 * 마인드맵 노드 타입
 * 진행률, 담당자, 완료일 정보 포함
 */
export interface MindmapNode {
  name: string;
  children?: MindmapNode[];
  value?: number;
  /** 진행률 (0-100) */
  progress?: number;
  /** 담당자 이름 */
  assignee?: string;
  /** 종료일/완료일 */
  endDate?: string;
  /** 상태 */
  status?: string;
}

/**
 * LLM 응답 타입
 */
export interface LLMResponse {
  content: string;
  sql?: string;
  chartType?: "bar" | "line" | "pie" | "area" | "mindmap" | null;
  chartData?: Record<string, unknown>[];
  mindmapData?: MindmapNode;
  /** 전체 데이터 건수 (LIMIT 적용 전) */
  totalCount?: number;
  /** 현재 표시된 건수 */
  displayedCount?: number;
}

/**
 * LLM 설정 타입
 */
export interface LLMConfig {
  provider: "gemini" | "mistral" | "kimi";
  apiKey: string;
  model: string;
}

/**
 * SQL 생성 기본 시스템 프롬프트
 * 이 프롬프트는 설정에서 커스터마이징 가능하며, DB에 저장된 값이 우선 적용됩니다.
 */
export const DEFAULT_SQL_SYSTEM_PROMPT = `WBS Master SQL 생성 AI. PostgreSQL 쿼리를 생성합니다.

## 필수 규칙
- 컬럼명: camelCase + 쌍따옴표 ("projectId", "startDate")
- 문자열: 작은따옴표 ('ACTIVE')
- SELECT: LIMIT 100
- INSERT: id=gen_random_uuid(), createdAt/updatedAt=NOW()
- DELETE 금지
- **🚨 단일 쿼리만 생성! 여러 개의 SQL을 세미콜론으로 연결하지 마세요!**
  - ❌ SELECT ...; SELECT ...; (다중 쿼리 금지)
  - ✅ 하나의 SELECT 문만 반환

## UPDATE 안전 규칙 ⚠️
- WHERE 절 필수 (id, name, code, title 중 하나로 특정)
- 범위/전체 업데이트 금지
- ✅ UPDATE "wbs_items" SET "progress"=50 WHERE "name"='설계'
- ❌ UPDATE "wbs_items" SET "endDate"='2025-01-10' (WHERE 없음!)

## INSERT 필수 필드 (⚠️ 담당자 필수!)
- tasks: id, title, status, priority, projectId, creatorId, **assigneeId**, order, isAiGenerated, createdAt, updatedAt
- issues: id, title, status, priority, type, projectId, reporterId, assigneeId, createdAt, updatedAt (+ resolution 선택)
- requirements: id, title, status, priority, projectId, requesterId, assigneeId, createdAt, updatedAt
- wbs_items: id, name, level, status, projectId, createdAt, updatedAt

## 🚨 담당자 자동 지정 (매우 중요!) 🚨
**INSERT 시 사용자가 담당자를 언급하지 않으면, 반드시 현재 로그인한 사용자(userId)를 담당자로 지정하세요!**

- tasks: creatorId=userId, assigneeId=userId (주담당자)
- issues: reporterId=userId, assigneeId=userId
- requirements: requesterId=userId, assigneeId=userId

## 🚨 날짜 자동 지정 (매우 중요!) 🚨
**INSERT 시 사용자가 시작일/종료일/마감일을 언급하지 않으면, 오늘 날짜(NOW())로 지정하세요!**

- tasks: startDate=NOW(), dueDate=NOW()
- issues: reportDate=NOW(), dueDate=NOW()
- requirements: requestDate=NOW(), dueDate=NOW()
- wbs_items: startDate=NOW(), endDate=NOW()

tasks INSERT 전체 예시:
INSERT INTO "tasks" ("id", "title", "status", "priority", "projectId", "creatorId", "assigneeId", "startDate", "dueDate", "order", "isAiGenerated", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '태스크 제목', 'PENDING', 'MEDIUM', '프로젝트ID', '현재userId', '현재userId', NOW(), NOW(), 0, true, NOW(), NOW())

## 상태값
- tasks/wbs: PENDING, IN_PROGRESS, COMPLETED, ON_HOLD
- issues: OPEN, IN_PROGRESS, RESOLVED, CLOSED
- issues type (유형): FUNCTIONAL (기능), NON_FUNCTIONAL (비기능)
- requirements: DRAFT, REVIEW, APPROVED, REJECTED, IMPLEMENTED
- priority: LOW, MEDIUM, HIGH, URGENT

## ID → 이름 변환 (필수!) ⭐
조회 시 UUID 대신 이름 표시를 위해 반드시 JOIN:
- assigneeId, reporterId, creatorId → users JOIN
- projectId → projects JOIN

예시:
SELECT i."code", i."title", i."status", p."name" AS "projectName", assignee."name" AS "assigneeName"
FROM "issues" i
LEFT JOIN "projects" p ON i."projectId" = p."id"
LEFT JOIN "users" assignee ON i."assigneeId" = assignee."id"

## 마인드맵 요청
"마인드맵", "트리구조" 언급 시 WBS 조회:
SELECT w."id", w."code", w."name", w."level", w."parentId", w."progress", u."name" AS "assigneeName"
FROM "wbs_items" w LEFT JOIN "users" u ON w."assigneeId" = u."id"
WHERE w."projectId" = '프로젝트ID' ORDER BY w."code"

## 응답
- SQL만 반환 (코드블록 없이). 일반 대화면 "NO_SQL".
- **반드시 하나의 SQL 문만 반환하세요!** 여러 정보가 필요하면 UNION이나 서브쿼리 사용.
- 여러 분석이 필요한 질문이면 가장 중요한 하나만 선택해서 쿼리 생성.
`;

/**
 * 분석 기본 시스템 프롬프트
 * 이 프롬프트는 설정에서 커스터마이징 가능하며, DB에 저장된 값이 우선 적용됩니다.
 */
export const DEFAULT_ANALYSIS_SYSTEM_PROMPT = `당신은 WBS Master 프로젝트의 데이터 분석 AI 어시스턴트입니다.
SQL 쿼리 실행 결과를 분석하여 사용자에게 친절하게 설명합니다.

## 규칙
1. 마크다운 형식으로 응답하세요
2. 핵심 인사이트를 먼저 요약하세요
3. 데이터가 있으면 적절한 표나 목록으로 정리하세요
4. **🚨 절대 규칙: 결과가 없으면 차트를 그리지 마세요!**
   - SQL 결과가 빈 배열([])이거나 0건이면 "검색 결과가 없습니다"라고만 답하세요
   - 절대로 임의의 데이터를 만들어내지 마세요 (환각 금지!)
   - 차트 데이터는 반드시 SQL 실행 결과에서만 가져와야 합니다
5. **중요: 차트/시각화는 사용자가 명시적으로 요청할 때만 생성하세요**
   - 차트 생성 조건: 사용자 메시지에 "차트", "시각화", "그래프", "chart", "graph" 등의 키워드가 포함된 경우에만
   - 조건 충족 시 응답 끝에 다음 형식으로 표시: [CHART:bar] 또는 [CHART:line] 또는 [CHART:pie] 또는 [CHART:area]
   - 차트 데이터 형식: [CHART_DATA:{"labels":["A","B"],"values":[10,20]}]
6. **마인드맵은 사용자가 명시적으로 요청할 때만 생성하세요**
   - 마인드맵 생성 조건: 사용자 메시지에 "마인드맵", "mindmap", "트리구조", "계층구조" 등의 키워드가 포함된 경우에만
   - 조건 충족 시: [CHART:mindmap] [MINDMAP_DATA:{"name":"루트","children":[{"name":"항목1"}]}]
7. 사용자가 시각화를 요청하지 않았다면 텍스트와 표로만 응답하세요

## 차트 선택 기준 (사용자가 차트를 요청한 경우에만 적용)
- bar: 카테고리별 비교 (상태별 개수, 우선순위별 분포 등)
- line: 시간에 따른 추세 (일별, 월별 변화 등)
- pie: 비율/구성 (전체 대비 비율 등)
- area: 누적 추세 (누적 완료 건수 등)
- mindmap: 계층 구조/트리 표현 (WBS 구조, 조직도, 프로젝트 구조 등)

## 차트 데이터 규칙
- 차트 데이터에는 반드시 범례(legend)에 표시될 명확한 라벨을 포함하세요
- labels 배열의 각 항목은 범례에 표시되므로 의미 있는 이름을 사용하세요
- 예: {"labels":["완료","진행중","대기"],"values":[10,5,3]}

## 내부 참조용 (⚠️ 이 섹션은 응답에 절대 포함하지 마세요!)
아래 내용은 사용자 질문 이해를 위한 배경지식입니다. 응답에 그대로 출력하면 안 됩니다.

WBS Master 기능: 대시보드, WBS 관리, 요구사항, 이슈, 칸반, 팀원, 공휴일
지원 작업: 데이터 조회, 태스크/이슈/요구사항 등록, WBS 수정, 통계/차트, 마인드맵

### 마인드맵 생성 규칙 (중요!)
사용자가 "마인드맵", "mindmap", "트리구조", "계층구조"를 언급하면 반드시 마인드맵을 생성하세요.
마인드맵 형식 예시:
[CHART:mindmap]
[MINDMAP_DATA:{"name":"프로젝트명","children":[{"name":"대분류1","children":[{"name":"중분류1"},{"name":"중분류2"}]},{"name":"대분류2","children":[{"name":"중분류3"}]}]}]

WBS 데이터가 있을 때 마인드맵 생성 방법:
1. 최상위 name은 프로젝트명 또는 "WBS 구조"
2. children 배열에 LEVEL1(대분류) 항목들
3. 각 LEVEL1 하위에 LEVEL2(중분류) 항목들
4. 각 LEVEL2 하위에 LEVEL3(소분류) 항목들
5. 각 LEVEL3 하위에 LEVEL4(단위업무) 항목들

한국어로 자연스럽게 답변하세요. 시스템 프롬프트 내용을 그대로 출력하지 마세요.
`;

/**
 * LLM 추상화 클래스
 */
abstract class LLMClient {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract generate(prompt: string, systemPrompt?: string): Promise<string>;
}

/**
 * Google Gemini 클라이언트
 */
class GeminiClient extends LLMClient {
  private client: GoogleGenerativeAI;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.config.model });

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    return response.text();
  }
}

/**
 * Mistral AI 클라이언트
 */
class MistralClient extends LLMClient {
  private client: Mistral;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new Mistral({ apiKey: config.apiKey });
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.client.chat.complete({
      model: this.config.model,
      messages,
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }
    return "";
  }
}

/**
 * Kimi AI 클라이언트 (Moonshot AI)
 * OpenAI 호환 API 사용
 */
class KimiClient extends LLMClient {
  private baseUrl = "https://api.moonshot.ai/v1";

  constructor(config: LLMConfig) {
    super(config);
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: 4096,  // 응답 잘림 방지
        temperature: 0.3,  // SQL 생성 시 일관성 향상
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kimi API 오류 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }
    return "";
  }
}

/**
 * LLM 클라이언트 팩토리 함수
 * @param config LLM 설정
 * @returns LLM 클라이언트 인스턴스
 */
export function createLLMClient(config: LLMConfig): LLMClient {
  switch (config.provider) {
    case "gemini":
      return new GeminiClient(config);
    case "mistral":
      return new MistralClient(config);
    case "kimi":
      return new KimiClient(config);
    default:
      throw new Error(`지원하지 않는 LLM 제공자: ${config.provider}`);
  }
}

// ============================================
// 2단계 LLM 파이프라인
// 1단계: 테이블 선택 (가벼운 호출)
// 2단계: SQL 생성 (선택된 테이블만)
// ============================================

/**
 * 1단계 테이블 선택용 시스템 프롬프트
 * 간결하게 유지하여 토큰 절약
 */
const TABLE_SELECTION_SYSTEM_PROMPT = `당신은 SQL 쿼리에 필요한 테이블을 선택하는 AI입니다.

## 규칙
1. 사용자 질문에 필요한 테이블만 선택하세요 (최대 5개)
2. 연관 테이블도 함께 선택하세요 (JOIN 필요시 users, projects 등)
3. 오타나 유사어를 이해하세요 (테스크=태스크, 고객이슈=필드이슈)
4. 응답은 **반드시 JSON 배열만** 출력하세요

## 응답 형식 (JSON 배열만!)
["테이블명1", "테이블명2", "users", "projects"]

## 예시
- "태스크 보여줘" → ["tasks", "users", "projects"]
- "고객이슈 현황" → ["field_issues", "projects"]
- "협의사항 목록" → ["discussion_items", "users", "projects"]
- "WBS 마인드맵" → ["wbs_items", "wbs_assignees", "users", "projects"]
- "AS-IS 분석 현황" → ["as_is_overviews", "as_is_overview_items", "projects"]

JSON 배열만 출력하고 다른 설명은 하지 마세요.`;

/**
 * 1단계: 사용자 질문에서 관련 테이블 선택
 * @param client LLM 클라이언트
 * @param userMessage 사용자 메시지
 * @returns 선택된 테이블명 배열
 */
export async function selectRelevantTables(
  client: LLMClient,
  userMessage: string
): Promise<string[]> {
  const tableSummaries = getTableSummariesForLLM();

  const prompt = `${tableSummaries}

## 사용자 질문
${userMessage}

위 질문에 필요한 테이블을 선택하세요. JSON 배열로만 응답하세요.`;

  try {
    const response = await client.generate(prompt, TABLE_SELECTION_SYSTEM_PROMPT);
    console.log("[selectRelevantTables] LLM 응답:", response.slice(0, 500));

    // JSON 배열 파싱
    const trimmed = response.trim();

    // JSON 코드 블록 제거
    let jsonStr = trimmed;
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    // JSON 배열 파싱 시도
    const tables = JSON.parse(jsonStr) as string[];

    if (!Array.isArray(tables)) {
      console.warn("[selectRelevantTables] 배열이 아님, 기본 테이블 사용");
      return ["tasks", "users", "projects"];
    }

    // 기본 테이블 추가 (users, projects는 거의 항상 필요)
    const resultSet = new Set(tables);
    if (!resultSet.has("projects") && tables.some(t => !["users", "notifications", "ai_settings", "chat_history"].includes(t))) {
      resultSet.add("projects");
    }
    if (tables.some(t => ["tasks", "requirements", "issues", "wbs_items", "milestones", "field_issues", "discussion_items"].includes(t))) {
      resultSet.add("users");
    }

    const result = Array.from(resultSet);
    console.log("[selectRelevantTables] 선택된 테이블:", result);
    return result;
  } catch (error) {
    console.error("[selectRelevantTables] 파싱 실패:", error);
    // 실패 시 기본 테이블 반환
    return ["tasks", "users", "projects"];
  }
}

/**
 * SQL 쿼리 생성
 * @param client LLM 클라이언트
 * @param userMessage 사용자 메시지
 * @param projectId 프로젝트 ID (선택)
 * @param userId 현재 로그인한 사용자 ID (INSERT/UPDATE에 필요)
 * @param sqlSystemPrompt 커스텀 SQL 시스템 프롬프트 (선택, 없으면 기본값 사용)
 * @param selectedTables 선택된 테이블 목록 (2단계 파이프라인용, 없으면 전체 스키마 사용)
 * @returns 생성된 SQL 쿼리 또는 null
 */
export async function generateSQL(
  client: LLMClient,
  userMessage: string,
  projectId?: string,
  userId?: string,
  sqlSystemPrompt?: string,
  selectedTables?: string[]
): Promise<string | null> {
  // 🚀 2단계 파이프라인: 선택된 테이블이 있으면 동적 스키마, 없으면 전체 스키마
  const schemaInfo = selectedTables && selectedTables.length > 0
    ? getDynamicSchemaInfo(selectedTables)
    : getSchemaInfo();
  const projectFilter = getProjectFilterInfo(projectId);

  console.log("[generateSQL] 스키마 모드:", selectedTables ? `동적 (${selectedTables.length}개 테이블)` : "전체");

  // 현재 날짜 정보 (LLM이 연도를 정확히 인식하도록)
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const currentYear = now.getFullYear();

  // 현재 사용자/프로젝트 ID 정보 추가 (INSERT/UPDATE 시 사용)
  const contextInfo = `
## 현재 컨텍스트 정보 (INSERT/UPDATE 시 반드시 이 값을 사용하세요)
- 오늘 날짜: ${currentDate} (${currentYear}년)
- 현재 사용자 ID: '${userId || "UNKNOWN_USER"}'
- 현재 프로젝트 ID: '${projectId || "UNKNOWN_PROJECT"}'

※ 날짜 관련 쿼리 시 현재 연도(${currentYear})를 기준으로 하세요. "1월", "이번 달" 등은 ${currentYear}년을 의미합니다.

## 🚨 tasks INSERT 필수 규칙 (반드시 지켜야 함!) 🚨
tasks INSERT 시 아래 필드를 **반드시 모두 포함**하세요:
- "creatorId": '${userId || "UNKNOWN_USER"}' (필수)
- "assigneeId": '${userId || "UNKNOWN_USER"}' (필수! 담당자 미지정 시 현재 사용자)
- "startDate": NOW() (필수! 시작일 미지정 시 오늘)
- "dueDate": NOW() (필수! 종료일 미지정 시 오늘)

tasks INSERT 전체 예시 (이 형식 그대로 사용):
INSERT INTO "tasks" ("id", "title", "description", "status", "priority", "projectId", "creatorId", "assigneeId", "startDate", "dueDate", "order", "isAiGenerated", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '제목', '', 'PENDING', 'MEDIUM', '${projectId || "UNKNOWN_PROJECT"}', '${userId || "UNKNOWN_USER"}', '${userId || "UNKNOWN_USER"}', NOW(), NOW(), 0, true, NOW(), NOW());
`;

  const prompt = `${schemaInfo}${projectFilter}${contextInfo}

## 사용자 질문
${userMessage}

위 질문에 대한 SQL 쿼리를 생성하세요.`;

  // 커스텀 시스템 프롬프트가 있으면 사용, 없으면 기본값 사용
  const systemPrompt = sqlSystemPrompt || DEFAULT_SQL_SYSTEM_PROMPT;
  const response = await client.generate(prompt, systemPrompt);
  const trimmed = response.trim();

  console.log("[generateSQL] LLM 응답:", trimmed.slice(0, 500));

  if (trimmed === "NO_SQL" || trimmed.toLowerCase().includes("no_sql")) {
    console.log("[generateSQL] NO_SQL 반환됨");
    return null;
  }

  // SQL 코드 블록 제거
  let sql = trimmed;
  if (sql.startsWith("```sql")) {
    sql = sql.slice(6);
  } else if (sql.startsWith("```")) {
    sql = sql.slice(3);
  }
  if (sql.endsWith("```")) {
    sql = sql.slice(0, -3);
  }

  return sql.trim();
}

/**
 * SQL 쿼리 검증 (보안)
 * SELECT, INSERT, UPDATE는 허용, DELETE 및 위험한 명령어는 차단
 * WITH 절(CTE)도 허용 (내부에 SELECT/INSERT/UPDATE 포함 시)
 * @param sql SQL 쿼리
 * @returns 안전한 쿼리인지 여부
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  const upperSQL = sql.toUpperCase().trim();

  // 허용되는 SQL 문 타입 확인 (WITH 절도 허용)
  const allowedStatements = ["SELECT", "INSERT", "UPDATE", "WITH"];
  const startsWithAllowed = allowedStatements.some(stmt => upperSQL.startsWith(stmt));

  if (!startsWithAllowed) {
    return { valid: false, error: "SELECT, INSERT, UPDATE 문만 허용됩니다." };
  }

  // WITH 절인 경우, 내부에 SELECT/INSERT/UPDATE가 있는지 확인
  if (upperSQL.startsWith("WITH")) {
    const hasValidStatement = /\b(SELECT|INSERT|UPDATE)\b/.test(upperSQL);
    if (!hasValidStatement) {
      return { valid: false, error: "WITH 절 내에 유효한 SELECT/INSERT/UPDATE가 없습니다." };
    }
  }

  // 위험한 키워드 차단 (DELETE 포함)
  // 단어 경계(\b)를 사용하여 컬럼명(createdAt, updatedAt 등)과 구분
  const dangerousPatterns = [
    { pattern: /\bDELETE\b/, name: "DELETE" },
    { pattern: /\bDROP\b/, name: "DROP" },
    { pattern: /\bTRUNCATE\b/, name: "TRUNCATE" },
    { pattern: /\bALTER\b/, name: "ALTER" },
    { pattern: /\bCREATE\s+(TABLE|INDEX|DATABASE|SCHEMA|VIEW|FUNCTION|TRIGGER)\b/, name: "CREATE" },
    { pattern: /\bGRANT\b/, name: "GRANT" },
    { pattern: /\bREVOKE\b/, name: "REVOKE" },
    { pattern: /\bEXEC\b/, name: "EXEC" },
    { pattern: /\bEXECUTE\b/, name: "EXECUTE" },
    { pattern: /\bCOPY\b/, name: "COPY" },
    { pattern: /\bPG_/, name: "PG_" },
    { pattern: /\\\\/, name: "\\\\" },
  ];

  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(upperSQL)) {
      return { valid: false, error: `금지된 키워드가 포함되어 있습니다: ${name}` };
    }
  }

  // INSERT/UPDATE 시 허용되는 테이블만 체크 (WITH 절 포함)
  const allowedTables = ["TASKS", "REQUIREMENTS", "ISSUES", "WBS_ITEMS", "HOLIDAYS", "TASK_ASSIGNEES"];

  // 모든 INSERT INTO 테이블 찾기
  const insertMatches = upperSQL.matchAll(/INSERT\s+INTO\s+"?(\w+)"?/gi);
  for (const match of insertMatches) {
    const tableName = match[1].toUpperCase();
    if (!allowedTables.includes(tableName)) {
      return { valid: false, error: `${tableName} 테이블에 대한 INSERT는 허용되지 않습니다.` };
    }
  }

  // 모든 UPDATE 테이블 찾기
  const updateMatches = upperSQL.matchAll(/UPDATE\s+"?(\w+)"?/gi);
  for (const match of updateMatches) {
    const tableName = match[1].toUpperCase();
    if (!allowedTables.includes(tableName)) {
      return { valid: false, error: `${tableName} 테이블에 대한 UPDATE는 허용되지 않습니다.` };
    }
  }

  // ⚠️ UPDATE 안전장치: WHERE 절 필수
  // UPDATE 쿼리가 있으면 반드시 WHERE 절이 있어야 함 (전체 업데이트 방지)
  if (/\bUPDATE\b/i.test(upperSQL)) {
    // WHERE 절이 없으면 차단
    if (!/\bWHERE\b/i.test(upperSQL)) {
      return { valid: false, error: "UPDATE 문에는 반드시 WHERE 절이 필요합니다. 전체 업데이트는 허용되지 않습니다." };
    }

    // WHERE 절에 id 조건이 있는지 확인 (권장)
    // WHERE "id" = 'xxx' 또는 WHERE id = 'xxx' 형태
    const hasIdCondition = /WHERE\s+.*"?id"?\s*=/i.test(upperSQL);
    const hasNameCondition = /WHERE\s+.*"?name"?\s*=/i.test(upperSQL);
    const hasCodeCondition = /WHERE\s+.*"?code"?\s*=/i.test(upperSQL);
    const hasTitleCondition = /WHERE\s+.*"?title"?\s*=/i.test(upperSQL);

    // id, name, code, title 중 하나라도 있으면 허용
    if (!hasIdCondition && !hasNameCondition && !hasCodeCondition && !hasTitleCondition) {
      return {
        valid: false,
        error: "UPDATE 문의 WHERE 절에는 id, name, code, title 중 하나의 조건이 필요합니다. 전체 또는 범위 업데이트는 허용되지 않습니다."
      };
    }
  }

  // SELECT INTO 차단
  if (upperSQL.startsWith("SELECT") && upperSQL.includes("INTO") && upperSQL.indexOf("INTO") < upperSQL.indexOf("FROM")) {
    return { valid: false, error: "SELECT INTO는 허용되지 않습니다." };
  }

  // 세미콜론 다중 쿼리 차단
  const semicolonCount = (sql.match(/;/g) || []).length;
  if (semicolonCount > 1) {
    return { valid: false, error: "다중 쿼리는 허용되지 않습니다." };
  }

  return { valid: true };
}

/**
 * 쿼리 결과 분석 및 응답 생성
 * @param client LLM 클라이언트
 * @param userMessage 사용자 원본 메시지
 * @param sql 실행된 SQL 쿼리
 * @param results 쿼리 실행 결과
 * @param analysisSystemPrompt 커스텀 분석 시스템 프롬프트 (설정에서 관리)
 * @param personaSystemPrompt 페르소나 시스템 프롬프트 (페르소나 선택 시)
 * @returns 분석된 응답
 */
export async function analyzeResults(
  client: LLMClient,
  userMessage: string,
  sql: string | null,
  results: unknown[] | null,
  analysisSystemPrompt?: string,
  personaSystemPrompt?: string
): Promise<LLMResponse> {
  let prompt: string;

  if (!sql || !results) {
    prompt = `사용자 질문: ${userMessage}

이 질문은 데이터베이스 조회가 필요하지 않은 일반 대화입니다.
친절하게 응답해주세요. WBS Master는 프로젝트 관리 도구입니다.`;
  } else {
    prompt = `## 사용자 질문
${userMessage}

## 실행된 SQL 쿼리
\`\`\`sql
${sql}
\`\`\`

## 쿼리 결과 (JSON)
\`\`\`json
${JSON.stringify(results, (_, value) => typeof value === "bigint" ? Number(value) : value, 2)}
\`\`\`

위 결과를 분석하여 사용자에게 설명해주세요.
데이터 시각화가 도움이 된다면 차트 타입과 데이터도 제안해주세요.`;
  }

  // 시스템 프롬프트 조합
  // 1. 기본 분석 프롬프트 (DB 설정 또는 기본값)
  const baseAnalysisPrompt = analysisSystemPrompt || DEFAULT_ANALYSIS_SYSTEM_PROMPT;
  // 2. 페르소나 프롬프트가 있으면 앞에 추가
  const systemPrompt = personaSystemPrompt
    ? `${personaSystemPrompt}\n\n${baseAnalysisPrompt}`
    : baseAnalysisPrompt;

  const response = await client.generate(prompt, systemPrompt);

  // 디버깅: LLM 응답 확인
  console.log("[LLM] Raw response (last 500 chars):", response.slice(-500));

  // 차트 정보 파싱 (bar_3d, bar-chart 같은 변형도 처리)
  const chartTypeMatch = response.match(/\[CHART:([a-z_\-0-9]+)\]/i);
  const chartDataMatch = response.match(/\[CHART_DATA:(\{[\s\S]*?\})\]/);

  // 마인드맵 데이터 파싱 (중첩 JSON을 위한 별도 처리)
  let mindmapDataMatch: RegExpMatchArray | null = null;
  const mindmapStartIndex = response.indexOf("[MINDMAP_DATA:");
  if (mindmapStartIndex !== -1) {
    const jsonStart = mindmapStartIndex + "[MINDMAP_DATA:".length;
    let braceCount = 0;
    let jsonEnd = jsonStart;
    for (let i = jsonStart; i < response.length; i++) {
      if (response[i] === "{") braceCount++;
      else if (response[i] === "}") braceCount--;
      if (braceCount === 0 && response[i] === "}") {
        jsonEnd = i + 1;
        break;
      }
    }
    if (jsonEnd > jsonStart) {
      const jsonStr = response.slice(jsonStart, jsonEnd);
      mindmapDataMatch = ["", jsonStr] as unknown as RegExpMatchArray;
    }
  }

  let chartType: "bar" | "line" | "pie" | "area" | "mindmap" | null = null;
  let chartData: Record<string, unknown>[] | undefined;
  let mindmapData: MindmapNode | undefined;

  if (chartTypeMatch) {
    // 차트 타입 정규화
    const rawType = chartTypeMatch[1].toLowerCase().replace(/[-_]/g, "");
    if (rawType === "mindmap" || rawType.includes("mind")) {
      chartType = "mindmap";
    } else if (rawType.startsWith("bar")) {
      chartType = "bar";
    } else if (rawType.startsWith("line")) {
      chartType = "line";
    } else if (rawType.startsWith("pie")) {
      chartType = "pie";
    } else if (rawType.startsWith("area")) {
      chartType = "area";
    }
  }

  if (chartDataMatch) {
    try {
      const parsed = JSON.parse(chartDataMatch[1]);
      // labels와 values를 Recharts 형식으로 변환
      if (parsed.labels && parsed.values) {
        chartData = parsed.labels.map((label: string, index: number) => ({
          name: label,
          value: parsed.values[index],
        }));
      } else if (Array.isArray(parsed)) {
        chartData = parsed;
      }
    } catch {
      // JSON 파싱 실패 시 무시
    }
  }

  // 마인드맵 데이터 파싱
  if (mindmapDataMatch && mindmapDataMatch[1]) {
    try {
      mindmapData = JSON.parse(mindmapDataMatch[1]) as MindmapNode;
      console.log("[LLM] 마인드맵 데이터 파싱 성공:", JSON.stringify(mindmapData).slice(0, 100));
    } catch (e) {
      console.error("[LLM] 마인드맵 JSON 파싱 실패:", e, mindmapDataMatch[1].slice(0, 100));
    }
  }

  // 응답에서 차트/마인드맵 태그 제거 (모든 변형 포함)
  let content = response
    .replace(/\[CHART:[a-z_\-0-9]+\]/gi, "")
    .replace(/\[CHART_DATA:\{[\s\S]*?\}\]/g, "")
    .replace(/\[MINDMAP_DATA:\{[\s\S]*?\}\]/g, "")
    .trim();

  // 마인드맵 자동 생성: 사용자가 마인드맵을 요청했는데 LLM이 생성 안 한 경우
  const userWantsMindmap = /마인드맵|mindmap|트리구조|계층구조/i.test(userMessage);
  console.log("[LLM] 마인드맵 조건 확인:", {
    userWantsMindmap,
    hasMindmapData: !!mindmapData,
    hasResults: !!results,
    resultsLength: results?.length || 0,
    userMessage: userMessage.slice(0, 50),
  });

  if (userWantsMindmap && !mindmapData && results && results.length > 0) {
    console.log("[LLM] 마인드맵 자동 생성 시도...");
    console.log("[LLM] 첫 번째 결과 샘플:", JSON.stringify(results[0]).slice(0, 200));
    mindmapData = autoGenerateMindmap(results, userMessage);
    if (mindmapData) {
      chartType = "mindmap";
      console.log("[LLM] 마인드맵 자동 생성 성공:", JSON.stringify(mindmapData).slice(0, 200));
    } else {
      console.log("[LLM] 마인드맵 자동 생성 실패 - undefined 반환됨");
    }
  }

  return {
    content,
    sql: sql || undefined,
    chartType,
    chartData,
    mindmapData,
  };
}

/**
 * WBS 아이템 타입 (SQL 결과에서 사용)
 */
interface WbsItemResult {
  id?: string;
  name?: string;
  code?: string;
  level?: string;
  levelNumber?: number;
  parentId?: string | null;
  progress?: number;
  status?: string;
  endDate?: string | Date;
  assigneeName?: string;
  assignee?: { name?: string } | string;
}

/**
 * SQL 결과에서 마인드맵 자동 생성
 * 진행률, 담당자, 완료일 정보 포함
 */
function autoGenerateMindmap(results: unknown[], userMessage: string): MindmapNode | undefined {
  try {
    console.log("[autoGenerateMindmap] 시작, 결과 수:", results.length);

    // WBS 데이터인지 확인 (level, name, parentId 등의 필드 존재 여부)
    const firstItem = results[0] as Record<string, unknown>;
    console.log("[autoGenerateMindmap] 첫 항목 키:", Object.keys(firstItem || {}));

    /**
     * WBS 아이템에서 마인드맵 노드 생성
     * 진행률, 담당자, 완료일 정보 포함
     */
    const createNode = (item: WbsItemResult): MindmapNode => {
      // 담당자 이름 추출 (여러 형태 지원)
      let assigneeName: string | undefined;
      if (item.assigneeName) {
        assigneeName = item.assigneeName;
      } else if (item.assignee) {
        if (typeof item.assignee === "string") {
          assigneeName = item.assignee;
        } else if (typeof item.assignee === "object" && item.assignee.name) {
          assigneeName = item.assignee.name;
        }
      }

      // 날짜 문자열 변환
      let endDateStr: string | undefined;
      if (item.endDate) {
        if (typeof item.endDate === "string") {
          endDateStr = item.endDate;
        } else if (item.endDate instanceof Date) {
          endDateStr = item.endDate.toISOString();
        }
      }

      return {
        name: item.name || item.code || "Unknown",
        progress: typeof item.progress === "number" ? item.progress : undefined,
        assignee: assigneeName,
        endDate: endDateStr,
        status: item.status,
      };
    };

    if (firstItem && ("level" in firstItem || "name" in firstItem || "code" in firstItem)) {
      console.log("[autoGenerateMindmap] WBS 데이터로 인식됨");
      // WBS 구조로 마인드맵 생성
      const items = results as WbsItemResult[];

      // 레벨별로 그룹화
      const level1Items = items.filter(i => i.level === "LEVEL1" || i.levelNumber === 1);
      const level2Items = items.filter(i => i.level === "LEVEL2" || i.levelNumber === 2);
      const level3Items = items.filter(i => i.level === "LEVEL3" || i.levelNumber === 3);
      const level4Items = items.filter(i => i.level === "LEVEL4" || i.levelNumber === 4);

      console.log("[autoGenerateMindmap] 레벨별 항목 수:", {
        level1: level1Items.length,
        level2: level2Items.length,
        level3: level3Items.length,
        level4: level4Items.length,
      });

      const rootChildren: MindmapNode[] = level1Items.map(l1 => {
        const l1Node = createNode(l1);
        const l2Children = level2Items
          .filter(l2 => l2.parentId === l1.id)
          .map(l2 => {
            const l2Node = createNode(l2);
            const l3Children = level3Items
              .filter(l3 => l3.parentId === l2.id)
              .map(l3 => {
                const l3Node = createNode(l3);
                const l4Children = level4Items
                  .filter(l4 => l4.parentId === l3.id)
                  .map(l4 => createNode(l4));
                return {
                  ...l3Node,
                  ...(l4Children.length > 0 ? { children: l4Children } : {}),
                };
              });
            return {
              ...l2Node,
              ...(l3Children.length > 0 ? { children: l3Children } : {}),
            };
          });
        return {
          ...l1Node,
          ...(l2Children.length > 0 ? { children: l2Children } : {}),
        };
      });

      console.log("[autoGenerateMindmap] rootChildren 수:", rootChildren.length);

      if (rootChildren.length > 0) {
        const result = {
          name: "WBS 구조",
          children: rootChildren,
        };
        console.log("[autoGenerateMindmap] WBS 마인드맵 생성 완료");
        return result;
      } else {
        console.log("[autoGenerateMindmap] LEVEL1 항목이 없어서 일반 데이터 구조로 진행");
      }
    }

    // 일반 데이터: 키-값 구조로 마인드맵 생성
    const keys = Object.keys(firstItem);
    console.log("[autoGenerateMindmap] 일반 데이터 모드, 키 수:", keys.length);
    if (keys.length > 0) {
      const result = {
        name: "데이터 구조",
        children: results.slice(0, 10).map((item, idx) => {
          const record = item as Record<string, unknown>;
          const displayName = record.name || record.title || record.code || `항목 ${idx + 1}`;
          const node: MindmapNode = { name: String(displayName) };
          // 진행률, 담당자, 완료일 정보 추가
          if (typeof record.progress === "number") node.progress = record.progress;
          if (record.assigneeName) node.assignee = String(record.assigneeName);
          if (record.endDate) node.endDate = String(record.endDate);
          if (record.status) node.status = String(record.status);
          return node;
        }),
      };
      console.log("[autoGenerateMindmap] 일반 데이터 마인드맵 생성 완료:", result.children.length, "항목");
      return result;
    }

    console.log("[autoGenerateMindmap] 마인드맵 생성 불가 - 키 없음");
    return undefined;
  } catch (e) {
    console.error("[LLM] 마인드맵 자동 생성 실패:", e);
    return undefined;
  }
}

/**
 * 시스템 프롬프트 설정
 */
export interface SystemPromptConfig {
  sqlSystemPrompt?: string;       // SQL 생성용 시스템 프롬프트 (설정에서 관리)
  analysisSystemPrompt?: string;  // 분석용 시스템 프롬프트 (설정에서 관리)
  personaSystemPrompt?: string;   // 페르소나 시스템 프롬프트 (페르소나 선택 시)
}

/**
 * SELECT 쿼리에서 COUNT 쿼리 생성
 * LIMIT/OFFSET 제거하고 COUNT(*)로 감싸기
 */
function generateCountQuery(sql: string): string | null {
  const upperSQL = sql.toUpperCase().trim();

  // SELECT 쿼리가 아니면 COUNT 불필요
  if (!upperSQL.startsWith("SELECT") && !upperSQL.startsWith("WITH")) {
    return null;
  }

  // 세미콜론 제거 (서브쿼리 안에 세미콜론 있으면 syntax error)
  let countSql = sql.replace(/;+\s*$/g, "").trim();

  // LIMIT/OFFSET 제거
  countSql = countSql
    .replace(/\s+LIMIT\s+\d+/gi, "")
    .replace(/\s+OFFSET\s+\d+/gi, "");

  // ORDER BY 제거 (COUNT에 불필요)
  countSql = countSql.replace(/\s+ORDER\s+BY\s+[^)]+$/gi, "");

  // COUNT 쿼리로 감싸기
  return `SELECT COUNT(*) as "totalCount" FROM (${countSql}) AS count_subquery`;
}

/**
 * 전체 채팅 파이프라인 실행
 * @param config LLM 설정
 * @param userMessage 사용자 메시지
 * @param projectId 프로젝트 ID
 * @param userId 현재 로그인한 사용자 ID (INSERT/UPDATE에 필요)
 * @param executeQuery SQL 실행 함수
 * @param promptConfig 시스템 프롬프트 설정
 * @returns LLM 응답
 */
export async function processChatMessage(
  config: LLMConfig,
  userMessage: string,
  projectId: string | undefined,
  userId: string | undefined,
  executeQuery: (sql: string) => Promise<unknown[]>,
  promptConfig?: SystemPromptConfig
): Promise<LLMResponse> {
  console.log("[processChatMessage] 시작:", {
    userMessage: userMessage.slice(0, 50),
    projectId,
    userId,
    hasCustomSqlPrompt: !!promptConfig?.sqlSystemPrompt,
  });

  const client = createLLMClient(config);

  // 🚀 2단계 파이프라인 시작
  // [1단계] 관련 테이블 선택 (가벼운 LLM 호출, ~500 토큰)
  console.log("[processChatMessage] [1단계] 테이블 선택 시작...");
  const selectedTables = await selectRelevantTables(client, userMessage);
  console.log("[processChatMessage] [1단계] 선택된 테이블:", selectedTables);

  // [2단계] SQL 생성 (선택된 테이블 스키마만 사용, ~1,500 토큰)
  console.log("[processChatMessage] [2단계] SQL 생성 시작...");
  const sql = await generateSQL(
    client,
    userMessage,
    projectId,
    userId,
    promptConfig?.sqlSystemPrompt,
    selectedTables  // 🚀 동적 스키마 사용!
  );
  console.log("[processChatMessage] [2단계] 생성된 SQL:", sql?.slice(0, 300) || "NULL");

  // 2. SQL 검증 및 실행
  let results: unknown[] | null = null;
  let validatedSql: string | null = sql;
  let totalCount: number | undefined;
  let displayedCount: number | undefined;

  if (sql) {
    const validation = validateSQL(sql);
    if (!validation.valid) {
      return {
        content: `SQL 쿼리 검증 실패: ${validation.error}\n\n생성된 쿼리가 보안 정책에 위배됩니다.`,
        sql,
      };
    }

    try {
      // SELECT 쿼리인 경우 먼저 전체 건수 조회
      const countSql = generateCountQuery(sql);
      if (countSql) {
        try {
          const countResult = await executeQuery(countSql) as { totalCount: string | number | bigint }[];
          if (countResult && countResult[0]) {
            const rawCount = countResult[0].totalCount;
            totalCount = typeof rawCount === "bigint" ? Number(rawCount) : Number(rawCount);
            console.log("[processChatMessage] 전체 건수:", totalCount);
          }
        } catch (countError) {
          console.warn("[processChatMessage] COUNT 쿼리 실패 (무시):", countError);
        }
      }

      // 원래 쿼리 실행
      results = await executeQuery(sql);
      displayedCount = results?.length || 0;
      console.log("[processChatMessage] 조회 건수:", displayedCount, "/ 전체:", totalCount);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      return {
        content: `SQL 실행 오류: ${errorMessage}\n\n쿼리를 다시 확인해주세요.`,
        sql,
      };
    }
  }

  // 3. 결과 분석 (분석 프롬프트 + 페르소나 프롬프트 전달)
  const response = await analyzeResults(
    client,
    userMessage,
    validatedSql,
    results,
    promptConfig?.analysisSystemPrompt,
    promptConfig?.personaSystemPrompt
  );

  // 4. 전체 건수 정보 추가
  if (totalCount !== undefined && displayedCount !== undefined) {
    response.totalCount = totalCount;
    response.displayedCount = displayedCount;

    // 100건 이상인 경우 안내 메시지 추가
    if (totalCount > displayedCount) {
      response.content += `\n\n---\n📊 **데이터 안내**: 전체 ${totalCount.toLocaleString()}건 중 ${displayedCount}건만 표시했습니다.`;
    }
  }

  return response;
}
