/**
 * @file src/app/dashboard/users/types.ts
 * @description 사용자/프로젝트 관리 페이지의 로컬 타입
 *
 * 초보자 가이드:
 * 1. **UserFormState**: 사용자 추가/수정 모달 폼 상태
 * 2. **ProjectFormState**: 프로젝트 생성 모달 폼 상태
 * 3. **User, Project, TeamMember**: api.ts의 타입 재-export
 */
import type { User, Project, TeamMember } from "@/lib/api";

export interface UserFormState {
  email: string;
  name: string;
  role: string;
  affiliation: string | null;
  avatar: string;
  password: string;
}

export interface ProjectFormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

export type { User, Project, TeamMember };
