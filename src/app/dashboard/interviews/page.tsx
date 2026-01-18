/**
 * @file src/app/dashboard/interviews/page.tsx
 * @description
 * 인터뷰 관리 메인 페이지입니다.
 * 인터뷰 목록 조회, 등록, 수정, 삭제, 이관 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **통계 카드**: 전체, 미이관, 이관완료, 완료율, 사업부별 통계
 * 2. **탭**: 미이관(NOT_TRANSFERRED) vs 이관완료(TRANSFERRED)
 * 3. **필터**: 사업부, 검색어로 필터링
 * 4. **테이블**: 인터뷰 목록 (InterviewTable 컴포넌트 사용)
 * 5. **이관 기능**: 요구사항/이슈/협의요청 중 선택하여 이관
 *
 * @example
 * 접속 URL: /dashboard/interviews
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { utils, writeFile } from "xlsx";
import { Icon, Button, Input, useToast, ConfirmModal } from "@/components/ui";
import { useProject } from "@/contexts";
import {
  useInterviews,
  useCreateInterview,
  useUpdateInterview,
  useDeleteInterview,
} from "@/hooks";
import { InterviewTable, InterviewModal } from "./components";
import {
  type Interview,
  type InterviewFormData,
  type InterviewTransferType,
  TRANSFER_STATUS_CONFIG,
  TRANSFER_TYPE_CONFIG,
  BUSINESS_UNITS,
} from "./types";

/**
 * 인터뷰 관리 페이지 컴포넌트
 */
