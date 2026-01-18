/**
 * @file src/app/dashboard/discussion-items/page.tsx
 * @description
 * 협의요청관리 페이지입니다.
 * 협의요청 목록 조회, 등록, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **협의요청이란**: 버그도 아니고 새 기능도 아닌, PM과 협의가 필요한 사항
 * 2. **통계 카드**: 전체, 협의 중, 변환됨, 완료 현황
 * 3. **탭**: 협의 중 vs 변환됨/완료
 * 4. **필터**: 사업부, 발생 단계, 검색어로 필터링
 *
 * @example
 * 접속 URL: /dashboard/discussion-items
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { utils, writeFile } from "xlsx";
import { Icon, Button, Input, useToast, ConfirmModal } from "@/components/ui";
import { useProject } from "@/contexts";
import { DiscussionItemTable, DiscussionItemModal } from "./components";
import {
  type DiscussionItem,
  type DiscussionItemFormData,
  type DiscussionStatus,
  STATUS_CONFIG,
  STAGE_CONFIG,
} from "./types";
import { BUSINESS_UNITS } from "@/constants/business-units";

/**
 * 협의요청관리 페이지 컴포넌트
 */
export default function DiscussionItemsPage() {
  /** 전역 프로젝트 선택 상태 */
  const { selectedProjectId, selectedProject } = useProject();

  // 필터 상태
  const [filterBusinessUnit, setFilterBusinessUnit] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"discussing" | "converted" | "completed" | "all">("discussing");

  // 모달 상태
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    item: DiscussionItem | null;
  }>({
    isOpen: false,
    mode: "create",
    item: null,
  });

  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingItem, setDeletingItem] = useState<DiscussionItem | null>(null);

  // 통계 카드 접기/펼치기 상태
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

  const toast = useToast();

  // 데이터 상태
  const [items, setItems] = useState<DiscussionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 협의요청 목록 조회
   * 프로젝트 ID가 있으면 해당 프로젝트의 협의요청만 조회
   */
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) {
        params.append("projectId", selectedProjectId);
      }
      const response = await fetch(`/api/discussion-items?${params.toString()}`);
      if (!response.ok) {
        throw new Error("협의요청 목록을 불러올 수 없습니다.");
      }
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error("협의요청 목록 조회 실패:", error);
      toast.error("협의요청 목록을 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, toast]);

  // 프로젝트 변경 시 데이터 다시 조회
  useEffect(() => {
    if (selectedProjectId) {
      fetchItems();
    } else {
      setItems([]);
    }
  }, [selectedProjectId, fetchItems]);

  // 탭별 아이템 분리
  const discussingItems = items.filter((i) => i.status === "DISCUSSING");
  const convertedItems = items.filter(
    (i) => i.status === "CONVERTED_TO_REQUEST" || i.status === "CONVERTED_TO_COOPERATION"
  );
  const completedItems = items.filter((i) => i.status === "COMPLETED");

  // 현재 탭에 해당하는 아이템
  const tabItems = useMemo(() => {
    if (activeTab === "discussing") return discussingItems;
    if (activeTab === "converted") return convertedItems;
    if (activeTab === "completed") return completedItems;
    return items; // all
  }, [activeTab, items, discussingItems, convertedItems, completedItems]);

  // 필터링된 아이템
  const filteredItems = useMemo(() => {
    return tabItems.filter((item) => {
      const matchesBusinessUnit =
        filterBusinessUnit === "all" || item.businessUnit === filterBusinessUnit;
      const matchesStage =
        filterStage === "all" || item.stage === filterStage;
      const matchesSearch =
        !searchQuery ||
        item.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBusinessUnit && matchesStage && matchesSearch;
    });
  }, [tabItems, filterBusinessUnit, filterStage, searchQuery]);

  // 필터/탭 변경 시 검색 리셋
  useEffect(() => {
    // 탭 변경 시 검색 유지
  }, [activeTab, filterBusinessUnit, filterStage]);

  // 통계 계산
  const stats = useMemo(() => {
    const total = items.length;
    const discussing = items.filter((i) => i.status === "DISCUSSING").length;
    const converted = items.filter(
      (i) => i.status === "CONVERTED_TO_REQUEST" || i.status === "CONVERTED_TO_COOPERATION"
    ).length;
    const blocked = items.filter((i) => i.status === "BLOCKED").length;
    const completed = items.filter((i) => i.status === "COMPLETED").length;

    return {
      total,
      discussing,
      converted,
      blocked,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [items]);

  // 모달 열기 - 등록
  const handleOpenCreate = useCallback(() => {
    setModalState({
      isOpen: true,
      mode: "create",
      item: null,
    });
  }, []);

  // 모달 열기 - 수정
  const handleOpenEdit = useCallback((item: DiscussionItem) => {
    setModalState({
      isOpen: true,
      mode: "edit",
      item,
    });
  }, []);

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    setModalState({
      isOpen: false,
      mode: "create",
      item: null,
    });
  }, []);

  // 제출 핸들러
  const handleSubmit = useCallback(
    async (formData: DiscussionItemFormData) => {
      try {
        if (modalState.mode === "create") {
          // 생성 API 호출
          const response = await fetch("/api/discussion-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: selectedProjectId,
              ...formData,
            }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "협의요청 등록에 실패했습니다.");
          }
          toast.success("협의요청이 등록되었습니다.");
        } else if (modalState.item) {
          // 수정 API 호출
          const response = await fetch(`/api/discussion-items/${modalState.item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "협의요청 수정에 실패했습니다.");
          }
          toast.success("협의요청이 수정되었습니다.");
        }
        // 목록 새로고침
        fetchItems();
      } catch (error) {
        console.error("협의요청 저장 실패:", error);
        toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
        throw error;
      }
    },
    [modalState, selectedProjectId, toast, fetchItems]
  );

  // 상태 변경 핸들러
  const handleStatusChange = useCallback(
    async (id: string, status: DiscussionStatus) => {
      try {
        const response = await fetch(`/api/discussion-items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "상태 변경에 실패했습니다.");
        }
        toast.success("상태가 변경되었습니다.");
        fetchItems();
      } catch (error) {
        console.error("상태 변경 실패:", error);
        toast.error(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
      }
    },
    [toast, fetchItems]
  );

  // 삭제 핸들러
  const handleDelete = useCallback((item: DiscussionItem) => {
    setDeletingItem(item);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    try {
      const response = await fetch(`/api/discussion-items/${deletingItem.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "삭제에 실패했습니다.");
      }
      toast.success("협의요청이 삭제되었습니다.");
      fetchItems();
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setShowDeleteConfirm(false);
      setDeletingItem(null);
    }
  }, [deletingItem, toast, fetchItems]);

  // 엑셀 다운로드
  const handleExportExcel = useCallback(() => {
    const data = filteredItems.map((item) => ({
      코드: item.code,
      사업부: item.businessUnit,
      협의주제: item.title,
      상세내용: item.description || "",
      상태: STATUS_CONFIG[item.status].label,
      발생단계: STAGE_CONFIG[item.stage].label,
      선택지수: item.options?.length || 0,
      최종결정: item.decision || "",
      보고일: item.reportDate,
      협의기한: item.dueDate || "",
      결정완료일: item.resolvedDate || "",
    }));

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "협의요청");
    writeFile(wb, `협의요청_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filteredItems]);

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="forum" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              DISCUSSION ITEMS
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 협의요청관리
            </span>
          </h1>
          <p className="text-text-secondary mt-1">
            버그도 아니고 새 기능도 아닌, PM과 협의가 필요한 사항을 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 프로젝트 배지 */}
          {selectedProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Icon name="folder" size="sm" className="text-primary" />
              <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
            </div>
          )}

          {/* 버튼들 */}
          <Button variant="outline" leftIcon="download" onClick={handleExportExcel}>
            엑셀 다운로드
          </Button>
          <Button variant="primary" leftIcon="add" onClick={handleOpenCreate}>
            새 협의요청 추가
          </Button>
        </div>
      </div>

      {/* 프로젝트 미선택 안내 */}
      {!selectedProjectId && (
        <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <Icon name="warning" className="text-warning" />
          <p className="text-sm text-warning">
            프로젝트를 선택해주세요. 상단 헤더에서 프로젝트를 선택할 수 있습니다.
          </p>
        </div>
      )}

      {/* 통계 카드 - 슬라이딩 컨테이너 */}
      <div className="relative">
        {/* 통계 카드 영역 */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isStatsCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
          }`}
        >
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 pb-2">
            {/* 완료율 */}
            <div className="bg-gradient-to-br from-primary/10 to-success/10 border border-primary/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="speed" size="xs" className="text-primary" />
                <span className="text-xs font-semibold text-primary">완료율</span>
              </div>
              <p className="text-2xl font-bold text-primary mb-1">{stats.completionRate}%</p>
              <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-success rounded-full"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>

            {/* 전체 */}
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
                  <Icon name="list_alt" size="xs" className="text-slate-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.total}</p>
                  <p className="text-[10px] text-text-secondary">전체</p>
                </div>
              </div>
            </div>

            {/* 협의 중 */}
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Icon name="forum" size="xs" className="text-yellow-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.discussing}</p>
                  <p className="text-[10px] text-text-secondary">협의 중</p>
                </div>
              </div>
            </div>

            {/* 변환됨 */}
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icon name="transition_slide" size="xs" className="text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.converted}</p>
                  <p className="text-[10px] text-text-secondary">변환됨</p>
                </div>
              </div>
            </div>

            {/* 보류 */}
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <Icon name="block" size="xs" className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.blocked}</p>
                  <p className="text-[10px] text-text-secondary">보류</p>
                </div>
              </div>
            </div>

            {/* 완료 */}
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Icon name="check_circle" size="xs" className="text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.completed}</p>
                  <p className="text-[10px] text-text-secondary">완료</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 슬라이드 핸들 */}
        <div
          className="group flex items-center justify-center cursor-pointer"
          onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
          onMouseEnter={() => isStatsCollapsed && setIsStatsCollapsed(false)}
        >
          <div className={`
            flex items-center gap-2 px-4 py-1 rounded-full transition-all duration-200
            ${isStatsCollapsed
              ? "bg-primary/10 border border-primary/30 hover:bg-primary/20"
              : "bg-surface dark:bg-background-dark border border-border dark:border-border-dark hover:border-primary/30"
            }
          `}>
            <Icon
              name={isStatsCollapsed ? "expand_more" : "expand_less"}
              size="xs"
              className={`transition-transform duration-200 ${isStatsCollapsed ? "text-primary" : "text-text-secondary group-hover:text-primary"}`}
            />
            <span className={`text-xs font-medium ${isStatsCollapsed ? "text-primary" : "text-text-secondary group-hover:text-primary"}`}>
              {isStatsCollapsed ? "통계 보기" : "통계 접기"}
            </span>
            <Icon
              name={isStatsCollapsed ? "expand_more" : "expand_less"}
              size="xs"
              className={`transition-transform duration-200 ${isStatsCollapsed ? "text-primary" : "text-text-secondary group-hover:text-primary"}`}
            />
          </div>
        </div>
      </div>

      {/* 필터 바 + 탭 (한 줄) */}
      <div className="flex flex-wrap items-center gap-4">
        {/* 검색창 */}
        <div className="w-64">
          <Input
            leftIcon="search"
            placeholder="검색 (코드, 주제, 설명)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 탭 필터 */}
        <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg">
          <button
            onClick={() => setActiveTab("discussing")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "discussing"
                ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                : "text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <Icon name="forum" size="xs" />
            <span>협의 중</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === "discussing"
                  ? "bg-primary/10 text-primary"
                  : "bg-surface dark:bg-background-dark"
              }`}
            >
              {stats.discussing}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("converted")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "converted"
                ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                : "text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <Icon name="transition_slide" size="xs" />
            <span>변환됨</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === "converted"
                  ? "bg-primary/10 text-primary"
                  : "bg-surface dark:bg-background-dark"
              }`}
            >
              {stats.converted}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "completed"
                ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                : "text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <Icon name="check_circle" size="xs" />
            <span>완료</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === "completed"
                  ? "bg-primary/10 text-primary"
                  : "bg-surface dark:bg-background-dark"
              }`}
            >
              {stats.completed}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                : "text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <Icon name="list_alt" size="xs" />
            <span>전체</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === "all"
                  ? "bg-primary/10 text-primary"
                  : "bg-surface dark:bg-background-dark"
              }`}
            >
              {stats.total}
            </span>
          </button>
        </div>

        {/* 사업부 필터 */}
        <select
          value={filterBusinessUnit}
          onChange={(e) => setFilterBusinessUnit(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
        >
          <option value="all">전체 사업부</option>
          {BUSINESS_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>

        {/* 단계 필터 */}
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
        >
          <option value="all">전체 단계</option>
          {Object.entries(STAGE_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* 테이블 */}
      <DiscussionItemTable
        items={filteredItems}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      {/* 모달 - 등록/수정 */}
      <DiscussionItemModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        item={modalState.item}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />

      {/* 모달 - 삭제 확인 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="협의요청 삭제"
        message={`정말로 "${deletingItem?.code} - ${deletingItem?.title}"를 삭제하시겠습니까?`}
        confirmText="삭제"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingItem(null);
        }}
      />
    </div>
  );
}
