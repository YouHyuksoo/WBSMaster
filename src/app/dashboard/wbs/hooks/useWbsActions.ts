/**
 * @file src/app/dashboard/wbs/hooks/useWbsActions.ts
 * @description
 * WBS 항목 CRUD, 폼 상태, 일괄 배정 등 액션 로직을 관리하는 커스텀 훅입니다.
 *
 * 초보자 가이드:
 * 1. **모달 상태**: showAddModal, showBulkAssignModal 등
 * 2. **폼 상태**: newItem, editingItem
 * 3. **핸들러**: handleAddChild, handleEdit, handleDelete 등
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { utils, writeFile } from "xlsx";
import type { WbsItem, WbsLevel, Project } from "@/lib/api";
import type { useCreateWbsItem, useUpdateWbsItem, useDeleteWbsItem, useChangeWbsLevel, useCreateTask } from "@/hooks";
import type { NewItemForm, RightPanelView } from "../types";
import { levelNames, statusNames } from "../constants";
import { isDelayed, getDelayDays, getDisplayStatus } from "../utils/wbsHelpers";

interface UseWbsActionsParams {
  selectedProjectId: string | null;
  selectedProject: Project | null;
  wbsTree: WbsItem[];
  rightPanelView: RightPanelView;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  checkedIds: Set<string>;
  setCheckedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  createWbs: ReturnType<typeof useCreateWbsItem>;
  updateWbs: ReturnType<typeof useUpdateWbsItem>;
  deleteWbs: ReturnType<typeof useDeleteWbsItem>;
  changeLevel: ReturnType<typeof useChangeWbsLevel>;
  createTask: ReturnType<typeof useCreateTask>;
  toast: { success: (msg: string, title?: string) => void; error: (msg: string, title?: string) => void };
}

export function useWbsActions({
  selectedProjectId,
  selectedProject,
  wbsTree,
  rightPanelView,
  selectedItemId,
  setSelectedItemId,
  setExpandedIds,
  checkedIds,
  setCheckedIds,
  createWbs,
  updateWbs,
  deleteWbs,
  changeLevel,
  createTask,
  toast,
}: UseWbsActionsParams) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WbsItem | null>(null);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssigneeIds, setBulkAssigneeIds] = useState<string[]>([]);
  const [showBulkTaskAssignModal, setShowBulkTaskAssignModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingItemName, setDeletingItemName] = useState("");
  const [deliverablePreviewUrl, setDeliverablePreviewUrl] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<NewItemForm>({
    name: "",
    description: "",
    level: "LEVEL1" as WbsLevel,
    parentId: undefined,
    assigneeIds: [],
    startDate: "",
    endDate: "",
    actualStartDate: "",
    actualEndDate: "",
    progress: 0,
    weight: 1,
    deliverableName: "",
    deliverableLink: "",
  });

  /** 트리에서 항목 ID로 WBS 항목 찾기 (재귀 탐색) */
  const findItemById = useCallback((items: WbsItem[], id: string): WbsItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  /** 상세보기 모드에서 선택 항목 변경 시 폼 데이터 자동 로딩 */
  useEffect(() => {
    if (rightPanelView !== "detail" || !selectedItemId) return;
    const item = findItemById(wbsTree, selectedItemId);
    if (item) {
      setNewItem({
        name: item.name,
        description: item.description || "",
        level: item.level,
        parentId: item.parentId,
        assigneeIds: item.assignees?.map((a) => a.id) || [],
        startDate: item.startDate?.split("T")[0] || "",
        endDate: item.endDate?.split("T")[0] || "",
        actualStartDate: item.actualStartDate?.split("T")[0] || "",
        actualEndDate: item.actualEndDate?.split("T")[0] || "",
        progress: item.progress || 0,
        weight: item.weight || 1,
        deliverableName: item.deliverableName || "",
        deliverableLink: item.deliverableLink || "",
      });
      setEditingItem(item);
    }
  }, [rightPanelView, selectedItemId, wbsTree, findItemById]);

  /** 자식 추가 */
  const handleAddChild = (parentId: string, level: WbsLevel) => {
    setNewItem({
      name: "",
      description: "",
      level,
      parentId,
      assigneeIds: [],
      startDate: "",
      endDate: "",
      actualStartDate: "",
      actualEndDate: "",
      progress: 0,
      weight: 1,
      deliverableName: "",
      deliverableLink: "",
    });
    setEditingItem(null);
    setShowAddModal(true);
  };

  /** 항목 수정 */
  const handleEdit = (item: WbsItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      description: item.description || "",
      level: item.level,
      parentId: item.parentId,
      assigneeIds: item.assignees?.map((a) => a.id) || [],
      startDate: item.startDate?.split("T")[0] || "",
      endDate: item.endDate?.split("T")[0] || "",
      actualStartDate: item.actualStartDate?.split("T")[0] || "",
      actualEndDate: item.actualEndDate?.split("T")[0] || "",
      progress: item.progress || 0,
      weight: item.weight || 1,
      deliverableName: item.deliverableName || "",
      deliverableLink: item.deliverableLink || "",
    });
    setShowAddModal(true);
  };

  /** 항목 삭제 - 확인 모달 표시 */
  const handleDelete = (id: string) => {
    const item = findItemById(wbsTree, id);
    if (item) {
      setDeletingItemId(id);
      setDeletingItemName(item.name);
      setShowDeleteConfirm(true);
    }
  };

  /** 항목 삭제 확인 */
  const handleConfirmDelete = async () => {
    if (!deletingItemId) return;

    try {
      await deleteWbs.mutateAsync(deletingItemId);
      if (selectedItemId === deletingItemId) {
        setSelectedItemId(null);
      }
      toast.success("항목이 삭제되었습니다.");
    } catch {
      toast.error("항목 삭제에 실패했습니다.");
    } finally {
      setShowDeleteConfirm(false);
      setDeletingItemId(null);
      setDeletingItemName("");
    }
  };

  /** 레벨 올리기 */
  const handleLevelUp = async (id: string) => {
    try {
      await changeLevel.mutateAsync({ id, direction: "up" });
      toast.success("레벨이 변경되었습니다.");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "레벨을 올릴 수 없습니다.";
      toast.error(msg, "레벨 변경 실패");
    }
  };

  /** 레벨 내리기 */
  const handleLevelDown = async (id: string) => {
    try {
      await changeLevel.mutateAsync({ id, direction: "down" });
      toast.success("레벨이 변경되었습니다.");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "레벨을 내릴 수 없습니다. 이전 형제 항목이 필요합니다.";
      toast.error(msg, "레벨 변경 실패");
    }
  };

  /** 진행률 인라인 업데이트 */
  const handleUpdateProgress = async (id: string, progress: number) => {
    try {
      await updateWbs.mutateAsync({ id, progress });
      toast.success(`진행률이 ${progress}%로 변경되었습니다.`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "진행률 변경에 실패했습니다.";
      toast.error(msg, "진행률 변경 실패");
    }
  };

  /** WBS 단위업무를 Task로 등록 */
  const handleRegisterTask = async (item: WbsItem) => {
    if (!selectedProjectId) return;

    try {
      await createTask.mutateAsync({
        title: `[${item.code}] ${item.name}`,
        description: item.description || `WBS 단위업무에서 생성됨\n\nWBS 코드: ${item.code}`,
        projectId: selectedProjectId,
        assigneeIds: item.assignees?.map(a => a.id) || [],
        dueDate: item.endDate?.split("T")[0],
        priority: "MEDIUM",
        wbsItemId: item.id,
      });
      toast.success(`"${item.name}" 항목이 Task로 등록되었습니다.`, "Task 등록 완료");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Task 등록에 실패했습니다.";
      toast.error(msg, "Task 등록 실패");
    }
  };

  /** 선택된 WBS 항목들을 가져오기 */
  const getSelectedWbsItems = (): WbsItem[] => {
    const items: WbsItem[] = [];
    const findItems = (list: WbsItem[]) => {
      list.forEach((item) => {
        if (checkedIds.has(item.id)) {
          items.push(item);
        }
        if (item.children) {
          findItems(item.children);
        }
      });
    };
    findItems(wbsTree);
    return items;
  };

  /** 일괄 배정 실행 */
  const handleBulkAssign = async () => {
    if (checkedIds.size === 0 || bulkAssigneeIds.length === 0) return;

    try {
      const promises = Array.from(checkedIds).map((id) =>
        updateWbs.mutateAsync({
          id,
          assigneeIds: bulkAssigneeIds,
        })
      );
      await Promise.all(promises);

      toast.success(`${checkedIds.size}개 항목에 담당자가 배정되었습니다.`);
      setShowBulkAssignModal(false);
      setCheckedIds(new Set());
      setBulkAssigneeIds([]);
    } catch {
      toast.error("일괄 배정 중 오류가 발생했습니다.");
    }
  };

  /** TASK 일괄 배정 핸들러 */
  const handleBulkTaskAssign = async (assigneeIdForUnassigned: string | null) => {
    if (!selectedProjectId) return;
    if (checkedIds.size === 0) return;

    const selectedItems = getSelectedWbsItems();
    if (selectedItems.length === 0) return;

    try {
      const promises = selectedItems.map((item) => {
        const assigneeIds =
          item.assignees && item.assignees.length > 0
            ? item.assignees.map((a) => a.id)
            : assigneeIdForUnassigned
            ? [assigneeIdForUnassigned]
            : [];

        return createTask.mutateAsync({
          title: `[${item.code}] ${item.name}`,
          description: item.description || `WBS에서 생성됨\n\nWBS 코드: ${item.code}`,
          projectId: selectedProjectId,
          assigneeIds,
          dueDate: item.endDate?.split("T")[0],
          priority: "MEDIUM",
          wbsItemId: item.id,
        });
      });

      await Promise.all(promises);

      toast.success(
        `${selectedItems.length}개 항목이 TASK로 등록되었습니다.`,
        "TASK 일괄 배정 완료"
      );

      setShowBulkTaskAssignModal(false);
      setCheckedIds(new Set());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "TASK 일괄 배정 중 오류가 발생했습니다.";
      toast.error(msg, "TASK 배정 실패");
    }
  };

  /** 항목 생성/수정 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newItem.name.trim()) return;

    if (editingItem) {
      await updateWbs.mutateAsync({
        id: editingItem.id,
        name: newItem.name,
        description: newItem.description,
        assigneeIds: newItem.assigneeIds.length > 0 ? newItem.assigneeIds : undefined,
        startDate: newItem.startDate || undefined,
        endDate: newItem.endDate || undefined,
        actualStartDate: newItem.actualStartDate || undefined,
        actualEndDate: newItem.actualEndDate || undefined,
        progress: newItem.progress,
        weight: newItem.level === "LEVEL1" ? newItem.weight : undefined,
        deliverableName: newItem.deliverableName || undefined,
        deliverableLink: newItem.deliverableLink || undefined,
      });
    } else {
      await createWbs.mutateAsync({
        name: newItem.name,
        description: newItem.description,
        projectId: selectedProjectId,
        parentId: newItem.parentId,
        level: newItem.level,
        assigneeIds: newItem.assigneeIds.length > 0 ? newItem.assigneeIds : undefined,
        startDate: newItem.startDate || undefined,
        endDate: newItem.endDate || undefined,
        weight: newItem.level === "LEVEL1" ? newItem.weight : undefined,
        deliverableName: newItem.deliverableName || undefined,
        deliverableLink: newItem.deliverableLink || undefined,
      });

      if (newItem.parentId) {
        setExpandedIds((prev) => new Set([...prev, newItem.parentId!]));
      }
    }

    setNewItem({
      name: "",
      description: "",
      level: "LEVEL1",
      parentId: undefined,
      assigneeIds: [],
      startDate: "",
      endDate: "",
      actualStartDate: "",
      actualEndDate: "",
      progress: 0,
      weight: 1,
      deliverableName: "",
      deliverableLink: "",
    });
    setEditingItem(null);
    setShowAddModal(false);
  };

  /** 상세보기 패널에서 저장 핸들러 */
  const handleDetailSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !newItem.name.trim()) return;

    try {
      await updateWbs.mutateAsync({
        id: editingItem.id,
        name: newItem.name,
        description: newItem.description,
        assigneeIds: newItem.assigneeIds.length > 0 ? newItem.assigneeIds : undefined,
        startDate: newItem.startDate || undefined,
        endDate: newItem.endDate || undefined,
        actualStartDate: newItem.actualStartDate || undefined,
        actualEndDate: newItem.actualEndDate || undefined,
        progress: newItem.progress,
        weight: newItem.level === "LEVEL1" ? newItem.weight : undefined,
        deliverableName: newItem.deliverableName || undefined,
        deliverableLink: newItem.deliverableLink || undefined,
      });
      toast.success("항목이 수정되었습니다.");
    } catch {
      toast.error("항목 수정에 실패했습니다.");
    }
  };

  /** 엑셀 다운로드 핸들러 */
  const handleExportToExcel = (flattenItems: (items: WbsItem[]) => WbsItem[]) => {
    const flatItems = flattenItems(wbsTree);
    if (flatItems.length === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    const excelData = flatItems.map((item) => {
      const delayDays = isDelayed(item.endDate, item.status, item.progress, item.actualEndDate)
        ? getDelayDays(item.endDate, item.status, item.progress, item.actualEndDate)
        : 0;
      return {
        "WBS 코드": item.code,
        "레벨": levelNames[item.level],
        "항목명": item.name,
        "상태": statusNames[getDisplayStatus(item.status, item.endDate, item.progress, item.actualEndDate)],
        "지연일수": delayDays > 0 ? `D+${delayDays}` : "-",
        "진행률": `${item.progress}%`,
        "시작일": item.startDate ? new Date(item.startDate).toLocaleDateString() : "-",
        "종료일": item.endDate ? new Date(item.endDate).toLocaleDateString() : "-",
        "담당자": item.assignees?.map((a) => a.name).join(", ") || "-",
        "가중치": item.weight ? `${item.weight}%` : "-",
        "산출물": item.deliverableName || "-",
        "설명": item.description || "",
      };
    });

    const worksheet = utils.json_to_sheet(excelData);
    worksheet["!cols"] = [
      { wch: 15 }, { wch: 8 }, { wch: 40 }, { wch: 10 }, { wch: 10 },
      { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 8 },
      { wch: 20 }, { wch: 50 },
    ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "WBS");

    const projectName = selectedProject?.name || "Project";
    const dateStr = new Date().toISOString().split("T")[0];
    writeFile(workbook, `${projectName}_WBS_${dateStr}.xlsx`);

    toast.success("WBS를 엑셀 파일로 다운로드했습니다.");
  };

  /** 대분류 추가 (모달 열기) */
  const handleAddNew = () => {
    setNewItem({
      name: "",
      description: "",
      level: "LEVEL1",
      parentId: undefined,
      assigneeIds: [],
      startDate: "",
      endDate: "",
      actualStartDate: "",
      actualEndDate: "",
      progress: 0,
      weight: 1,
      deliverableName: "",
      deliverableLink: "",
    });
    setEditingItem(null);
    setShowAddModal(true);
  };

  return {
    // 모달 상태
    showAddModal,
    setShowAddModal,
    editingItem,
    setEditingItem,
    showBulkAssignModal,
    setShowBulkAssignModal,
    bulkAssigneeIds,
    setBulkAssigneeIds,
    showBulkTaskAssignModal,
    setShowBulkTaskAssignModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    deletingItemName,
    deliverablePreviewUrl,
    setDeliverablePreviewUrl,
    // 폼 상태
    newItem,
    setNewItem,
    // 핸들러
    findItemById,
    handleAddChild,
    handleEdit,
    handleDelete,
    handleConfirmDelete,
    handleLevelUp,
    handleLevelDown,
    handleUpdateProgress,
    handleRegisterTask,
    handleBulkAssign,
    handleBulkTaskAssign,
    handleSubmit,
    handleDetailSave,
    handleExportToExcel,
    handleAddNew,
    getSelectedWbsItems,
  };
}
