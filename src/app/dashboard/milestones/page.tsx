/**
 * @file src/app/dashboard/milestones/page.tsx
 * @description
 * 마일스톤 관리 페이지입니다.
 * 프로젝트의 모든 마일스톤을 타임라인으로 시각화하고 관리합니다.
 *
 * 초보자 가이드:
 * 1. **프로젝트 선택**: 상단 드롭다운에서 프로젝트 선택
 * 2. **마일스톤 관리**: 드래그, 리사이즈, 생성/수정/삭제
 * 3. **행 관리**: 타임라인 행 추가/수정
 * 4. **핀포인트**: 특정 시점에 삼각형 마커 추가
 *
 * 수정 방법:
 * - MilestonePageHeader: 헤더 UI 변경
 * - MilestonePageContent: 타임라인 영역 변경
 * - MilestonePageEmpty: 빈 상태 메시지 변경
 *
 * @example
 * // 마일스톤 페이지로 이동
 * <Link href="/dashboard/milestones">마일스톤</Link>
 */

"use client";

import { useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { MilestoneTimeline } from "@/components/dashboard/MilestoneTimeline";
import { Icon } from "@/components/ui";
import {
  MilestonePageHeader,
  MilestonePageContent,
  MilestonePageEmpty,
} from "./components";

/**
 * 마일스톤 페이지 메인 컴포넌트
 */
export default function MilestonesPage() {
  // 프로젝트 선택 상태
  const { selectedProjectId } = useProject();

  // 프로젝트 목록 조회
  const { data: projects = [] } = useProjects();

  // 선택된 프로젝트 정보
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  // 프로젝트 미선택 시 빈 상태 표시
  if (!selectedProjectId || !selectedProject) {
    return <MilestonePageEmpty />;
  }

  // 프로젝트 선택됨 → 헤더 + 타임라인 표시
  return (
    <div className="space-y-4 px-4 md:px-6 lg:px-8 py-4">
      {/* 페이지 타이틀 - 대시보드 차트 스타일 */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Icon name="flag" className="text-[#00f3ff]" />
          <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
            MILESTONES
          </span>
          <span className="text-slate-400 text-sm font-normal ml-1">
            / 마일스톤 관리
          </span>
        </h1>
      </div>

      <MilestonePageHeader selectedProject={selectedProject} />

      <MilestonePageContent>
        <MilestoneTimeline
          projectId={selectedProjectId}
          startDate={selectedProject.startDate || null}
          endDate={selectedProject.endDate || null}
        />
      </MilestonePageContent>
    </div>
  );
}
