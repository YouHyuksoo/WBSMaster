/**
 * @file src/app/dashboard/kanban/page.tsx
 * @description
 * 칸반 페이지입니다.
 * 칸반보드, 플로우, 부하분석 탭을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **칸반보드 탭**: 기존 칸반보드 (드래그앤드롭으로 작업 관리)
 * 2. **플로우 탭**: 태스크 순서/의존성을 플로우차트로 시각화
 * 3. **부하분석 탭**: 멤버별/날짜별 작업 부하 분석
 */

"use client";

import { useState, useCallback } from "react";
import { Icon } from "@/components/ui";
import { useProject } from "@/contexts";
import { useTasks, useMembers } from "@/hooks";
import { KanbanBoard, WorkloadAnalysis, TaskFlowCanvas, TaskListPanel, TaskFlowSidebar } from "./components";
import { useTaskConnections } from "./hooks/useTaskConnections";

/** 탭 타입 */
type TabType = "kanban" | "flow" | "workload";

/**
 * 칸반 페이지
 */
export default function KanbanPage() {
  const [activeTab, setActiveTab] = useState<TabType>("kanban");
  const { selectedProjectId, selectedProject } = useProject();

  // 플로우/부하분석용 상태
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null); // 노드 선택 (하이라이트)
  const [sidebarTaskId, setSidebarTaskId] = useState<string | null>(null); // 사이드바 표시용
  const [showTaskList, setShowTaskList] = useState(true);

  // 플로우 변경사항 관리
  const [flowHasChanges, setFlowHasChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabType | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 탭 전환 핸들러 (변경사항 확인)
  const handleTabChange = useCallback((newTab: TabType) => {
    // 플로우 탭에서 다른 탭으로 이동할 때 변경사항 확인
    if (activeTab === "flow" && newTab !== "flow" && flowHasChanges) {
      setPendingTab(newTab);
      setShowConfirmModal(true);
      return;
    }
    setActiveTab(newTab);
  }, [activeTab, flowHasChanges]);

  // 변경사항 무시하고 탭 전환
  const handleDiscardAndSwitch = useCallback(() => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
      setShowConfirmModal(false);
      setFlowHasChanges(false);
    }
  }, [pendingTab]);

  // 모달 닫기 (탭 전환 취소)
  const handleCancelSwitch = useCallback(() => {
    setPendingTab(null);
    setShowConfirmModal(false);
  }, []);

  // 부하분석용 데이터 (칸반보드 탭에서는 내부에서 자체 조회)
  const { data: tasks = [] } = useTasks(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );
  const { data: members = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );
  // 플로우용 연결 데이터
  const { data: connections = [] } = useTaskConnections(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  // 사이드바에 표시할 태스크 찾기
  const sidebarTask = sidebarTaskId ? tasks.find((t) => t.id === sidebarTaskId) : null;

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
              onClick={() => handleTabChange("kanban")}
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
              onClick={() => handleTabChange("flow")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "flow"
                  ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                  : "text-text-secondary hover:text-text dark:hover:text-white"
              }`}
            >
              <Icon name="account_tree" size="sm" />
              <span>플로우</span>
              {/* 변경사항 표시 */}
              {flowHasChanges && activeTab === "flow" && (
                <span className="size-2 rounded-full bg-warning animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => handleTabChange("workload")}
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

      {activeTab === "flow" && (
        <div className="flex-1 flex overflow-hidden relative">
          {!selectedProjectId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Icon name="folder" size="lg" className="text-text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text dark:text-white mb-2">
                  프로젝트를 선택하세요
                </h3>
                <p className="text-text-secondary">
                  상단 헤더에서 프로젝트를 선택하면 플로우를 볼 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 좌측: 태스크 목록 패널 (토글 가능) */}
              {showTaskList && (
                <TaskListPanel
                  tasks={tasks}
                  selectedId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
                  onClose={() => setShowTaskList(false)}
                />
              )}

              {/* 패널 토글 버튼 (패널 닫혔을 때) */}
              {!showTaskList && (
                <button
                  onClick={() => setShowTaskList(true)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
                  title="태스크 목록 열기"
                >
                  <span className="material-symbols-outlined text-text dark:text-white" style={{ fontSize: 20 }}>
                    chevron_right
                  </span>
                </button>
              )}

              {/* 중앙: 캔버스 */}
              <TaskFlowCanvas
                tasks={tasks}
                connections={connections}
                projectId={selectedProjectId}
                selectedId={selectedTaskId}
                onSelectNode={setSelectedTaskId}
                onOpenSidebar={setSidebarTaskId}
                onHasChangesChange={setFlowHasChanges}
              />

              {/* 우측: 태스크 상세 사이드바 */}
              {sidebarTask && (
                <TaskFlowSidebar
                  task={sidebarTask}
                  projectId={selectedProjectId}
                  onClose={() => setSidebarTaskId(null)}
                />
              )}
            </>
          )}
        </div>
      )}

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
              projectId={selectedProjectId}
              projectName={selectedProject?.name}
            />
          )}
        </div>
      )}

      {/* 변경사항 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCancelSwitch}
          />

          {/* 모달 */}
          <div className="relative bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
            {/* 아이콘 */}
            <div className="flex justify-center mb-4">
              <div className="size-16 rounded-full bg-warning/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-warning" style={{ fontSize: 32 }}>
                  warning
                </span>
              </div>
            </div>

            {/* 제목 */}
            <h3 className="text-lg font-bold text-text dark:text-white text-center mb-2">
              저장하지 않은 변경사항이 있습니다
            </h3>

            {/* 설명 */}
            <p className="text-sm text-text-secondary text-center mb-6">
              노드 위치 변경사항이 저장되지 않았습니다.<br />
              저장하지 않고 이동하면 변경사항이 사라집니다.
            </p>

            {/* 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelSwitch}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border dark:border-border-dark text-text dark:text-white font-medium hover:bg-surface dark:hover:bg-background-dark transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDiscardAndSwitch}
                className="flex-1 px-4 py-2.5 rounded-lg bg-error text-white font-medium hover:bg-error/90 transition-colors"
              >
                저장 안 함
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
