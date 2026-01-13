/**
 * @file src/app/dashboard/weekly-report/components/ReportListView.tsx
 * @description
 * 주간보고 목록 뷰 컴포넌트입니다.
 * 모든 멤버의 주간보고를 테이블 형태로 표시합니다.
 *
 * 초보자 가이드:
 * 1. **멤버 필터**: "내꺼만" / "전체 멤버" 토글 (기본값: 내꺼만)
 * 2. **연도/주차 필터**: 연도, 주차별 필터링 가능
 * 3. **테이블**: 작성자, 주차, 상태, 항목 수 등 표시
 * 4. **클릭**: 행 클릭 시 상세 화면으로 이동
 * 5. **새 보고서 작성**: 버튼 클릭 시 상세 화면으로 이동 (새 작성 모드)
 */

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Icon, Button } from "@/components/ui";
import { useWeeklyReports, useCurrentUser, useMembers } from "@/hooks";
import { useProject } from "@/contexts";
import { ReportWithRelations, WeekInfo } from "../types";
import { REPORT_STATUS_MAP, formatShortDate, getProjectWeekInfo, getProjectTotalWeeks } from "../constants";

interface ReportListViewProps {
  /** 보고서 선택 시 콜백 (상세 화면으로 전환) */
  onSelectReport: (report: ReportWithRelations) => void;
  /** 새 보고서 작성 시 콜백 */
  onCreateNew: (weekInfo: WeekInfo) => void;
}

/**
 * 주간보고 목록 뷰 컴포넌트
 * 모든 멤버의 주간보고를 테이블로 표시
 */
