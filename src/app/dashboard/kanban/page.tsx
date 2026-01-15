/**
 * @file src/app/dashboard/kanban/page.tsx
 * @description
 * 칸반 페이지입니다.
 * 칸반보드와 부하분석 탭을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **칸반보드 탭**: 기존 칸반보드 (드래그앤드롭으로 작업 관리)
 * 2. **부하분석 탭**: 멤버별/날짜별 작업 부하 분석
 */

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import { useProject } from "@/contexts";
import { useTasks, useMembers } from "@/hooks";
import { KanbanBoard, WorkloadAnalysis } from "./components";

/** 탭 타입 */
type TabType = "kanban" | "workload";

/**
 * 칸반 페이지
 */
export default function KanbanPage() {
  const [activeTab, setActiveTab] = useState<TabType>("kanban");
  const { selectedProjectId, selectedProject } = useProject();

  // 부하분석용 데이터 (칸반보드 탭에서는 내부에서 자체 조회)
  const { data: tasks = [] } = useTasks(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );
  const { data: members = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  return (
    <div className="h-full flex flex-col bg-background dark:bg-background-dark">
      {/* 탭 헤더 */}
      <div className="px-6 py-3 border-b border-border dark:border-border-dark bg-background-white dark:bg-surface-dark shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="view_kanban" className="text-[#00f3ff]" />
              <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
                KANBAN
              </span>
              <span className="text-slate-400 text-sm font-normal ml-1">
                / 작업 현황
              </span>
            </h1>
            {selectedProject && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">
                <Icon name="folder" size="sm" className="text-primary" />
                <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
              </div>
            )}
          </div>

          {/* 탭 버튼 */}
          <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "kanban"
                  ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                  : "text-text-secondary hover:text-text dark:hover:text-white"
              }`}
            >
              <Icon name="view_kanban" size="sm" />
              <span>칸반보드</span>
            </button>
            <button
              onClick={() => setActiveTab("workload")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "workload"
                  ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                  : "text-text-secondary hover:text-text dark:hover:text-white"
              }`}
            >
              <Icon name="analytics" size="sm" />
              <span>부하분석</span>
            </button>
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "kanban" && <KanbanBoard />}

      {activeTab === "workload" && (
        <div className="flex-1 overflow-auto p-6">
          {!selectedProjectId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Icon name="folder" size="lg" className="text-text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text dark:text-white mb-2">
                  프로젝트를 선택하세요
                </h3>
                <p className="text-text-secondary">
                  상단 헤더에서 프로젝트를 선택하면 부하분석을 볼 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <WorkloadAnalysis
              tasks={tasks}
              members={members}
              projectName={selectedProject?.name}
            />
          )}
        </div>
      )}
    </div>
  );
}
