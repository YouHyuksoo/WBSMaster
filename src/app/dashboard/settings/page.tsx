/**
 * @file src/app/dashboard/settings/page.tsx
 * @description
 * WBS 기준 설정 페이지입니다.
 * 프로젝트 작업 관리 기준을 설정합니다.
 *
 * 초보자 가이드:
 * 1. **작업 기준**: 작업 단위, 기본 기간 등
 * 2. **상태 정의**: 작업 상태 커스터마이징
 * 3. **우선순위**: 우선순위 레벨 정의
 *
 * 수정 방법:
 * - 설정 항목 추가: settings 객체에 필드 추가
 * - 옵션 추가: select 옵션에 추가
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input, Card } from "@/components/ui";

/**
 * 기준 설정 페이지
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // 작업 기준
    defaultTaskDuration: 1,
    workingHoursPerDay: 8,
    workingDays: ["월", "화", "수", "목", "금"],
    // 표시 설정
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    language: "ko",
    // 알림 설정
    emailNotifications: true,
    slackNotifications: false,
    dueDateReminder: 1,
  });

  const handleChange = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-text dark:text-white">기준 설정</h1>
        <p className="text-text-secondary mt-1">
          프로젝트 작업 관리 기준을 설정합니다
        </p>
      </div>

      {/* 작업 기준 */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="tune" size="sm" className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text dark:text-white">작업 기준</h2>
              <p className="text-sm text-text-secondary">작업 생성 시 기본 값을 설정합니다</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* 기본 작업 기간 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  기본 작업 기간 (일)
                </label>
                <Input
                  type="number"
                  value={settings.defaultTaskDuration}
                  onChange={(e) => handleChange("defaultTaskDuration", Number(e.target.value))}
                  min={1}
                />
                <p className="text-xs text-text-secondary mt-1">새 작업 생성 시 기본 기간</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  일일 근무 시간
                </label>
                <Input
                  type="number"
                  value={settings.workingHoursPerDay}
                  onChange={(e) => handleChange("workingHoursPerDay", Number(e.target.value))}
                  min={1}
                  max={24}
                />
                <p className="text-xs text-text-secondary mt-1">작업량 계산에 사용됩니다</p>
              </div>
            </div>

            {/* 근무일 */}
            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-2">
                근무일
              </label>
              <div className="flex gap-2">
                {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
                  <button
                    key={day}
                    onClick={() => {
                      const days = settings.workingDays.includes(day)
                        ? settings.workingDays.filter((d) => d !== day)
                        : [...settings.workingDays, day];
                      handleChange("workingDays", days);
                    }}
                    className={`size-10 rounded-lg font-medium text-sm transition-colors ${
                      settings.workingDays.includes(day)
                        ? "bg-primary text-white"
                        : "bg-surface dark:bg-surface-dark text-text-secondary hover:bg-surface-hover dark:hover:bg-background-dark"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-secondary mt-1">일정 계산에서 비근무일은 제외됩니다</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 표시 설정 */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Icon name="palette" size="sm" className="text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text dark:text-white">표시 설정</h2>
              <p className="text-sm text-text-secondary">날짜 및 시간 표시 형식을 설정합니다</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-2">
                날짜 형식
              </label>
              <select
                value={settings.dateFormat}
                onChange={(e) => handleChange("dateFormat", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
              >
                <option value="YYYY-MM-DD">2024-01-15</option>
                <option value="DD/MM/YYYY">15/01/2024</option>
                <option value="MM/DD/YYYY">01/15/2024</option>
                <option value="YYYY년 MM월 DD일">2024년 01월 15일</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-2">
                시간 형식
              </label>
              <select
                value={settings.timeFormat}
                onChange={(e) => handleChange("timeFormat", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
              >
                <option value="24h">24시간 (14:30)</option>
                <option value="12h">12시간 (2:30 PM)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-2">
                언어
              </label>
              <select
                value={settings.language}
                onChange={(e) => handleChange("language", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* 알림 설정 */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Icon name="notifications" size="sm" className="text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text dark:text-white">알림 설정</h2>
              <p className="text-sm text-text-secondary">알림 수신 방법을 설정합니다</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 이메일 알림 */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-surface dark:bg-background-dark">
              <div className="flex items-center gap-3">
                <Icon name="mail" size="sm" className="text-text-secondary" />
                <div>
                  <p className="font-medium text-text dark:text-white">이메일 알림</p>
                  <p className="text-sm text-text-secondary">작업 할당, 마감일 등의 알림</p>
                </div>
              </div>
              <button
                onClick={() => handleChange("emailNotifications", !settings.emailNotifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.emailNotifications ? "bg-primary" : "bg-border dark:bg-border-dark"
                }`}
              >
                <div
                  className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${
                    settings.emailNotifications ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Slack 알림 */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-surface dark:bg-background-dark">
              <div className="flex items-center gap-3">
                <Icon name="tag" size="sm" className="text-text-secondary" />
                <div>
                  <p className="font-medium text-text dark:text-white">Slack 알림</p>
                  <p className="text-sm text-text-secondary">Slack 채널로 알림 전송</p>
                </div>
              </div>
              <button
                onClick={() => handleChange("slackNotifications", !settings.slackNotifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.slackNotifications ? "bg-primary" : "bg-border dark:bg-border-dark"
                }`}
              >
                <div
                  className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${
                    settings.slackNotifications ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 마감일 알림 */}
            <div className="p-4 rounded-lg bg-surface dark:bg-background-dark">
              <div className="flex items-center gap-3 mb-3">
                <Icon name="event" size="sm" className="text-text-secondary" />
                <div>
                  <p className="font-medium text-text dark:text-white">마감일 알림</p>
                  <p className="text-sm text-text-secondary">마감일 전 미리 알림</p>
                </div>
              </div>
              <select
                value={settings.dueDateReminder}
                onChange={(e) => handleChange("dueDateReminder", Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
              >
                <option value={0}>알림 안함</option>
                <option value={1}>1일 전</option>
                <option value={2}>2일 전</option>
                <option value={3}>3일 전</option>
                <option value={7}>1주일 전</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost">취소</Button>
        <Button variant="primary" leftIcon="save">
          설정 저장
        </Button>
      </div>
    </div>
  );
}
