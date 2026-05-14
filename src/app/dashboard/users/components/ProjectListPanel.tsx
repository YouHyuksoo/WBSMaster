/**
 * @file src/app/dashboard/users/components/ProjectListPanel.tsx
 * @description 우측 상단 프로젝트 패널 — 검색/생성/선택
 *
 * 초보자 가이드:
 * 1. **accessibleOnly: false**: ADMIN 페이지이므로 전체 프로젝트 조회
 * 2. **선택**: 행 클릭 → 부모(page.tsx)의 selectedProjectId 변경
 */
"use client";

import { useState, useMemo } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { useProjects } from "@/hooks";
import type { Project } from "@/lib/api";
import { ProjectListRow } from "./ProjectListRow";

interface Props {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (project: Project) => void;
}

export function ProjectListPanel({ selectedProjectId, onSelectProject, onCreateProject, onDeleteProject }: Props) {
  const { data: projects = [], isLoading } = useProjects({ accessibleOnly: false });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );
  }, [projects, search]);

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl flex flex-col">
      <div className="p-4 border-b border-border dark:border-border-dark space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-text dark:text-white">프로젝트</h2>
          <Button variant="primary" size="sm" leftIcon="add" onClick={onCreateProject}>
            추가
          </Button>
        </div>
        <Input
          leftIcon="search"
          placeholder="프로젝트 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-[40vh] overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-text-secondary">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            <Icon name="folder_off" size="xl" className="mb-3" />
            <p>프로젝트가 없습니다.</p>
          </div>
        ) : (
          filtered.map((p) => (
            <ProjectListRow
              key={p.id}
              project={p}
              selected={p.id === selectedProjectId}
              onSelect={() => onSelectProject(p.id)}
              onDelete={() => onDeleteProject(p)}
            />
          ))
        )}
      </div>
    </div>
  );
}
