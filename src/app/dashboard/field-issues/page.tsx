/**
 * @file src/app/dashboard/field-issues/page.tsx
 * @description
 * 현업이슈관리 페이지입니다.
 * 현업이슈 목록 조회, 등록, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **통계 카드**: 전체, 발견/수정중/해결/수정안함/완료 현황
 * 2. **탭**: 진행(발견/수정중) vs 종료(해결/수정안함/완료)
 * 3. **필터**: 사업부, 업무구분, 검색어로 필터링
 * 4. **테이블**: 현업이슈 목록 (상태 클릭으로 변경)
 *
 * 상태 흐름 (필독 가이드 기준):
 * OPEN (발견) → IN_PROGRESS (수정 중) → RESOLVED (해결) / WONT_FIX (수정 안함) → CLOSED (완료)
 *
 * @example
 * 접속 URL: /dashboard/field-issues
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { utils, writeFile } from "xlsx";
import { Icon, Button, Input, useToast, ConfirmModal } from "@/components/ui";
import { useProject } from "@/contexts";
import {
  useFieldIssues,
  useCreateFieldIssue,
  useUpdateFieldIssue,
  useDeleteFieldIssue,
} from "@/hooks";
import { FieldIssueTable, FieldIssueModal } from "./components";
import { ImportExcelModal } from "@/components/common";
import {
  type FieldIssue,
  type FieldIssueFormData,
  type FieldIssueStatus,
  STATUS_CONFIG,
  BUSINESS_UNITS,
  BUSINESS_CATEGORIES,
} from "./types";

/**
 * 현업이슈관리 페이지 컴포넌트
 */
