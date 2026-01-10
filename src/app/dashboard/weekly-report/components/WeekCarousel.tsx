/**
 * @file src/app/dashboard/weekly-report/components/WeekCarousel.tsx
 * @description
 * 주간 선택 캐로셀 컴포넌트입니다.
 * 프로젝트 시작일 기반으로 5개의 주차를 카드 형태로 표시합니다.
 * 스타일은 globals.css의 .week-carousel 클래스를 사용합니다.
 *
 * 초보자 가이드:
 * 1. **현재 주차 기반 렌더링**: currentWeekInfo를 기반으로 전후 주차 계산
 * 2. **캐로셀 이동**: prev/next 버튼으로 주차 리스트 스크롤
 * 3. **주차 선택**: 개별 주차 카드 클릭으로 선택
 * 4. **프로젝트 시작일 필수**: projectStartDate가 없으면 렌더링 안 됨
 */

"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/ui";
import {
  getProjectWeekDateRange,
  formatShortDate,
} from "../constants";

/** 주차별 제출 상태 */
interface WeekSubmitStatus {
  weekNumber: number;
  status: "DRAFT" | "SUBMITTED" | null; // null = 보고서 없음
}

interface WeekCarouselProps {
  /** 현재 선택된 주차 정보 */
  currentWeekInfo: {
    year: number;
    week: number;
    weekStart: Date;
    weekEnd: Date;
  };
  /** 프로젝트 시작일 (필수) */
  projectStartDate?: Date;
  /** 주차별 제출 상태 목록 */
  weekSubmitStatuses?: WeekSubmitStatus[];
  /** 주차 변경 콜백 */
  onWeekChange: (weekInfo: {
    year: number;
    week: number;
    weekStart: Date;
    weekEnd: Date;
  }) => void;
  /** 이번 주로 이동 콜백 */
  onGoToCurrentWeek: () => void;
}

/**
 * 주간 선택 캐로셀 컴포넌트
 * 5개의 주차를 카드 형태로 표시하고, 좌우 화살표로 스크롤합니다.
 */
export function WeekCarousel({
  currentWeekInfo,
  projectStartDate,
  weekSubmitStatuses = [],
  onWeekChange,
  onGoToCurrentWeek,
}: WeekCarouselProps) {
  // 캐로셀 스크롤 위치
  const [carouselOffset, setCarouselOffset] = useState(0);

  if (!projectStartDate) {
    return null;
  }

  /** 주차별 제출 상태 조회 */
  const getWeekStatus = (weekNum: number) => {
    const found = weekSubmitStatuses.find((s) => s.weekNumber === weekNum);
    return found?.status || null;
  };

  /**
   * 캐로셀에 표시할 5개 주차 계산
   */
  const carouselWeeks = useMemo(() => {
    const weeks = [];
    for (let i = -2; i <= 2; i++) {
      const weekNum = currentWeekInfo.week + carouselOffset + i;
      if (weekNum < 1) continue;

      const { start, end } = getProjectWeekDateRange(projectStartDate, weekNum);

      weeks.push({
        week: weekNum,
        year: currentWeekInfo.year,
        start,
        end,
        isSelected: weekNum === currentWeekInfo.week && carouselOffset === 0,
      });
    }
    return weeks;
  }, [currentWeekInfo, projectStartDate, carouselOffset]);

  /** 주차 선택 핸들러 */
  const handleSelectWeek = (week: (typeof carouselWeeks)[0]) => {
    const { start, end } = getProjectWeekDateRange(projectStartDate, week.week);
    onWeekChange({
      year: week.year,
      week: week.week,
      weekStart: start,
      weekEnd: end,
    });
    setCarouselOffset(0);
  };

  /** 캐로셀 이전 버튼 핸들러 */
  const handlePrevCarousel = () => {
    setCarouselOffset((prev) => Math.max(prev - 1, -currentWeekInfo.week + 1));
  };

  /** 캐로셀 다음 버튼 핸들러 */
  const handleNextCarousel = () => {
    setCarouselOffset((prev) => prev + 1);
  };

  /** 오늘 버튼 핸들러 - carouselOffset 초기화 후 이동 */
  const handleGoToToday = () => {
    setCarouselOffset(0);
    onGoToCurrentWeek();
  };

  return (
    <div className="week-carousel">
      {/* 헤더: 현재 주차 정보 + 오늘 버튼 */}
      <div className="week-carousel__header">
        <div>
          <div className="week-carousel__title">
            {currentWeekInfo.year}년 {currentWeekInfo.week}주차
          </div>
          <div className="week-carousel__date">
            {formatShortDate(currentWeekInfo.weekStart)} ~ {formatShortDate(currentWeekInfo.weekEnd)}
          </div>
        </div>
        <button
          onClick={handleGoToToday}
          className="week-carousel__today-btn"
        >
          <Icon name="today" size="sm" />
          오늘
        </button>
      </div>

      {/* 캐로셀: 이전 버튼 + 카드 리스트 + 다음 버튼 */}
      <div className="week-carousel__wrapper">
        {/* 이전 버튼 */}
        <button
          onClick={handlePrevCarousel}
          disabled={currentWeekInfo.week + carouselOffset <= 1}
          className="week-carousel__nav-btn"
        >
          <Icon name="chevron_left" size="sm" />
        </button>

        {/* 주차 카드 리스트 */}
        <div className="week-carousel__list">
          {carouselWeeks.map((week) => {
            const status = getWeekStatus(week.week);
            return (
              <button
                key={`${week.year}-w${week.week}`}
                onClick={() => handleSelectWeek(week)}
                className={`week-carousel__card ${
                  week.isSelected ? "week-carousel__card--selected" : ""
                }`}
              >
                <div className="week-carousel__card-header">
                  <span className="week-carousel__card-week">{week.week}주</span>
                  {/* 제출 상태 표시 */}
                  {status === "SUBMITTED" && (
                    <Icon name="check_circle" size="xs" className="text-emerald-500" />
                  )}
                  {status === "DRAFT" && (
                    <Icon name="edit_note" size="xs" className="text-amber-500" />
                  )}
                </div>
                <span className="week-carousel__card-date">
                  {formatShortDate(week.start)}
                </span>
              </button>
            );
          })}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={handleNextCarousel}
          className="week-carousel__nav-btn"
        >
          <Icon name="chevron_right" size="sm" />
        </button>
      </div>
    </div>
  );
}
