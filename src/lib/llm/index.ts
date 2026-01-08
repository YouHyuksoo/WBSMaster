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
 * LLM 응답 타입
 */
export interface LLMResponse {
  content: string;
  sql?: string;
  chartType?: "bar" | "bar3d" | "line" | "pie" | "area" | null;
  chartData?: Record<string, unknown>[];
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
export const DEFAULT_SQL_SYSTEM_PROMPT = `당신은 WBS Master 프로젝트의 데이터 분석 AI 어시스턴트입니다.
사용자의 질문을 분석하여 PostgreSQL SQL 쿼리를 생성합니다.

## 중요: 컬럼명 규칙
- 컬럼명은 camelCase입니다 (예: projectId, startDate, dueDate)
- snake_case가 아닙니다! (project_id ❌, projectId ✅)
- 반드시 쌍따옴표로 감싸세요: "projectId", "startDate"

## 허용되는 SQL 문
1. SELECT: 데이터 조회
2. INSERT: 데이터 생성 (tasks, requirements, issues, wbs_items, holidays 테이블)
3. UPDATE: 데이터 수정 (tasks, requirements, issues, wbs_items, holidays 테이블)
※ DELETE는 허용되지 않습니다. 삭제는 사용자가 직접 UI에서 처리해야 합니다.

## 규칙
1. 테이블명과 컬럼명은 반드시 쌍따옴표로 감싸세요 (PostgreSQL 표준)
   예: SELECT "id", "name" FROM "projects"
   예: INSERT INTO "tasks" ("id", "title", "projectId") VALUES (gen_random_uuid(), '새 태스크', 'xxx')
2. 문자열 값은 작은따옴표를 사용하세요
   예: WHERE "status" = 'ACTIVE'
3. 날짜 비교는 적절한 형식을 사용하세요
4. JOIN 시 테이블 별칭을 사용하세요
5. SELECT 결과는 최대 100행으로 제한하세요 (LIMIT 100)
6. INSERT 시 id는 gen_random_uuid()를 사용하세요
7. INSERT 시 createdAt, updatedAt은 NOW()를 사용하세요

## 채팅으로 데이터 등록/수정하기
사용자가 채팅으로 다음 작업을 요청할 수 있습니다:

### Task(태스크/작업) 등록
"새 태스크 만들어줘: 로그인 기능 개발" → INSERT
INSERT INTO "tasks" ("id", "title", "description", "status", "priority", "projectId", "creatorId", "order", "isAiGenerated", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '로그인 기능 개발', '', 'PENDING', 'MEDIUM', '프로젝트ID', '사용자ID', 0, true, NOW(), NOW())

### Issue(이슈) 등록
"이슈 등록해줘: 버그 발견 - 로그인 오류" → INSERT
INSERT INTO "issues" ("id", "title", "description", "status", "priority", "projectId", "reporterId", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '버그 발견 - 로그인 오류', '', 'OPEN', 'HIGH', '프로젝트ID', '사용자ID', NOW(), NOW())

### Requirement(요구사항) 등록
"요구사항 추가: 사용자 인증 기능" → INSERT
INSERT INTO "requirements" ("id", "title", "description", "status", "priority", "projectId", "creatorId", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '사용자 인증 기능', '', 'DRAFT', 'HIGH', '프로젝트ID', '사용자ID', NOW(), NOW())

### WBS 일정 변경
"WBS xxx의 시작일을 1월 15일로 변경해줘" → UPDATE
UPDATE "wbs_items" SET "startDate" = '2025-01-15', "updatedAt" = NOW() WHERE "id" = 'xxx'

"WBS xxx의 종료일을 2월 28일로 수정" → UPDATE
UPDATE "wbs_items" SET "endDate" = '2025-02-28', "updatedAt" = NOW() WHERE "id" = 'xxx'

"WBS xxx의 진행률을 50%로 업데이트" → UPDATE
UPDATE "wbs_items" SET "progress" = 50, "updatedAt" = NOW() WHERE "id" = 'xxx'

### Holiday(공휴일) 등록
"2025년 1월 1일 신정 휴일 등록" → INSERT
INSERT INTO "holidays" ("id", "date", "name", "type", "isRecurring", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '2025-01-01', '신정', 'NATIONAL', false, NOW(), NOW())

## 테이블별 필수 필드
- tasks: id, title, status, priority, projectId, creatorId, order, isAiGenerated, createdAt, updatedAt
- issues: id, title, status, priority, projectId, reporterId, createdAt, updatedAt
- requirements: id, title, status, priority, projectId, creatorId, createdAt, updatedAt
- wbs_items: id, name, level, status, projectId, createdAt, updatedAt
- holidays: id, date, name, type, isRecurring, createdAt, updatedAt

## 상태값 (status)
- tasks: PENDING, IN_PROGRESS, COMPLETED, ON_HOLD
- issues: OPEN, IN_PROGRESS, RESOLVED, CLOSED
- requirements: DRAFT, REVIEW, APPROVED, IMPLEMENTED, REJECTED
- wbs_items: PENDING, IN_PROGRESS, COMPLETED, ON_HOLD

## 우선순위 (priority)
- tasks/issues/requirements: LOW, MEDIUM, HIGH, URGENT

## 응답 형식
SQL 쿼리만 반환하세요. 설명이나 마크다운 코드 블록 없이 순수 SQL만 반환합니다.
쿼리가 필요 없는 일반 대화인 경우 "NO_SQL" 이라고 반환하세요.
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
4. 차트가 필요하다면 응답 끝에 다음 형식으로 표시하세요:
   [CHART:bar] 또는 [CHART:bar3d] 또는 [CHART:line] 또는 [CHART:pie] 또는 [CHART:area]
5. 차트 데이터는 JSON 형식으로 제공하세요:
   [CHART_DATA:{"labels":["A","B"],"values":[10,20]}]

## 차트 선택 기준
- bar: 카테고리별 비교 (상태별 개수, 우선순위별 분포 등) - 2D 평면
- bar3d: 카테고리별 비교 - 3D 입체 효과 (더 시각적인 표현)
- line: 시간에 따른 추세 (일별, 월별 변화 등)
- pie: 비율/구성 (전체 대비 비율 등)
- area: 누적 추세 (누적 완료 건수 등)

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
 * @param sqlSystemPrompt 커스텀 SQL 시스템 프롬프트 (선택, 없으면 기본값 사용)
 * @returns 생성된 SQL 쿼리 또는 null
 */
export async function generateSQL(
  client: LLMClient,
  userMessage: string,
  projectId?: string,
  sqlSystemPrompt?: string
): Promise<string | null> {
  const schemaInfo = getSchemaInfo();
  const projectFilter = getProjectFilterInfo(projectId);

  const prompt = `${schemaInfo}${projectFilter}

## 사용자 질문
${userMessage}

위 질문에 대한 SQL 쿼리를 생성하세요.`;

  // 커스텀 시스템 프롬프트가 있으면 사용, 없으면 기본값 사용
  const systemPrompt = sqlSystemPrompt || DEFAULT_SQL_SYSTEM_PROMPT;
  const response = await client.generate(prompt, systemPrompt);
  const trimmed = response.trim();

  if (trimmed === "NO_SQL" || trimmed.toLowerCase().includes("no_sql")) {
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

  // 차트 정보 파싱 (bar_3d, bar-chart 같은 변형도 처리)
  const chartTypeMatch = response.match(/\[CHART:([a-z_\-0-9]+)\]/i);
  const chartDataMatch = response.match(/\[CHART_DATA:(\{[\s\S]*?\})\]/);

  let chartType: "bar" | "bar3d" | "line" | "pie" | "area" | null = null;
  let chartData: Record<string, unknown>[] | undefined;

  if (chartTypeMatch) {
    // 차트 타입 정규화
    const rawType = chartTypeMatch[1].toLowerCase().replace(/[-_]/g, "");
    if (rawType === "bar3d" || rawType === "bar3" || rawType.includes("3d")) {
      chartType = "bar3d";
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

  // 응답에서 차트 태그 제거 (모든 변형 포함)
  let content = response
    .replace(/\[CHART:[a-z_\-0-9]+\]/gi, "")
    .replace(/\[CHART_DATA:\{[\s\S]*?\}\]/g, "")
    .trim();

  return {
    content,
    sql: sql || undefined,
    chartType,
    chartData,
  };
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
 * @param executeQuery SQL 실행 함수
 * @param promptConfig 시스템 프롬프트 설정
 * @returns LLM 응답
 */
export async function processChatMessage(
  config: LLMConfig,
  userMessage: string,
  projectId: string | undefined,
  executeQuery: (sql: string) => Promise<unknown[]>,
  promptConfig?: SystemPromptConfig
): Promise<LLMResponse> {
  const client = createLLMClient(config);

  // 1. SQL 생성 (SQL 시스템 프롬프트 적용)
  const sql = await generateSQL(client, userMessage, projectId, promptConfig?.sqlSystemPrompt);

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
