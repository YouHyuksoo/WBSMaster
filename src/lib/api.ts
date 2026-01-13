/**
 * @file src/lib/api.ts
 * @description
 * API 호출을 위한 클라이언트 유틸리티입니다.
 * fetch를 래핑하여 타입 안전성과 에러 처리를 제공합니다.
 *
 * 초보자 가이드:
 * 1. **api 객체**: 각 리소스별 CRUD 메서드 제공
 * 2. **에러 처리**: 자동으로 에러 응답 처리
 * 3. **타입 안전성**: TypeScript 타입 제공
 *
 * @example
 * import { api } from '@/lib/api';
 *
 * // 프로젝트 목록 조회
 * const projects = await api.projects.list();
 *
 * // 프로젝트 생성
 * const newProject = await api.projects.create({ name: '새 프로젝트' });
 */

/** API 에러 클래스 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** API 응답 처리 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "알 수 없는 오류" }));
    throw new ApiError(response.status, error.error || "요청 실패");
  }
  return response.json();
}

/** 기본 fetch 옵션 */
const defaultOptions: RequestInit = {
  headers: {
    "Content-Type": "application/json",
  },
};

/** GET 요청 */
async function get<T>(url: string, params?: Record<string, string | undefined>): Promise<T> {
  // undefined 값 필터링
  const filteredParams = params
    ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null))
    : undefined;
  const searchParams = filteredParams && Object.keys(filteredParams).length > 0
    ? `?${new URLSearchParams(filteredParams as Record<string, string>)}`
    : "";
  const response = await fetch(`${url}${searchParams}`, {
    ...defaultOptions,
    method: "GET",
  });
  return handleResponse<T>(response);
}

/** POST 요청 */
async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await fetch(url, {
    ...defaultOptions,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(response);
}

/** PATCH 요청 */
async function patch<T>(url: string, data?: unknown): Promise<T> {
  const response = await fetch(url, {
    ...defaultOptions,
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(response);
}

/** DELETE 요청 */
async function del<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    ...defaultOptions,
    method: "DELETE",
  });
  return handleResponse<T>(response);
}

// ============================================
// 타입 정의
// ============================================

/** 프로젝트 타입 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  startDate?: string;
  endDate?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner?: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
  teamMembers?: TeamMember[];
  _count?: {
    tasks: number;
    requirements: number;
  };
}

/** 태스크 타입 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "HOLDING" | "DELAYED" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  startDate?: string;  // 시작일
  dueDate?: string;    // 마감일
  order: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  creatorId: string;
  requirementId?: string | null; // 연결된 요구사항 ID
  /** 주 담당자 ID (이 태스크가 누구의 것인지) */
  assigneeId?: string | null;
  /** 주 담당자 정보 */
  assignee?: {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
  } | null;
  /** 부 담당자 목록 (다중 담당자, 협업자) */
  assignees?: {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
  }[];
  creator?: {
    id: string;
    name?: string;
  };
  /** 연결된 요구사항 정보 */
  requirement?: {
    id: string;
    code?: string;
    title: string;
    status: string;
    priority: string;
  } | null;
  /** 재촉 목록 */
  nudges?: {
    id: string;
    message?: string | null;
    createdAt: string;
    nudger: {
      id: string;
      name?: string;
      avatar?: string;
    };
  }[];
}

/** 요구사항 타입 */
export interface Requirement {
  id: string;
  code?: string;
  title: string;
  description?: string;
  category?: string;
  oneDriveLink?: string;
  status: "DRAFT" | "APPROVED" | "REJECTED" | "IMPLEMENTED";
  priority: "MUST" | "SHOULD" | "COULD" | "WONT";
  requestDate: string;
  dueDate?: string;
  isDelayed: boolean;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  requesterId?: string;
  requester?: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
  assigneeId?: string;
  assignee?: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
  /** 연결된 태스크 목록 */
  tasks?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  }[];
  /** 연결된 태스크 개수 */
  _count?: {
    tasks: number;
  };
}

/** 휴무/일정 타입 */
export interface Holiday {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  type: string;
  isAllDay: boolean;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  userId?: string;
  project?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
}

/** 팀 멤버 타입 */
export interface TeamMember {
  id: string;
  role: "OWNER" | "MANAGER" | "MEMBER";
  customRole?: string; // 커스텀 역할명 (예: PMO, 프로젝트 총괄 등)
  department?: string; // 부서 (예: 개발팀, 기획팀, 디자인팀 등)
  position?: string;   // 직급 (예: 사원, 대리, 과장, 차장, 부장 등)
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  userId: string;
  user?: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
}

/** 소속 타입 */
export type Affiliation = "CLIENT" | "DEVELOPER" | "CONSULTING" | "OUTSOURCING" | "OTHER";

