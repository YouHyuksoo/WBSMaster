/**
 * @file src/app/dashboard/components/ProjectCarousel.tsx
 * @description 그림자 있는 프로젝트 섹션과 독립적인 캐러셀 탐색을 표시합니다.
 * 초보자 가이드:
 * - 섹션이 스크롤 상태와 탐색 버튼을 관리합니다.
 * - 프로젝트 데이터와 개요 동작은 부모에서 전달받습니다.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import ProjectCard, { type ProjectCardProps, type ProjectWithWbs } from "@/app/dashboard/components/ProjectCard";

interface ProjectCarouselProps {
  projects: ProjectWithWbs[];
  onEdit: ProjectCardProps["onEdit"];
  onOverview: ProjectCardProps["onOverview"];
}

export default function ProjectCarousel({ projects, onEdit, onOverview }: ProjectCarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const updateEdges = useCallback(() => {
    const node = track.current;
    if (node) setEdges({ left: node.scrollLeft > 1, right: node.scrollLeft + node.clientWidth < node.scrollWidth - 2 });
  }, []);
  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
  }, []);
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    node.addEventListener("scroll", updateEdges);
    return () => { observer.disconnect(); node.removeEventListener("scroll", updateEdges); stop(); };
  }, [projects.length, updateEdges, stop]);
  const start = (direction: number) => {
    stop();
    interval.current = setInterval(() => track.current?.scrollBy({ left: direction * 8 }), 16);
  };
  const width = "w-full md:w-[calc((100%-12px)/2)] xl:w-[calc((100%-24px)/3)]";
  const navigation = (direction: -1 | 1) => {
    const enabled = direction === -1 ? edges.left : edges.right;
    return (
      <button type="button" aria-label={direction === -1 ? "이전 프로젝트" : "다음 프로젝트"}
        disabled={!enabled}
        onClick={() => track.current?.scrollBy({ left: direction * track.current.clientWidth })}
        onMouseEnter={() => enabled && start(direction)} onMouseLeave={stop} onBlur={stop}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-primary/10 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <Icon name={direction === -1 ? "chevron_left" : "chevron_right"} size="md" />
      </button>
    );
  };
  return (
    <div className="relative flex items-center gap-2 rounded-xl bg-background-white dark:bg-surface-dark p-3 shadow-[0_4px_16px_rgba(15,23,42,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.30)]">
      {navigation(-1)}
      <div ref={track} className="flex min-w-0 flex-1 gap-3 overflow-x-auto md:overflow-x-hidden px-2 py-3 -mx-2 -my-3">
        {projects.map(project => (
          <div key={project.id} className={`min-w-0 shrink-0 ${width}`}>
            <ProjectCard project={project} compact onEdit={onEdit} onOverview={onOverview} />
          </div>
        ))}
      </div>
      {navigation(1)}
    </div>
  );
}
