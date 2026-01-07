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
  status: "PENDING" | "IN_PROGRESS" | "HOLDING" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  creatorId: string;
  requirementId?: string | null; // 연결된 요구사항 ID
  /** 담당자 목록 (다중 담당자 지원) */
  assignees?: {
    id: string;
    name?: string;
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
}

/** 요구사항 타입 */
export interface Requirement {
  id: string;
  code?: string;
  title: string;
  description?: string;
  category?: string;
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

/** 휴무 타입 */
export interface Holiday {
  id: string;
  title: string;
  date: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
}

/** 팀 멤버 타입 */
export interface TeamMember {
  id: string;
  role: "OWNER" | "MANAGER" | "MEMBER";
  customRole?: string; // 커스텀 역할명 (예: PMO, 프로젝트 총괄 등)
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

/** 사용자 타입 */
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: "EXECUTIVE" | "DIRECTOR" | "PMO" | "PM" | "PL" | "DEVELOPER" | "DESIGNER" | "OPERATOR" | "MEMBER";
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
  weight: number;
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
    /** 태스크 생성 (다중 담당자, 요구사항 연결 지원) */
    create: (data: { title: string; description?: string; projectId: string; assigneeIds?: string[]; priority?: string; dueDate?: string; requirementId?: string }) =>
      post<Task>("/api/tasks", data),
    /** 태스크 수정 (담당자, 요구사항 변경 지원) */
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
      dueDate?: string;
      requesterId?: string;
      assigneeId?: string;
    }) => post<Requirement>("/api/requirements", data),
    update: (id: string, data: Partial<Requirement>) =>
      patch<Requirement>(`/api/requirements/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/requirements/${id}`),
  },

  /** 휴무 API */
  holidays: {
    list: (params?: { type?: string; year?: string; month?: string }) =>
      get<Holiday[]>("/api/holidays", params),
    get: (id: string) => get<Holiday>(`/api/holidays/${id}`),
    create: (data: { title: string; date: string; type: string; projectId: string }) =>
      post<Holiday>("/api/holidays", data),
    update: (id: string, data: Partial<Holiday>) =>
      patch<Holiday>(`/api/holidays/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/holidays/${id}`),
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
    create: (data: { id?: string; email: string; name?: string; avatar?: string }) =>
      post<User>("/api/users", data),
    update: (id: string, data: { name?: string; role?: string; avatar?: string }) =>
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
    }) => patch<WbsItem>(`/api/wbs/${id}`, data),
    /** WBS 항목 삭제 (자식도 함께 삭제됨) */
    delete: (id: string) => del<{ message: string; deletedId: string; childrenDeleted: number }>(`/api/wbs/${id}`),
    /** WBS 레벨 변경 (up: 상위로, down: 하위로) */
    changeLevel: (id: string, direction: "up" | "down") =>
      patch<{ message: string; item: WbsItem }>(`/api/wbs/${id}/level`, { direction }),
  },
};