/** 사용자 타입 */
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: "ADMIN" | "USER" | "GUEST";
  affiliation?: Affiliation | null;
  createdAt: string;
}

/** 이슈 타입 */
export interface Issue {
  id: string;
  code?: string;
  title: string;
  description?: string;
  category: "BUG" | "IMPROVEMENT" | "QUESTION" | "FEATURE" | "DOCUMENTATION" | "OTHER";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "WONT_FIX";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reportDate: string;
  dueDate?: string;
  resolvedDate?: string;
  isDelayed: boolean;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  reporterId?: string;
  reporter?: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
  assigneeId?: string;
  assignee?: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
}

/** WBS 레벨 타입 */
export type WbsLevel = "LEVEL1" | "LEVEL2" | "LEVEL3" | "LEVEL4";

/** WBS 항목 타입 (계층형 구조) */
export interface WbsItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  level: WbsLevel;
  levelNumber: number; // 1, 2, 3, 4
  order: number;
  status: "PENDING" | "IN_PROGRESS" | "HOLDING" | "COMPLETED" | "CANCELLED";
  progress: number;
  startDate?: string;
  endDate?: string;
  /** 실제 시작일 */
  actualStartDate?: string;
  /** 실제 종료일 */
  actualEndDate?: string;
  weight: number;
  /** 산출물명 */
  deliverableName?: string;
  /** 산출물 링크 (URL) */
  deliverableLink?: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  parentId?: string;
  hasChildren: boolean;
  /** 담당자 목록 */
  assignees?: {
    id: string;
    name?: string;
    avatar?: string;
  }[];
  /** 자식 항목 (트리 구조) */
  children?: WbsItem[];
  /** 부모 항목 정보 */
  parent?: {
    id: string;
    code: string;
    name: string;
    level: WbsLevel;
  };
}

/** WBS 담당자별 통계 타입 */
export interface WbsAssigneeStat {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  totalProgress: number;
  avgProgress: number;
  completionRate: number;
}

/** WBS 전체 통계 응답 타입 */
export interface WbsStats {
  assignees: WbsAssigneeStat[];
  total: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    delayed: number; // 지연건수 (종료일이 지났는데 완료되지 않은 업무)
  };
  projectCount: number;
}

/** 이슈 카테고리별 통계 */
export interface IssueCategoryStat {
  category: string;
  label: string;
  resolved: number;
  unresolved: number;
  total: number;
}

/** 이슈 전체 통계 응답 타입 */
export interface IssueStats {
  categories: IssueCategoryStat[];
  total: {
    total: number;
    resolved: number;
    unresolved: number;
    open: number;
    inProgress: number;
    closed: number;
  };
  projectCount: number;
}

/** 요구사항 담당자별 통계 */
export interface RequirementAssigneeStat {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  total: number;
  draft: number;
  approved: number;
  rejected: number;
  implemented: number;
  completionRate: number;
}

/** 요구사항 상태별 분포 */
export interface RequirementStatusDist {
  status: string;
  label: string;
  count: number;
  color: string;
}

/** 요구사항 전체 통계 응답 타입 */
export interface RequirementStats {
  assignees: RequirementAssigneeStat[];
  statusDistribution: RequirementStatusDist[];
  total: {
    total: number;
    draft: number;
    approved: number;
    rejected: number;
    implemented: number;
  };
  projectCount: number;
}

