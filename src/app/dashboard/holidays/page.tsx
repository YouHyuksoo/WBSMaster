/**
 * @file src/app/dashboard/holidays/page.tsx
 * @description
 * 일정 관리 페이지입니다.
 * 휴무일 및 개인 일정을 관리합니다.
 * 월간/주간 뷰를 지원합니다.
 *
 * 초보자 가이드:
 * 1. **뷰 모드**: 월간(month) / 주간(week) 전환 가능
 * 2. **일정 유형**: 회사 휴일, 팀 오프사이트, 개인 휴가, 개인 일정, 회의, 마감일, 기타
 * 3. **일정 영향**: WBS 간트 차트에 자동 반영
 *
 * 수정 방법:
 * - 컴포넌트 스타일: components/ 폴더 내 각 컴포넌트 파일 수정
 * - 타입/설정: types.ts 파일 수정
 */

"use client";

import { useState } from "react";
import { Icon, Button, useToast, ConfirmModal } from "@/components/ui";
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday, useMembers } from "@/hooks";
import type { Holiday } from "@/lib/api";
import { useProject } from "@/contexts";
import {
  MonthlyCalendar,
  WeeklyCalendar,
  HolidayList,
  HolidayLegend,
  HolidayModal,
  CalendarNavigation,
} from "./components";
import { ViewMode, HolidayFormState, initialHolidayFormState } from "./types";

/**
 * 일정 관리 페이지
 */
