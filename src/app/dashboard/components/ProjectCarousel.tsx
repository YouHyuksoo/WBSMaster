/**
 * @file src/app/dashboard/components/ProjectCarousel.tsx
 * @description
 * 대시보드 상단: 프로젝트 하나가 전체 폭을 쓰는 영역. 왼쪽에 프로젝트 카드, 오른쪽에 그 프로젝트의 상황 타일(진척률 차트 ·
 * 긴급 상황 · 오늘 · 누적 등록 · WBS 상태 · 14일 추이 · 미결 · 오늘 일정)을 가로로 흘려 보여 준다.
 *
 * 초보자 가이드:
 * 1. 좌 · 우 버튼(또는 영역에 포커스 후 ← →)으로 다른 프로젝트 하나로 바꾼다. 아래 점은 몇 번째 프로젝트인지 보여 준다
 * 2. 처음에는 헤더에서 고른 프로젝트를 보여 준다 (없으면 첫 프로젝트). 여기서 바꿔도 헤더의 프로젝트 선택은 그대로다
 * 3. 프로젝트 데이터와 수정 · 개요 동작은 부모(page.tsx)에서 받는다
 */
"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { useProject } from "@/contexts";
import ProjectCard, { type ProjectCardProps, type ProjectWithWbs } from "@/app/dashboard/components/ProjectCard";
import { ProjectPulsePanel } from "./pulse/ProjectPulsePanel";

interface ProjectCarouselProps {
  projects: ProjectWithWbs[];
  onEdit: ProjectCardProps["onEdit"];
  onOverview: ProjectCardProps["onOverview"];
}

export default function ProjectCarousel({ projects, onEdit, onOverview }: ProjectCarouselProps) {
  const { selectedProjectId } = useProject();
  const [index, setIndex] = useState(0);

  // 헤더에서 고른 프로젝트가 바뀌면 그 프로젝트로 맞춘다
  useEffect(() => {
    const at = projects.findIndex((p) => p.id === selectedProjectId);
    if (at >= 0) setIndex(at);
  }, [selectedProjectId, projects]);

  const count = projects.length;
  const current = projects[Math.min(index, Math.max(0, count - 1))];
  if (!current) return null;
  const go = (direction: -1 | 1) => setIndex((i) => (i + direction + count) % count);

  const navigation = (direction: -1 | 1) => (
    <button
      type="button"
      aria-label={direction === -1 ? "이전 프로젝트" : "다음 프로젝트"}
      disabled={count < 2}
      onClick={() => go(direction)}
      className="flex h-10 w-8 shrink-0 items-center justify-center self-center rounded-lg text-text-secondary hover:bg-primary/10 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Icon name={direction === -1 ? "chevron_left" : "chevron_right"} size="md" />
    </button>
  );

  return (
    <div
      role="region"
      aria-roledescription="프로젝트 슬라이드"
      aria-label={`프로젝트 ${index + 1} / ${count}: ${current.name}`}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || count < 2) return;
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
      tabIndex={-1}
      className="relative rounded-xl bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark p-3 shadow-[0_4px_16px_rgba(15,23,42,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.30)]"
    >
      <div className="flex items-stretch gap-2">
        {navigation(-1)}
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row">
          <div className="w-full shrink-0 lg:w-[340px]">
            <ProjectCard key={current.id} project={current} compact onEdit={onEdit} onOverview={onOverview} />
          </div>
          <ProjectPulsePanel projectId={current.id} />
        </div>
        {navigation(1)}
      </div>
      {count > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2" aria-hidden="true">
          {projects.map((p, i) => (
            <span key={p.id} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-border dark:bg-border-dark"}`} />
          ))}
          <span className="ml-1 text-[11px] tabular-nums text-text-secondary">{index + 1} / {count}</span>
        </div>
      )}
    </div>
  );
}
