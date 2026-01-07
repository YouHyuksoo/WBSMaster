/**
 * @file src/app/dashboard/holidays/page.tsx
 * @description
 * 휴무 달력 페이지입니다.
 * 프로젝트 일정 계산에서 제외할 휴무일을 관리합니다.
 * React Query를 사용하여 API와 연동됩니다.
 *
 * 초보자 가이드:
 * 1. **달력 뷰**: 월별 달력에서 휴무일 표시
 * 2. **휴무 유형**: 회사 휴일, 팀 오프사이트, 개인 휴가
 * 3. **일정 영향**: WBS 간트 차트에 자동 반영
 *
 * 수정 방법:
 * - 휴무 추가: useCreateHoliday hook 사용
 * - 휴무 삭제: useDeleteHoliday hook 사용
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { useHolidays, useCreateHoliday, useDeleteHoliday, useProjects } from "@/hooks";

/** 휴무 유형 설정 */
const holidayTypeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  COMPANY_HOLIDAY: { label: "회사 휴일", color: "text-error", bgColor: "bg-error" },
  TEAM_OFFSITE: { label: "팀 오프사이트", color: "text-primary", bgColor: "bg-primary" },
  PERSONAL_LEAVE: { label: "개인 휴가", color: "text-success", bgColor: "bg-success" },
};

/**
 * 휴무 달력 페이지
 */
export default function HolidaysPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);

  /** 새 휴일 폼 상태 */
  const [newHoliday, setNewHoliday] = useState({
    title: "",
    date: "",
    type: "COMPANY_HOLIDAY",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  /** 프로젝트 목록 조회 */
  const { data: projects = [] } = useProjects();

  /** 휴일 목록 조회 */
  const { data: holidays = [], isLoading, error } = useHolidays({
    year: String(year),
  });

  /** 휴일 생성 */
  const createHoliday = useCreateHoliday();

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
   * 휴일 생성 핸들러
   */
  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.title.trim() || !newHoliday.date || !selectedProjectId) {
      alert("프로젝트를 선택하고 모든 필드를 입력해주세요.");
      return;
    }

    await createHoliday.mutateAsync({
      title: newHoliday.title,
      date: newHoliday.date,
      type: newHoliday.type,
      projectId: selectedProjectId,
    });

    setNewHoliday({ title: "", date: "", type: "COMPANY_HOLIDAY" });
    setShowAddModal(false);
  };

  /**
   * 휴일 삭제 핸들러
   */
  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("이 휴무일을 삭제하시겠습니까?")) return;
    await deleteHoliday.mutateAsync(id);
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
                  className={`text-[10px] px-1.5 py-0.5 rounded truncate ${config.bgColor} text-white`}
                >
                  {holiday.title}
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
          <h1 className="text-2xl font-bold text-text dark:text-white">휴무 달력</h1>
          <p className="text-text-secondary mt-1">
            프로젝트 일정 계산에서 제외할 휴무일을 관리합니다
          </p>
        </div>
        <div className="flex gap-2">
          {/* 프로젝트 선택 */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
          >
            <option value="">프로젝트 선택</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            leftIcon="add"
            onClick={() => setShowAddModal(true)}
            disabled={!selectedProjectId}
          >
            휴무일 추가
          </Button>
        </div>
      </div>

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

        <div className="flex items-center gap-2">
          {(["all", "COMPANY_HOLIDAY", "TEAM_OFFSITE", "PERSONAL_LEAVE"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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

        {/* 휴무 목록 */}
        <div className="xl:col-span-1">
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
            <h3 className="font-bold text-text dark:text-white mb-4">
              {month + 1}월 휴무일 ({filteredHolidays.length})
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
                        className="flex items-center gap-3 p-3 rounded-lg bg-surface dark:bg-background-dark group"
                      >
                        <div className={`size-2 rounded-full ${config.bgColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text dark:text-white truncate">
                            {holiday.title}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {date.getMonth() + 1}/{date.getDate()} ({dayNames[date.getDay()]})
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-error/10 rounded transition-all"
                          title="삭제"
                        >
                          <Icon name="close" size="xs" className="text-error" />
                        </button>
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

      {/* 휴무일 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-text dark:text-white mb-4">
              휴무일 추가
            </h2>
            <form onSubmit={handleCreateHoliday} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  휴무일 이름 *
                </label>
                <Input
                  value={newHoliday.title}
                  onChange={(e) => setNewHoliday({ ...newHoliday, title: e.target.value })}
                  placeholder="예: 설날 연휴"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  날짜 *
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
                  유형
                </label>
                <select
                  value={newHoliday.type}
                  onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                >
                  <option value="COMPANY_HOLIDAY">회사 휴일</option>
                  <option value="TEAM_OFFSITE">팀 오프사이트</option>
                  <option value="PERSONAL_LEAVE">개인 휴가</option>
                </select>
              </div>
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
    </div>
  );
}
