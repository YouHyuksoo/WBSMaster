/**
 * @file src/app/dashboard/wbs/page.tsx
 * @description
 * WBS 관리 페이지. 4단계 계층 구조를 지원합니다.
 * 로직은 hooks/, UI는 components/로 분리되어 있습니다.
 */

"use client";

import { useState, useMemo } from "react";
import { Icon, Button, ConfirmModal, useToast } from "@/components/ui";
import { useWbsItems, useCreateWbsItem, useUpdateWbsItem, useDeleteWbsItem, useChangeWbsLevel, useMembers, useCreateTask } from "@/hooks";
import { useProject } from "@/contexts/ProjectContext";
import type { WbsItem } from "@/lib/api";
import type { RightPanelView } from "./types";
import { applyCalculatedDates } from "./utils/wbsHelpers";
import { useGanttDrag, usePanelResize, useWbsStats, useGanttChart, useScrollSync, useWbsTree, useWbsActions } from "./hooks";
import { WbsToolbar, WbsStatsBar, WbsTreePanel, GanttChart, WbsDetailPanel, BulkAssignModal, BulkTaskAssignModal, WbsFormModal, DeliverablePreviewModal } from "./components";

/** 담당자 필터 적용 */
function filterTreeByAssignee(items: WbsItem[], assigneeId: string): WbsItem[] {
  const result: WbsItem[] = [];
  for (const item of items) {
    const filteredChildren = item.children ? filterTreeByAssignee(item.children, assigneeId) : [];
    const matches = assigneeId === "unassigned"
      ? !item.assignees || item.assignees.length === 0
      : item.assignees?.some((a) => a.id === assigneeId) || false;
    if (matches || filteredChildren.length > 0) {
      result.push({ ...item, children: filteredChildren });
    }
  }
  return result;
}