export default function FieldIssuesPage() {
  /** 전역 프로젝트 선택 상태 (헤더에서 선택) */
  const { selectedProjectId, selectedProject } = useProject();

  // 필터 상태
  const [filterBusinessUnit, setFilterBusinessUnit] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  /** 현재 선택된 탭 (active: 발견/수정중, closed: 해결/수정안함/완료) */
  const [activeTab, setActiveTab] = useState<"active" | "closed">("active");

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 모달 상태
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    issue: FieldIssue | null;
  }>({
    isOpen: false,
    mode: "create",
    issue: null,
  });

  // 엑셀 가져오기 모달 상태
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // 통계 카드 접기/펼치기 상태
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingIssue, setDeletingIssue] = useState<FieldIssue | null>(null);

  // 협의요청 이관 모달 상태
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferringIssue, setTransferringIssue] = useState<FieldIssue | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const toast = useToast();

  // 필터 객체 메모이제이션
  const queryFilters = useMemo(
    () => ({
      projectId: selectedProjectId || undefined,
    }),
    [selectedProjectId]
  );

  // 데이터 조회
  const { data: issues = [], isLoading, error, refetch: refetchIssues } = useFieldIssues(queryFilters);

  // Mutations
  const createMutation = useCreateFieldIssue();
  const updateMutation = useUpdateFieldIssue();
  const deleteMutation = useDeleteFieldIssue();

  // 탭별 이슈 분리 (필독 가이드 기준)
  // 진행: 발견(OPEN), 수정 중(IN_PROGRESS) + 레거시(PENDING)
  // 종료: 해결(RESOLVED), 수정안함(WONT_FIX), 완료(CLOSED) + 레거시(COMPLETED)
  const activeIssues = issues.filter(
    (i) => i.status === "OPEN" || i.status === "IN_PROGRESS" || i.status === "PENDING"
  );
  const closedIssues = issues.filter(
    (i) => i.status === "RESOLVED" || i.status === "WONT_FIX" || i.status === "CLOSED" || i.status === "COMPLETED"
  );

  // 현재 탭에 해당하는 이슈 목록
  const tabIssues = activeTab === "active" ? activeIssues : closedIssues;

  // 필터링된 이슈
  const filteredIssues = useMemo(() => {
    return tabIssues.filter((issue) => {
      const matchesBusinessUnit =
        filterBusinessUnit === "all" || issue.businessUnit === filterBusinessUnit;
      const matchesCategory =
        filterCategory === "all" || issue.category === filterCategory;
      const matchesSearch =
        !searchQuery ||
        issue.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.issuer?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBusinessUnit && matchesCategory && matchesSearch;
    }).sort((a, b) => a.sequence - b.sequence);
  }, [tabIssues, filterBusinessUnit, filterCategory, searchQuery]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const paginatedIssues = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredIssues.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredIssues, currentPage, itemsPerPage]);

  // 필터/탭 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterBusinessUnit, filterCategory, searchQuery]);

  // 통계 계산 (필독 가이드 기준)
  const stats = useMemo(() => {
    const total = issues.length;
    const open = issues.filter((i) => i.status === "OPEN").length;
    const inProgress = issues.filter((i) => i.status === "IN_PROGRESS" || i.status === "PENDING").length;
    const resolved = issues.filter((i) => i.status === "RESOLVED").length;
    const wontFix = issues.filter((i) => i.status === "WONT_FIX").length;
    const closed = issues.filter((i) => i.status === "CLOSED" || i.status === "COMPLETED").length;

    // 종료 상태 합계 (해결 + 수정안함 + 완료)
    const totalClosed = resolved + wontFix + closed;

    return {
      total,
      open,
      inProgress,
      resolved,
      wontFix,
      closed,
      completionRate: total > 0 ? Math.round((totalClosed / total) * 100) : 0,
    };
  }, [issues]);

  // 사업부별 통계 (필독 가이드 기준)
  const businessUnitStats = useMemo(() => {
    const unitCounts: Record<string, { active: number; closed: number }> = {};
    issues.forEach((issue) => {
      if (issue.businessUnit) {
        if (!unitCounts[issue.businessUnit]) {
          unitCounts[issue.businessUnit] = { active: 0, closed: 0 };
        }
        // 진행 중 (발견, 수정 중)
        if (issue.status === "OPEN" || issue.status === "IN_PROGRESS" || issue.status === "PENDING") {
          unitCounts[issue.businessUnit].active++;
        }
        // 종료 (해결, 수정안함, 완료)
        else {
          unitCounts[issue.businessUnit].closed++;
        }
      }
    });
    return unitCounts;
  }, [issues]);

  // 모달 열기 - 등록
  const handleOpenCreate = useCallback(() => {
    setModalState({
      isOpen: true,
      mode: "create",
      issue: null,
    });
  }, []);

  // 모달 열기 - 수정
  const handleOpenEdit = useCallback((issue: FieldIssue) => {
    setModalState({
      isOpen: true,
      mode: "edit",
      issue,
    });
  }, []);

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    setModalState({
      isOpen: false,
      mode: "create",
      issue: null,
    });
  }, []);

  // 제출 핸들러
  const handleSubmit = useCallback(
    async (formData: FieldIssueFormData) => {
      if (modalState.mode === "create") {
        await createMutation.mutateAsync({
          ...formData,
          projectId: selectedProjectId || "",
          registeredDate: formData.registeredDate || undefined,
          targetDate: formData.targetDate || undefined,
          completedDate: formData.completedDate || undefined,
        });
        toast.success("현업이슈가 등록되었습니다.");
      } else if (modalState.issue) {
        await updateMutation.mutateAsync({
          id: modalState.issue.id,
          data: {
            ...formData,
            registeredDate: formData.registeredDate || undefined,
            targetDate: formData.targetDate || undefined,
            completedDate: formData.completedDate || undefined,
          },
        });
        toast.success("현업이슈가 수정되었습니다.");
      }
    },
    [modalState, selectedProjectId, createMutation, updateMutation, toast]
  );

  // 삭제 핸들러
  const handleDelete = useCallback((issue: FieldIssue) => {
    setDeletingIssue(issue);
    setShowDeleteConfirm(true);
  }, []);

  // 삭제 확인
  const handleConfirmDelete = async () => {
    if (!deletingIssue) return;
    try {
      await deleteMutation.mutateAsync(deletingIssue.id);
      toast.success("현업이슈가 삭제되었습니다.");
      setShowDeleteConfirm(false);
      setDeletingIssue(null);
    } catch (error) {
      toast.error("현업이슈 삭제에 실패했습니다.");
    }
  };

  // 상태 변경
  const handleStatusChange = async (id: string, newStatus: FieldIssueStatus) => {
    await updateMutation.mutateAsync({
      id,
      data: { status: newStatus },
    });
    toast.success("상태가 변경되었습니다.");
  };

  // 협의요청 이관 클릭
  const handleTransferToDiscussion = useCallback((issue: FieldIssue) => {
    setTransferringIssue(issue);
    setShowTransferConfirm(true);
  }, []);

  // 협의요청 이관 확인
  const handleConfirmTransfer = async () => {
    if (!transferringIssue || !selectedProjectId) return;

    setIsTransferring(true);
    try {
      // 카테고리에 따라 발생 단계 결정
      const stageMap: Record<string, string> = {
        "자재": "ANALYSIS",
        "생산": "IMPLEMENTATION",
        "품질": "TESTING",
        "공통": "ANALYSIS",
      };
      const stage = stageMap[transferringIssue.category || ""] || "ANALYSIS";

      // 협의요청 생성
      const response = await fetch("/api/discussion-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          businessUnit: transferringIssue.businessUnit || "공통",
          title: transferringIssue.title,
          description: `${transferringIssue.description || ""}\n\n[현업이슈에서 이관: ${transferringIssue.code}]`,
          stage,
          priority: "MEDIUM",
          requesterName: transferringIssue.issuer || null,
          options: [
            { label: "A안", description: transferringIssue.proposedSolution || "대안 A 검토 필요" },
            { label: "B안", description: "대안 B 검토 필요" },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "협의요청 생성에 실패했습니다.");
      }

      const createdItem = await response.json();

      // 원본 이슈 삭제
      await deleteMutation.mutateAsync(transferringIssue.id);

      toast.success(`협의요청으로 이관되었습니다. (${createdItem.code})`);
      setShowTransferConfirm(false);
      setTransferringIssue(null);
    } catch (error) {
      console.error("이관 실패:", error);
      toast.error(error instanceof Error ? error.message : "이관에 실패했습니다.");
    } finally {
      setIsTransferring(false);
    }
  };

  // 새로고침 핸들러
  const handleRefresh = async () => {
    try {
      await refetchIssues();
      toast.success("데이터가 업데이트되었습니다.");
    } catch (err) {
      console.error("새로고침 실패:", err);
      toast.error("데이터 업데이트에 실패했습니다.");
    }
  };

  // 엑셀 다운로드 핸들러
  const handleExportToExcel = () => {
    if (filteredIssues.length === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    const excelData = filteredIssues.map((issue, idx) => ({
      "이슈번호": issue.code || "",
      "사업부": issue.businessUnit || "",
      "업무구분": issue.category || "",
      "이슈관리명": issue.title || "",
      "이슈 설명": issue.description || "",
      "등록일": issue.registeredDate ? new Date(issue.registeredDate).toLocaleDateString() : "",
      "이슈어": issue.issuer || "",
      "요구사항 번호": issue.requirementCode || "",
      "담당자": issue.assignee || "",
      "상태": STATUS_CONFIG[issue.status]?.label || issue.status,
      "타겟일": issue.targetDate ? new Date(issue.targetDate).toLocaleDateString() : "",
      "완료일": issue.completedDate ? new Date(issue.completedDate).toLocaleDateString() : "",
      "제안된 해결방안": issue.proposedSolution || "",
      "최종 적용방안": issue.finalSolution || "",
      "참고": issue.remarks || "",
    }));

    const worksheet = utils.json_to_sheet(excelData);
    worksheet["!cols"] = [
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 25 }, { wch: 40 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 30 },
    ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "현업이슈");

    const projectName = selectedProject?.name || "Project";
    const dateStr = new Date().toISOString().split("T")[0];
    writeFile(workbook, `${projectName}_현업이슈_${dateStr}.xlsx`);
  };

  /** 로딩 상태 */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  /** 에러 상태 */
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-error/10 text-error p-4 rounded-lg">
          데이터를 불러오는데 실패했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="support_agent" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              FIELD ISSUES
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 현업이슈관리
            </span>
          </h1>
          <p className="text-text-secondary mt-1">
            현업에서 발생하는 이슈를 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Icon name="folder" size="sm" className="text-primary" />
              <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={!selectedProjectId || isLoading}
            className="flex items-center justify-center p-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary hover:text-primary hover:border-primary/30 transition-all"
            title="데이터 새로고침"
          >
            <Icon name="refresh" size="sm" />
          </button>
          <Button
            variant="outline"
            leftIcon="download"
            onClick={handleExportToExcel}
            disabled={!selectedProjectId || filteredIssues.length === 0}
          >
            엑셀 다운로드
          </Button>
          <Button
            variant="outline"
            leftIcon="upload"
            onClick={() => setIsImportModalOpen(true)}
            disabled={!selectedProjectId}
          >
            Excel 가져오기
          </Button>
          <Button
            variant="primary"
            leftIcon="add"
            onClick={handleOpenCreate}
            disabled={!selectedProjectId}
          >
            새 이슈 추가
          </Button>
        </div>
      </div>

      {/* 프로젝트 미선택 안내 */}
      {!selectedProjectId && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <Icon name="folder_open" size="xl" className="text-primary mb-4" />
          <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
            프로젝트를 선택해주세요
          </h3>
          <p className="text-text-secondary">
            상단 헤더에서 프로젝트를 선택하면 해당 프로젝트의 현업이슈를 관리할 수 있습니다.
          </p>
        </div>
      )}

      {selectedProjectId && (
        <>
          {/* 통계 카드 - 슬라이딩 컨테이너 */}
          <div className="relative">
            {/* 통계 카드 영역 */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isStatsCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
              }`}
            >
              <div className="grid grid-cols-2 lg:grid-cols-8 gap-3 pb-2">
                {/* 종료율 카드 */}
                <div className="bg-gradient-to-br from-primary/10 to-success/10 border border-primary/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="speed" size="xs" className="text-primary" />
                    <span className="text-xs font-semibold text-primary">종료율</span>
                  </div>
                  <p className="text-2xl font-bold text-primary mb-1">{stats.completionRate}%</p>
                  <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* 전체 */}
                <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon name="list_alt" size="xs" className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-text dark:text-white">{stats.total}</p>
                      <p className="text-[10px] text-text-secondary">전체</p>
                    </div>
                  </div>
                </div>

                {/* 발견 (OPEN) */}
                <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-error/10 flex items-center justify-center">
                      <Icon name="radio_button_checked" size="xs" className="text-error" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-text dark:text-white">{stats.open}</p>
                      <p className="text-[10px] text-text-secondary">발견</p>
                    </div>
                  </div>
                </div>

                {/* 수정 중 (IN_PROGRESS) */}
                <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Icon name="build" size="xs" className="text-warning" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-text dark:text-white">{stats.inProgress}</p>
                      <p className="text-[10px] text-text-secondary">수정 중</p>
                    </div>
                  </div>
                </div>

                {/* 해결 (RESOLVED) */}
                <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-success/10 flex items-center justify-center">
                      <Icon name="check_circle" size="xs" className="text-success" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-text dark:text-white">{stats.resolved}</p>
                      <p className="text-[10px] text-text-secondary">해결</p>
                    </div>
                  </div>
                </div>

                {/* 수정안함 (WONT_FIX) */}
                <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Icon name="block" size="xs" className="text-text-secondary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-text dark:text-white">{stats.wontFix}</p>
                      <p className="text-[10px] text-text-secondary">수정안함</p>
                    </div>
                  </div>
                </div>

                {/* 완료 (CLOSED) */}
                <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon name="done_all" size="xs" className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-text dark:text-white">{stats.closed}</p>
                      <p className="text-[10px] text-text-secondary">완료</p>
                    </div>
                  </div>
                </div>

                {/* 사업부별 통계 */}
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="business" size="xs" className="text-cyan-500" />
                    <span className="text-xs font-semibold text-cyan-500">사업부별</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {Object.entries(businessUnitStats).slice(0, 4).map(([unit, counts]) => (
                      <div key={unit} className="text-center flex-1">
                        <p className="text-sm font-bold text-text dark:text-white">
                          {counts.active}
                        </p>
                        <p className="text-[8px] text-text-secondary truncate">{unit}</p>
                      </div>
                    ))}
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

          {/* 탭 및 필터 (필독 가이드 기준) */}
          <div className="flex flex-wrap items-center gap-4">
            {/* 탭 */}
            <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "active"
                    ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                <Icon name="pending_actions" size="xs" />
                <span>진행</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === "active" ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"
                }`}>
                  {activeIssues.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("closed")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "closed"
                    ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                <Icon name="done_all" size="xs" />
                <span>종료</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === "closed" ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"
                }`}>
                  {closedIssues.length}
                </span>
              </button>
            </div>

            {/* 검색 */}
            <div className="w-64">
              <Input
                leftIcon="search"
                placeholder="이슈 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* 사업부 필터 */}
            <select
              value={filterBusinessUnit}
              onChange={(e) => setFilterBusinessUnit(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
            >
              <option value="all">전체 사업부</option>
              {BUSINESS_UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>

            {/* 업무구분 필터 */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
            >
              <option value="all">전체 업무구분</option>
              {BUSINESS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 이슈 목록 테이블 */}
          <FieldIssueTable
            issues={paginatedIssues}
            totalCount={filteredIssues.length}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onTransferToDiscussion={handleTransferToDiscussion}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(count) => {
              setItemsPerPage(count);
              setCurrentPage(1);
            }}
            emptyMessage={
              issues.length === 0
                ? "등록된 현업이슈가 없습니다."
                : "검색 조건에 맞는 이슈가 없습니다."
            }
          />
        </>
      )}

      {/* 등록/수정 모달 */}
      <FieldIssueModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        issue={modalState.issue}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />

      {/* 엑셀 가져오기 모달 */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        projectId={selectedProjectId || ""}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => setIsImportModalOpen(false)}
        title="현업이슈 가져오기"
        apiEndpoint="/api/field-issues/import"
        templateConfig={{
          fileName: "현업이슈_템플릿",
          sheetName: "리스트",
          columns: [
            { header: "이슈번호", key: "code", width: 10, example: "IS0001" },
            { header: "사업부", key: "businessUnit", width: 10, example: "V_IVI" },
            { header: "업무구분", key: "category", width: 8, example: "자재" },
            { header: "이슈관리명", key: "title", width: 25, example: "LOT 추적성" },
            { header: "이슈 설명", key: "description", width: 50, example: "LOT 추적성을 확인하기 위해..." },
            { header: "등록일", key: "registeredDate", width: 12, example: "2025-12-17" },
            { header: "이슈어", key: "issuer", width: 12, example: "김형만부장" },
            { header: "요구사항 번호", key: "requirementCode", width: 15, example: "RQVP_00018" },
            { header: "담당자", key: "assignee", width: 10, example: "유성만" },
            { header: "상태", key: "status", width: 8, example: "오픈" },
            { header: "타겟일", key: "targetDate", width: 12, example: "2026-02-27" },
            { header: "완료일", key: "completedDate", width: 12, example: "" },
            { header: "제안된 해결방안", key: "proposedSolution", width: 50, example: "로트추적 기능 구현 예정" },
            { header: "최종 적용방안", key: "finalSolution", width: 50, example: "" },
            { header: "참고", key: "remarks", width: 30, example: "" },
          ],
        }}
        hints={[
          "첫 번째 행은 헤더로 인식됩니다",
          "이슈번호가 없으면 자동 생성됩니다 (IS0001 형식)",
          "사업부: V_HNS, V_DISP, V_IVI, V_PCBA, 공통",
          "상태: 발견/수정중/해결/수정안함/완료",
        ]}
        clearExistingLabel="기존 현업이슈 삭제 후 가져오기"
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="현업이슈 삭제"
        message={
          deletingIssue
            ? `"${deletingIssue.code}" 항목을 삭제하시겠습니까?\n\n` +
              `이슈관리명: ${deletingIssue.title}\n\n` +
              "이 작업은 되돌릴 수 없습니다."
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingIssue(null);
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* 협의요청 이관 확인 모달 */}
      <ConfirmModal
        isOpen={showTransferConfirm}
        title="협의요청으로 이관"
        message={
          transferringIssue
            ? `"${transferringIssue.code}" 항목을 협의요청으로 이관하시겠습니까?\n\n` +
              `이슈관리명: ${transferringIssue.title}\n\n` +
              "이관 시 원본 현업이슈는 삭제되고, 협의요청관리에 새로운 항목이 생성됩니다."
            : ""
        }
        onConfirm={handleConfirmTransfer}
        onCancel={() => {
          setShowTransferConfirm(false);
          setTransferringIssue(null);
        }}
        confirmText="이관"
        cancelText="취소"
        variant="info"
        isLoading={isTransferring}
      />
    </div>
  );
}
