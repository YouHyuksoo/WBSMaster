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
        description: "시스템 역할",
        values: ["ADMIN", "USER", "GUEST"],
      },
      affiliation: {
        type: "enum?",
        description: "소속 (고객사, 개발사, 컨설팅, 외주 등)",
        values: ["CLIENT", "DEVELOPER", "CONSULTING", "OUTSOURCING", "HAENGSUNG", "OTHER"],
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
      purpose: { type: "string?", description: "프로젝트 목적" },
      organizationChart: { type: "json?", description: "프로젝트 조직도 (JSON: {role, name, department}[])" },
      successIndicators: { type: "string[]", description: "성공지표 (문자열 배열)" },
      futureVision: { type: "string?", description: "추구하는 미래모습" },
      visionImage: { type: "string?", description: "미래 비전 이미지 URL" },
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
      completedAt: { type: "datetime?", description: "완료 일시 (주간보고 연동용)" },
      order: { type: "int", description: "칸반 보드 내 순서" },
      isAiGenerated: { type: "boolean", description: "AI 생성 여부" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      assigneeId: { type: "uuid?", description: "주 담당자 ID (FK -> users.id)" },
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
      type: {
        type: "enum",
        description: "이슈 유형 (기능/비기능)",
        values: ["FUNCTIONAL", "NON_FUNCTIONAL"],
      },
      resolution: { type: "string?", description: "처리내용 (해결 방법이나 조치 사항)" },
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
    description: "WBS 항목 테이블 (계층형 구조). ⚠️ 중요: 담당자(assignee)는 이 테이블에 없음! wbs_assignees 테이블을 통해 다대다로 연결됨. assigneeId 컬럼 사용 금지!",
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
      startDate: { type: "datetime?", description: "계획 시작일" },
      endDate: { type: "datetime?", description: "계획 종료일" },
      actualStartDate: { type: "datetime?", description: "실제 시작일" },
      actualEndDate: { type: "datetime?", description: "실제 종료일" },
      weight: { type: "int", description: "가중치 (진행률 계산용)" },
      deliverableName: { type: "string?", description: "산출물명" },
      deliverableLink: { type: "string?", description: "산출물 링크 (URL)" },
      parentId: { type: "uuid?", description: "부모 WBS ID (FK -> wbs_items.id, 자기 참조). NULL이면 최상위(LEVEL1)" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  wbs_assignees: {
    tableName: "wbs_assignees",
    description: "WBS 담당자 조인 테이블 (다대다). WBS 담당자 조회 시 이 테이블을 JOIN해야 함! wbs_items에는 assigneeId 없음!",
    columns: {
      id: { type: "uuid", description: "고유 ID (Primary Key)" },
      wbsItemId: { type: "uuid", description: "WBS 항목 ID (FK -> wbs_items.id)" },
      userId: { type: "uuid", description: "담당자 사용자 ID (FK -> users.id)" },
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
      date: { type: "datetime", description: "일정 날짜 또는 시작일 (컬럼명은 'date'임, startDate 아님!)" },
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
  process_verification_categories: {
    tableName: "process_verification_categories",
    description: "기능추적표(공정검증) 카테고리 테이블 - 재료관리, SMD공정관리, 검사관리 등의 카테고리",
    columns: {
      id: { type: "uuid", description: "카테고리 고유 ID (Primary Key)" },
      name: { type: "string", description: "카테고리명 (예: 재료관리, SMD공정관리, 검사관리)" },
      code: { type: "string", description: "영문 코드 (예: MATERIAL, SMD_PROCESS, INSPECTION)" },
      order: { type: "int", description: "정렬 순서" },
      description: { type: "string?", description: "카테고리 설명" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  process_verification_items: {
    tableName: "process_verification_items",
    description: "기능추적표(공정검증) 항목 테이블 - 각 카테고리 내 세부 검증 항목",
    columns: {
      id: { type: "uuid", description: "항목 고유 ID (Primary Key)" },
      category: { type: "string", description: "구분 (재료, 공정, 검사 등)" },
      isApplied: { type: "boolean", description: "적용 여부 (Y/N)" },
      managementArea: { type: "string", description: "(L1) 관리 영역" },
      detailItem: { type: "string", description: "(L2) 세부 관리 항목" },
      mesMapping: { type: "string?", description: "(L3) MES/IT 매핑 기능명" },
      verificationDetail: { type: "string?", description: "세부 검증 내용 및 점검 기준" },
      managementCode: { type: "string", description: "관리코드 (M-1-01, P-1-01 등)" },
      acceptanceStatus: { type: "string?", description: "수용 여부" },
      existingMes: { type: "boolean", description: "기존 MES 유무 (Y/N)" },
      customerRequest: { type: "string?", description: "고객 요청 여부" },
      order: { type: "int", description: "정렬 순서" },
      remarks: { type: "string?", description: "비고" },
      status: {
        type: "enum",
        description: "검증 상태",
        values: ["PENDING", "IN_PROGRESS", "VERIFIED", "NOT_APPLICABLE"],
      },
      categoryId: { type: "uuid", description: "카테고리 ID (FK -> process_verification_categories.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  customer_requirements: {
    tableName: "customer_requirements",
    description: "고객요구사항 테이블 - 고객사 요구사항 추적 관리",
    columns: {
      id: { type: "uuid", description: "요구사항 고유 ID (Primary Key)" },
      sequence: { type: "int", description: "순번 (자동 부여)" },
      code: { type: "string", description: "관리번호 (RQIT_00001 형식)" },
      businessUnit: { type: "string", description: "사업부 (IT, 생산, 품질 등)" },
      category: { type: "string?", description: "업무구분 (공통, 프로세스 등)" },
      functionName: { type: "string", description: "기능명" },
      content: { type: "string", description: "요구사항 내용" },
      requestDate: { type: "datetime?", description: "요청일자" },
      requester: { type: "string?", description: "요청자 이름" },
      solution: { type: "string?", description: "적용방안" },
      applyStatus: {
        type: "enum",
        description: "적용여부 상태",
        values: ["REVIEWING", "APPLIED", "REJECTED", "HOLD"],
      },
      remarks: { type: "string?", description: "비고" },
      toBeCode: { type: "string?", description: "To-Be 관리번호 (연결용, 텍스트)" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  documents: {
    tableName: "documents",
    description: "문서함 테이블 - 프로젝트 문서 관리 (공용/개인 문서함)",
    columns: {
      id: { type: "uuid", description: "문서 고유 ID (Primary Key)" },
      name: { type: "string", description: "문서명" },
      description: { type: "string?", description: "설명" },
      category: {
        type: "enum",
        description: "문서 종류",
        values: ["SPECIFICATION", "MANUAL", "MEETING", "REPORT", "CONTRACT", "TEMPLATE", "REFERENCE", "OTHER"],
      },
      version: { type: "string?", description: "버전 (기본: 1.0)" },
      sourceType: {
        type: "enum",
        description: "소스 타입",
        values: ["ONEDRIVE", "GOOGLE", "SERVER_UPLOAD", "EXTERNAL_LINK"],
      },
      url: { type: "string?", description: "외부 링크 (OneDrive, Google, SharePoint 등)" },
      filePath: { type: "string?", description: "서버 업로드 파일 경로" },
      fileName: { type: "string?", description: "원본 파일명" },
      fileSize: { type: "int?", description: "파일 크기 (bytes)" },
      mimeType: { type: "string?", description: "MIME 타입" },
      tags: { type: "string[]", description: "태그 배열" },
      isFavorite: { type: "boolean", description: "즐겨찾기 여부" },
      isPersonal: { type: "boolean", description: "개인문서함 여부 (true: 개인, false: 공용)" },
      order: { type: "int", description: "정렬 순서" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdById: { type: "uuid", description: "등록자 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  timeline_rows: {
    tableName: "timeline_rows",
    description: "타임라인 행 테이블 - 타임라인 차트의 행 구조 (계층형)",
    columns: {
      id: { type: "uuid", description: "행 고유 ID (Primary Key)" },
      name: { type: "string", description: "행 이름 (예: 태스크, 인프라)" },
      color: { type: "string", description: "행 색상 (좌측 라벨 배경)" },
      order: { type: "int", description: "행 정렬 순서" },
      isDefault: { type: "boolean", description: "기본 행 여부 (삭제 불가)" },
      parentId: { type: "uuid?", description: "부모 행 ID (FK -> timeline_rows.id, 자기 참조)" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  milestones: {
    tableName: "milestones",
    description: "마일스톤 테이블 - 프로젝트 주요 이정표 (기간 막대 형태)",
    columns: {
      id: { type: "uuid", description: "마일스톤 고유 ID (Primary Key)" },
      name: { type: "string", description: "마일스톤 이름 (예: API 개발)" },
      description: { type: "string?", description: "상세 설명" },
      startDate: { type: "datetime", description: "시작일" },
      endDate: { type: "datetime", description: "종료일" },
      status: {
        type: "enum",
        description: "마일스톤 상태",
        values: ["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"],
      },
      color: { type: "string", description: "막대 색상 (HEX)" },
      order: { type: "int", description: "정렬 순서" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      rowId: { type: "uuid?", description: "타임라인 행 ID (FK -> timeline_rows.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  pinpoints: {
    tableName: "pinpoints",
    description: "핀포인트 테이블 - 타임라인 상의 중요 시점 마커",
    columns: {
      id: { type: "uuid", description: "핀포인트 고유 ID (Primary Key)" },
      name: { type: "string", description: "핀포인트 이름 (예: 오픈, 베타, 런칭)" },
      description: { type: "string?", description: "상세 설명" },
      date: { type: "datetime", description: "핀포인트 날짜" },
      color: { type: "string", description: "삼각형 색상 (HEX)" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      rowId: { type: "uuid", description: "타임라인 행 ID (FK -> timeline_rows.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  weekly_reports: {
    tableName: "weekly_reports",
    description: "주간보고 테이블 - 사용자별 주간 업무보고",
    columns: {
      id: { type: "uuid", description: "주간보고 고유 ID (Primary Key)" },
      year: { type: "int", description: "연도 (예: 2026)" },
      weekNumber: { type: "int", description: "주차 (1~53, ISO 주차 기준)" },
      weekStart: { type: "datetime", description: "해당 주 시작일 (월요일)" },
      weekEnd: { type: "datetime", description: "해당 주 종료일 (일요일)" },
      issueContent: { type: "string?", description: "이슈 내용 (HTML 형식, React-Quill)" },
      status: {
        type: "enum",
        description: "보고서 상태",
        values: ["DRAFT", "SUBMITTED"],
      },
      submittedAt: { type: "datetime?", description: "제출 완료 시간" },
      userId: { type: "uuid", description: "사용자 ID (FK -> users.id)" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  weekly_report_items: {
    tableName: "weekly_report_items",
    description: "주간보고 항목 테이블 - 전주실적/차주계획 업무 항목",
    columns: {
      id: { type: "uuid", description: "항목 고유 ID (Primary Key)" },
      type: {
        type: "enum",
        description: "항목 타입",
        values: ["PREVIOUS_RESULT", "NEXT_PLAN"],
      },
      category: {
        type: "enum",
        description: "업무 카테고리",
        values: ["DOCUMENT", "ANALYSIS", "DEVELOPMENT", "DESIGN", "TESTING", "MEETING", "EDUCATION", "SUPPORT", "OTHER"],
      },
      title: { type: "string", description: "업무 제목" },
      description: { type: "string?", description: "업무 상세 설명" },
      targetDate: { type: "datetime?", description: "목표일" },
      remarks: { type: "string?", description: "기타/비고" },
      isAdditional: { type: "boolean", description: "계획에 없던 추가 업무 여부" },
      isCompleted: { type: "boolean", description: "완료 여부 (전주 실적용)" },
      progress: { type: "int", description: "진행률 (0-100)" },
      linkedTaskId: { type: "uuid?", description: "연결된 Task ID (FK -> tasks.id)" },
      linkedWbsId: { type: "uuid?", description: "연결된 WBS 항목 ID (FK -> wbs_items.id)" },
      order: { type: "int", description: "순서" },
      reportId: { type: "uuid", description: "주간보고 ID (FK -> weekly_reports.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  weekly_summaries: {
    tableName: "weekly_summaries",
    description: "주간보고 취합 테이블 - 여러 멤버의 주간보고를 통합 분석",
    columns: {
      id: { type: "uuid", description: "취합 고유 ID (Primary Key)" },
      year: { type: "int", description: "연도 (예: 2026)" },
      weekNumber: { type: "int", description: "주차 (1~53)" },
      weekStart: { type: "datetime", description: "해당 주 시작일 (월요일)" },
      weekEnd: { type: "datetime", description: "해당 주 종료일 (일요일)" },
      title: { type: "string", description: "취합 보고서 제목" },
      memberIds: { type: "string[]", description: "포함된 멤버 ID 목록 (배열)" },
      reportIds: { type: "string[]", description: "포함된 주간보고 ID 목록 (배열)" },
      memberSummaries: { type: "json?", description: "멤버별 요약 JSON (memberId, memberName, previousResults, nextPlans)" },
      llmSummary: { type: "string?", description: "LLM 요약 (전주실적/차주계획 통합)" },
      llmInsights: { type: "string?", description: "LLM 인사이트 (리스크, 개선점, 제안)" },
      llmAnalyzedAt: { type: "datetime?", description: "LLM 분석 완료 시간" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdById: { type: "uuid", description: "생성자 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  equipments: {
    tableName: "equipments",
    description: "MES 설비 관리 테이블 - 노드 기반 시각화",
    columns: {
      id: { type: "uuid", description: "설비 고유 ID (Primary Key)" },
      code: { type: "string", description: "설비 코드 (예: EQ-001)" },
      name: { type: "string", description: "설비명" },
      type: {
        type: "enum",
        description: "설비 타입",
        values: ["MACHINE", "TOOL", "DEVICE", "CONVEYOR", "STORAGE", "INSPECTION", "PC", "PRINTER", "SCANNER", "DIO", "SCREEN_PRINTER", "SPI", "CHIP_MOUNTER", "MOI", "REFLOW_OVEN", "AOI", "ICT", "FCT", "OTHER"],
      },
      status: {
        type: "enum",
        description: "설비 상태",
        values: ["ACTIVE", "MAINTENANCE", "INACTIVE", "BROKEN", "RESERVED"],
      },
      positionX: { type: "float", description: "X 좌표 (React Flow 위치)" },
      positionY: { type: "float", description: "Y 좌표 (React Flow 위치)" },
      description: { type: "string?", description: "설명" },
      location: { type: "string?", description: "물리적 위치 (예: A동 2층)" },
      lineCode: { type: "string?", description: "라인코드 (예: L1, L2, LINE-A)" },
      divisionCode: { type: "string?", description: "사업부 코드" },
      imageUrl: { type: "string?", description: "설비 이미지 URL" },
      manufacturer: { type: "string?", description: "제조사" },
      modelNumber: { type: "string?", description: "모델번호" },
      serialNumber: { type: "string?", description: "시리얼번호" },
      ipAddress: { type: "string?", description: "IP 주소" },
      portNumber: { type: "int?", description: "PORT 번호" },
      isLogTarget: { type: "boolean", description: "로그수집대상 여부" },
      isInterlockTarget: { type: "boolean", description: "인터락대상 여부" },
      isBarcodeEnabled: { type: "boolean", description: "바코드 식별가능 여부" },
      logCollectionPath: { type: "string?", description: "로그수집위치" },
      systemType: {
        type: "enum?",
        description: "시스템 종류",
        values: ["WINDOWS_XP", "WINDOWS_10", "WINDOWS_11", "LINUX", "OTHER"],
      },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  equipment_properties: {
    tableName: "equipment_properties",
    description: "설비 동적 속성 테이블 - 사용자가 설비별로 커스텀 속성 추가",
    columns: {
      id: { type: "uuid", description: "속성 고유 ID (Primary Key)" },
      key: { type: "string", description: "속성명 (예: 온도, 압력, 용량)" },
      value: { type: "string", description: "속성값" },
      valueType: {
        type: "enum",
        description: "값 타입",
        values: ["TEXT", "NUMBER", "DATE", "BOOLEAN"],
      },
      unit: { type: "string?", description: "단위 (예: ℃, MPa, ton)" },
      order: { type: "int", description: "표시 순서" },
      equipmentId: { type: "uuid", description: "설비 ID (FK -> equipments.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  equipment_connections: {
    tableName: "equipment_connections",
    description: "설비 연결 테이블 - 설비 간의 흐름/연결 관계 (React Flow Edge용)",
    columns: {
      id: { type: "uuid", description: "연결 고유 ID (Primary Key)" },
      label: { type: "string?", description: "연결 라벨 (예: 원료공급, 제품이동)" },
      type: {
        type: "enum",
        description: "연결 타입",
        values: ["FLOW", "SIGNAL", "POWER", "DEPENDENCY", "OTHER"],
      },
      order: { type: "int", description: "우선순위" },
      color: { type: "string?", description: "선 색상" },
      animated: { type: "boolean", description: "애니메이션 효과" },
      sourceHandle: { type: "string?", description: "출발 핸들 (top, right, bottom, left)" },
      targetHandle: { type: "string?", description: "도착 핸들 (top, right, bottom, left)" },
      fromEquipmentId: { type: "uuid", description: "출발 설비 ID (FK -> equipments.id)" },
      toEquipmentId: { type: "uuid", description: "도착 설비 ID (FK -> equipments.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },
  notifications: {
    tableName: "notifications",
    description: "알림 테이블 - 사용자별 알림 관리",
    columns: {
      id: { type: "uuid", description: "알림 고유 ID (Primary Key)" },
      type: {
        type: "enum",
        description: "알림 타입",
        values: ["TASK_ASSIGNED", "MILESTONE_DUE_SOON", "ISSUE_URGENT"],
      },
      title: { type: "string", description: "알림 제목" },
      message: { type: "string", description: "알림 내용" },
      link: { type: "string?", description: "클릭 시 이동 경로" },
      isRead: { type: "boolean", description: "읽음 여부" },
      relatedId: { type: "string?", description: "관련 엔티티 ID" },
      projectId: { type: "string?", description: "관련 프로젝트 ID" },
      projectName: { type: "string?", description: "프로젝트명 (삭제되어도 남음)" },
      userId: { type: "uuid", description: "사용자 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
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
   - 1:N → weekly_reports (주간보고 작성자)
   - 1:N → weekly_summaries (취합 보고서 생성자)
   - 1:N → documents (문서 등록자)
   - 1:N → notifications (알림)

2. **projects** (프로젝트)
   - 1:N → tasks, requirements, issues, wbs_items, holidays, team_members
   - 1:N → process_verification_categories (기능추적표 카테고리)
   - 1:N → customer_requirements (고객요구사항)
   - 1:N → documents (문서함)
   - 1:N → timeline_rows (타임라인 행)
   - 1:N → milestones (마일스톤)
   - 1:N → pinpoints (핀포인트)
   - 1:N → weekly_reports (주간보고)
   - 1:N → weekly_summaries (주간보고 취합)
   - 1:N → equipments (설비 목록)
   - N:1 → users (소유자)

3. **tasks** (태스크)
   - N:1 → projects
   - N:M → users (담당자)
   - N:1 → requirements (선택적 연결)
   - 1:N → weekly_report_items (주간보고 항목 연결)

4. **wbs_items** (WBS 항목)
   - 자기참조 (parentId로 계층 구조, NULL이면 최상위 LEVEL1)
   - N:1 → projects
   - ⚠️ N:M → users (담당자) - **wbs_assignees 테이블을 통해 연결! wbs_items에는 assigneeId 컬럼 없음!**
   - 1:N → weekly_report_items (주간보고 항목 연결)
   - WBS 마인드맵/트리 조회 시: id, code, name, level, parentId, status, progress 사용

5. **process_verification_categories** (기능추적표 카테고리)
   - N:1 → projects
   - 1:N → process_verification_items (카테고리 내 항목들)

6. **process_verification_items** (기능추적표 항목)
   - N:1 → process_verification_categories

7. **customer_requirements** (고객요구사항)
   - N:1 → projects

8. **documents** (문서함)
   - N:1 → projects
   - N:1 → users (등록자)

9. **timeline_rows** (타임라인 행)
   - 자기참조 (parentId로 계층 구조)
   - N:1 → projects
   - 1:N → milestones (행에 속한 마일스톤들)
   - 1:N → pinpoints (행에 속한 핀포인트들)

10. **milestones** (마일스톤)
    - N:1 → projects
    - N:1 → timeline_rows (선택적 연결)

11. **pinpoints** (핀포인트)
    - N:1 → projects
    - N:1 → timeline_rows

12. **weekly_reports** (주간보고)
    - N:1 → projects
    - N:1 → users (작성자)
    - 1:N → weekly_report_items (보고서 내 항목들)

13. **weekly_report_items** (주간보고 항목)
    - N:1 → weekly_reports
    - N:1 → tasks (선택적 연결)
    - N:1 → wbs_items (선택적 연결)

14. **weekly_summaries** (주간보고 취합)
    - N:1 → projects
    - N:1 → users (생성자)

15. **equipments** (설비)
    - N:1 → projects
    - 1:N → equipment_properties (동적 속성)
    - N:M → equipments (equipment_connections를 통해)

16. **equipment_properties** (설비 동적 속성)
    - N:1 → equipments

17. **equipment_connections** (설비 연결)
    - N:1 → equipments (출발 설비)
    - N:1 → equipments (도착 설비)

18. **notifications** (알림)
    - N:1 → users
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