export default function InterviewsPage() {
  /** 전역 프로젝트 선택 상태 (헤더에서 선택) */
  const { selectedProjectId, selectedProject } = useProject();

  // 필터 상태
  const [filterBusinessUnit, setFilterBusinessUnit] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  /** 현재 선택된 탭 (not_transferred: 미이관, transferred: 이관완료) */
  const [activeTab, setActiveTab] = useState<"not_transferred" | "transferred">("not_transferred");

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 모달 상태
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    interview: Interview | null;
  }>({
    isOpen: false,
    mode: "create",
    interview: null,
  });

  // 통계 카드 접기/펼치기 상태
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingInterview, setDeletingInterview] = useState<Interview | null>(null);

  // 이관 확인 모달 상태
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferringInterview, setTransferringInterview] = useState<Interview | null>(null);
  const [transferType, setTransferType] = useState<InterviewTransferType | null>(null);
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
  const { data: interviews = [], isLoading, error, refetch: refetchInterviews } = useInterviews(queryFilters);

  // Mutations
  const createMutation = useCreateInterview();
  const updateMutation = useUpdateInterview();
  const deleteMutation = useDeleteInterview();

  // 탭별 인터뷰 분리
  const notTransferredInterviews = interviews.filter(
    (i) => i.transferStatus === "NOT_TRANSFERRED"
  );
  const transferredInterviews = interviews.filter((i) => i.transferStatus === "TRANSFERRED");

  // 현재 탭에 해당하는 인터뷰 목록
  const tabInterviews = activeTab === "not_transferred" ? notTransferredInterviews : transferredInterviews;

  // 필터링된 인터뷰
  const filteredInterviews = useMemo(() => {
    return tabInterviews.filter((interview) => {
      const matchesBusinessUnit =
        filterBusinessUnit === "all" || interview.businessUnit === filterBusinessUnit;
      const matchesSearch =
        !searchQuery ||
        interview.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.interviewer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.interviewee?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.currentProcess?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.painPoints?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.desiredResults?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBusinessUnit && matchesSearch;
    });
  }, [tabInterviews, filterBusinessUnit, searchQuery]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredInterviews.length / itemsPerPage);
  const paginatedInterviews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInterviews.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInterviews, currentPage, itemsPerPage]);

  // 필터/탭 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterBusinessUnit, searchQuery]);

  // 통계 계산
  const stats = useMemo(() => {
    const total = interviews.length;
    const notTransferred = interviews.filter((i) => i.transferStatus === "NOT_TRANSFERRED").length;
    const transferred = interviews.filter((i) => i.transferStatus === "TRANSFERRED").length;

    return {
      total,
      notTransferred,
      transferred,
      completionRate: total > 0 ? Math.round((transferred / total) * 100) : 0,
    };
  }, [interviews]);

  // 사업부별 통계
  const businessUnitStats = useMemo(() => {
    const unitCounts: Record<string, { notTransferred: number; transferred: number }> = {};
    interviews.forEach((interview) => {
      if (interview.businessUnit) {
        if (!unitCounts[interview.businessUnit]) {
          unitCounts[interview.businessUnit] = { notTransferred: 0, transferred: 0 };
        }
        if (interview.transferStatus === "NOT_TRANSFERRED") unitCounts[interview.businessUnit].notTransferred++;
        else if (interview.transferStatus === "TRANSFERRED") unitCounts[interview.businessUnit].transferred++;
      }
    });
    return unitCounts;
  }, [interviews]);

  // 모달 열기 - 등록
  const handleOpenCreate = useCallback(() => {
    setModalState({
      isOpen: true,
      mode: "create",
      interview: null,
    });
  }, []);

  // 모달 열기 - 수정
  const handleOpenEdit = useCallback((interview: Interview) => {
    setModalState({
      isOpen: true,
      mode: "edit",
      interview,
    });
  }, []);

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    setModalState({
      isOpen: false,
      mode: "create",
      interview: null,
    });
  }, []);

  // 제출 핸들러
  const handleSubmit = useCallback(
    async (formData: InterviewFormData) => {
      if (modalState.mode === "create") {
        await createMutation.mutateAsync({
          ...formData,
          projectId: selectedProjectId || "",
          interviewDate: formData.interviewDate || undefined,
        });
        toast.success("인터뷰가 등록되었습니다.");
      } else if (modalState.interview) {
        await updateMutation.mutateAsync({
          id: modalState.interview.id,
          data: {
            ...formData,
            interviewDate: formData.interviewDate || undefined,
          },
        });
        toast.success("인터뷰가 수정되었습니다.");
      }
    },
    [modalState, selectedProjectId, createMutation, updateMutation, toast]
  );

  // 삭제 핸들러
  const handleDelete = useCallback((interview: Interview) => {
    setDeletingInterview(interview);
    setShowDeleteConfirm(true);
  }, []);

  // 삭제 확인
  const handleConfirmDelete = async () => {
    if (!deletingInterview) return;
    try {
      await deleteMutation.mutateAsync(deletingInterview.id);
      toast.success("인터뷰가 삭제되었습니다.");
      setShowDeleteConfirm(false);
      setDeletingInterview(null);
    } catch (error) {
      toast.error("인터뷰 삭제에 실패했습니다.");
    }
  };

  // 이관 클릭
  const handleTransfer = useCallback((interview: Interview, type: InterviewTransferType) => {
    setTransferringInterview(interview);
    setTransferType(type);
    setShowTransferConfirm(true);
  }, []);

  // 이관 확인
  const handleConfirmTransfer = async () => {
    if (!transferringInterview || !selectedProjectId || !transferType) return;

    setIsTransferring(true);
    try {
      let apiEndpoint = "";
      let bodyData: any = {
        projectId: selectedProjectId,
        businessUnit: transferringInterview.businessUnit || "공통",
        title: transferringInterview.title,
      };

      // 이관 타입에 따라 API 엔드포인트와 데이터 구성
      if (transferType === "CUSTOMER_REQUIREMENT") {
        apiEndpoint = "/api/customer-requirements";
        bodyData = {
          ...bodyData,
          description: `${transferringInterview.currentProcess || ""}\n\n[인터뷰에서 이관: ${transferringInterview.title}]\n\n문제점: ${transferringInterview.painPoints || ""}\n원하는 결과: ${transferringInterview.desiredResults || ""}`,
          category: "기능",
          priority: "MEDIUM",
          requesterName: transferringInterview.interviewee || null,
        };
      } else if (transferType === "FIELD_ISSUE") {
        apiEndpoint = "/api/field-issues";
        bodyData = {
          ...bodyData,
          description: `${transferringInterview.currentProcess || ""}\n\n[인터뷰에서 이관: ${transferringInterview.title}]`,
          category: "자재",
          issuer: transferringInterview.interviewee || null,
          status: "OPEN",
          proposedSolution: transferringInterview.desiredResults || null,
        };
      } else if (transferType === "DISCUSSION_ITEM") {
        apiEndpoint = "/api/discussion-items";
        bodyData = {
          ...bodyData,
          description: `${transferringInterview.currentProcess || ""}\n\n[인터뷰에서 이관: ${transferringInterview.title}]\n\n문제점: ${transferringInterview.painPoints || ""}\n원하는 결과: ${transferringInterview.desiredResults || ""}`,
          stage: "ANALYSIS",
          priority: "MEDIUM",
          requesterName: transferringInterview.interviewee || null,
          options: [
            { label: "A안", description: transferringInterview.desiredResults || "대안 A 검토 필요" },
            { label: "B안", description: "대안 B 검토 필요" },
          ],
        };
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "이관에 실패했습니다.");
      }

      const createdItem = await response.json();

      // 원본 인터뷰 상태를 "이관완료"로 업데이트
      await updateMutation.mutateAsync({
        id: transferringInterview.id,
        data: { transferStatus: "TRANSFERRED" },
      });

      const transferTypeLabel = TRANSFER_TYPE_CONFIG[transferType].label;
      toast.success(`${transferTypeLabel}으로 이관되었습니다. (${createdItem.code || ""})`);
      setShowTransferConfirm(false);
      setTransferringInterview(null);
      setTransferType(null);
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
      await refetchInterviews();
      toast.success("데이터가 업데이트되었습니다.");
    } catch (err) {
      console.error("새로고침 실패:", err);
      toast.error("데이터 업데이트에 실패했습니다.");
    }
  };

  // 엑셀 다운로드 핸들러
  const handleExportToExcel = () => {
    if (filteredInterviews.length === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    const excelData = filteredInterviews.map((interview) => ({
      "제목": interview.title || "",
      "인터뷰 일자": interview.interviewDate ? new Date(interview.interviewDate).toLocaleDateString() : "",
      "사업부": interview.businessUnit || "",
      "진행자": interview.interviewer || "",
      "대상자": interview.interviewee || "",
      "현재 운영 방식 (AS-IS)": interview.currentProcess || "",
      "문제점 (Pain Points)": interview.painPoints || "",
      "원하는 결과 (TO-BE)": interview.desiredResults || "",
      "기술적 제약 (Technical Limits)": interview.technicalConstraints || "",
      "궁금한 점 (Questions)": interview.questions || "",
      "비고": interview.remarks || "",
      "이관 상태": TRANSFER_STATUS_CONFIG[interview.transferStatus]?.label || interview.transferStatus,
    }));

    const worksheet = utils.json_to_sheet(excelData);
    worksheet["!cols"] = [
      { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 },
      { wch: 30 }, { wch: 10 },
    ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "인터뷰");

    const projectName = selectedProject?.name || "Project";
    const dateStr = new Date().toISOString().split("T")[0];
    writeFile(workbook, `${projectName}_인터뷰_${dateStr}.xlsx`);
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
            <Icon name="mic" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              INTERVIEWS
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 인터뷰 관리
            </span>
          </h1>
          <p className="text-text-secondary mt-1">
            현업 인터뷰를 관리하고 요구사항/이슈/협의요청으로 이관합니다
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
            disabled={!selectedProjectId || filteredInterviews.length === 0}
          >
            엑셀 다운로드
          </Button>
          <Button
            variant="primary"
            leftIcon="add"
            onClick={handleOpenCreate}
            disabled={!selectedProjectId}
          >
            새 인터뷰 추가
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
            상단 헤더에서 프로젝트를 선택하면 해당 프로젝트의 인터뷰를 관리할 수 있습니다.
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
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 pb-2">
                {/* 완료율 카드 (이관 완료 비율) */}
                <div className="bg-gradient-to-br from-primary/10 to-success/10 border border-primary/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="speed" size="xs" className="text-primary" />
                    <span className="text-xs font-semibold text-primary">이관율</span>
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

                {/* 미이관 */}
                <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Icon name="pending" size="xs" className="text-warning" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-text dark:text-white">{stats.notTransferred}</p>
                      <p className="text-[10px] text-text-secondary">미이관</p>
                    </div>
                  </div>
                </div>

                {/* 이관완료 */}
                <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-success/10 flex items-center justify-center">
                      <Icon name="check_circle" size="xs" className="text-success" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-text dark:text-white">{stats.transferred}</p>
                      <p className="text-[10px] text-text-secondary">이관완료</p>
                    </div>
                  </div>
                </div>

                {/* 사업부별 통계 - 2개 카드 */}
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="business" size="xs" className="text-cyan-500" />
                    <span className="text-xs font-semibold text-cyan-500">사업부별 (1/2)</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {Object.entries(businessUnitStats).slice(0, 2).map(([unit, counts]) => (
                      <div key={unit} className="text-center flex-1">
                        <p className="text-sm font-bold text-text dark:text-white">
                          {counts.notTransferred}
                        </p>
                        <p className="text-[8px] text-text-secondary truncate">{unit}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="business" size="xs" className="text-cyan-500" />
                    <span className="text-xs font-semibold text-cyan-500">사업부별 (2/2)</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {Object.entries(businessUnitStats).slice(2, 5).map(([unit, counts]) => (
                      <div key={unit} className="text-center flex-1">
                        <p className="text-sm font-bold text-text dark:text-white">
                          {counts.notTransferred}
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

          {/* 탭 및 필터 */}
          <div className="flex flex-wrap items-center gap-4">
            {/* 탭 */}
            <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg">
              <button
                onClick={() => setActiveTab("not_transferred")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "not_transferred"
                    ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                <Icon name="pending" size="xs" />
                <span>미이관</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === "not_transferred" ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"
                }`}>
                  {notTransferredInterviews.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("transferred")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "transferred"
                    ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                <Icon name="check_circle" size="xs" />
                <span>이관완료</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === "transferred" ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"
                }`}>
                  {transferredInterviews.length}
                </span>
              </button>
            </div>

            {/* 검색 */}
            <div className="w-64">
              <Input
                leftIcon="search"
                placeholder="인터뷰 검색 (제목, 진행자, 대상자, 내용)..."
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
          </div>

          {/* 인터뷰 목록 테이블 */}
          <InterviewTable
            interviews={paginatedInterviews}
            totalCount={filteredInterviews.length}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onTransfer={handleTransfer}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(count) => {
              setItemsPerPage(count);
              setCurrentPage(1);
            }}
            emptyMessage={
              interviews.length === 0
                ? "등록된 인터뷰가 없습니다."
                : "검색 조건에 맞는 인터뷰가 없습니다."
            }
          />
        </>
      )}

      {/* 등록/수정 모달 */}
      <InterviewModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        interview={modalState.interview}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="인터뷰 삭제"
        message={
          deletingInterview
            ? `"${deletingInterview.title}" 항목을 삭제하시겠습니까?\n\n` +
              `진행자: ${deletingInterview.interviewer || "-"} / 대상자: ${deletingInterview.interviewee || "-"}\n\n` +
              "이 작업은 되돌릴 수 없습니다."
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingInterview(null);
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* 이관 확인 모달 */}
      <ConfirmModal
        isOpen={showTransferConfirm}
        title="이관 확인"
        message={
          transferringInterview && transferType
            ? `"${transferringInterview.title}" 항목을 ${TRANSFER_TYPE_CONFIG[transferType].label}으로 이관하시겠습니까?\n\n` +
              `진행자: ${transferringInterview.interviewer || "-"} / 대상자: ${transferringInterview.interviewee || "-"}\n\n` +
              "이관 시 인터뷰 상태가 '이관완료'로 변경되며, 선택한 곳에 새로운 항목이 생성됩니다."
            : ""
        }
        onConfirm={handleConfirmTransfer}
        onCancel={() => {
          setShowTransferConfirm(false);
          setTransferringInterview(null);
          setTransferType(null);
        }}
        confirmText="이관"
        cancelText="취소"
        variant="info"
        isLoading={isTransferring}
      />
    </div>
  );
}
