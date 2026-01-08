/**
 * @file src/lib/llm/schema-info.ts
 * @description
 * 데이터베이스 스키마 정보를 LLM 프롬프트용으로 변환하는 유틸리티입니다.
 * LLM이 SQL을 생성할 수 있도록 테이블 구조와 관계를 설명합니다.
 *
 * 초보자 가이드:
 * 1. **getSchemaInfo()**: 전체 스키마 정보를 마크다운 형태로 반환
 * 2. **getTableInfo()**: 특정 테이블의 상세 정보 반환
 */

/**
 * 데이터베이스 스키마 정보
 * LLM에게 전달할 테이블 구조 정보
 */
export const DATABASE_SCHEMA = {
  users: {
    tableName: "users",
    description: "사용자 정보 테이블",
    columns: {
      id: { type: "uuid", description: "사용자 고유 ID (Primary Key)" },
      email: { type: "string", description: "이메일 주소 (Unique)" },
      name: { type: "string?", description: "사용자 이름" },
      avatar: { type: "string?", description: "프로필 이미지 URL" },
      role: {
        type: "enum",
        description: "사용자 역할",
        values: ["EXECUTIVE", "DIRECTOR", "PMO", "PM", "PL", "DEVELOPER", "DESIGNER", "OPERATOR", "MEMBER"],
      },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  projects: {
    tableName: "projects",
    description: "프로젝트 정보 테이블",
    columns: {
      id: { type: "uuid", description: "프로젝트 고유 ID (Primary Key)" },
      name: { type: "string", description: "프로젝트명" },
      description: { type: "string?", description: "프로젝트 설명" },
      status: {
        type: "enum",
        description: "프로젝트 상태",
        values: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"],
      },
      startDate: { type: "datetime?", description: "시작일" },
      endDate: { type: "datetime?", description: "종료일" },
      progress: { type: "int", description: "진행률 (0-100)" },
      ownerId: { type: "uuid", description: "프로젝트 소유자 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  tasks: {
    tableName: "tasks",
    description: "칸반 태스크 테이블",
    columns: {
      id: { type: "uuid", description: "태스크 고유 ID (Primary Key)" },
      title: { type: "string", description: "태스크 제목" },
      description: { type: "string?", description: "태스크 설명" },
      status: {
        type: "enum",
        description: "태스크 상태",
        values: ["PENDING", "IN_PROGRESS", "HOLDING", "DELAYED", "COMPLETED", "CANCELLED"],
      },
      priority: {
        type: "enum",
        description: "우선순위",
        values: ["LOW", "MEDIUM", "HIGH"],
      },
      startDate: { type: "datetime?", description: "시작일" },
      dueDate: { type: "datetime?", description: "마감일" },
      order: { type: "int", description: "칸반 보드 내 순서" },
      isAiGenerated: { type: "boolean", description: "AI 생성 여부" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      creatorId: { type: "uuid", description: "생성자 ID (FK -> users.id)" },
      requirementId: { type: "uuid?", description: "연결된 요구사항 ID (FK -> requirements.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  task_assignees: {
    tableName: "task_assignees",
    description: "태스크 담당자 조인 테이블 (다대다)",
    columns: {
      id: { type: "uuid", description: "고유 ID (Primary Key)" },
      taskId: { type: "uuid", description: "태스크 ID (FK -> tasks.id)" },
      userId: { type: "uuid", description: "사용자 ID (FK -> users.id)" },
      assignedAt: { type: "datetime", description: "담당자 지정일" },
    },
  },
  requirements: {
    tableName: "requirements",
    description: "요구사항 점검표 테이블",
    columns: {
      id: { type: "uuid", description: "요구사항 고유 ID (Primary Key)" },
      code: { type: "string?", description: "요구사항 코드 (REQ-001 등)" },
      title: { type: "string", description: "요구사항 제목" },
      description: { type: "string?", description: "요구사항 설명" },
      status: {
        type: "enum",
        description: "요구사항 상태",
        values: ["DRAFT", "APPROVED", "REJECTED", "IMPLEMENTED"],
      },
      priority: {
        type: "enum",
        description: "우선순위 (MoSCoW)",
        values: ["MUST", "SHOULD", "COULD", "WONT"],
      },
      category: { type: "string?", description: "카테고리 (인증, UI/UX, API 등)" },
      oneDriveLink: { type: "string?", description: "OneDrive 문서 링크" },
      requestDate: { type: "datetime", description: "요청일" },
      dueDate: { type: "datetime?", description: "마감일" },
      isDelayed: { type: "boolean", description: "지연 여부" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      requesterId: { type: "uuid?", description: "요청자 ID (FK -> users.id)" },
      assigneeId: { type: "uuid?", description: "담당자 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  issues: {
    tableName: "issues",
    description: "이슈사항 점검표 테이블",
    columns: {
      id: { type: "uuid", description: "이슈 고유 ID (Primary Key)" },
      code: { type: "string?", description: "이슈 코드 (ISS-001 등)" },
      title: { type: "string", description: "이슈 제목" },
      description: { type: "string?", description: "이슈 설명" },
      status: {
        type: "enum",
        description: "이슈 상태",
        values: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "WONT_FIX"],
      },
      priority: {
        type: "enum",
        description: "우선순위",
        values: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
      },
      category: {
        type: "enum",
        description: "이슈 분류",
        values: ["BUG", "IMPROVEMENT", "QUESTION", "FEATURE", "DOCUMENTATION", "OTHER"],
      },
      reportDate: { type: "datetime", description: "보고일" },
      dueDate: { type: "datetime?", description: "목표 해결일" },
      resolvedDate: { type: "datetime?", description: "실제 해결일" },
      isDelayed: { type: "boolean", description: "지연 여부" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      reporterId: { type: "uuid?", description: "보고자 ID (FK -> users.id)" },
      assigneeId: { type: "uuid?", description: "담당자 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  wbs_items: {
    tableName: "wbs_items",
    description: "WBS 항목 테이블 (계층형 구조)",
    columns: {
      id: { type: "uuid", description: "WBS 항목 고유 ID (Primary Key)" },
      code: { type: "string", description: "WBS 코드 (예: 1, 1.1, 1.1.1)" },
      name: { type: "string", description: "항목명" },
      description: { type: "string?", description: "설명" },
      level: {
        type: "enum",
        description: "계층 레벨",
        values: ["LEVEL1", "LEVEL2", "LEVEL3", "LEVEL4"],
      },
      order: { type: "int", description: "같은 레벨 내 순서" },
      status: {
        type: "enum",
        description: "진행 상태",
        values: ["PENDING", "IN_PROGRESS", "HOLDING", "DELAYED", "COMPLETED", "CANCELLED"],
      },
      progress: { type: "int", description: "진행률 (0-100)" },
      startDate: { type: "datetime?", description: "시작일" },
      endDate: { type: "datetime?", description: "종료일" },
      weight: { type: "int", description: "가중치 (진행률 계산용)" },
      parentId: { type: "uuid?", description: "부모 WBS ID (FK -> wbs_items.id, 자기 참조)" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  wbs_assignees: {
    tableName: "wbs_assignees",
    description: "WBS 담당자 조인 테이블 (다대다)",
    columns: {
      id: { type: "uuid", description: "고유 ID (Primary Key)" },
      wbsItemId: { type: "uuid", description: "WBS 항목 ID (FK -> wbs_items.id)" },
      userId: { type: "uuid", description: "사용자 ID (FK -> users.id)" },
      assignedAt: { type: "datetime", description: "담당자 지정일" },
    },
  },
  holidays: {
    tableName: "holidays",
    description: "일정 관리 테이블 (휴무 + 개인 일정)",
    columns: {
      id: { type: "uuid", description: "일정 고유 ID (Primary Key)" },
      title: { type: "string", description: "일정 제목" },
      description: { type: "string?", description: "일정 상세 설명" },
      date: { type: "datetime", description: "시작일" },
      endDate: { type: "datetime?", description: "종료일 (기간 일정용)" },
      type: {
        type: "enum",
        description: "일정 종류",
        values: ["COMPANY_HOLIDAY", "TEAM_OFFSITE", "PERSONAL_LEAVE", "PERSONAL_SCHEDULE", "MEETING", "DEADLINE", "OTHER"],
      },
      isAllDay: { type: "boolean", description: "종일 일정 여부" },
      startTime: { type: "string?", description: "시작 시간 (HH:mm 형식)" },
      endTime: { type: "string?", description: "종료 시간 (HH:mm 형식)" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      userId: { type: "uuid?", description: "개인 일정인 경우 사용자 ID" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  team_members: {
    tableName: "team_members",
    description: "프로젝트 팀멤버 테이블",
    columns: {
      id: { type: "uuid", description: "고유 ID (Primary Key)" },
      role: {
        type: "enum",
        description: "팀 내 역할",
        values: ["OWNER", "MANAGER", "MEMBER"],
      },
      customRole: { type: "string?", description: "커스텀 역할명 (PMO, PL 등)" },
      department: { type: "string?", description: "부서 (예: 개발팀, 기획팀)" },
      position: { type: "string?", description: "직급 (예: 사원, 대리, 과장)" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      userId: { type: "uuid", description: "사용자 ID (FK -> users.id)" },
      joinedAt: { type: "datetime", description: "합류일" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
};

/**
 * 테이블 관계 정보
 */
export const TABLE_RELATIONSHIPS = `
## 테이블 관계

1. **users** (사용자)
   - 1:N → projects (소유한 프로젝트)
   - N:M → tasks (task_assignees를 통해)
   - N:M → wbs_items (wbs_assignees를 통해)
   - 1:N → requirements (요청자/담당자로)
   - 1:N → issues (보고자/담당자로)

2. **projects** (프로젝트)
   - 1:N → tasks, requirements, issues, wbs_items, holidays, team_members
   - N:1 → users (소유자)

3. **tasks** (태스크)
   - N:1 → projects
   - N:M → users (담당자)
   - N:1 → requirements (선택적 연결)

4. **wbs_items** (WBS 항목)
   - 자기참조 (parentId로 계층 구조)
   - N:1 → projects
   - N:M → users (담당자)
`;

/**
 * 전체 스키마 정보를 LLM 프롬프트용 문자열로 변환
 * @returns {string} 마크다운 형식의 스키마 정보
 */
export function getSchemaInfo(): string {
  let result = "# 데이터베이스 스키마 정보\n\n";

  // 각 테이블 정보 추가
  for (const [key, table] of Object.entries(DATABASE_SCHEMA)) {
    result += `## ${table.tableName}\n`;
    result += `${table.description}\n\n`;
    result += "| 컬럼명 | 타입 | 설명 |\n";
    result += "|--------|------|------|\n";

    for (const [colName, col] of Object.entries(table.columns)) {
      const colInfo = col as { type: string; description: string; values?: string[] };
      let typeStr = colInfo.type;
      if (colInfo.values) {
        typeStr += ` (${colInfo.values.join(", ")})`;
      }
      // 컬럼명은 camelCase 그대로 사용 (PostgreSQL에서 쌍따옴표로 감싸서 사용)
      result += `| "${colName}" | ${typeStr} | ${colInfo.description} |\n`;
    }
    result += "\n";
  }

  // 테이블 관계 추가
  result += TABLE_RELATIONSHIPS;

  return result;
}

/**
 * 프로젝트 ID 필터가 포함된 SQL 생성 안내
 * @param projectId 프로젝트 ID
 * @returns {string} 프로젝트 필터 안내 문자열
 */
export function getProjectFilterInfo(projectId?: string): string {
  if (!projectId) {
    return "\n\n**주의**: 현재 선택된 프로젝트가 없습니다. 전체 데이터를 조회합니다.";
  }
  return `\n\n**현재 프로젝트 ID**: \`${projectId}\`\n프로젝트 관련 테이블 조회 시 \`"projectId" = '${projectId}'\` 조건을 사용하세요.`;
}