export default function HolidaysPage() {
  // 상태 관리
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [newHoliday, setNewHoliday] = useState<HolidayFormState>(initialHolidayFormState);
  const [editHoliday, setEditHoliday] = useState<HolidayFormState>(initialHolidayFormState);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);

  const toast = useToast();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 컨텍스트 및 데이터 조회
  const { selectedProjectId, selectedProject } = useProject();
  const { data: members = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );
  const { data: holidays = [], isLoading, error } = useHolidays({ year: String(year) });
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  // === 날짜 계산 함수 ===
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  };

  const getWeekEnd = (date: Date) => {
    const d = getWeekStart(date);
    d.setDate(d.getDate() + 6);
    return d;
  };

  const getWeekDays = () => {
    const days: Date[] = [];
    const start = getWeekStart(currentDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const weekStart = getWeekStart(currentDate);
  const weekEnd = getWeekEnd(currentDate);
  const weekDays = getWeekDays();

  // === 네비게이션 함수 ===
  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToPrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };
  const goToToday = () => setCurrentDate(new Date());

  // === 일정 필터링 함수 ===
  /**
   * 해당 날짜에 표시할 일정 목록 반환
   * 시작일~종료일 사이의 모든 날짜에 일정이 표시됨
   */
  const getHolidaysForDate = (day: number) => {
    const targetDate = new Date(year, month, day);
    targetDate.setHours(0, 0, 0, 0);

    return holidays.filter((h) => {
      if (selectedType !== "all" && h.type !== selectedType) return false;

      const startDate = new Date(h.date);
      startDate.setHours(0, 0, 0, 0);

      // endDate가 없으면 시작일과 동일
      const endDate = h.endDate ? new Date(h.endDate) : new Date(h.date);
      endDate.setHours(0, 0, 0, 0);

      // 해당 날짜가 시작일~종료일 범위 안에 있는지 확인
      return targetDate >= startDate && targetDate <= endDate;
    });
  };

  const getHolidaysForDateObj = (date: Date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return holidays.filter((h) => {
      if (selectedType !== "all" && h.type !== selectedType) return false;

      const startDate = new Date(h.date);
      startDate.setHours(0, 0, 0, 0);

      // endDate가 없으면 시작일과 동일
      const endDate = h.endDate ? new Date(h.endDate) : new Date(h.date);
      endDate.setHours(0, 0, 0, 0);

      // 해당 날짜가 시작일~종료일 범위 안에 있는지 확인
      return targetDate >= startDate && targetDate <= endDate;
    });
  };

  const filteredHolidays = holidays.filter((h) => {
    if (selectedType !== "all" && h.type !== selectedType) return false;
    const holidayDate = new Date(h.date);
    return holidayDate.getFullYear() === year && holidayDate.getMonth() === month;
  });

  const weeklyHolidays = holidays.filter((h) => {
    if (selectedType !== "all" && h.type !== selectedType) return false;
    const holidayDate = new Date(h.date);
    return holidayDate >= weekStart && holidayDate <= weekEnd;
  });

  // === 일정 CRUD 핸들러 ===
  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error("헤더에서 프로젝트를 먼저 선택해주세요.");
      return;
    }
    if (!newHoliday.title.trim() || !newHoliday.date) {
      toast.error("제목과 날짜를 입력해주세요.");
      return;
    }

    try {
      await createHoliday.mutateAsync({
        title: newHoliday.title,
        description: newHoliday.description || undefined,
        date: newHoliday.date,
        endDate: newHoliday.endDate || undefined,
        type: newHoliday.type,
        isAllDay: newHoliday.isAllDay,
        startTime: newHoliday.isAllDay ? undefined : newHoliday.startTime || undefined,
        endTime: newHoliday.isAllDay ? undefined : newHoliday.endTime || undefined,
        projectId: selectedProjectId,
        userId: newHoliday.userId || undefined,
      });

      toast.success("일정이 추가되었습니다.");
      setNewHoliday(initialHolidayFormState);
      setShowAddModal(false);
    } catch (error) {
      toast.error("일정 추가에 실패했습니다.");
    }
  };

  const handleUpdateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;
    if (!editHoliday.title.trim() || !editHoliday.date) {
      toast.error("제목과 날짜를 입력해주세요.");
      return;
    }

    try {
      await updateHoliday.mutateAsync({
        id: editingHoliday.id,
        data: {
          title: editHoliday.title,
          description: editHoliday.description || undefined,
          date: editHoliday.date,
          endDate: editHoliday.endDate || undefined,
          type: editHoliday.type,
          isAllDay: editHoliday.isAllDay,
          startTime: editHoliday.isAllDay ? undefined : editHoliday.startTime || undefined,
          endTime: editHoliday.isAllDay ? undefined : editHoliday.endTime || undefined,
          userId: editHoliday.userId || undefined,
        },
      });

      toast.success("일정이 수정되었습니다.");
      setShowEditModal(false);
      setEditingHoliday(null);
    } catch (error) {
      toast.error("일정 수정에 실패했습니다.");
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    setDeletingHolidayId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingHolidayId) return;
    try {
      await deleteHoliday.mutateAsync(deletingHolidayId);
      toast.success("일정이 삭제되었습니다.");
      setShowDeleteConfirm(false);
      setDeletingHolidayId(null);
    } catch (error) {
      toast.error("일정 삭제에 실패했습니다.");
    }
  };

  const handleOpenEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setEditHoliday({
      title: holiday.title,
      description: holiday.description || "",
      date: holiday.date.split("T")[0],
      endDate: holiday.endDate ? holiday.endDate.split("T")[0] : "",
      type: holiday.type,
      isAllDay: holiday.isAllDay,
      startTime: holiday.startTime || "",
      endTime: holiday.endTime || "",
      userId: holiday.userId || "",
    });
    setShowEditModal(true);
  };

  /**
   * 특정 날짜로 일정 추가 모달 열기
   * 달력에서 날짜 클릭 시 해당 날짜가 미리 설정됨
   */
  const handleAddHolidayForDate = (dateStr: string) => {
    setNewHoliday({
      ...initialHolidayFormState,
      date: dateStr,
    });
    setShowAddModal(true);
  };

  // === 네비게이션 라벨 ===
  const dateLabel = viewMode === "month"
    ? `${year}년 ${month + 1}월`
    : `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}/${weekStart.getDate()} ~ ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

  const listTitle = viewMode === "month"
    ? `${month + 1}월 일정 (${filteredHolidays.length})`
    : `${getWeekNumber(currentDate)}주차 일정 (${weeklyHolidays.length})`;

  // === 로딩/에러 상태 ===
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
        <div className="bg-error/10 text-error p-4 rounded-lg">
          데이터를 불러오는데 실패했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 - 대시보드 차트 스타일 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="calendar_month" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              SCHEDULE
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 일정 관리
            </span>
          </h1>
          <p className="text-text-secondary mt-1">
            휴무일 및 개인 일정을 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Icon name="folder" size="sm" className="text-primary" />
              <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
            </div>
          )}
          <Button
            variant="primary"
            leftIcon="add"
            onClick={() => setShowAddModal(true)}
            disabled={!selectedProjectId}
          >
            일정 추가
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
            상단 헤더에서 프로젝트를 선택하면 휴무 달력이 표시됩니다.
          </p>
        </div>
      )}

      {selectedProjectId && (
        <>
          {/* 필터 및 네비게이션 */}
          <CalendarNavigation
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            dateLabel={dateLabel}
            onPrev={viewMode === "month" ? goToPrevMonth : goToPrevWeek}
            onNext={viewMode === "month" ? goToNextMonth : goToNextWeek}
            onToday={goToToday}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
          />

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* 달력 영역 */}
            <div className="xl:col-span-3 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden">
              {viewMode === "month" ? (
                <MonthlyCalendar
                  year={year}
                  month={month}
                  getHolidaysForDate={getHolidaysForDate}
                  onHolidayClick={handleOpenEditModal}
                  onAddHoliday={handleAddHolidayForDate}
                />
              ) : (
                <WeeklyCalendar
                  weekDays={weekDays}
                  getHolidaysForDate={getHolidaysForDateObj}
                  onHolidayClick={handleOpenEditModal}
                  onAddHoliday={handleAddHolidayForDate}
                />
              )}
            </div>

            {/* 일정 목록 + 범례 */}
            <div className="xl:col-span-1">
              <HolidayList
                holidays={viewMode === "month" ? filteredHolidays : weeklyHolidays}
                title={listTitle}
                onHolidayClick={handleOpenEditModal}
                onHolidayDelete={handleDeleteHoliday}
              />
              <HolidayLegend />
            </div>
          </div>
        </>
      )}

      {/* 일정 추가 모달 */}
      <HolidayModal
        mode="add"
        isOpen={showAddModal}
        formData={newHoliday}
        onFormChange={(data) => setNewHoliday({ ...newHoliday, ...data })}
        onSubmit={handleCreateHoliday}
        onClose={() => setShowAddModal(false)}
        members={members}
        isSubmitting={createHoliday.isPending}
      />

      {/* 일정 수정 모달 */}
      <HolidayModal
        mode="edit"
        isOpen={showEditModal}
        formData={editHoliday}
        onFormChange={(data) => setEditHoliday({ ...editHoliday, ...data })}
        onSubmit={handleUpdateHoliday}
        onClose={() => {
          setShowEditModal(false);
          setEditingHoliday(null);
        }}
        members={members}
        isSubmitting={updateHoliday.isPending}
        editingHoliday={editingHoliday}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="일정 삭제"
        message="이 일정을 삭제하시겠습니까?"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingHolidayId(null);
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteHoliday.isPending}
      />
    </div>
  );
}
