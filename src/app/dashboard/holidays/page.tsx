/**
 * @file src/app/dashboard/holidays/page.tsx
 * @description
 * 일정 관리 페이지입니다.
 * 휴무일 및 개인 일정을 관리합니다.
 * React Query를 사용하여 API와 연동됩니다.
 *
 * 초보자 가이드:
 * 1. **달력 뷰**: 월별 달력에서 일정 표시
 * 2. **일정 유형**: 회사 휴일, 팀 오프사이트, 개인 휴가, 개인 일정, 회의, 마감일, 기타
 * 3. **일정 영향**: WBS 간트 차트에 자동 반영
 *
 * 수정 방법:
 * - 일정 추가: useCreateHoliday hook 사용
 * - 일정 삭제: useDeleteHoliday hook 사용
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday, useMembers } from "@/hooks";
import type { Holiday } from "@/lib/api";
import { useProject } from "@/contexts";

/** 일정 유형 설정 */
const holidayTypeConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  COMPANY_HOLIDAY: { label: "회사 휴일", color: "text-rose-500", bgColor: "bg-rose-500", icon: "event_busy" },
  TEAM_OFFSITE: { label: "팀 오프사이트", color: "text-primary", bgColor: "bg-primary", icon: "groups" },
  PERSONAL_LEAVE: { label: "개인 휴가", color: "text-emerald-500", bgColor: "bg-emerald-500", icon: "beach_access" },
  PERSONAL_SCHEDULE: { label: "개인 일정", color: "text-violet-500", bgColor: "bg-violet-500", icon: "person" },
  MEETING: { label: "회의", color: "text-sky-500", bgColor: "bg-sky-500", icon: "videocam" },
  DEADLINE: { label: "마감일", color: "text-amber-500", bgColor: "bg-amber-500", icon: "flag" },
  OTHER: { label: "기타", color: "text-slate-500", bgColor: "bg-slate-500", icon: "event" },
};

/**
 * 일정 관리 페이지
 */
