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
async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const searchParams = params ? `?${new URLSearchParams(params)}` : "";
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
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  assignee?: {
    id: string;
    name?: string;
    avatar?: string;
  };
  creator?: {
    id: string;
    name?: string;
  };
}

/** 요구사항 타입 */
export interface Requirement {
  id: string;
  code?: string;
  title: string;
  description?: string;
  category?: string;
  status: string;
  priority: string;
  requestDate: string;
  dueDate?: string;
  isDelayed: boolean;
  createdAt: string;
  updatedAt: string;
  projectId: string;
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
  role: "ADMIN" | "MANAGER" | "MEMBER";
  createdAt: string;
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
    create: (data: { title: string; description?: string; projectId: string; assigneeId?: string; priority?: string; dueDate?: string }) =>
      post<Task>("/api/tasks", data),
    update: (id: string, data: Partial<Task>) =>
      patch<Task>(`/api/tasks/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/tasks/${id}`),
  },

  /** 요구사항 API */
  requirements: {
    list: (params?: { projectId?: string; status?: string; priority?: string }) =>
      get<Requirement[]>("/api/requirements", params),
    get: (id: string) => get<Requirement>(`/api/requirements/${id}`),
    create: (data: { title: string; description?: string; projectId: string; priority?: string; status?: string; dueDate?: string }) =>
      post<Requirement>("/api/requirements", data),
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
    create: (data: { projectId: string; userId: string; role?: string }) =>
      post<TeamMember>("/api/members", data),
    update: (id: string, data: { role?: string }) =>
      patch<TeamMember>(`/api/members/${id}`, data),
    delete: (id: string) => del<{ message: string }>(`/api/members/${id}`),
  },

  /** 사용자 API */
  users: {
    list: (params?: { search?: string; email?: string; name?: string }) =>
      get<User[]>("/api/users", params),
    create: (data: { id?: string; email: string; name?: string; avatar?: string }) =>
      post<User>("/api/users", data),
  },
};
