/**
 * @file src/app/dashboard/weekly-report/components/ReportDetailView.tsx
 * @description
 * 주간보고 상세/등록/수정 화면 컴포넌트입니다.
 * 좌측: 전주 실적, 우측: 차주 계획, 하단: 이슈 섹션
 *
 * 초보자 가이드:
 * 1. **WeekCarousel**: 주차 선택 캐로셀
 * 2. **2컬럼 레이아웃**: 왼쪽 전주 실적, 오른쪽 차주 계획
 * 3. **자동 로드**: 전주 차주계획을 금주 실적으로 자동 불러오기
 * 4. **이슈 섹션**: React-Quill 리치텍스트 에디터
 * 5. **상태 관리**: 임시저장, 제출 완료, 제출 취소
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon, Button } from "@/components/ui";
import {
  useCurrentUser,
  useWeeklyReports,
  useWeeklyReport,
  useCreateWeeklyReport,
  useUpdateWeeklyReport,
  useAutoLoadData,
  useCreateReportItem,
  useUpdateReportItem,
  useDeleteReportItem,
  useBulkCreateReportItems,
} from "@/hooks";
import { useProject, useToast } from "@/contexts";
import { WeeklyReportItem, ReportItemType, WorkCategory } from "@/lib/api";
import {
  getProjectWeekInfo,
  getCategoryInfo,
  REPORT_STATUS_MAP,
} from "../constants";
import { WeekCarousel } from "./WeekCarousel";
import { ReportItemRow } from "./ReportItemRow";
import { ItemModal } from "./ItemModal";
import { WeekInfo, ReportWithRelations } from "../types";
import dynamic from "next/dynamic";

// SSR 비활성화 RichTextEditor
const RichTextEditor = dynamic(
  () => import("@/components/ui/RichTextEditor"),
  { ssr: false }
);

interface ReportDetailViewProps {
  /** 선택된 보고서 (수정 모드) */
  selectedReport?: ReportWithRelations | null;
  /** 초기 주차 정보 (새 작성 모드) */
  initialWeekInfo?: WeekInfo | null;
  /** 목록으로 돌아가기 핸들러 */
  onBack: () => void;
}

/**
 * 주간보고 상세/등록/수정 화면 컴포넌트
 */
