/**
 * @file src/contexts/ProjectContext.tsx
 * @description
 * 프로젝트 선택 상태를 전역으로 관리하는 Context입니다.
 * 선택된 프로젝트가 모든 페이지에서 유지되도록 합니다.
 *
 * 초보자 가이드:
 * 1. **useProject**: 현재 선택된 프로젝트 정보와 선택 함수 제공
 * 2. **localStorage**: 브라우저 새로고침 후에도 선택 상태 유지
 *
 * @example
 * const { selectedProjectId, setSelectedProjectId, selectedProject } = useProject();
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useProjects } from "@/hooks";
import type { Project } from "@/lib/api";

/** localStorage 키 */
const STORAGE_KEY = "wbs-selected-project-id";

/** Context 타입 정의 */
interface ProjectContextType {
  /** 선택된 프로젝트 ID */
  selectedProjectId: string;
  /** 프로젝트 ID 설정 함수 */
  setSelectedProjectId: (id: string) => void;
  /** 선택된 프로젝트 객체 (전체 정보) */
  selectedProject: Project | null;
  /** 프로젝트 목록 */
  projects: Project[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 프로젝트 선택 초기화 */
  clearSelection: () => void;
}

/** Context 생성 */
const ProjectContext = createContext<ProjectContextType | null>(null);

/**
 * 프로젝트 Context Hook
 * @returns 프로젝트 Context 값
 */
export function useProject(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

/**
 * 프로젝트 Provider 컴포넌트
 * 대시보드 레이아웃에서 사용
 */
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectIdState] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  // 프로젝트 목록 조회
  const { data: rawProjects = [], isLoading } = useProjects();

  // projects 참조 안정화: 내용이 같으면 같은 참조 유지
  const projectsRef = useRef<Project[]>([]);
  const projects = useMemo(() => {
    // ID 목록이 같으면 이전 참조 유지
    const prevIds = projectsRef.current.map((p) => p.id).join(",");
    const newIds = rawProjects.map((p) => p.id).join(",");
    if (prevIds === newIds && projectsRef.current.length === rawProjects.length) {
      return projectsRef.current;
    }
    projectsRef.current = rawProjects;
    return rawProjects;
  }, [rawProjects]);

  // localStorage에서 초기값 로드
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        setSelectedProjectIdState(savedId);
      }
      setIsInitialized(true);
    }
  }, []);

  // 프로젝트 목록 로드 후 유효성 검증
  // 주의: projects.length로 의존성 지정하여 배열 참조 변경으로 인한 무한 루프 방지
  useEffect(() => {
    if (!isLoading && isInitialized && projects.length > 0) {
      // 저장된 프로젝트 ID가 유효한지 확인
      if (selectedProjectId) {
        const isValid = projects.some((p) => p.id === selectedProjectId);
        if (!isValid) {
          // 유효하지 않으면 첫 번째 프로젝트 선택
          const firstProjectId = projects[0].id;
          setSelectedProjectIdState(firstProjectId);
          localStorage.setItem(STORAGE_KEY, firstProjectId);
        }
      } else {
        // 선택된 프로젝트가 없으면 첫 번째 프로젝트 자동 선택
        const firstProjectId = projects[0].id;
        setSelectedProjectIdState(firstProjectId);
        localStorage.setItem(STORAGE_KEY, firstProjectId);
      }
    }
  }, [isLoading, isInitialized, projects.length, selectedProjectId]);

  // 프로젝트 ID 설정 (localStorage에도 저장)
  const setSelectedProjectId = useCallback((id: string) => {
    setSelectedProjectIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // 선택 초기화
  const clearSelection = useCallback(() => {
    setSelectedProjectIdState("");
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // 선택된 프로젝트 객체
  const selectedProject = useMemo(() => {
    if (!selectedProjectId || projects.length === 0) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  const value = useMemo(
    () => ({
      selectedProjectId,
      setSelectedProjectId,
      selectedProject,
      projects,
      isLoading,
      clearSelection,
    }),
    [selectedProjectId, setSelectedProjectId, selectedProject, projects, isLoading, clearSelection]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}
