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
 * AI 채팅 SQL 이 볼 수 있는 테이블 (2026-11-09 정리)
 * 베트남 잔재(업무기능추적표, AS-IS 상세 분석)와 설정·알림·채팅 테이블은 뺐다.
 * 늘리려면 이 목록, DATABASE_SCHEMA, TABLE_SUMMARIES 를 함께 고친다 (schema-info.test.ts 가 검사).
 */
export const CHAT_SCHEMA_TABLES = [
  "users", "projects", "team_members", "tasks", "task_assignees", "wbs_items", "wbs_assignees",
  "milestones", "timeline_rows", "issues", "requirements", "customer_requirements", "field_issues",
  "discussion_items", "interviews", "equipments", "equipment_connections", "weekly_reports",
  "weekly_report_items", "documents", "as_is_overviews", "as_is_overview_items",
] as const;

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
  customer_requirements: {
    tableName: "customer_requirements",
    description: "고객요구사항 테이블 - 고객사 요구사항 추적 관리",
    columns: {
      id: { type: "uuid", description: "요구사항 고유 ID (Primary Key)" },
      sequence: { type: "int", description: "순번 (자동 부여)" },
      code: { type: "string", description: "관리번호 (RQIT_00001 형식)" },
      businessUnit: { type: "string", description: "내부 고정값 POLE (화면에서 사업부 구분 안 함, 필터에 쓰지 말 것)" },
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
      divisionCode: { type: "string?", description: "구분 코드 (선택, 화면에서 사용 안 함)" },
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
      businessUnit: { type: "string", description: "내부 고정값 POLE (화면에서 사업부 구분 안 함, 필터에 쓰지 말 것)" },
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
      businessUnit: { type: "string", description: "내부 고정값 POLE (화면에서 사업부 구분 안 함, 필터에 쓰지 말 것)" },
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
      businessUnit: { type: "string", description: "내부 고정값 POLE (화면에서 사업부 구분 안 함, 필터에 쓰지 말 것)" },
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
      businessUnit: { type: "string", description: "내부 고정값 POLE (화면에서 사업부 구분 안 함, 필터에 쓰지 말 것)" },
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








  // ============================================
  // AS-IS 단위업무 분석 관련 테이블 (2026-01-20)
  // ============================================














  // ============================================
  // 기타 누락 테이블 (2026-01-20)
  // ============================================



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
   - 1:N → documents (문서 등록자)

2. **projects** (프로젝트)
   - 1:N → tasks, requirements, issues, wbs_items, team_members
   - 1:N → customer_requirements (고객요구사항)
   - 1:N → documents (문서함)
   - 1:N → timeline_rows (타임라인 행)
   - 1:N → milestones (마일스톤)
   - 1:N → weekly_reports (주간보고)
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

7. **customer_requirements** (고객요구사항)
   - N:1 → projects

8. **documents** (문서함)
   - N:1 → projects
   - N:1 → users (등록자)

9. **timeline_rows** (타임라인 행)
   - 자기참조 (parentId로 계층 구조)
   - N:1 → projects
   - 1:N → milestones (행에 속한 마일스톤들)

10. **milestones** (마일스톤)
    - N:1 → projects
    - N:1 → timeline_rows (선택적 연결)

12. **weekly_reports** (주간보고)
    - N:1 → projects
    - N:1 → users (작성자)
    - 1:N → weekly_report_items (보고서 내 항목들)

13. **weekly_report_items** (주간보고 항목)
    - N:1 → weekly_reports
    - N:1 → tasks (선택적 연결)
    - N:1 → wbs_items (선택적 연결)

15. **equipments** (설비)
    - N:1 → projects
    - N:M → equipments (equipment_connections를 통해)

17. **equipment_connections** (설비 연결)
    - N:1 → equipments (출발 설비)
    - N:1 → equipments (도착 설비)

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
  return `\n\n**현재 프로젝트 ID**: \`${projectId}\`
프로젝트 관련 테이블 조회 시 \`"projectId" = '${projectId}'\` 조건을 사용하세요.

**⚠️ projectId가 없는 테이블 (조건 추가 금지!)**:
- users
- task_assignees, wbs_assignees, weekly_report_items, equipment_connections, as_is_overview_items (부모 테이블을 JOIN 해서 projectId 로 거른다)`;
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
  timeline_rows: {
    description: "타임라인 행 (계층형)",
    keywords: ["타임라인", "timeline", "행", "row", "간트차트"]
  },
  milestones: {
    description: "마일스톤 (프로젝트 이정표)",
    keywords: ["마일스톤", "milestone", "이정표", "일정", "기간", "막대"]
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

  // === 팀/조직 ===
  team_members: {
    description: "프로젝트 팀멤버",
    keywords: ["팀멤버", "팀원", "역할", "부서", "직급", "PMO", "PL"]
  },

  // === 공정검증표 (기능추적표) ===

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
  equipment_connections: {
    description: "설비 연결 관계 (Flow)",
    keywords: ["설비연결", "흐름", "신호", "의존관계", "엣지"]
  },

  // === 알림 ===

  // === AI/채팅 ===

  // === AS-IS 분석 ===
  as_is_overviews: {
    description: "AS-IS 분석 총괄",
    keywords: ["AS-IS", "현행분석"]
  },
  as_is_overview_items: {
    description: "AS-IS 업무 항목 (대/중분류)",
    keywords: ["AS-IS항목", "대분류", "중분류", "업무명", "현행방식", "수기", "엑셀", "시스템"]
  },

  // === 기타 ===
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