export function ReportListView({ onSelectReport, onCreateNew }: ReportListViewProps) {
  const { selectedProject, selectedProjectId } = useProject();
  const { data: currentUser } = useCurrentUser();

  // 프로젝트 시작일 기반 현재 주차 정보
  const currentProjectWeek = useMemo(() => {
    if (selectedProject?.startDate) {
      return getProjectWeekInfo(new Date(), new Date(selectedProject.startDate));
    }
    return null;
  }, [selectedProject?.startDate]);

  // 필터 상태 - 프로젝트 주차 기반으로 기본값 설정
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [weekFilter, setWeekFilter] = useState<number | "all">("all"); // 초기값은 all, useEffect에서 금주로 설정
  const [memberFilter, setMemberFilter] = useState<"mine" | "all">("mine"); // 기본값: 내꺼만 보기

  // 프로젝트 선택 시 금주로 필터 초기화
  useEffect(() => {
    if (currentProjectWeek) {
      setWeekFilter(currentProjectWeek.week);
    }
  }, [selectedProjectId, currentProjectWeek?.week]);

  // 주간보고 필터 객체 메모이제이션 (불필요한 쿼리 재실행 방지)
  const reportFilters = useMemo(
    () => ({
      projectId: selectedProjectId || undefined,
      userId: memberFilter === "mine" ? currentUser?.id : undefined,
      year: String(yearFilter),
      weekNumber: weekFilter === "all" ? undefined : String(weekFilter),
    }),
    [selectedProjectId, memberFilter, currentUser?.id, yearFilter, weekFilter]
  );

  // 주간보고 조회 (memberFilter에 따라 userId 필터 적용)
  const { data: reports, isLoading } = useWeeklyReports(reportFilters);

  // 멤버 필터 객체 메모이제이션 (불필요한 쿼리 재실행 방지)
  const memberFilters = useMemo(
    () => (selectedProjectId ? { projectId: selectedProjectId } : undefined),
    [selectedProjectId]
  );

  // 전체 멤버 조회 (금주 통계용)
  const { data: members = [] } = useMembers(memberFilters);

  // 금주 주간보고 필터 객체 메모이제이션 (불필요한 쿼리 재실행 방지)
  const currentWeekFilters = useMemo(
    () => ({
      projectId: selectedProjectId || undefined,
      year: currentProjectWeek ? String(currentProjectWeek.year) : undefined,
      weekNumber: currentProjectWeek ? String(currentProjectWeek.week) : undefined,
    }),
    [selectedProjectId, currentProjectWeek?.year, currentProjectWeek?.week]
  );

  // 금주 주간보고 조회 (통계용 - 전체 멤버, 프로젝트 주차 기준)
  const { data: currentWeekReports = [] } = useWeeklyReports(currentWeekFilters);

  // 금주 통계 계산
  const weeklyStats = useMemo(() => {
    const totalMembers = members.length;
    const submittedCount = currentWeekReports.filter((r) => r.status === "SUBMITTED").length;
    const draftCount = currentWeekReports.filter((r) => r.status === "DRAFT").length;
    const notSubmittedCount = Math.max(0, totalMembers - submittedCount - draftCount);

    return {
      totalMembers,
      submittedCount,
      draftCount,
      notSubmittedCount,
    };
  }, [members.length, currentWeekReports]);

  // 연도 옵션 생성 (현재 연도 ± 2년)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // 주차 옵션 생성 (프로젝트 기준: 1주차 ~ 현재주차+4)
  const weekOptions = useMemo(() => {
    if (!selectedProject?.startDate) {
      // 프로젝트가 없으면 기본 1~53주
      return Array.from({ length: 53 }, (_, i) => i + 1);
    }
    const totalWeeks = getProjectTotalWeeks(
      new Date(selectedProject.startDate),
      selectedProject.endDate ? new Date(selectedProject.endDate) : undefined
    );
    // 현재 주차 + 4주 여유 (미래 주차 작성 가능)
    const maxWeek = Math.max(totalWeeks + 4, currentProjectWeek?.week || 1);
    return Array.from({ length: maxWeek }, (_, i) => i + 1);
  }, [selectedProject?.startDate, selectedProject?.endDate, currentProjectWeek?.week]);

  /** 새 보고서 작성 핸들러 */
  const handleCreateNew = () => {
    if (currentProjectWeek) {
      onCreateNew(currentProjectWeek);
    }
  };

  /** 항목 수 계산 */
  const getItemCounts = (report: ReportWithRelations) => {
    const items = report.items || [];
    const previousCount = items.filter((item) => item.type === "PREVIOUS_RESULT").length;
    const nextCount = items.filter((item) => item.type === "NEXT_PLAN").length;
    return { previousCount, nextCount };
  };

  return (
    <div className="space-y-6">
      {/* 헤더: 타이틀 + 프로젝트 배지 + 필터 + 버튼 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* 좌측: 타이틀 */}
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Icon name="summarize" className="text-[#00f3ff]" />
          <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
            WEEKLY REPORT
          </span>
          <span className="text-slate-400 text-sm font-normal ml-1">
            / 주간 업무보고
          </span>
        </h1>

        {/* 우측: 프로젝트 배지 + 필터 + 버튼 */}
        <div className="flex items-center gap-3">
          {/* 프로젝트 표시 */}
          {selectedProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Icon name="folder" size="sm" className="text-primary" />
              <span className="text-sm font-medium text-primary">
                {selectedProject.name}
              </span>
            </div>
          )}
          {/* 멤버 필터 (내꺼만/전체) */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setMemberFilter("mine")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                memberFilter === "mine"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-muted"
              }`}
            >
              내꺼만
            </button>
            <button
              onClick={() => setMemberFilter("all")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                memberFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-muted"
              }`}
            >
              전체 멤버
            </button>
          </div>

          {/* 연도 필터 */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>

          {/* 주차 필터 */}
          <select
            value={weekFilter}
            onChange={(e) =>
              setWeekFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">전체 주차</option>
            {weekOptions.map((week) => (
              <option key={week} value={week}>
                {week}주차
              </option>
            ))}
          </select>

          {/* 새 보고서 작성 버튼 */}
          <Button onClick={handleCreateNew} disabled={!currentProjectWeek}>
            <Icon name="add" size="sm" className="mr-1" />
            주간보고 작성
          </Button>
        </div>
      </div>

      {/* 금주 통계 카드 */}
      {currentProjectWeek && (
        <div className="flex items-center gap-2 mb-2">
          <Icon name="calendar_today" size="sm" className="text-primary" />
          <span className="text-sm font-medium text-foreground">
            {currentProjectWeek.week}주차 현황
          </span>
          <span className="text-xs text-muted-foreground">
            ({formatShortDate(currentProjectWeek.weekStart)} ~ {formatShortDate(currentProjectWeek.weekEnd)})
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 전체 멤버 */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Icon name="groups" className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">전체 멤버</p>
              <p className="text-2xl font-bold text-foreground">{weeklyStats.totalMembers}</p>
            </div>
          </div>
        </div>

        {/* 제출 완료 */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Icon name="check_circle" className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">제출 완료</p>
              <p className="text-2xl font-bold text-emerald-500">{weeklyStats.submittedCount}</p>
            </div>
          </div>
        </div>

        {/* 작성 중 */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Icon name="edit_note" className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">작성 중</p>
              <p className="text-2xl font-bold text-amber-500">{weeklyStats.draftCount}</p>
            </div>
          </div>
        </div>

        {/* 미제출 */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Icon name="warning" className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">미제출</p>
              <p className="text-2xl font-bold text-red-500">{weeklyStats.notSubmittedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="sync" className="animate-spin text-muted-foreground mr-2" />
            <span className="text-muted-foreground">로딩 중...</span>
          </div>
        ) : reports && reports.length > 0 ? (
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  작성자
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  주차
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  기간
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  전주실적
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  차주계획
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  상태
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  작성일
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((report) => {
                const { previousCount, nextCount } = getItemCounts(report as ReportWithRelations);
                const statusInfo = REPORT_STATUS_MAP[report.status] || REPORT_STATUS_MAP.DRAFT;
                return (
                  <tr
                    key={report.id}
                    onClick={() => onSelectReport(report as ReportWithRelations)}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    {/* 작성자 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(report as ReportWithRelations).user?.avatar ? (
                          <img
                            src={(report as ReportWithRelations).user!.avatar!}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                            <Icon name="person" size="xs" className="text-primary" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {(report as ReportWithRelations).user?.name || "이름 없음"}
                        </span>
                      </div>
                    </td>
                    {/* 주차 */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">
                        {report.year}년 {report.weekNumber}주차
                      </span>
                    </td>
                    {/* 기간 */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {formatShortDate(report.weekStart)} ~ {formatShortDate(report.weekEnd)}
                      </span>
                    </td>
                    {/* 전주실적 수 */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium">
                        {previousCount}
                      </span>
                    </td>
                    {/* 차주계획 수 */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium">
                        {nextCount}
                      </span>
                    </td>
                    {/* 상태 */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    {/* 작성일 */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-muted-foreground">
                        {formatShortDate(report.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Icon name="description" size="xl" className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">등록된 주간보고가 없습니다.</p>
            <Button onClick={handleCreateNew} disabled={!currentProjectWeek}>
              <Icon name="add" size="sm" className="mr-1" />
              주간보고 작성
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