export default function WBSPage() {
  const toast = useToast();
  const { selectedProjectId, selectedProject } = useProject();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>("gantt");
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);

  // 데이터 fetching
  const { data: rawWbsTree = [], isLoading, error } = useWbsItems(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );
  const { data: teamMembers = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  // CRUD mutations
  const createWbs = useCreateWbsItem();
  const updateWbs = useUpdateWbsItem();
  const deleteWbs = useDeleteWbsItem();
  const changeLevel = useChangeWbsLevel();
  const createTask = useCreateTask();

  // 데이터 가공
  const wbsTreeWithDates = useMemo(() => applyCalculatedDates(rawWbsTree), [rawWbsTree]);
  const wbsTree = useMemo(
    () => filterAssigneeId ? filterTreeByAssignee(wbsTreeWithDates, filterAssigneeId) : wbsTreeWithDates,
    [wbsTreeWithDates, filterAssigneeId]
  );

  // 커스텀 훅
  const { panelWidth, containerRef, handleMouseDown } = usePanelResize();
  const ganttChart = useGanttChart(selectedProject);
  const { treeListRef, ganttScrollRef } = useScrollSync(selectedItemId);
  const tree = useWbsTree(wbsTree);
  const { stats, scheduleStats } = useWbsStats(wbsTree, selectedProject);
  const ganttDrag = useGanttDrag({ cellWidth: ganttChart.cellWidth, updateWbs, toast });
  const actions = useWbsActions({
    selectedProjectId, selectedProject, wbsTree, rightPanelView, selectedItemId, setSelectedItemId,
    setExpandedIds: tree.setExpandedIds, checkedIds: tree.checkedIds, setCheckedIds: tree.setCheckedIds,
    createWbs, updateWbs, deleteWbs, changeLevel, createTask, toast,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-error/10 text-error p-4 rounded-lg">데이터를 불러오는데 실패했습니다.</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background dark:bg-background-dark">
      <WbsToolbar
        selectedProject={selectedProject}
        selectedProjectId={selectedProjectId}
        wbsTree={wbsTree}
        rightPanelView={rightPanelView}
        filterAssigneeId={filterAssigneeId}
        teamMembers={teamMembers}
        onFilterChange={setFilterAssigneeId}
        onViewChange={setRightPanelView}
        onExpandAll={tree.handleExpandAll}
        onExpandLevel2={tree.handleExpandLevel2}
        onCollapseAll={tree.handleCollapseAll}
        onExportExcel={() => actions.handleExportToExcel((items) => {
          const result: WbsItem[] = [];
          const traverse = (list: WbsItem[]) => {
            list.forEach((item) => {
              result.push(item);
              if (item.children && tree.expandedIds.has(item.id)) traverse(item.children);
            });
          };
          traverse(items);
          return result;
        })}
        onAddNew={actions.handleAddNew}
      />

      {!selectedProjectId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon name="folder_open" size="xl" className="text-primary mb-4" />
            <h3 className="text-lg font-semibold text-text dark:text-white mb-2">프로젝트를 선택해주세요</h3>
            <p className="text-text-secondary">상단 헤더에서 프로젝트를 선택하면 WBS가 표시됩니다.</p>
          </div>
        </div>
      )}

      {selectedProjectId && (
        <>
          <WbsStatsBar stats={stats} scheduleStats={scheduleStats} />

          {wbsTree.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Icon name="account_tree" size="xl" className="text-text-secondary mb-4" />
                <h3 className="text-lg font-semibold text-text dark:text-white mb-2">WBS 항목이 없습니다</h3>
                <p className="text-text-secondary mb-4">대분류부터 추가하여 WBS 구조를 만들어보세요.</p>
                <Button variant="primary" leftIcon="add" onClick={actions.handleAddNew}>대분류 추가</Button>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="flex-1 flex overflow-hidden">
              <WbsTreePanel
                panelWidth={panelWidth} wbsTree={wbsTree} expandedIds={tree.expandedIds}
                selectedItemId={selectedItemId} checkedIds={tree.checkedIds} stats={stats} treeListRef={treeListRef}
                onToggle={tree.handleToggle} onSelect={setSelectedItemId} onCheck={tree.handleCheck}
                onCheckAll={tree.handleCheckAll} onAddChild={actions.handleAddChild} onEdit={actions.handleEdit}
                onDelete={actions.handleDelete} onLevelUp={actions.handleLevelUp} onLevelDown={actions.handleLevelDown}
                onRegisterTask={actions.handleRegisterTask} onUpdateProgress={actions.handleUpdateProgress}
                onPreviewDeliverable={actions.setDeliverablePreviewUrl}
                onBulkAssign={() => actions.setShowBulkAssignModal(true)}
                onBulkTaskAssign={() => actions.setShowBulkTaskAssignModal(true)}
                onClearChecked={() => tree.setCheckedIds(new Set())}
                getAllItemIds={tree.getAllItemIds}
              />

              <div
                onMouseDown={handleMouseDown}
                className="w-2 flex-shrink-0 bg-border dark:bg-border-dark hover:bg-primary/50 cursor-col-resize transition-colors flex items-center justify-center group"
                title="드래그하여 크기 조절"
              >
                <div className="w-0.5 h-8 bg-text-secondary/30 group-hover:bg-primary rounded-full" />
              </div>

              {rightPanelView === "detail" ? (
                <WbsDetailPanel
                  selectedItem={selectedItemId ? actions.findItemById(wbsTree, selectedItemId) : null}
                  teamMembers={teamMembers} formData={actions.newItem}
                  onFormChange={(data) => actions.setNewItem({ ...actions.newItem, ...data })}
                  onSave={actions.handleDetailSave} isSaving={updateWbs.isPending}
                />
              ) : (
                <GanttChart
                  visibleItems={tree.visibleItems} dates={ganttChart.dates} cellWidth={ganttChart.cellWidth}
                  todayIndex={ganttChart.todayIndex} selectedItemId={selectedItemId}
                  dragState={ganttDrag.dragState} dragDelta={ganttDrag.dragDelta}
                  pendingDates={ganttDrag.pendingDates} isSavingDates={ganttDrag.isSavingDates}
                  zoomIndex={ganttChart.zoomIndex} zoomLevels={ganttChart.zoomLevels}
                  onZoomIn={ganttChart.handleZoomIn} onZoomOut={ganttChart.handleZoomOut}
                  onDragStart={ganttDrag.handleGanttDragStart}
                  onSavePending={ganttDrag.handleSavePendingDates}
                  onCancelPending={ganttDrag.handleCancelPendingDates}
                  onSelectItem={setSelectedItemId} ganttScrollRef={ganttScrollRef}
                />
              )}
            </div>
          )}
        </>
      )}

      <BulkAssignModal
        isOpen={actions.showBulkAssignModal} checkedCount={tree.checkedIds.size} teamMembers={teamMembers}
        selectedAssigneeIds={actions.bulkAssigneeIds} onAssigneeChange={actions.setBulkAssigneeIds}
        onAssign={actions.handleBulkAssign} onClose={() => actions.setShowBulkAssignModal(false)}
      />
      <BulkTaskAssignModal
        isOpen={actions.showBulkTaskAssignModal} selectedItems={actions.getSelectedWbsItems()}
        teamMembers={teamMembers} onAssign={actions.handleBulkTaskAssign}
        onClose={() => actions.setShowBulkTaskAssignModal(false)} isLoading={createTask.isPending}
      />
      <WbsFormModal
        isOpen={actions.showAddModal} editingItem={actions.editingItem} teamMembers={teamMembers}
        formData={actions.newItem} onFormChange={(data) => actions.setNewItem({ ...actions.newItem, ...data })}
        onSubmit={actions.handleSubmit}
        onClose={() => { actions.setShowAddModal(false); actions.setEditingItem(null); }}
        isSubmitting={createWbs.isPending || updateWbs.isPending}
      />
      <DeliverablePreviewModal url={actions.deliverablePreviewUrl} onClose={() => actions.setDeliverablePreviewUrl(null)} />
      <ConfirmModal
        isOpen={actions.showDeleteConfirm} title="WBS 항목 삭제"
        message={`"${actions.deletingItemName}" 항목과 모든 하위 항목이 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`}
        onConfirm={actions.handleConfirmDelete} onCancel={() => actions.setShowDeleteConfirm(false)}
        confirmText="삭제" cancelText="취소" variant="danger" isLoading={deleteWbs.isPending}
      />
    </div>
  );
}
