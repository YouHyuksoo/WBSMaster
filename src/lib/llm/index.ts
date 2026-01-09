/**
 * @file src/lib/llm/index.ts
 * @description
 * LLM (Large Language Model) 클라이언트 통합 모듈입니다.
 * Google Gemini와 Mistral AI를 모두 지원합니다.
 *
 * 초보자 가이드:
 * 1. **LLMClient**: LLM 추상화 클래스 (Gemini/Mistral 공통 인터페이스)
 * 2. **createLLMClient()**: 설정에 따라 적절한 LLM 클라이언트 생성
 * 3. **generateSQL()**: 사용자 질문을 SQL로 변환
 * 4. **analyzeResults()**: SQL 실행 결과를 분석하여 응답 생성
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";
import { getSchemaInfo, getProjectFilterInfo } from "./schema-info";

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
  chartType?: "bar" | "bar3d" | "line" | "pie" | "area" | "mindmap" | null;
  chartData?: Record<string, unknown>[];
  mindmapData?: MindmapNode;
}

/**
 * LLM 설정 타입
 */
export interface LLMConfig {
  provider: "gemini" | "mistral";
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

## UPDATE 안전 규칙 ⚠️
- WHERE 절 필수 (id, name, code, title 중 하나로 특정)
- 범위/전체 업데이트 금지
- ✅ UPDATE "wbs_items" SET "progress"=50 WHERE "name"='설계'
- ❌ UPDATE "wbs_items" SET "endDate"='2025-01-10' (WHERE 없음!)

## INSERT 필수 필드
- tasks: id, title, status, priority, projectId, creatorId, order, isAiGenerated, createdAt, updatedAt
- issues: id, title, status, priority, projectId, reporterId, createdAt, updatedAt
- requirements: id, title, status, priority, projectId, creatorId, createdAt, updatedAt
- wbs_items: id, name, level, status, projectId, createdAt, updatedAt

## 담당자 기본값 ⭐
INSERT/UPDATE 시 담당자(assigneeId, reporterId, creatorId)를 명시하지 않으면 현재 userId 사용:
- tasks: creatorId=userId, assigneeId=userId
- issues: reporterId=userId, assigneeId=userId
- requirements: requesterId=userId, assigneeId=userId

## 상태값
- tasks/wbs: PENDING, IN_PROGRESS, COMPLETED, ON_HOLD
- issues: OPEN, IN_PROGRESS, RESOLVED, CLOSED
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
SQL만 반환 (코드블록 없이). 일반 대화면 "NO_SQL".
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
4. **중요: 차트/시각화는 사용자가 명시적으로 요청할 때만 생성하세요**
   - 차트 생성 조건: 사용자 메시지에 "차트", "시각화", "그래프", "chart", "graph" 등의 키워드가 포함된 경우에만
   - 조건 충족 시 응답 끝에 다음 형식으로 표시: [CHART:bar] 또는 [CHART:bar3d] 또는 [CHART:line] 또는 [CHART:pie] 또는 [CHART:area]
   - 차트 데이터 형식: [CHART_DATA:{"labels":["A","B"],"values":[10,20]}]
5. **마인드맵은 사용자가 명시적으로 요청할 때만 생성하세요**
   - 마인드맵 생성 조건: 사용자 메시지에 "마인드맵", "mindmap", "트리구조", "계층구조" 등의 키워드가 포함된 경우에만
   - 조건 충족 시: [CHART:mindmap] [MINDMAP_DATA:{"name":"루트","children":[{"name":"항목1"}]}]
6. 사용자가 시각화를 요청하지 않았다면 텍스트와 표로만 응답하세요

## 차트 선택 기준 (사용자가 차트를 요청한 경우에만 적용)
- bar: 카테고리별 비교 (상태별 개수, 우선순위별 분포 등) - 2D 평면
- bar3d: 카테고리별 비교 - 3D 입체 효과 (더 시각적인 표현)
- line: 시간에 따른 추세 (일별, 월별 변화 등)
- pie: 비율/구성 (전체 대비 비율 등)
- area: 누적 추세 (누적 완료 건수 등)
- mindmap: 계층 구조/트리 표현 (WBS 구조, 조직도, 프로젝트 구조 등)

## WBS Master 도움말 (사용자 질문에 활용)
### 주요 기능
- **대시보드**: 프로젝트 진행률, WBS 진행 현황, 이슈/태스크 통계 한눈에 확인
- **WBS 관리**: 계층 구조 작업 분류 (대분류→중분류→소분류→단위업무), 간트 차트
- **요구사항 관리**: 요구사항 등록/추적, 상태 관리 (DRAFT→REVIEW→APPROVED→IMPLEMENTED)
- **이슈 관리**: 버그/개선사항 등록, 상태 추적 (OPEN→IN_PROGRESS→RESOLVED→CLOSED)
- **칸반 보드**: 드래그앤드롭으로 태스크 상태 변경, 우선순위/담당자별 필터링
- **팀원 관리**: 프로젝트별 팀원 등록, 역할 지정 (DEVELOPER, DESIGNER, PM 등)
- **공휴일 관리**: 국가 공휴일/회사 휴일 등록, WBS 일정 계산에 반영

### 키보드 단축키
- Ctrl+K 또는 /: AI 채팅 열기
- G D: 대시보드 이동
- G W: WBS 관리 이동
- G K: 칸반 보드 이동
- G R: 요구사항 관리 이동
- G I: 이슈 관리 이동

### 채팅으로 할 수 있는 것
- 데이터 조회: "이번 주 완료된 태스크 보여줘", "진행률 50% 이상인 WBS 목록"
- 태스크 등록: "새 태스크 만들어줘: 로그인 기능 개발"
- 이슈 등록: "이슈 등록해줘: 버그 발견 - 로그인 오류"
- 요구사항 등록: "요구사항 추가: 사용자 인증 기능"
- WBS 수정: "WBS xxx의 시작일을 1월 15일로 변경", "진행률 50%로 업데이트"
- 공휴일 등록: "1월 1일 신정 휴일 등록"
- 통계/차트: "상태별 태스크 개수 차트로 보여줘"
- 마인드맵: "WBS 구조를 마인드맵으로", "프로젝트 구조 마인드맵"

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

### 자주 묻는 질문 답변
- "WBS가 뭐야?": Work Breakdown Structure - 프로젝트 작업을 계층적으로 분류하는 도구
- "진행률 계산": WBS 진행률은 하위 항목의 가중 평균으로 자동 계산됨
- "담당자 배정": WBS 편집에서 담당자 선택, 다중 담당자 지정 가능
- "일정 지연": 대시보드에서 지연 건수 확인, 종료일 지났는데 완료되지 않은 항목

한국어로 답변하세요.
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
    default:
      throw new Error(`지원하지 않는 LLM 제공자: ${config.provider}`);
  }
}

