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
        values: ["TASK_ASSIGNED", "MILESTONE_DUE_SOON", "ISSUE_URGENT", "FIELD_ISSUE_CREATED", "CUSTOMER_REQ_CREATED", "DISCUSSION_CREATED"],
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

  // ============================================
  // 누락된 테이블 추가 (2026-01-20)
  // ============================================

  field_issues: {
    tableName: "field_issues",
    description: "필드이슈/고객이슈/현업이슈 테이블 - 현장에서 발생하는 이슈 관리",
    columns: {
      id: { type: "uuid", description: "이슈 고유 ID (Primary Key)" },
      sequence: { type: "int", description: "순번 (자동 부여)" },
      code: { type: "string", description: "이슈번호 (IS0001 형식)" },
      businessUnit: { type: "string", description: "사업부 (V_IVI, V_DISP, V_PCBA 등)" },
      category: { type: "string?", description: "업무구분 (자재, 생산, 품질 등)" },
      title: { type: "string", description: "이슈관리명 (제목)" },
      description: { type: "string?", description: "이슈 설명 (상세 내용)" },
      registeredDate: { type: "datetime?", description: "등록일" },
      issuer: { type: "string?", description: "이슈어 (보고자 이름)" },
      requirementCode: { type: "string?", description: "요구사항 번호 (연결용)" },
      assignee: { type: "string?", description: "담당자 이름" },
      status: {
        type: "enum",
        description: "상태",
        values: ["OPEN", "IN_PROGRESS", "RESOLVED", "WONT_FIX", "CLOSED", "PENDING", "COMPLETED"],
      },
      targetDate: { type: "datetime?", description: "타겟일 (목표일)" },
      completedDate: { type: "datetime?", description: "완료일" },
      proposedSolution: { type: "string?", description: "제안된 해결 방안" },
      finalSolution: { type: "string?", description: "최종 적용된 방안" },
      remarks: { type: "string?", description: "참고/비고" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  discussion_items: {
    tableName: "discussion_items",
    description: "협의요청/고객협의사항 테이블 - 결정이 필요한 사항 관리",
    columns: {
      id: { type: "uuid", description: "협의요청 고유 ID (Primary Key)" },
      code: { type: "string", description: "협의요청 코드 (DIS-001 등)" },
      businessUnit: { type: "string", description: "사업부구분 (IT, 생산, 품질 등)" },
      title: { type: "string", description: "협의 주제" },
      description: { type: "string?", description: "상세 내용" },
      status: {
        type: "enum",
        description: "상태",
        values: ["DISCUSSING", "CONVERTED_TO_REQUEST", "CONVERTED_TO_COOPERATION", "BLOCKED", "COMPLETED"],
      },
      stage: {
        type: "enum",
        description: "발생 단계",
        values: ["ANALYSIS", "DESIGN", "IMPLEMENTATION", "TESTING", "OPERATION"],
      },
      priority: {
        type: "enum",
        description: "우선순위",
        values: ["HIGH", "MEDIUM", "LOW"],
      },
      options: { type: "json?", description: "선택지 배열 [{label, description, cost, duration}]" },
      decision: { type: "string?", description: "최종 결정 내용" },
      convertedToType: { type: "enum?", description: "변환 유형", values: ["CUSTOMER_REQUEST", "COOPERATION", "BLOCKED", "COMPLETED"] },
      convertedToCode: { type: "string?", description: "변환된 항목 코드" },
      referenceNote: { type: "string?", description: "참고사항" },
      reportDate: { type: "datetime", description: "보고일" },
      dueDate: { type: "datetime?", description: "협의 기한" },
      resolvedDate: { type: "datetime?", description: "결정 완료일" },
      requesterName: { type: "string?", description: "요청자명" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      reporterId: { type: "uuid?", description: "보고자 ID (FK -> users.id)" },
      assigneeId: { type: "uuid?", description: "담당자 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  interviews: {
    tableName: "interviews",
    description: "인터뷰 기록 테이블 - 현업 담당자 인터뷰 내용 관리",
    columns: {
      id: { type: "uuid", description: "인터뷰 고유 ID (Primary Key)" },
      sequence: { type: "int", description: "순번 (자동 부여)" },
      code: { type: "string", description: "인터뷰 코드 (IV0001 형식)" },
      title: { type: "string", description: "인터뷰 제목" },
      interviewDate: { type: "datetime", description: "인터뷰 일자" },
      interviewer: { type: "string?", description: "인터뷰 진행자 (이름)" },
      interviewee: { type: "string?", description: "인터뷰 대상자 (현업 담당자)" },
      businessUnit: { type: "string", description: "사업부" },
      category: { type: "string?", description: "업무영역 (생산, 구매, 자재, 품질 등)" },
      currentProcess: { type: "string?", description: "1. 현재 운영 방식 (AS-IS)" },
      painPoints: { type: "string?", description: "2. 문제점 (Pain Points)" },
      desiredResults: { type: "string?", description: "3. 원하는 결과 (TO-BE)" },
      technicalConstraints: { type: "string?", description: "4. 기술적 제약" },
      questions: { type: "string?", description: "5. 궁금한 점" },
      transferStatus: {
        type: "enum",
        description: "이관 상태",
        values: ["NOT_TRANSFERRED", "TRANSFERRED"],
      },
      transferredTo: { type: "string?", description: "이관된 항목 코드" },
      transferredType: { type: "enum?", description: "이관 유형", values: ["CUSTOMER_REQUIREMENT", "FIELD_ISSUE", "DISCUSSION_ITEM"] },
      transferredAt: { type: "datetime?", description: "이관 일시" },
      remarks: { type: "string?", description: "참고/비고" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_overviews: {
    tableName: "as_is_overviews",
    description: "AS-IS 분석 총괄 테이블 - 프로젝트별 현행 분석 총괄 정보",
    columns: {
      id: { type: "uuid", description: "총괄 고유 ID (Primary Key)" },
      businessUnit: { type: "string", description: "사업부 구분 (V_IVI, V_DISP, V_PCBA, V_HNS)" },
      customerName: { type: "string?", description: "고객사명" },
      author: { type: "string?", description: "작성자" },
      createdDate: { type: "datetime", description: "작성일" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_overview_items: {
    tableName: "as_is_overview_items",
    description: "AS-IS 업무 항목 테이블 - 업무 분류 체계 (대분류 > 중분류 > 업무명)",
    columns: {
      id: { type: "uuid", description: "항목 고유 ID (Primary Key)" },
      asIsManagementNo: { type: "string?", description: "AS-IS 관리번호 (예: AS-001)" },
      majorCategory: {
        type: "enum",
        description: "대분류",
        values: ["MASTER", "MATERIAL", "PRODUCTION", "QUALITY", "EQUIPMENT", "INVENTORY", "SHIPMENT", "OTHER"],
      },
      middleCategory: { type: "string", description: "중분류 (텍스트 입력)" },
      taskName: { type: "string", description: "업무명 (단위업무)" },
      currentMethod: {
        type: "enum",
        description: "현행방식",
        values: ["MANUAL", "EXCEL", "SYSTEM", "MIXED"],
      },
      issueSummary: { type: "string?", description: "이슈 요약" },
      details: { type: "string?", description: "세부내용" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      overviewId: { type: "uuid", description: "총괄 ID (FK -> as_is_overviews.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  task_connections: {
    tableName: "task_connections",
    description: "태스크 연결 관계 테이블 - 태스크 간 의존관계",
    columns: {
      id: { type: "uuid", description: "연결 고유 ID (Primary Key)" },
      sourceTaskId: { type: "uuid", description: "출발 태스크 ID (FK -> tasks.id)" },
      targetTaskId: { type: "uuid", description: "도착 태스크 ID (FK -> tasks.id)" },
      type: {
        type: "enum",
        description: "연결 타입",
        values: ["FINISH_TO_START", "START_TO_START", "FINISH_TO_FINISH", "START_TO_FINISH"],
      },
      label: { type: "string?", description: "연결 라벨" },
      color: { type: "string?", description: "선 색상" },
      animated: { type: "boolean", description: "애니메이션 효과" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  ai_settings: {
    tableName: "ai_settings",
    description: "AI 설정 테이블 - 사용자별 AI API 키 및 모델 설정",
    columns: {
      id: { type: "uuid", description: "설정 고유 ID (Primary Key)" },
      provider: { type: "string", description: "현재 선택된 제공자 (gemini/mistral)" },
      geminiApiKey: { type: "string?", description: "Gemini API 키 (암호화)" },
      geminiModel: { type: "string", description: "Gemini 모델명" },
      mistralApiKey: { type: "string?", description: "Mistral API 키 (암호화)" },
      mistralModel: { type: "string", description: "Mistral 모델명" },
      sqlSystemPrompt: { type: "string?", description: "SQL 생성 시스템 프롬프트 (커스텀)" },
      analysisSystemPrompt: { type: "string?", description: "분석 시스템 프롬프트 (커스텀)" },
      userId: { type: "uuid", description: "사용자 ID (FK -> users.id, Unique)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  chat_history: {
    tableName: "chat_history",
    description: "AI 채팅 기록 테이블 - 사용자와 AI 간의 대화 기록",
    columns: {
      id: { type: "uuid", description: "채팅 고유 ID (Primary Key)" },
      role: { type: "string", description: "발화자 역할 (user/assistant)" },
      content: { type: "string", description: "메시지 내용" },
      sqlQuery: { type: "string?", description: "실행된 SQL 쿼리" },
      chartType: { type: "string?", description: "차트 타입" },
      chartData: { type: "json?", description: "차트 데이터 (JSON)" },
      mindmapData: { type: "json?", description: "마인드맵 데이터 (JSON)" },
      userQuery: { type: "string?", description: "원본 사용자 질문 (분석용)" },
      processingTimeMs: { type: "int?", description: "처리 시간 (밀리초)" },
      sqlGenTimeMs: { type: "int?", description: "SQL 생성 시간 (밀리초)" },
      sqlExecTimeMs: { type: "int?", description: "SQL 실행 시간 (밀리초)" },
      personaId: { type: "uuid?", description: "사용된 페르소나 ID" },
      userId: { type: "uuid", description: "사용자 ID (FK -> users.id)" },
      projectId: { type: "uuid?", description: "프로젝트 ID (FK -> projects.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
    },
  },

  ai_personas: {
    tableName: "ai_personas",
    description: "AI 페르소나 테이블 - 사용자 정의 AI 캐릭터",
    columns: {
      id: { type: "uuid", description: "페르소나 고유 ID (Primary Key)" },
      name: { type: "string", description: "페르소나 이름" },
      description: { type: "string?", description: "페르소나 설명" },
      systemPrompt: { type: "string", description: "시스템 프롬프트" },
      isDefault: { type: "boolean", description: "기본 페르소나 여부" },
      userId: { type: "uuid", description: "사용자 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  chat_feedback: {
    tableName: "chat_feedback",
    description: "채팅 피드백 테이블 - 응답 품질 피드백",
    columns: {
      id: { type: "uuid", description: "피드백 고유 ID (Primary Key)" },
      rating: {
        type: "enum",
        description: "평가",
        values: ["GOOD", "BAD"],
      },
      comment: { type: "string?", description: "추가 코멘트" },
      chatHistoryId: { type: "uuid", description: "채팅 기록 ID (FK -> chat_history.id)" },
      userId: { type: "uuid", description: "사용자 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
    },
  },

  slack_settings: {
    tableName: "slack_settings",
    description: "Slack 연동 설정 테이블",
    columns: {
      id: { type: "uuid", description: "설정 고유 ID (Primary Key)" },
      webhookUrl: { type: "string", description: "Slack 웹훅 URL" },
      channel: { type: "string?", description: "알림 채널명" },
      isEnabled: { type: "boolean", description: "활성화 여부" },
      notifyOnTaskCreate: { type: "boolean", description: "태스크 생성 시 알림" },
      notifyOnTaskComplete: { type: "boolean", description: "태스크 완료 시 알림" },
      notifyOnIssueCreate: { type: "boolean", description: "이슈 생성 시 알림" },
      notifyOnMilestone: { type: "boolean", description: "마일스톤 알림" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id, Unique)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  workload_analyses: {
    tableName: "workload_analyses",
    description: "업무량 분석 테이블",
    columns: {
      id: { type: "uuid", description: "분석 고유 ID (Primary Key)" },
      year: { type: "int", description: "연도" },
      weekNumber: { type: "int", description: "주차" },
      totalTasks: { type: "int", description: "전체 태스크 수" },
      completedTasks: { type: "int", description: "완료된 태스크 수" },
      overdueTasks: { type: "int", description: "지연된 태스크 수" },
      avgCompletionTime: { type: "float?", description: "평균 완료 시간 (시간)" },
      projectId: { type: "uuid", description: "프로젝트 ID (FK -> projects.id)" },
      userId: { type: "uuid?", description: "사용자 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
    },
  },

  // ============================================
  // AS-IS 단위업무 분석 관련 테이블 (2026-01-20)
  // ============================================

  as_is_unit_analyses: {
    tableName: "as_is_unit_analyses",
    description: "AS-IS 단위업무 상세 분석 테이블 (개요 항목별 1:1 연결)",
    columns: {
      id: { type: "uuid", description: "분석 고유 ID (Primary Key)" },
      flowChartData: { type: "json?", description: "React Flow 노드/엣지 데이터 (JSON)" },
      swimlaneData: { type: "json?", description: "Swimlane 노드/엣지 데이터 (JSON)" },
      overviewItemId: { type: "uuid", description: "개요 항목 ID (FK -> as_is_overview_items.id, Unique)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_process_definitions: {
    tableName: "as_is_process_definitions",
    description: "AS-IS 업무 프로세스 정의서 테이블",
    columns: {
      id: { type: "uuid", description: "정의 고유 ID (Primary Key)" },
      stepNumber: { type: "int", description: "순서 번호" },
      processName: { type: "string", description: "프로세스명" },
      description: { type: "string?", description: "설명" },
      input: { type: "string?", description: "입력" },
      output: { type: "string?", description: "출력" },
      relatedSystem: { type: "string?", description: "관련 시스템" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_flow_chart_details: {
    tableName: "as_is_flow_chart_details",
    description: "AS-IS Flow Chart 상세 정보 테이블",
    columns: {
      id: { type: "uuid", description: "상세 고유 ID (Primary Key)" },
      nodeId: { type: "string?", description: "React Flow 노드 ID (연동용)" },
      stepNumber: { type: "int", description: "순서 번호" },
      processName: { type: "string", description: "프로세스명" },
      description: { type: "string?", description: "설명" },
      responsible: { type: "string?", description: "담당자/부서" },
      systemUsed: { type: "string?", description: "사용 시스템" },
      inputData: { type: "string?", description: "입력 데이터" },
      outputData: { type: "string?", description: "출력 데이터" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_responsibilities: {
    tableName: "as_is_responsibilities",
    description: "AS-IS R&R (역할과 책임) 정의 테이블",
    columns: {
      id: { type: "uuid", description: "R&R 고유 ID (Primary Key)" },
      role: { type: "string", description: "역할/담당자" },
      department: { type: "string?", description: "부서" },
      responsibility: { type: "string", description: "책임/업무" },
      authority: { type: "string?", description: "권한" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_interviews: {
    tableName: "as_is_interviews",
    description: "AS-IS 현업 인터뷰 결과 테이블",
    columns: {
      id: { type: "uuid", description: "인터뷰 고유 ID (Primary Key)" },
      interviewee: { type: "string", description: "인터뷰 대상자" },
      department: { type: "string?", description: "부서" },
      position: { type: "string?", description: "직책" },
      interviewDate: { type: "datetime?", description: "인터뷰 일자" },
      topic: { type: "string?", description: "인터뷰 주제" },
      content: { type: "string", description: "인터뷰 내용" },
      keyFindings: { type: "string?", description: "주요 발견사항" },
      suggestions: { type: "string?", description: "개선 제안" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_issues: {
    tableName: "as_is_issues",
    description: "AS-IS 이슈/Pain Point 테이블",
    columns: {
      id: { type: "uuid", description: "이슈 고유 ID (Primary Key)" },
      issueType: {
        type: "enum",
        description: "이슈 유형",
        values: ["PAIN_POINT", "BOTTLENECK", "GAP", "OTHER"],
      },
      title: { type: "string", description: "이슈 제목" },
      description: { type: "string?", description: "상세 설명" },
      impact: { type: "string?", description: "영향도" },
      frequency: { type: "string?", description: "발생 빈도" },
      priority: { type: "string?", description: "우선순위 (HIGH, MEDIUM, LOW)" },
      suggestedFix: { type: "string?", description: "개선 제안" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_documents: {
    tableName: "as_is_documents",
    description: "AS-IS 관련 문서 목록 테이블",
    columns: {
      id: { type: "uuid", description: "문서 고유 ID (Primary Key)" },
      documentName: { type: "string", description: "문서명" },
      documentType: { type: "string?", description: "문서 유형 (양식, 보고서, 대장 등)" },
      purpose: { type: "string?", description: "용도" },
      creator: { type: "string?", description: "작성 주체" },
      frequency: { type: "string?", description: "작성 빈도" },
      storageLocation: { type: "string?", description: "보관 위치" },
      retentionPeriod: { type: "string?", description: "보관 기간" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_document_analyses: {
    tableName: "as_is_document_analyses",
    description: "AS-IS 문서 분석 (필드 단위) 테이블",
    columns: {
      id: { type: "uuid", description: "분석 고유 ID (Primary Key)" },
      documentName: { type: "string", description: "분석 대상 문서명" },
      fieldName: { type: "string", description: "필드/항목명" },
      dataType: { type: "string?", description: "데이터 타입" },
      sampleData: { type: "string?", description: "샘플 데이터" },
      isMandatory: { type: "boolean", description: "필수 여부" },
      validationRule: { type: "string?", description: "검증 규칙" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_functions: {
    tableName: "as_is_functions",
    description: "AS-IS 기능 목록 테이블",
    columns: {
      id: { type: "uuid", description: "기능 고유 ID (Primary Key)" },
      functionId: { type: "string?", description: "기능 ID" },
      functionName: { type: "string", description: "기능명" },
      description: { type: "string?", description: "기능 설명" },
      module: { type: "string?", description: "모듈명" },
      usageFrequency: { type: "string?", description: "사용 빈도" },
      userCount: { type: "string?", description: "사용자 수" },
      importance: { type: "string?", description: "중요도 (HIGH, MEDIUM, LOW)" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_screens: {
    tableName: "as_is_screens",
    description: "AS-IS 화면 목록 테이블",
    columns: {
      id: { type: "uuid", description: "화면 고유 ID (Primary Key)" },
      screenId: { type: "string?", description: "화면 ID" },
      screenName: { type: "string", description: "화면명" },
      description: { type: "string?", description: "화면 설명" },
      menuPath: { type: "string?", description: "메뉴 경로" },
      screenType: { type: "string?", description: "화면 유형 (조회, 등록, 수정, 리포트 등)" },
      relatedFunction: { type: "string?", description: "연관 기능" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_interfaces: {
    tableName: "as_is_interfaces",
    description: "AS-IS 인터페이스 정의 테이블",
    columns: {
      id: { type: "uuid", description: "인터페이스 고유 ID (Primary Key)" },
      interfaceId: { type: "string?", description: "인터페이스 ID" },
      interfaceName: { type: "string", description: "인터페이스명" },
      description: { type: "string?", description: "설명" },
      sourceSystem: { type: "string?", description: "송신 시스템" },
      targetSystem: { type: "string?", description: "수신 시스템" },
      interfaceType: { type: "string?", description: "유형 (실시간, 배치, 파일 등)" },
      protocol: { type: "string?", description: "프로토콜 (REST, SOAP, FILE 등)" },
      frequency: { type: "string?", description: "연동 빈도" },
      dataVolume: { type: "string?", description: "데이터 건수" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_data_models: {
    tableName: "as_is_data_models",
    description: "AS-IS 데이터 모델 (테이블/컬럼 정의) 테이블",
    columns: {
      id: { type: "uuid", description: "모델 고유 ID (Primary Key)" },
      tableName: { type: "string", description: "테이블명" },
      tableNameKr: { type: "string?", description: "테이블 한글명" },
      description: { type: "string?", description: "설명" },
      columnName: { type: "string?", description: "컬럼명" },
      columnNameKr: { type: "string?", description: "컬럼 한글명" },
      dataType: { type: "string?", description: "데이터 타입" },
      length: { type: "string?", description: "길이" },
      isPrimaryKey: { type: "boolean", description: "PK 여부" },
      isForeignKey: { type: "boolean", description: "FK 여부" },
      isNullable: { type: "boolean", description: "NULL 허용" },
      defaultValue: { type: "string?", description: "기본값" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  as_is_code_definitions: {
    tableName: "as_is_code_definitions",
    description: "AS-IS 코드 정의 (공통코드) 테이블",
    columns: {
      id: { type: "uuid", description: "코드 고유 ID (Primary Key)" },
      codeGroup: { type: "string", description: "코드 그룹" },
      codeGroupName: { type: "string?", description: "코드 그룹명" },
      codeValue: { type: "string", description: "코드 값" },
      codeName: { type: "string", description: "코드명" },
      description: { type: "string?", description: "설명" },
      isActive: { type: "boolean", description: "사용 여부" },
      remarks: { type: "string?", description: "비고" },
      order: { type: "int", description: "정렬 순서" },
      unitAnalysisId: { type: "uuid", description: "단위분석 ID (FK -> as_is_unit_analyses.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  // ============================================
  // 기타 누락 테이블 (2026-01-20)
  // ============================================

  task_nudges: {
    tableName: "task_nudges",
    description: "태스크 넛지 (리마인더/재촉) 테이블",
    columns: {
      id: { type: "uuid", description: "넛지 고유 ID (Primary Key)" },
      message: { type: "string?", description: "재촉 메시지" },
      taskId: { type: "uuid", description: "태스크 ID (FK -> tasks.id)" },
      nudgerId: { type: "uuid", description: "재촉한 사람 ID (FK -> users.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
    },
  },

  process_verification_masters: {
    tableName: "process_verification_masters",
    description: "공정검증 마스터 (관리코드별 정보) 테이블",
    columns: {
      id: { type: "uuid", description: "마스터 고유 ID (Primary Key)" },
      managementCode: { type: "string", description: "관리코드 (M-1-01, P-1-01 등)" },
      productType: { type: "string", description: "제품유형 (SMD, HANES 등)" },
      category: { type: "string", description: "구분 (재료관리, SMD공정관리 등)" },
      managementArea: { type: "string", description: "(L1) 관리 영역" },
      detailItem: { type: "string", description: "(L2) 세부 관리 항목" },
      mesMapping: { type: "string?", description: "(L3) MES/IT 매핑 기능명" },
      verificationDetail: { type: "string?", description: "세부 검증 내용 및 점검 기준" },
      acceptanceStatus: { type: "string?", description: "수용 여부" },
      existingMes: { type: "boolean", description: "기존MES유무 (Y/N)" },
      customerRequest: { type: "string?", description: "고객요청여부" },
      asIsCode: { type: "string?", description: "AS-IS 관리번호" },
      toBeCode: { type: "string?", description: "TO-BE 관리번호" },
      order: { type: "int", description: "정렬 순서" },
      remarks: { type: "string?", description: "비고" },
      categoryId: { type: "uuid", description: "카테고리 ID (FK -> process_verification_categories.id)" },
      createdAt: { type: "datetime", description: "생성일시" },
      updatedAt: { type: "datetime", description: "수정일시" },
    },
  },

  process_verification_business_units: {
    tableName: "process_verification_business_units",
    description: "공정검증 사업부별 적용 현황 테이블",
    columns: {
      id: { type: "uuid", description: "적용 고유 ID (Primary Key)" },
      businessUnit: { type: "string", description: "사업부 코드 (V_IVI, V_DISP, V_PCBA, V_HMS)" },
      isApplied: { type: "boolean", description: "적용여부 (Y/N)" },
      status: {
        type: "enum",
        description: "검증 상태",
        values: ["PENDING", "IN_PROGRESS", "COMPLETED", "NA"],
      },
      masterId: { type: "uuid", description: "마스터 ID (FK -> process_verification_masters.id)" },
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

19. **field_issues** (필드이슈/고객이슈)
    - N:1 → projects

20. **discussion_items** (협의요청/고객협의사항)
    - N:1 → projects
    - N:1 → users (보고자, 담당자)

21. **interviews** (인터뷰)
    - N:1 → projects

22. **as_is_overviews** (AS-IS 분석 총괄)
    - N:1 → projects
    - 1:N → as_is_overview_items (업무 항목들)

23. **as_is_overview_items** (AS-IS 업무 항목)
    - N:1 → as_is_overviews
    - 1:1 → as_is_unit_analyses (단위업무 상세 분석)

24. **as_is_unit_analyses** (AS-IS 단위업무 분석)
    - 1:1 → as_is_overview_items
    - 1:N → as_is_process_definitions (프로세스 정의서)
    - 1:N → as_is_flow_chart_details (플로우차트 상세)
    - 1:N → as_is_responsibilities (R&R)
    - 1:N → as_is_interviews (현업 인터뷰)
    - 1:N → as_is_issues (이슈/Pain Point)
    - 1:N → as_is_documents (관련 문서)
    - 1:N → as_is_document_analyses (문서 분석)
    - 1:N → as_is_functions (기능 목록)
    - 1:N → as_is_screens (화면 목록)
    - 1:N → as_is_interfaces (인터페이스)
    - 1:N → as_is_data_models (데이터 모델)
    - 1:N → as_is_code_definitions (코드 정의)

25. **task_nudges** (태스크 넛지/리마인더)
    - N:1 → tasks
    - N:1 → users (재촉한 사람)

26. **process_verification_masters** (공정검증 마스터)
    - N:1 → process_verification_categories
    - 1:N → process_verification_business_units (사업부별 적용)

27. **process_verification_business_units** (공정검증 사업부별)
    - N:1 → process_verification_masters
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

// ============================================
// 2단계 LLM 파이프라인용 테이블 요약 정보
// 1단계: 테이블 선택 LLM에서 사용
// ============================================

/**
 * 테이블 요약 정보 (1단계 LLM용)
 * - description: 테이블 설명
 * - keywords: 연관 키워드 (오타, 유사어, 관련 용어 포함)
 */
export const TABLE_SUMMARIES: Record<string, { description: string; keywords: string[] }> = {
  // === 핵심 테이블 ===
  users: {
    description: "사용자/팀원 정보",
    keywords: ["사용자", "유저", "user", "멤버", "팀원", "담당자", "이름", "이메일", "직원", "인원"]
  },
  projects: {
    description: "프로젝트 정보",
    keywords: ["프로젝트", "project", "사업", "진행률", "상태", "시작일", "종료일", "목적"]
  },
  tasks: {
    description: "칸반 태스크/업무 관리",
    keywords: ["태스크", "task", "업무", "할일", "일감", "작업", "칸반", "진행중", "완료", "대기", "지연"]
  },
  task_assignees: {
    description: "태스크 담당자 매핑 (다대다)",
    keywords: ["태스크담당자", "업무담당", "배정", "할당"]
  },

  // === 요구사항/이슈 관리 ===
  requirements: {
    description: "요구사항 점검표 (업무협조요청)",
    keywords: ["요구사항", "requirement", "협조요청", "업무협조", "점검표", "MoSCoW", "우선순위"]
  },
  issues: {
    description: "이슈사항 점검표 (내부 이슈)",
    keywords: ["이슈", "issue", "버그", "문제", "결함", "개선", "점검표"]
  },
  customer_requirements: {
    description: "고객요구사항 관리",
    keywords: ["고객요구", "고객요청", "RQIT", "기능명", "적용방안", "요청자", "고객"]
  },
  field_issues: {
    description: "필드이슈/고객이슈/현업이슈",
    keywords: ["필드이슈", "고객이슈", "현업이슈", "현장문제", "이슈등록", "IS코드", "해결방안"]
  },
  discussion_items: {
    description: "협의요청/고객협의사항",
    keywords: ["협의", "논의", "협의요청", "협의사항", "결정필요", "의사결정", "DIS코드", "선택지"]
  },
  interviews: {
    description: "인터뷰 기록 (현업 담당자)",
    keywords: ["인터뷰", "interview", "면담", "현업", "AS-IS", "TO-BE", "Pain Point"]
  },

  // === WBS 관리 ===
  wbs_items: {
    description: "WBS 항목 (계층형 작업분류체계)",
    keywords: ["WBS", "작업분류", "대분류", "중분류", "소분류", "단위업무", "산출물", "가중치", "진행률"]
  },
  wbs_assignees: {
    description: "WBS 담당자 매핑 (다대다)",
    keywords: ["WBS담당자", "WBS배정", "WBS할당"]
  },

  // === 일정/타임라인 ===
  holidays: {
    description: "일정/휴무 관리",
    keywords: ["일정", "휴무", "휴가", "미팅", "데드라인", "스케줄", "달력", "캘린더"]
  },
  timeline_rows: {
    description: "타임라인 행 (계층형)",
    keywords: ["타임라인", "timeline", "행", "row", "간트차트"]
  },
  milestones: {
    description: "마일스톤 (프로젝트 이정표)",
    keywords: ["마일스톤", "milestone", "이정표", "일정", "기간", "막대"]
  },
  pinpoints: {
    description: "핀포인트 (중요 시점 마커)",
    keywords: ["핀포인트", "pinpoint", "시점", "마커", "오픈", "런칭", "베타"]
  },

  // === 주간보고 ===
  weekly_reports: {
    description: "주간보고서",
    keywords: ["주간보고", "주보", "weekly", "주차", "실적", "계획", "이슈내용"]
  },
  weekly_report_items: {
    description: "주간보고 항목 (전주실적/차주계획)",
    keywords: ["주간항목", "실적", "계획", "업무내용", "진행률", "완료여부"]
  },
  weekly_summaries: {
    description: "주간보고 취합/LLM 분석",
    keywords: ["취합", "통합", "LLM분석", "인사이트", "요약"]
  },

  // === 팀/조직 ===
  team_members: {
    description: "프로젝트 팀멤버",
    keywords: ["팀멤버", "팀원", "역할", "부서", "직급", "PMO", "PL"]
  },

  // === 공정검증표 (기능추적표) ===
  process_verification_categories: {
    description: "공정검증 카테고리",
    keywords: ["공정검증", "기능추적", "카테고리", "재료관리", "SMD", "검사"]
  },
  process_verification_items: {
    description: "공정검증 항목",
    keywords: ["공정항목", "검증항목", "MES매핑", "관리코드", "수용여부"]
  },

  // === 문서 관리 ===
  documents: {
    description: "문서함 (공용/개인)",
    keywords: ["문서", "document", "파일", "OneDrive", "업로드", "태그", "즐겨찾기"]
  },

  // === 설비 관리 (MES) ===
  equipments: {
    description: "MES 설비 관리",
    keywords: ["설비", "equipment", "기계", "장비", "노드", "라인", "IP주소", "인터락"]
  },
  equipment_properties: {
    description: "설비 동적 속성",
    keywords: ["설비속성", "온도", "압력", "용량", "커스텀속성"]
  },
  equipment_connections: {
    description: "설비 연결 관계 (Flow)",
    keywords: ["설비연결", "흐름", "신호", "의존관계", "엣지"]
  },

  // === 알림 ===
  notifications: {
    description: "사용자 알림",
    keywords: ["알림", "notification", "읽음", "미확인", "마일스톤임박"]
  },

  // === AI/채팅 ===
  ai_settings: {
    description: "AI 설정 (API 키, 모델)",
    keywords: ["AI설정", "Gemini", "Mistral", "API키", "모델"]
  },
  ai_personas: {
    description: "AI 페르소나",
    keywords: ["페르소나", "캐릭터", "시스템프롬프트"]
  },
  chat_history: {
    description: "AI 채팅 기록",
    keywords: ["채팅", "대화", "질문", "응답", "SQL"]
  },
  chat_feedback: {
    description: "채팅 피드백",
    keywords: ["피드백", "좋아요", "싫어요", "평가"]
  },

  // === AS-IS 분석 ===
  as_is_overviews: {
    description: "AS-IS 분석 총괄",
    keywords: ["AS-IS", "현행분석", "사업부", "V_IVI", "V_DISP", "V_PCBA", "V_HNS"]
  },
  as_is_overview_items: {
    description: "AS-IS 업무 항목 (대/중분류)",
    keywords: ["AS-IS항목", "대분류", "중분류", "업무명", "현행방식", "수기", "엑셀", "시스템"]
  },
  as_is_unit_analyses: {
    description: "AS-IS 단위업무 분석",
    keywords: ["단위업무", "분석", "Input", "Output", "시스템연동"]
  },
  as_is_process_definitions: {
    description: "AS-IS 프로세스 정의",
    keywords: ["프로세스", "절차", "단계", "흐름"]
  },
  as_is_flow_chart_details: {
    description: "AS-IS 플로우차트 상세",
    keywords: ["플로우차트", "flowchart", "상세흐름"]
  },
  as_is_responsibilities: {
    description: "AS-IS R&R (역할과 책임)",
    keywords: ["R&R", "역할", "책임", "담당"]
  },
  as_is_interviews: {
    description: "AS-IS 인터뷰 내용",
    keywords: ["AS-IS인터뷰", "현업면담", "Pain Point"]
  },
  as_is_issues: {
    description: "AS-IS 이슈 목록",
    keywords: ["AS-IS이슈", "현행문제", "개선점"]
  },
  as_is_documents: {
    description: "AS-IS 관련 문서",
    keywords: ["AS-IS문서", "현행문서", "참고자료"]
  },
  as_is_document_analyses: {
    description: "AS-IS 문서 분석",
    keywords: ["문서분석", "현행분석"]
  },
  as_is_functions: {
    description: "AS-IS 기능 목록",
    keywords: ["AS-IS기능", "현행기능", "시스템기능"]
  },
  as_is_screens: {
    description: "AS-IS 화면 목록",
    keywords: ["AS-IS화면", "현행화면", "UI"]
  },
  as_is_interfaces: {
    description: "AS-IS 인터페이스",
    keywords: ["인터페이스", "연동", "API", "데이터교환"]
  },
  as_is_data_models: {
    description: "AS-IS 데이터 모델",
    keywords: ["데이터모델", "테이블", "ERD", "스키마"]
  },
  as_is_code_definitions: {
    description: "AS-IS 코드 정의",
    keywords: ["코드정의", "공통코드", "코드값"]
  },

  // === 기타 ===
  task_connections: {
    description: "태스크 연결 관계",
    keywords: ["태스크연결", "의존관계", "선후관계"]
  },
  task_nudges: {
    description: "태스크 넛지 (리마인더)",
    keywords: ["넛지", "리마인더", "알림", "독촉"]
  },
  slack_settings: {
    description: "Slack 연동 설정",
    keywords: ["슬랙", "Slack", "웹훅", "알림"]
  },
  workload_analyses: {
    description: "업무량 분석",
    keywords: ["업무량", "워크로드", "부하", "분석"]
  },
  process_verification_masters: {
    description: "공정검증 마스터",
    keywords: ["검증마스터", "템플릿"]
  },
  process_verification_business_units: {
    description: "공정검증 사업부별 설정",
    keywords: ["검증사업부", "사업부설정"]
  },
};

/**
 * 1단계 LLM용: 테이블 요약 목록 생성
 * 테이블명 + 설명 + 연관 키워드를 한 줄로 출력
 * @returns {string} 테이블 요약 목록 (약 500~800 토큰)
 */
export function getTableSummariesForLLM(): string {
  let result = "# 테이블 목록 (관련 테이블을 선택하세요)\n\n";
  result += "| 테이블명 | 설명 | 연관 키워드 |\n";
  result += "|----------|------|-------------|\n";

  for (const [tableName, info] of Object.entries(TABLE_SUMMARIES)) {
    result += `| ${tableName} | ${info.description} | ${info.keywords.join(", ")} |\n`;
  }

  return result;
}

/**
 * 2단계 LLM용: 선택된 테이블의 상세 스키마만 반환
 * @param tables 선택된 테이블명 배열
 * @returns {string} 선택된 테이블들의 상세 스키마
 */
export function getDynamicSchemaInfo(tables: string[]): string {
  let result = "# 선택된 테이블 스키마\n\n";

  for (const tableName of tables) {
    // DATABASE_SCHEMA에서 테이블 찾기 (snake_case → camelCase 변환 시도)
    const schemaKey = Object.keys(DATABASE_SCHEMA).find(
      (key) => key === tableName ||
               key === tableName.replace(/_/g, "") ||
               DATABASE_SCHEMA[key as keyof typeof DATABASE_SCHEMA]?.tableName === tableName
    );

    if (schemaKey) {
      const table = DATABASE_SCHEMA[schemaKey as keyof typeof DATABASE_SCHEMA];
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
        result += `| "${colName}" | ${typeStr} | ${colInfo.description} |\n`;
      }
      result += "\n";
    } else {
      // DATABASE_SCHEMA에 없는 테이블은 간단히 표시
      result += `## ${tableName}\n`;
      result += `(상세 스키마 정보 없음 - Prisma 모델 참조)\n\n`;
    }
  }

  // 선택된 테이블 간의 관계 정보 추가
  result += getSelectedTableRelationships(tables);

  return result;
}

/**
 * 선택된 테이블들 간의 관계 정보만 추출
 * @param tables 선택된 테이블명 배열
 * @returns {string} 관련된 관계 정보만
 */
function getSelectedTableRelationships(tables: string[]): string {
  const tableSet = new Set(tables.map(t => t.toLowerCase().replace(/_/g, "")));

  let result = "## 테이블 관계\n\n";

  // 기본 관계 설명
  if (tableSet.has("tasks") || tableSet.has("task")) {
    result += "- tasks N:1 → projects (projectId)\n";
    result += "- tasks N:M → users (task_assignees 테이블 통해)\n";
    if (tableSet.has("users") || tableSet.has("user")) {
      result += "- tasks.assigneeId → users.id (주 담당자)\n";
      result += "- tasks.creatorId → users.id (생성자)\n";
    }
  }

  if (tableSet.has("wbsitems") || tableSet.has("wbs")) {
    result += "- wbs_items 자기참조: parentId → wbs_items.id (계층 구조)\n";
    result += "- wbs_items N:M → users (wbs_assignees 테이블 통해, assigneeId 컬럼 없음!)\n";
  }

  if (tableSet.has("fieldissues")) {
    result += "- field_issues N:1 → projects (projectId)\n";
  }

  if (tableSet.has("discussionitems")) {
    result += "- discussion_items N:1 → projects (projectId)\n";
    result += "- discussion_items N:1 → users (reporterId, assigneeId)\n";
  }

  if (tableSet.has("customerrequirements")) {
    result += "- customer_requirements N:1 → projects (projectId)\n";
  }

  if (tableSet.has("milestones")) {
    result += "- milestones N:1 → projects (projectId)\n";
    result += "- milestones N:1 → timeline_rows (rowId)\n";
  }

  if (tableSet.has("weeklyreports")) {
    result += "- weekly_reports N:1 → projects (projectId)\n";
    result += "- weekly_reports N:1 → users (userId)\n";
    result += "- weekly_reports 1:N → weekly_report_items\n";
  }

  return result;
}