/** AI 페르소나 타입 */
export interface AiPersona {
  id: string;
  userId: string;
  name: string;
  description?: string;
  icon?: string;
  systemPrompt: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 핀포인트 타입 (삼각형 마커) */
export interface Pinpoint {
  id: string;
  name: string;
  description?: string | null;
  date: string;
  color: string;
  projectId: string;
  rowId: string;
  row?: {
    id: string;
    name: string;
    color: string;
  };
  project?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

/** 마일스톤 상태 타입 */
export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";

/** 타임라인 행 타입 */
export interface TimelineRow {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  projectId: string;
  /** 부모 행 ID (null이면 최상위 행) */
  parentId?: string | null;
  /** 부모 행 정보 */
  parent?: TimelineRow | null;
  /** 자식 행들 (계층 구조) */
  children?: TimelineRow[];
  milestones?: Milestone[];
  createdAt: string;
  updatedAt: string;
}

/** 마일스톤 타입 (기간 막대 형태) */
export interface Milestone {
  id: string;
  name: string;
  description?: string | null;
  startDate: string;    // 시작일
  endDate: string;      // 종료일
  status: MilestoneStatus;
  color: string;
  order: number;
  projectId: string;
  rowId?: string | null;  // 타임라인 행 ID
  row?: {
    id: string;
    name: string;
    color: string;
  } | null;
  project?: {
    id: string;
    name: string;
    startDate?: string | null;
    endDate?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

/** 업무 카테고리 타입 */
export type WorkCategory = "DOCUMENT" | "ANALYSIS" | "DEVELOPMENT" | "DESIGN" | "SUPPORT" | "MEETING" | "REVIEW" | "OTHER";

/** 주간보고 상태 타입 */
export type ReportStatus = "DRAFT" | "SUBMITTED";

/** 주간보고 항목 타입 */
export type ReportItemType = "PREVIOUS_RESULT" | "NEXT_PLAN";

/** 주간보고 항목 타입 */
export interface WeeklyReportItem {
  id: string;
  type: ReportItemType;
  category: WorkCategory;
  title: string;
  description?: string | null;
  targetDate?: string | null;
  remarks?: string | null;
  isAdditional: boolean;
  isCompleted: boolean;
  progress: number;
  linkedTaskId?: string | null;
  linkedWbsId?: string | null;
  order: number;
  reportId: string;
  createdAt: string;
  updatedAt: string;
  linkedTask?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  } | null;
  linkedWbs?: {
    id: string;
    code: string;
    name: string;
    level: WbsLevel;
  } | null;
}

/** 주간보고 타입 */
export interface WeeklyReport {
  id: string;
  year: number;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  issueContent?: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  userId: string;
  projectId: string;
  user?: {
    id: string;
    name?: string | null;
    email: string;
    avatar?: string | null;
  };
  project?: {
    id: string;
    name: string;
  };
  items?: WeeklyReportItem[];
}

/** 자동 로드 데이터 타입 (전주계획 + 완료된 Task) */
export interface AutoLoadData {
  previousPlanItems: WeeklyReportItem[];
  completedTasks: {
    id: string;
    title: string;
    status: string;
    completedAt: string | null;
    assigneeId?: string | null;
  }[];
}

/** 멤버별 요약 데이터 */
export interface MemberSummaryData {
  memberId: string;
  memberName: string;
  previousResults: {
    category: string;
    title: string;
    description?: string;
    isCompleted: boolean;
    progress: number;
  }[];
  nextPlans: {
    category: string;
    title: string;
    description?: string;
    targetDate?: string;
  }[];
}

/** 고객요구사항 적용여부 상태 타입 */
export type ApplyStatus = "REVIEWING" | "APPLIED" | "REJECTED" | "HOLD";

/** 고객요구사항 타입 */
export interface CustomerRequirement {
  id: string;
  sequence: number;         // 순번
  code: string;            // 관리번호 (RQIT_00001)
  businessUnit: string;    // 사업부
  category?: string | null; // 업무구분
  functionName: string;    // 기능명
  content: string;         // 요구사항 내용
  requestDate?: string | null; // 요청일자
  requester?: string | null;   // 요청자
  solution?: string | null;    // 적용방안
  applyStatus: ApplyStatus;    // 적용여부
  remarks?: string | null;     // 비고
  toBeCode?: string | null;    // To-Be 관리번호
  createdAt: string;
  updatedAt: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
  };
}

/** 고객요구사항 임포트 결과 타입 */
export interface CustomerRequirementImportResult {
  success: boolean;
  message: string;
  stats: {
    total: number;
    created: number;
    skipped: number;
    errors: string[];
  };
}

/** 문서 종류 */
export type DocumentCategory =
  | "SPECIFICATION"
  | "MANUAL"
  | "MEETING"
  | "REPORT"
  | "CONTRACT"
  | "TEMPLATE"
  | "REFERENCE"
  | "OTHER";

/** 문서 소스 타입 */
export type DocumentSourceType =
  | "ONEDRIVE"
  | "GOOGLE"
  | "SERVER_UPLOAD"
  | "EXTERNAL_LINK";

/** 문서함 타입 */
export interface Document {
  id: string;
  name: string;
  description?: string | null;
  category: DocumentCategory;
  version?: string | null;
  sourceType: DocumentSourceType;
  url?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  tags: string[];
  isFavorite: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
  };
  createdById: string;
  createdBy?: {
    id: string;
    name?: string | null;
    email: string;
    avatar?: string | null;
  };
}

/** 주간보고 취합(Summary) 타입 */
export interface WeeklySummary {
  id: string;
  year: number;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  title: string;
  memberIds: string[];
  reportIds: string[];
  memberSummaries?: MemberSummaryData[] | null;
  llmSummary?: string | null;
  llmInsights?: string | null;
  llmAnalyzedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  createdById: string;
  createdBy?: {
    id: string;
    name?: string | null;
    email: string;
    avatar?: string | null;
  };
  project?: {
    id: string;
    name: string;
  };
}

/** 설비 타입 */
export type EquipmentType =
  | "MACHINE"
  | "TOOL"
  | "DEVICE"
  | "CONVEYOR"
  | "STORAGE"
  | "INSPECTION"
  | "PC"
  | "PRINTER"
  | "SCANNER"
  | "DIO"
  // 자동창고/물류
  | "AUTO_RACK_IN"
  | "AUTO_RACK_OUT_REQUEST"
  | "AUTO_RACK_OUT"
  // 마킹/부착/투입
  | "PID_MARKING"
  | "PID_ATTACH"
  | "PCB_INPUT"
  | "TAPE_ATTACH"
  // SMD 제조
  | "SCREEN_PRINTER"
  | "SPI"
  | "CHIP_MOUNTER"
  | "MOI"
  | "REFLOW_OVEN"
  | "AOI"
  | "ICT"
  | "FCT"
  | "CURING"
  | "ROUTER"
  // HANES (와이어 하네스) 제조
  | "WIRE_CUTTING"
  | "WIRE_STRIPPING"
  | "CRIMPING"
  | "TWIST_MACHINE"
  | "HARNESS_ASSEMBLY"
  | "TAPING_MACHINE"
  | "CONNECTOR_INSERT"
  | "HARNESS_TESTER"
  | "SOLDERING"
  | "SEALING"
  // X-RAY
  | "XRAY_INSPECTOR"
  | "XRAY_COUNTER"
  // ODC/IC
  | "ODC_WRITE"
  | "ODC_VERIFY"
  | "TEMP_IC"
  | "VERIFY_TEMP_IC"
  // 검사/측정
  | "CONFORMAL_COATING_INSPECTION"
  | "TENSION_METER"
  | "VISCOSITY_METER"
  | "THERMO_HYGROMETER"
  // 기타
  | "ESG_GATE"
  | "LOADER"
  | "OTHER";

/** 설비 상태 */
export type EquipmentStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE" | "BROKEN" | "RESERVED";

/** 속성 값 타입 */
export type PropertyValueType = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN";

/** 연결 타입 */
export type ConnectionType = "FLOW" | "SIGNAL" | "POWER" | "DEPENDENCY" | "OTHER";

/** 설비 타입 */
export interface Equipment {
  id: string;
  projectId: string;
  code: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  positionX: number;
  positionY: number;
  description?: string | null;
  location?: string | null;
  lineCode?: string | null;
  divisionCode?: string | null;
  imageUrl?: string | null;
  manufacturer?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  warrantyEndDate?: string | null;
  ipAddress?: string | null;
  portNumber?: number | null;
  isLogTarget: boolean;
  isInterlockTarget: boolean;
  isBarcodeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  properties?: EquipmentProperty[];
  connectionsFrom?: EquipmentConnection[];
  connectionsTo?: EquipmentConnection[];
}

/** 설비 속성 타입 */
export interface EquipmentProperty {
  id: string;
  key: string;
  value: string;
  valueType: PropertyValueType;
  unit?: string | null;
  order: number;
  equipmentId: string;
  createdAt: string;
  updatedAt: string;
}

/** 설비 연결 타입 */
export interface EquipmentConnection {
  id: string;
  label?: string | null;
  type: ConnectionType;
  color?: string | null;
  animated: boolean;
  order: number;
  sourceHandle?: string | null; // React Flow 출발 핸들 (top, right, bottom, left)
  targetHandle?: string | null; // React Flow 도착 핸들 (top, right, bottom, left)
  fromEquipmentId: string;
  toEquipmentId: string;
  createdAt: string;
  updatedAt: string;
  fromEquipment?: {
    id: string;
    code: string;
    name: string;
  };
  toEquipment?: {
    id: string;
    code: string;
    name: string;
  };
}

// ============================================
// API 클라이언트
// ============================================

export const api = {
  /** 프로젝트 API */
  projects: {
    list: (params?: { status?: string; ownerId?: string }) =>
      get<Project[]>("/api/projects", params),
    get: (id: string) => get<Project>(`/api/projects/${id}`),
    create: (data: { name: string; description?: string; startDate?: string; endDate?: string }) =>
      post<Project>("/api/projects", data),
    update: (id: string, data: Partial<Project>) =>
      patch<Project>(`/api/projects/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/projects/${id}`),
  },

  /** 태스크 API */
  tasks: {
    list: (params?: { projectId?: string; status?: string; assigneeId?: string }) =>
      get<Task[]>("/api/tasks", params),
    get: (id: string) => get<Task>(`/api/tasks/${id}`),
    /** 태스크 생성 (다중 담당자, 요구사항 연결, 시작일/마감일 지원) */
    create: (data: { title: string; description?: string; projectId: string; assigneeIds?: string[]; priority?: string; startDate?: string; dueDate?: string; requirementId?: string }) =>
      post<Task>("/api/tasks", data),
    /** 태스크 수정 (담당자, 요구사항, 시작일/마감일 변경 지원) */
    update: (id: string, data: Partial<Task> & { assigneeIds?: string[]; requirementId?: string | null }) =>
      patch<Task>(`/api/tasks/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/tasks/${id}`),
  },

  /** 요구사항 API */
  requirements: {
    list: (params?: { projectId?: string; status?: string; priority?: string }) =>
      get<Requirement[]>("/api/requirements", params),
    get: (id: string) => get<Requirement>(`/api/requirements/${id}`),
    create: (data: {
      title: string;
      description?: string;
      projectId: string;
      priority?: string;
      category?: string;
      oneDriveLink?: string;
      dueDate?: string;
      requesterId?: string;
      assigneeId?: string;
    }) => post<Requirement>("/api/requirements", data),
    update: (id: string, data: Partial<Requirement>) =>
      patch<Requirement>(`/api/requirements/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/requirements/${id}`),
    /** 요구사항 통계 조회 (담당자별 처리 현황) */
    stats: (params?: { projectId?: string }) =>
      get<RequirementStats>("/api/requirements/stats", params as Record<string, string | undefined>),
  },

  /** 휴무/일정 API */
  holidays: {
    list: (params?: { type?: string; year?: string; month?: string; projectId?: string }) =>
      get<Holiday[]>("/api/holidays", params),
    get: (id: string) => get<Holiday>(`/api/holidays/${id}`),
    create: (data: {
      title: string;
      description?: string;
      date: string;
      endDate?: string;
      type: string;
      isAllDay?: boolean;
      startTime?: string;
      endTime?: string;
      projectId: string;
      userId?: string;
    }) => post<Holiday>("/api/holidays", data),
    update: (id: string, data: Partial<Holiday>) =>
      patch<Holiday>(`/api/holidays/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/holidays/${id}`),
    /** 오늘의 일정 조회 */
    today: (params?: { projectId?: string; userId?: string }) =>
      get<Holiday[]>("/api/holidays/today", params),
  },

  /** 타임라인 행 API */
  timelineRows: {
    list: (params: { projectId: string }) =>
      get<TimelineRow[]>("/api/timeline-rows", params as Record<string, string | undefined>),
    get: (id: string) => get<TimelineRow>(`/api/timeline-rows/${id}`),
    create: (data: {
      name: string;
      projectId: string;
      color?: string;
      isDefault?: boolean;
      /** 부모 행 ID (자식 행 생성 시 지정) */
      parentId?: string;
    }) => post<TimelineRow>("/api/timeline-rows", data),
    update: (id: string, data: Partial<TimelineRow>) =>
      patch<TimelineRow>(`/api/timeline-rows/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/timeline-rows/${id}`),
  },

  /** 마일스톤 API (기간 막대 형태) */
  milestones: {
    list: (params: { projectId: string; rowId?: string; status?: MilestoneStatus }) =>
      get<Milestone[]>("/api/milestones", params as Record<string, string | undefined>),
    get: (id: string) => get<Milestone>(`/api/milestones/${id}`),
    create: (data: {
      name: string;
      startDate: string;
      endDate: string;
      projectId: string;
      rowId?: string;
      description?: string;
      status?: MilestoneStatus;
      color?: string;
      order?: number;
    }) => post<Milestone>("/api/milestones", data),
    update: (id: string, data: Partial<Milestone>) =>
      patch<Milestone>(`/api/milestones/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/milestones/${id}`),
  },

  /** 핀포인트 API (삼각형 마커) */
  pinpoints: {
    list: (params: { projectId: string; rowId?: string }) =>
      get<Pinpoint[]>("/api/pinpoints", params as Record<string, string | undefined>),
    get: (id: string) => get<Pinpoint>(`/api/pinpoints/${id}`),
    create: (data: {
      name: string;
      date: string;
      projectId: string;
      rowId: string;
      description?: string;
      color?: string;
    }) => post<Pinpoint>("/api/pinpoints", data),
    update: (id: string, data: Partial<Pinpoint>) =>
      patch<Pinpoint>(`/api/pinpoints/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/pinpoints/${id}`),
  },

  /** 팀 멤버 API */
  members: {
    list: (params?: { projectId?: string }) =>
      get<TeamMember[]>("/api/members", params),
    get: (id: string) => get<TeamMember>(`/api/members/${id}`),
    create: (data: { projectId: string; userId: string; role?: string; customRole?: string }) =>
      post<TeamMember>("/api/members", data),
    update: (id: string, data: { role?: string; customRole?: string }) =>
      patch<TeamMember>(`/api/members/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/members/${id}`),
  },

  /** 사용자 API */
  users: {
    list: (params?: { search?: string; email?: string; name?: string }) =>
      get<User[]>("/api/users", params),
    get: (id: string) => get<User>(`/api/users/${id}`),
    create: (data: { id?: string; email: string; name?: string; avatar?: string; affiliation?: Affiliation }) =>
      post<User>("/api/users", data),
    update: (id: string, data: { name?: string; role?: string; avatar?: string; affiliation?: Affiliation; password?: string }) =>
      patch<User>(`/api/users/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/users/${id}`),
  },

  /** 이슈 API */
  issues: {
    list: (params?: { projectId?: string; status?: string; priority?: string; category?: string }) =>
      get<Issue[]>("/api/issues", params),
    get: (id: string) => get<Issue>(`/api/issues/${id}`),
    create: (data: {
      title: string;
      description?: string;
      projectId: string;
      priority?: string;
      category?: string;
      dueDate?: string;
      reporterId?: string;
      assigneeId?: string;
    }) => post<Issue>("/api/issues", data),
    update: (id: string, data: Partial<Issue>) =>
      patch<Issue>(`/api/issues/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/issues/${id}`),
    /** 이슈 통계 조회 (카테고리별, 해결/미해결) */
    stats: (params?: { projectId?: string }) =>
      get<IssueStats>("/api/issues/stats", params as Record<string, string | undefined>),
  },

  /** WBS API (계층형 구조) */
  wbs: {
    /** WBS 목록 조회 (기본: 트리 구조, flat=true: 평탄화) */
    list: (params: { projectId: string; flat?: string; parentId?: string }) =>
      get<WbsItem[]>("/api/wbs", params),
    /** WBS 항목 상세 조회 */
    get: (id: string) => get<WbsItem>(`/api/wbs/${id}`),
    /** WBS 항목 생성 */
    create: (data: {
      name: string;
      description?: string;
      projectId: string;
      parentId?: string;
      level: WbsLevel;
      assigneeIds?: string[];
      startDate?: string;
      endDate?: string;
      weight?: number;
      deliverableName?: string;
      deliverableLink?: string;
    }) => post<WbsItem>("/api/wbs", data),
    /** WBS 항목 수정 */
    update: (id: string, data: {
      name?: string;
      description?: string;
      status?: string;
      progress?: number;
      startDate?: string;
      endDate?: string;
      weight?: number;
      assigneeIds?: string[];
      order?: number;
      deliverableName?: string;
      deliverableLink?: string;
    }) => patch<WbsItem>(`/api/wbs/${id}`, data),
    /** WBS 항목 삭제 (자식도 함께 삭제됨) */
    delete: (id: string) => del<{ message: string; deletedId: string; childrenDeleted: number }>(`/api/wbs/${id}`),
    /** WBS 레벨 변경 (up: 상위로, down: 하위로) */
    changeLevel: (id: string, direction: "up" | "down") =>
      patch<{ message: string; item: WbsItem }>(`/api/wbs/${id}/level`, { direction }),
    /** WBS 단위업무 기반 담당자별 통계 조회 */
    stats: (params?: { projectId?: string }) =>
      get<WbsStats>("/api/wbs/stats", params as Record<string, string | undefined>),
  },

  /** AI 페르소나 API */
  personas: {
    list: () => get<AiPersona[]>("/api/ai-personas"),
    get: (id: string) => get<AiPersona>(`/api/ai-personas/${id}`),
    create: (data: { name: string; description?: string; icon?: string; systemPrompt: string }) =>
      post<AiPersona>("/api/ai-personas", data),
    update: (id: string, data: { name?: string; description?: string; icon?: string; systemPrompt?: string; isActive?: boolean }) =>
      patch<AiPersona>(`/api/ai-personas/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/ai-personas/${id}`),
  },

  /** 주간보고 API */
  weeklyReports: {
    /** 주간보고 목록 조회 */
    list: (params?: { projectId?: string; userId?: string; year?: string; weekNumber?: string }) =>
      get<WeeklyReport[]>("/api/weekly-reports", params),
    /** 주간보고 상세 조회 */
    get: (id: string) => get<WeeklyReport>(`/api/weekly-reports/${id}`),
    /** 주간보고 생성 */
    create: (data: {
      projectId: string;
      year: number;
      weekNumber: number;
      weekStart: string;
      weekEnd: string;
      issueContent?: string;
    }) => post<WeeklyReport>("/api/weekly-reports", data),
    /** 주간보고 수정 */
    update: (id: string, data: {
      issueContent?: string;
      status?: ReportStatus;
    }) => patch<WeeklyReport>(`/api/weekly-reports/${id}`, data),
    /** 주간보고 삭제 */
    delete: (id: string) => del<{ message: string }>(`/api/weekly-reports/${id}`),
    /** 자동 데이터 로드 (전주계획 + 완료된 Task) */
    autoLoad: (params: { projectId: string; year: string; weekNumber: string }) =>
      get<AutoLoadData>("/api/weekly-reports/auto-load", params),
  },

  /** 주간보고 항목 API */
  weeklyReportItems: {
    /** 항목 목록 조회 */
    list: (reportId: string) =>
      get<WeeklyReportItem[]>(`/api/weekly-reports/${reportId}/items`),
    /** 항목 추가 */
    create: (reportId: string, data: {
      type: ReportItemType;
      category: WorkCategory;
      title: string;
      description?: string;
      targetDate?: string;
      remarks?: string;
      isAdditional?: boolean;
      isCompleted?: boolean;
      progress?: number;
      linkedTaskId?: string;
      linkedWbsId?: string;
      order?: number;
    }) => post<WeeklyReportItem>(`/api/weekly-reports/${reportId}/items`, data),
    /** 항목 수정 */
    update: (reportId: string, itemId: string, data: Partial<Omit<WeeklyReportItem, "id" | "reportId" | "createdAt" | "updatedAt">>) =>
      patch<WeeklyReportItem>(`/api/weekly-reports/${reportId}/items/${itemId}`, data),
    /** 항목 삭제 */
    delete: (reportId: string, itemId: string) =>
      del<{ message: string }>(`/api/weekly-reports/${reportId}/items/${itemId}`),
  },

  /** 고객요구사항 API */
  customerRequirements: {
    /** 목록 조회 (필터링 지원) */
    list: (params?: { projectId?: string; businessUnit?: string; applyStatus?: string; search?: string }) =>
      get<CustomerRequirement[]>("/api/customer-requirements", params),
    /** 단건 조회 */
    get: (id: string) => get<CustomerRequirement>(`/api/customer-requirements/${id}`),
    /** 생성 (관리번호 자동 부여) */
    create: (data: {
      projectId: string;
      businessUnit: string;
      category?: string;
      functionName: string;
      content: string;
      requestDate?: string;
      requester?: string;
      solution?: string;
      applyStatus?: ApplyStatus;
      remarks?: string;
      toBeCode?: string;
    }) => post<CustomerRequirement>("/api/customer-requirements", data),
    /** 수정 */
    update: (id: string, data: Partial<CustomerRequirement>) =>
      patch<CustomerRequirement>(`/api/customer-requirements/${id}`, data),
    /** 삭제 */
    delete: (id: string) => del<{ message: string }>(`/api/customer-requirements/${id}`),
    /** 엑셀 임포트 (FormData 전송) */
    import: async (formData: FormData): Promise<CustomerRequirementImportResult> => {
      const response = await fetch("/api/customer-requirements/import", {
        method: "POST",
        body: formData,
      });
      return handleResponse<CustomerRequirementImportResult>(response);
    },
  },

  /** 주간보고 취합 API */
  weeklySummaries: {
    /** 취합 보고서 목록 조회 */
    list: (params?: { projectId?: string; year?: string; weekNumber?: string }) =>
      get<WeeklySummary[]>("/api/weekly-summaries", params),
    /** 취합 보고서 상세 조회 */
    get: (id: string) => get<WeeklySummary>(`/api/weekly-summaries/${id}`),
    /** 취합 보고서 생성 */
    create: (data: {
      projectId: string;
      year: number;
      weekNumber: number;
      weekStart: string;
      weekEnd: string;
      title: string;
      reportIds: string[];
      createdById: string;
    }) => post<WeeklySummary>("/api/weekly-summaries", data),
    /** 취합 보고서 수정 */
    update: (id: string, data: {
      title?: string;
      llmSummary?: string;
      llmInsights?: string;
    }) => patch<WeeklySummary>(`/api/weekly-summaries/${id}`, data),
    /** 취합 보고서 삭제 */
    delete: (id: string) => del<{ message: string }>(`/api/weekly-summaries/${id}`),
    /** LLM 분석 실행 */
    analyze: (id: string) => post<WeeklySummary>(`/api/weekly-summaries/${id}/analyze`),
  },

  /** 문서함 API */
  documents: {
    /** 목록 조회 (필터링 지원) */
    list: (params?: {
      projectId?: string;
      category?: string;
      sourceType?: string;
      search?: string;
      favoriteOnly?: string;
      isPersonal?: string;
    }) => get<Document[]>("/api/documents", params),
    /** 단건 조회 */
    get: (id: string) => get<Document>(`/api/documents/${id}`),
    /** 생성 */
    create: (data: {
      projectId: string;
      name: string;
      description?: string;
      category: DocumentCategory;
      version?: string;
      sourceType: DocumentSourceType;
      url?: string;
      filePath?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      tags?: string[];
      isPersonal?: boolean;
    }) => post<Document>("/api/documents", data),
    /** 수정 */
    update: (id: string, data: Partial<Document>) =>
      patch<Document>(`/api/documents/${id}`, data),
    /** 삭제 */
    delete: (id: string) => del<{ success: boolean }>(`/api/documents/${id}`),
  },

  /** 설비 관리 API */
  equipment: {
    /** 설비 목록 조회 (사업부/라인 필터 지원) */
    list: (params?: { projectId?: string; divisionCode?: string; lineCode?: string }) =>
      get<Equipment[]>("/api/equipment", params),
    /** 설비 상세 조회 */
    get: (id: string) => get<Equipment>(`/api/equipment/${id}`),
    /** 설비 생성 (코드 자동 생성) */
    create: (data: {
      projectId: string;
      name: string;
      type: EquipmentType;
      status?: EquipmentStatus;
      positionX?: number;
      positionY?: number;
      description?: string;
      location?: string;
      lineCode?: string;         // 라인코드 (예: L1, L2, LINE-A)
      divisionCode?: string;     // 사업부 코드 (예: DIV-A, 사업부1)
      imageUrl?: string;         // 설비 이미지 URL
      manufacturer?: string;
      modelNumber?: string;
      serialNumber?: string;
      purchaseDate?: string;
      warrantyEndDate?: string;
      ipAddress?: string;        // IP 주소 (예: 192.168.1.100)
      portNumber?: number;       // PORT 번호 (예: 8080)
      isLogTarget?: boolean;     // 로그수집대상 여부
      isInterlockTarget?: boolean; // 인터락대상 여부
      isBarcodeEnabled?: boolean;  // 바코드 식별가능 여부
    }) => post<Equipment>("/api/equipment", data),
    /** 설비 수정 */
    update: (id: string, data: Partial<Equipment>) =>
      patch<Equipment>(`/api/equipment/${id}`, data),
    /** 설비 삭제 */
    delete: (id: string) => del<{ message: string }>(`/api/equipment/${id}`),
    /** 설비 위치 일괄 업데이트 (캔버스 저장용) */
    bulkUpdate: (updates: { id: string; positionX: number; positionY: number }[]) =>
      post<{ success: boolean; updatedCount: number; message: string }>(
        "/api/equipment/bulk-update",
        { updates }
      ),
    /** 필터 목록 조회 (사업부/라인 코드) */
    getFilters: (projectId: string, divisionCode?: string) =>
      get<{ divisions: string[]; lines: string[] }>("/api/equipment/filters", { projectId, divisionCode }),
  },

  /** 설비 속성 API */
  equipmentProperties: {
    /** 속성 목록 조회 */
    list: (equipmentId: string) =>
      get<EquipmentProperty[]>(`/api/equipment/${equipmentId}/properties`),
    /** 속성 추가 */
    create: (equipmentId: string, data: {
      key: string;
      value: string;
      valueType?: PropertyValueType;
      unit?: string;
      order?: number;
    }) => post<EquipmentProperty>(`/api/equipment/${equipmentId}/properties`, data),
    /** 속성 수정 */
    update: (equipmentId: string, propertyId: string, data: Partial<EquipmentProperty>) =>
      patch<EquipmentProperty>(`/api/equipment/${equipmentId}/properties/${propertyId}`, data),
    /** 속성 삭제 */
    delete: (equipmentId: string, propertyId: string) =>
      del<{ message: string }>(`/api/equipment/${equipmentId}/properties/${propertyId}`),
  },

  /** 설비 연결 API */
  equipmentConnections: {
    /** 연결 목록 조회 */
    list: (params?: { projectId?: string }) =>
      get<EquipmentConnection[]>("/api/equipment/connections", params),
    /** 연결 생성 */
    create: (data: {
      fromEquipmentId: string;
      toEquipmentId: string;
      label?: string;
      type?: ConnectionType;
      color?: string;
      animated?: boolean;
      order?: number;
      sourceHandle?: string;  // 출발 핸들 (top, right, bottom, left)
      targetHandle?: string;  // 도착 핸들 (top, right, bottom, left)
    }) => post<EquipmentConnection>("/api/equipment/connections", data),
    /** 연결 수정 */
    update: (id: string, data: Partial<EquipmentConnection>) =>
      patch<EquipmentConnection>(`/api/equipment/connections/${id}`, data),
    /** 연결 삭제 */
    delete: (id: string) =>
      del<{ message: string }>(`/api/equipment/connections/${id}`),
  },
};