/**
 * SQL 쿼리 생성
 * @param client LLM 클라이언트
 * @param userMessage 사용자 메시지
 * @param projectId 프로젝트 ID (선택)
 * @param userId 현재 로그인한 사용자 ID (INSERT/UPDATE에 필요)
 * @param sqlSystemPrompt 커스텀 SQL 시스템 프롬프트 (선택, 없으면 기본값 사용)
 * @returns 생성된 SQL 쿼리 또는 null
 */
export async function generateSQL(
  client: LLMClient,
  userMessage: string,
  projectId?: string,
  userId?: string,
  sqlSystemPrompt?: string
): Promise<string | null> {
  const schemaInfo = getSchemaInfo();
  const projectFilter = getProjectFilterInfo(projectId);

  // 현재 사용자/프로젝트 ID 정보 추가 (INSERT/UPDATE 시 사용)
  const contextInfo = `
## 현재 컨텍스트 정보 (INSERT/UPDATE 시 반드시 이 값을 사용하세요)
- 현재 사용자 ID: '${userId || "UNKNOWN_USER"}'
- 현재 프로젝트 ID: '${projectId || "UNKNOWN_PROJECT"}'

※ INSERT 시 creatorId, reporterId 등에는 반드시 위의 "현재 사용자 ID" 값을 사용하세요.
※ INSERT 시 projectId에는 반드시 위의 "현재 프로젝트 ID" 값을 사용하세요.
`;

  const prompt = `${schemaInfo}${projectFilter}${contextInfo}

## 사용자 질문
${userMessage}

위 질문에 대한 SQL 쿼리를 생성하세요.`;

  // 커스텀 시스템 프롬프트가 있으면 사용, 없으면 기본값 사용
  const systemPrompt = sqlSystemPrompt || DEFAULT_SQL_SYSTEM_PROMPT;
  const response = await client.generate(prompt, systemPrompt);
  const trimmed = response.trim();

  console.log("[generateSQL] LLM 응답:", trimmed.slice(0, 200));

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

  let chartType: "bar" | "bar3d" | "line" | "pie" | "area" | "mindmap" | null = null;
  let chartData: Record<string, unknown>[] | undefined;
  let mindmapData: MindmapNode | undefined;

  if (chartTypeMatch) {
    // 차트 타입 정규화
    const rawType = chartTypeMatch[1].toLowerCase().replace(/[-_]/g, "");
    if (rawType === "bar3d" || rawType === "bar3" || rawType.includes("3d")) {
      chartType = "bar3d";
    } else if (rawType === "mindmap" || rawType.includes("mind")) {
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

  // 1. SQL 생성 (SQL 시스템 프롬프트 적용, userId 전달)
  console.log("[processChatMessage] SQL 생성 시작...");
  const sql = await generateSQL(client, userMessage, projectId, userId, promptConfig?.sqlSystemPrompt);
  console.log("[processChatMessage] 생성된 SQL:", sql?.slice(0, 100) || "NULL");

  // 2. SQL 검증 및 실행
  let results: unknown[] | null = null;
  let validatedSql: string | null = sql;

  if (sql) {
    const validation = validateSQL(sql);
    if (!validation.valid) {
      return {
        content: `SQL 쿼리 검증 실패: ${validation.error}\n\n생성된 쿼리가 보안 정책에 위배됩니다.`,
        sql,
      };
    }

    try {
      results = await executeQuery(sql);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      return {
        content: `SQL 실행 오류: ${errorMessage}\n\n쿼리를 다시 확인해주세요.`,
        sql,
      };
    }
  }

  // 3. 결과 분석 (분석 프롬프트 + 페르소나 프롬프트 전달)
  return analyzeResults(
    client,
    userMessage,
    validatedSql,
    results,
    promptConfig?.analysisSystemPrompt,
    promptConfig?.personaSystemPrompt
  );
}