export function ReportDetailView({
  selectedReport,
  initialWeekInfo,
  onBack,
}: ReportDetailViewProps) {
  const { data: currentUser } = useCurrentUser();
  const { selectedProject, selectedProjectId } = useProject();
  const toast = useToast();

  // 주차 상태 초기화
  const [currentWeekInfo, setCurrentWeekInfo] = useState<WeekInfo>(() => {
    // 선택된 보고서가 있으면 해당 주차 정보 사용
    if (selectedReport) {
      return {
        year: selectedReport.year,
        week: selectedReport.weekNumber,
        weekStart: new Date(selectedReport.weekStart),
        weekEnd: new Date(selectedReport.weekEnd),
      };
    }
    // 초기 주차 정보가 있으면 사용
    if (initialWeekInfo) {
      return initialWeekInfo;
    }
    // 없으면 기본값
    return {
      year: new Date().getFullYear(),
      week: 1,
      weekStart: new Date(),
      weekEnd: new Date(),
    };
  });

  const [issueContent, setIssueContent] = useState("");
  const [issueEdited, setIssueEdited] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WeeklyReportItem | null>(null);
  const [savingAction, setSavingAction] = useState<"temp" | "submit" | "cancel" | null>(null);

  // 현재 주차의 주간보고 조회
  const { data: reports, isLoading: isReportsLoading } = useWeeklyReports({
    projectId: selectedProjectId || undefined,
    userId: currentUser?.id,
    year: String(currentWeekInfo.year),
    weekNumber: String(currentWeekInfo.week),
  });

  // 해당 프로젝트의 전체 주간보고 조회 (주차별 상태 표시용)
  const { data: allReports } = useWeeklyReports({
    projectId: selectedProjectId || undefined,
    userId: currentUser?.id,
    year: String(currentWeekInfo.year),
  });

  // 주차별 제출 상태 계산
  const weekSubmitStatuses = useMemo(() => {
    if (!allReports) return [];
    return allReports.map((report) => ({
      weekNumber: report.weekNumber,
      status: report.status as "DRAFT" | "SUBMITTED",
    }));
  }, [allReports]);

  // 현재 보고서 (있으면 첫 번째 것 사용)
  const currentReportId = reports && reports.length > 0 ? reports[0].id : null;
  const { data: currentReport, isLoading: isReportLoading } = useWeeklyReport(currentReportId);

  // 자동 로드 데이터 (이전 주차의 차주계획)
  const { data: autoLoadData } = useAutoLoadData({
    projectId: selectedProjectId,
    year: String(currentWeekInfo.year),
    weekNumber: String(currentWeekInfo.week),
  });

  // Mutations
  const createReport = useCreateWeeklyReport();
  const updateReport = useUpdateWeeklyReport();
  const createItem = useCreateReportItem();
  const updateItem = useUpdateReportItem();
  const deleteItem = useDeleteReportItem();
  const bulkCreateItems = useBulkCreateReportItems();

  // 프로젝트 변경 시 currentWeekInfo 업데이트 (선택된 보고서가 없을 때만)
  useEffect(() => {
    if (!selectedReport && selectedProject?.startDate) {
      const weekInfo = getProjectWeekInfo(new Date(), new Date(selectedProject.startDate));
      setCurrentWeekInfo(weekInfo);
    }
  }, [selectedProject?.id, selectedProject?.startDate, selectedReport]);

  // 보고서 변경 시 편집 상태 초기화
  useEffect(() => {
    setIssueEdited(false);
    setIssueContent("");
  }, [currentReportId]);

  // 표시할 이슈 내용 계산
  const displayIssueContent = issueEdited ? issueContent : (currentReport?.issueContent || "");

  // 주차 변경
  const changeWeek = (weekInfo: WeekInfo) => {
    setCurrentWeekInfo(weekInfo);
  };

  // 이번 주로 이동
  const goToCurrentWeek = () => {
    if (selectedProject?.startDate) {
      const weekInfo = getProjectWeekInfo(
        new Date(),
        new Date(selectedProject.startDate)
      );
      setCurrentWeekInfo(weekInfo);
    }
  };

  // 보고서 생성
  const handleCreateReport = async () => {
    if (!selectedProjectId || !currentUser) return;

    try {
      await createReport.mutateAsync({
        projectId: selectedProjectId,
        year: currentWeekInfo.year,
        weekNumber: currentWeekInfo.week,
        weekStart: currentWeekInfo.weekStart.toISOString(),
        weekEnd: currentWeekInfo.weekEnd.toISOString(),
      });
    } catch (error) {
      console.error("보고서 생성 실패:", error);
    }
  };

  // 임시저장
  const handleTempSave = async () => {
    if (!currentReportId) return;

    setSavingAction("temp");
    try {
      const contentToSave = issueEdited ? issueContent : (currentReport?.issueContent || "");
      await updateReport.mutateAsync({
        id: currentReportId,
        data: { issueContent: contentToSave },
      });
      toast.success("임시저장되었습니다.");
      setIssueEdited(false);
    } catch (error) {
      console.error("임시저장 실패:", error);
      toast.error("임시저장에 실패했습니다.");
    } finally {
      setSavingAction(null);
    }
  };

  // 제출 완료
  const handleSubmit = async () => {
    if (!currentReportId) return;

    setSavingAction("submit");
    try {
      await updateReport.mutateAsync({
        id: currentReportId,
        data: { status: "SUBMITTED" },
      });
      toast.success("제출되었습니다.");
    } catch (error) {
      console.error("제출 실패:", error);
      toast.error("제출에 실패했습니다.");
    } finally {
      setSavingAction(null);
    }
  };

  // 제출 취소
  const handleCancelSubmit = async () => {
    if (!currentReportId) return;

    setSavingAction("cancel");
    try {
      await updateReport.mutateAsync({
        id: currentReportId,
        data: { status: "DRAFT" },
      });
      toast.success("제출이 취소되었습니다.");
    } catch (error) {
      console.error("제출 취소 실패:", error);
      toast.error("제출 취소에 실패했습니다.");
    } finally {
      setSavingAction(null);
    }
  };

  // 전주 계획 불러오기
  const handleLoadPreviousPlan = async () => {
    if (!currentReportId || !autoLoadData?.previousPlanItems.length) return;

    try {
      const itemsToCreate = autoLoadData.previousPlanItems.map((item, index) => ({
        type: "PREVIOUS_RESULT" as ReportItemType,
        category: item.category as WorkCategory,
        title: item.title,
        description: item.description || undefined,
        targetDate: item.targetDate || undefined,
        remarks: item.remarks || undefined,
        isAdditional: false,
        isCompleted: false,
        progress: 0,
        linkedTaskId: item.linkedTaskId || undefined,
        linkedWbsId: item.linkedWbsId || undefined,
        order: index,
      }));

      await bulkCreateItems.mutateAsync({
        reportId: currentReportId,
        items: itemsToCreate,
      });
      toast.success("전주 계획을 불러왔습니다.");
    } catch (error) {
      console.error("전주 계획 불러오기 실패:", error);
      toast.error("전주 계획 불러오기에 실패했습니다.");
    }
  };

  // 항목 추가 모달 열기
  const openAddItemModal = (type: ReportItemType) => {
    setEditingItem({
      id: "",
      type,
      category: "DEVELOPMENT",
      title: "",
      description: null,
      targetDate: null,
      remarks: null,
      isAdditional: type === "PREVIOUS_RESULT",
      isCompleted: false,
      progress: 0,
      linkedTaskId: null,
      linkedWbsId: null,
      order: 0,
      reportId: currentReportId || "",
      createdAt: "",
      updatedAt: "",
    });
    setIsItemModalOpen(true);
  };

  // 항목 저장
  const handleSaveItem = async (item: Partial<WeeklyReportItem>) => {
    if (!currentReportId) return;

    try {
      const isEditing = editingItem?.id && editingItem.id !== "";

      if (isEditing) {
        await updateItem.mutateAsync({
          reportId: currentReportId,
          itemId: editingItem.id,
          data: {
            type: item.type as ReportItemType,
            category: item.category as WorkCategory,
            title: item.title || "",
            description: item.description || undefined,
            targetDate: item.targetDate || undefined,
            remarks: item.remarks || undefined,
            isAdditional: item.isAdditional,
            isCompleted: item.isCompleted,
            progress: item.progress,
            linkedTaskId: item.linkedTaskId || undefined,
            linkedWbsId: item.linkedWbsId || undefined,
          },
        });
      } else {
        await createItem.mutateAsync({
          reportId: currentReportId,
          data: {
            type: item.type as ReportItemType,
            category: item.category as WorkCategory,
            title: item.title || "",
            description: item.description || undefined,
            targetDate: item.targetDate || undefined,
            remarks: item.remarks || undefined,
            isAdditional: item.isAdditional,
            isCompleted: item.isCompleted,
            progress: item.progress,
            linkedTaskId: item.linkedTaskId || undefined,
            linkedWbsId: item.linkedWbsId || undefined,
          },
        });
      }
      setIsItemModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("항목 저장 실패:", error);
      toast.error("항목 저장에 실패했습니다.");
    }
  };

  // 항목 수정 모달 열기
  const openEditItemModal = (item: WeeklyReportItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  // 항목 삭제
  const handleDeleteItem = async (itemId: string) => {
    if (!currentReportId) return;

    try {
      await deleteItem.mutateAsync({
        reportId: currentReportId,
        itemId,
      });
    } catch (error) {
      console.error("항목 삭제 실패:", error);
      toast.error("항목 삭제에 실패했습니다.");
    }
  };

  // 전주 실적 항목들
  const previousItems = currentReport?.items?.filter(
    (item) => item.type === "PREVIOUS_RESULT"
  ) || [];

  // 차주 계획 항목들
  const nextItems = currentReport?.items?.filter(
    (item) => item.type === "NEXT_PLAN"
  ) || [];

  // 자동 로드 데이터
  const autoLoadItems = autoLoadData?.previousPlanItems || [];
  const hasAutoLoadItems = autoLoadItems.length > 0 && previousItems.length === 0;

  const isLoading = isReportsLoading || isReportLoading;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Icon name="arrow_back" size="sm" />
          </button>
          <h2 className="text-lg font-bold text-foreground">주간 업무보고</h2>
          {currentReport && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                REPORT_STATUS_MAP[currentReport.status].color
              }`}
            >
              {REPORT_STATUS_MAP[currentReport.status].label}
            </span>
          )}
        </div>

        {/* 프로젝트 표시 */}
        {selectedProject && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
            <Icon name="folder" size="sm" className="text-primary" />
            <span className="text-sm font-medium text-foreground">
              {selectedProject.name}
            </span>
          </div>
        )}
      </div>

      {/* 주차 선택 캐로셀 */}
      {selectedProject?.startDate && (
        <WeekCarousel
          currentWeekInfo={currentWeekInfo}
          projectStartDate={new Date(selectedProject.startDate)}
          weekSubmitStatuses={weekSubmitStatuses}
          onWeekChange={changeWeek}
          onGoToCurrentWeek={goToCurrentWeek}
        />
      )}

      {/* 보고서 미존재 시 */}
      {!isLoading && !currentReport && selectedProjectId && (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <Icon
            name="description"
            size="xl"
            className="text-muted-foreground mb-4"
          />
          <p className="text-foreground mb-4">
            해당 주차의 주간보고가 없습니다.
          </p>
          <Button onClick={handleCreateReport} isLoading={createReport.isPending}>
            주간보고 작성 시작
          </Button>
        </div>
      )}

      {/* 보고서 존재 시 */}
      {currentReport && (
        <>
          {/* 자동 로드 안내 */}
          {hasAutoLoadItems && (
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="auto_fix_high" className="text-sky-500" />
                <span className="text-sm text-sky-700 dark:text-sky-400">
                  전주에 작성한 차주계획 {autoLoadItems.length}건을 전주 실적으로 불러올 수 있습니다.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLoadPreviousPlan}
                isLoading={bulkCreateItems.isPending}
              >
                불러오기
              </Button>
            </div>
          )}

          {/* 2컬럼 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 왼쪽: 전주 실적 */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 bg-muted border-b border-border">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Icon name="history" size="sm" className="text-primary" />
                  전주 실적
                </h3>
              </div>
              <div className="divide-y divide-border">
                {previousItems.length === 0 && !hasAutoLoadItems ? (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    등록된 업무가 없습니다.
                  </div>
                ) : (
                  <>
                    {/* 자동 로드 미리보기 */}
                    {hasAutoLoadItems && autoLoadItems.map((item, idx) => (
                      <div key={`auto-${idx}`} className="px-4 py-3 bg-sky-50/50 dark:bg-sky-900/10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryInfo(item.category as WorkCategory).color}`}>
                            {getCategoryInfo(item.category as WorkCategory).label}
                          </span>
                          <span className="text-xs text-sky-600 dark:text-sky-400">(자동 로드 대기)</span>
                        </div>
                        <div className="text-sm font-medium text-foreground">{item.title}</div>
                      </div>
                    ))}
                    {/* 저장된 항목들 */}
                    {previousItems.map((item) => (
                      <ReportItemRow
                        key={item.id}
                        item={item}
                        onEdit={() => openEditItemModal(item)}
                        onDelete={() => handleDeleteItem(item.id)}
                      />
                    ))}
                  </>
                )}
              </div>
              {/* 항목 추가 버튼 */}
              <div className="border-t border-border p-3">
                <button
                  onClick={() => openAddItemModal("PREVIOUS_RESULT")}
                  className="w-full py-2 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Icon name="add" size="sm" />
                  추가 업무 등록
                </button>
              </div>
            </div>

            {/* 오른쪽: 차주 계획 */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 bg-muted border-b border-border">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Icon name="event_upcoming" size="sm" className="text-primary" />
                  차주 계획
                </h3>
              </div>
              <div className="divide-y divide-border">
                {nextItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    등록된 업무가 없습니다.
                  </div>
                ) : (
                  nextItems.map((item) => (
                    <ReportItemRow
                      key={item.id}
                      item={item}
                      onEdit={() => openEditItemModal(item)}
                      onDelete={() => handleDeleteItem(item.id)}
                      showProgress={false}
                    />
                  ))
                )}
              </div>
              {/* 항목 추가 버튼 */}
              <div className="border-t border-border p-3">
                <button
                  onClick={() => openAddItemModal("NEXT_PLAN")}
                  className="w-full py-2 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Icon name="add" size="sm" />
                  계획 추가
                </button>
              </div>
            </div>
          </div>

          {/* 이슈 섹션 */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
              <Icon name="warning" size="sm" className="text-warning" />
              이슈사항
            </h3>
            <RichTextEditor
              key={currentReportId}
              value={displayIssueContent}
              onChange={(val) => {
                setIssueContent(val);
                setIssueEdited(true);
              }}
              placeholder="이슈사항을 입력하세요..."
              minHeight={150}
            />
          </div>

          {/* 하단 액션 버튼 */}
          <div className="flex justify-end gap-3">
            {currentReport.status === "DRAFT" ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleTempSave}
                  isLoading={savingAction === "temp"}
                  disabled={savingAction !== null}
                >
                  임시저장
                </Button>
                <Button
                  onClick={handleSubmit}
                  isLoading={savingAction === "submit"}
                  disabled={savingAction !== null}
                >
                  제출 완료
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={handleCancelSubmit}
                isLoading={savingAction === "cancel"}
                disabled={savingAction !== null}
              >
                제출 취소
              </Button>
            )}
          </div>
        </>
      )}

      {/* 항목 추가/수정 모달 */}
      <ItemModal
        isOpen={isItemModalOpen}
        item={editingItem}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
      />
    </div>
  );
}