export default function HolidaysPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  /** 새 일정 폼 상태 */
  const [newHoliday, setNewHoliday] = useState({
    title: "",
    description: "",
    date: "",
    endDate: "",
    type: "PERSONAL_SCHEDULE",
    isAllDay: true,
    startTime: "",
    endTime: "",
    userId: "", // 담당자 ID
  });

  /** 수정 일정 폼 상태 */
  const [editHoliday, setEditHoliday] = useState({
    title: "",
    description: "",
    date: "",
    endDate: "",
    type: "PERSONAL_SCHEDULE",
    isAllDay: true,
    startTime: "",
    endTime: "",
    userId: "", // 담당자 ID
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  /** 전역 프로젝트 선택 상태 (헤더에서 선택) */
  const { selectedProjectId, selectedProject } = useProject();

  /** 프로젝트 팀 멤버 목록 조회 */
  const { data: members = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** 휴일 목록 조회 */
  const { data: holidays = [], isLoading, error } = useHolidays({
    year: String(year),
  });

  /** 휴일 생성 */
  const createHoliday = useCreateHoliday();

  /** 휴일 수정 */
  const updateHoliday = useUpdateHoliday();

  /** 휴일 삭제 */
  const deleteHoliday = useDeleteHoliday();

  // 월의 첫날과 마지막날
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDay = firstDayOfMonth.getDay();

  // 이전/다음 달 이동
  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // 해당 날짜의 휴무일 가져오기
  const getHolidaysForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return holidays.filter((h) => {
      if (selectedType !== "all" && h.type !== selectedType) return false;
      const holidayDate = h.date.split("T")[0];
      return holidayDate === dateStr;
    });
  };

  // 필터링된 휴무 목록 (현재 월)
  const filteredHolidays = holidays.filter((h) => {
    if (selectedType !== "all" && h.type !== selectedType) return false;
    const holidayDate = new Date(h.date);
    return holidayDate.getFullYear() === year && holidayDate.getMonth() === month;
  });

  // 요일 이름
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  /**
   * 일정 생성 핸들러
   */
  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert("헤더에서 프로젝트를 먼저 선택해주세요.");
      return;
    }
    if (!newHoliday.title.trim() || !newHoliday.date) {
      alert("제목과 날짜를 입력해주세요.");
      return;
    }

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
      userId: newHoliday.userId || undefined, // 담당자 ID 전달
    });

    setNewHoliday({
      title: "",
      description: "",
      date: "",
      endDate: "",
      type: "PERSONAL_SCHEDULE",
      isAllDay: true,
      startTime: "",
      endTime: "",
      userId: "",
    });
    setShowAddModal(false);
  };

  /**
   * 휴일 삭제 핸들러
   */
  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    await deleteHoliday.mutateAsync(id);
  };

  /**
   * 수정 모달 열기
   */
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
      userId: holiday.userId || "", // 담당자 ID
    });
    setShowEditModal(true);
  };

  /**
   * 일정 수정 핸들러
   */
  const handleUpdateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;
    if (!editHoliday.title.trim() || !editHoliday.date) {
      alert("제목과 날짜를 입력해주세요.");
      return;
    }

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
        userId: editHoliday.userId || undefined, // 담당자 ID 전달
      },
    });

    setShowEditModal(false);
    setEditingHoliday(null);
  };

  // 달력 셀 생성
  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();

    // 이전 달의 빈 칸
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-surface/50 dark:bg-background-dark/50" />);
    }

    // 현재 달의 날짜
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      const isWeekend = (startingDay + day - 1) % 7 === 0 || (startingDay + day - 1) % 7 === 6;
      const dayHolidays = getHolidaysForDate(day);

      days.push(
        <div
          key={day}
          className={`h-24 p-2 border-b border-r border-border dark:border-border-dark overflow-hidden ${
            isWeekend ? "bg-surface/50 dark:bg-background-dark/50" : "bg-background-white dark:bg-surface-dark"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-sm font-medium ${
                isToday
                  ? "size-6 rounded-full bg-primary text-white flex items-center justify-center"
                  : isWeekend
                  ? "text-error"
                  : "text-text dark:text-white"
              }`}
            >
              {day}
            </span>
          </div>
          <div className="space-y-1">
            {dayHolidays.slice(0, 2).map((holiday) => {
              const config = holidayTypeConfig[holiday.type] || holidayTypeConfig.COMPANY_HOLIDAY;
              return (
                <div
                  key={holiday.id}
                  className={`text-[10px] px-1.5 py-0.5 rounded truncate ${config.bgColor} text-white flex items-center gap-1`}
                >
                  {/* 개인 일정인 경우 사용자 아바타 표시 */}
                  {holiday.user?.avatar ? (
                    <img
                      src={holiday.user.avatar}
                      alt={holiday.user.name || "사용자"}
                      className="size-4 rounded-full object-cover shrink-0 border border-white/30"
                    />
                  ) : holiday.user ? (
                    <div className="size-4 rounded-full bg-white/30 flex items-center justify-center shrink-0">
                      <Icon name="person" size="xs" className="text-white text-[8px]" />
                    </div>
                  ) : null}
                  <span className="truncate">{holiday.title}</span>
                </div>
              );
            })}
            {dayHolidays.length > 2 && (
              <div className="text-[10px] text-text-secondary">+{dayHolidays.length - 2}개 더</div>
            )}
          </div>
        </div>
      );
    }

    return days;
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
          <h1 className="text-2xl font-bold text-text dark:text-white">일정 관리</h1>
          <p className="text-text-secondary mt-1">
            휴무일 및 개인 일정을 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 현재 선택된 프로젝트 표시 */}
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevMonth}
                className="p-2 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              >
                <Icon name="chevron_left" size="sm" className="text-text dark:text-white" />
              </button>
              <h2 className="text-lg font-bold text-text dark:text-white min-w-[140px] text-center">
                {year}년 {month + 1}월
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              >
                <Icon name="chevron_right" size="sm" className="text-text dark:text-white" />
              </button>
              <button
                onClick={goToToday}
                className="ml-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                오늘
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(["all", "COMPANY_HOLIDAY", "PERSONAL_LEAVE", "PERSONAL_SCHEDULE", "MEETING", "DEADLINE", "OTHER"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedType === type
                      ? type === "all"
                        ? "bg-primary/10 text-primary"
                        : `${holidayTypeConfig[type]?.bgColor || "bg-primary"} text-white`
                      : "bg-surface dark:bg-surface-dark text-text-secondary hover:text-text dark:hover:text-white"
                  }`}
                >
                  {type === "all" ? "전체" : holidayTypeConfig[type]?.label || type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* 달력 */}
        <div className="xl:col-span-3 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-border dark:border-border-dark">
            {dayNames.map((day, index) => (
              <div
                key={day}
                className={`py-3 text-center text-sm font-semibold ${
                  index === 0 ? "text-error" : index === 6 ? "text-primary" : "text-text dark:text-white"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 달력 그리드 */}
          <div className="grid grid-cols-7">{renderCalendarDays()}</div>
        </div>

        {/* 일정 목록 */}
        <div className="xl:col-span-1">
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
            <h3 className="font-bold text-text dark:text-white mb-4">
              {month + 1}월 일정 ({filteredHolidays.length})
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredHolidays.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4">휴무일이 없습니다</p>
              ) : (
                filteredHolidays
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((holiday) => {
                    const config = holidayTypeConfig[holiday.type] || holidayTypeConfig.COMPANY_HOLIDAY;
                    const date = new Date(holiday.date);
                    return (
                      <div
                        key={holiday.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-surface dark:bg-background-dark group hover:bg-surface-hover dark:hover:bg-surface-dark transition-colors cursor-pointer"
                        onClick={() => handleOpenEditModal(holiday)}
                      >
                        {/* 아바타 또는 유형 아이콘 */}
                        {holiday.user?.avatar ? (
                          <img
                            src={holiday.user.avatar}
                            alt={holiday.user.name || "사용자"}
                            className="size-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${config.bgColor}`}>
                            <Icon name={config.icon} size="sm" className="text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text dark:text-white truncate">
                              {holiday.title}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${config.bgColor} text-white shrink-0`}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {date.getMonth() + 1}/{date.getDate()} ({dayNames[date.getDay()]})
                            {!holiday.isAllDay && holiday.startTime && ` ${holiday.startTime}`}
                          </p>
                          {/* 사용자 이름 표시 */}
                          {holiday.user && (
                            <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                              <Icon name="person" size="xs" />
                              {holiday.user.name || holiday.user.email}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(holiday);
                            }}
                            className="p-1 hover:bg-primary/10 rounded"
                            title="수정"
                          >
                            <Icon name="edit" size="xs" className="text-primary" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHoliday(holiday.id);
                            }}
                            className="p-1 hover:bg-error/10 rounded"
                            title="삭제"
                          >
                            <Icon name="close" size="xs" className="text-error" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* 범례 */}
          <div className="mt-4 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
            <h3 className="font-bold text-text dark:text-white mb-3">범례</h3>
            <div className="space-y-2">
              {Object.entries(holidayTypeConfig).map(([type, config]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`size-3 rounded ${config.bgColor}`} />
                  <span className="text-sm text-text dark:text-white">{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
          </div>
        </>
      )}

      {/* 일정 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text dark:text-white mb-4">
              일정 추가
            </h2>
            <form onSubmit={handleCreateHoliday} className="space-y-4">
              {/* 일정 제목 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  일정 제목 *
                </label>
                <Input
                  value={newHoliday.title}
                  onChange={(e) => setNewHoliday({ ...newHoliday, title: e.target.value })}
                  placeholder="예: 팀 회의, 휴가"
                  required
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  설명
                </label>
                <textarea
                  value={newHoliday.description}
                  onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                  placeholder="일정에 대한 상세 설명"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white resize-none"
                />
              </div>

              {/* 유형 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  유형
                </label>
                <select
                  value={newHoliday.type}
                  onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                >
                  <option value="PERSONAL_SCHEDULE">개인 일정</option>
                  <option value="MEETING">회의</option>
                  <option value="DEADLINE">마감일</option>
                  <option value="COMPANY_HOLIDAY">회사 휴일</option>
                  <option value="TEAM_OFFSITE">팀 오프사이트</option>
                  <option value="PERSONAL_LEAVE">개인 휴가</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>

              {/* 담당자 선택 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  담당자
                </label>
                <select
                  value={newHoliday.userId}
                  onChange={(e) => setNewHoliday({ ...newHoliday, userId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                >
                  <option value="">선택 안함</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user?.name || member.user?.email || "알 수 없음"}
                    </option>
                  ))}
                </select>
              </div>

              {/* 종일 여부 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAllDay"
                  checked={newHoliday.isAllDay}
                  onChange={(e) => setNewHoliday({ ...newHoliday, isAllDay: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="isAllDay" className="text-sm text-text dark:text-white">
                  종일
                </label>
              </div>

              {/* 날짜 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    시작일 *
                  </label>
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={newHoliday.endDate}
                    onChange={(e) => setNewHoliday({ ...newHoliday, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                  />
                </div>
              </div>

              {/* 시간 (종일이 아닌 경우) */}
              {!newHoliday.isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      시작 시간
                    </label>
                    <input
                      type="time"
                      value={newHoliday.startTime}
                      onChange={(e) => setNewHoliday({ ...newHoliday, startTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      종료 시간
                    </label>
                    <input
                      type="time"
                      value={newHoliday.endTime}
                      onChange={(e) => setNewHoliday({ ...newHoliday, endTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={createHoliday.isPending}
                >
                  {createHoliday.isPending ? "추가 중..." : "추가"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일정 수정 모달 */}
      {showEditModal && editingHoliday && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text dark:text-white">
                일정 수정
              </h2>
              {/* 등록자 정보 */}
              {editingHoliday.user && (
                <div className="flex items-center gap-2">
                  {editingHoliday.user.avatar ? (
                    <img
                      src={editingHoliday.user.avatar}
                      alt={editingHoliday.user.name || "사용자"}
                      className="size-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Icon name="person" size="xs" className="text-primary" />
                    </div>
                  )}
                  <span className="text-xs text-text-secondary">
                    {editingHoliday.user.name || editingHoliday.user.email}
                  </span>
                </div>
              )}
            </div>
            <form onSubmit={handleUpdateHoliday} className="space-y-4">
              {/* 일정 제목 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  일정 제목 *
                </label>
                <Input
                  value={editHoliday.title}
                  onChange={(e) => setEditHoliday({ ...editHoliday, title: e.target.value })}
                  placeholder="예: 팀 회의, 휴가"
                  required
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  설명
                </label>
                <textarea
                  value={editHoliday.description}
                  onChange={(e) => setEditHoliday({ ...editHoliday, description: e.target.value })}
                  placeholder="일정에 대한 상세 설명"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white resize-none"
                />
              </div>

              {/* 유형 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  유형
                </label>
                <select
                  value={editHoliday.type}
                  onChange={(e) => setEditHoliday({ ...editHoliday, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                >
                  <option value="PERSONAL_SCHEDULE">개인 일정</option>
                  <option value="MEETING">회의</option>
                  <option value="DEADLINE">마감일</option>
                  <option value="COMPANY_HOLIDAY">회사 휴일</option>
                  <option value="TEAM_OFFSITE">팀 오프사이트</option>
                  <option value="PERSONAL_LEAVE">개인 휴가</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>

              {/* 담당자 선택 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  담당자
                </label>
                <select
                  value={editHoliday.userId}
                  onChange={(e) => setEditHoliday({ ...editHoliday, userId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                >
                  <option value="">선택 안함</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user?.name || member.user?.email || "알 수 없음"}
                    </option>
                  ))}
                </select>
              </div>

              {/* 종일 여부 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsAllDay"
                  checked={editHoliday.isAllDay}
                  onChange={(e) => setEditHoliday({ ...editHoliday, isAllDay: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="editIsAllDay" className="text-sm text-text dark:text-white">
                  종일
                </label>
              </div>

              {/* 날짜 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    시작일 *
                  </label>
                  <input
                    type="date"
                    value={editHoliday.date}
                    onChange={(e) => setEditHoliday({ ...editHoliday, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={editHoliday.endDate}
                    onChange={(e) => setEditHoliday({ ...editHoliday, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                  />
                </div>
              </div>

              {/* 시간 (종일이 아닌 경우) */}
              {!editHoliday.isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      시작 시간
                    </label>
                    <input
                      type="time"
                      value={editHoliday.startTime}
                      onChange={(e) => setEditHoliday({ ...editHoliday, startTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      종료 시간
                    </label>
                    <input
                      type="time"
                      value={editHoliday.endTime}
                      onChange={(e) => setEditHoliday({ ...editHoliday, endTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingHoliday(null);
                  }}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={updateHoliday.isPending}
                >
                  {updateHoliday.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
