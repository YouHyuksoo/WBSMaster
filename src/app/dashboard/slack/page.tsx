/**
 * @file src/app/dashboard/slack/page.tsx
 * @description
 * Slack 연동 설정 페이지입니다.
 * 웹훅 URL, 채널명, 알림 조건 등을 설정할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **웹훅 URL**: Slack에서 생성한 Incoming Webhook URL
 * 2. **알림 조건**: 어떤 이벤트에 알림을 보낼지 선택
 * 3. **테스트**: 설정된 웹훅으로 테스트 메시지 전송
 */

"use client";

import { useState, useEffect } from "react";
import { Icon, Button } from "@/components/ui";
import { useToast } from "@/contexts/ToastContext";

/** Slack 설정 타입 */
interface SlackSettings {
  id: string | null;
  webhookUrl: string;
  channelName: string;
  isEnabled: boolean;
  notifyTaskCompleted: boolean;
  notifyTaskCreated: boolean;
  notifyTaskDelayed: boolean;
  notifyIssueCreated: boolean;
  notifyIssueResolved: boolean;
  notifyProjectProgress: boolean;
  mentionOnUrgent: boolean;
  dailyReportTime: string | null;
}

export default function SlackSettingsPage() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [settings, setSettings] = useState<SlackSettings>({
    id: null,
    webhookUrl: "",
    channelName: "",
    isEnabled: true,
    notifyTaskCompleted: true,
    notifyTaskCreated: false,
    notifyTaskDelayed: true,
    notifyIssueCreated: true,
    notifyIssueResolved: false,
    notifyProjectProgress: false,
    mentionOnUrgent: false,
    dailyReportTime: null,
  });

  // 설정 불러오기
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/slack-settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Slack 설정 조회 실패:", error);
      toast.error("설정을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 설정 저장
  const handleSave = async () => {
    if (!settings.webhookUrl) {
      toast.error("웹훅 URL을 입력해주세요.");
      return;
    }

    if (!settings.webhookUrl.startsWith("https://hooks.slack.com/")) {
      toast.error("유효하지 않은 Slack 웹훅 URL입니다.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/slack-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        toast.success("Slack 설정이 저장되었습니다.");
      } else {
        const error = await response.json();
        toast.error(error.error || "저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Slack 설정 저장 실패:", error);
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 테스트 메시지 전송
  const handleTest = async () => {
    if (!settings.webhookUrl) {
      toast.error("웹훅 URL을 먼저 입력해주세요.");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("/api/slack-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: settings.webhookUrl }),
      });

      if (response.ok) {
        toast.success("테스트 메시지가 전송되었습니다. Slack을 확인해주세요!");
      } else {
        const error = await response.json();
        toast.error(error.error || "테스트 전송에 실패했습니다.");
      }
    } catch (error) {
      console.error("Slack 테스트 실패:", error);
      toast.error("테스트 중 오류가 발생했습니다.");
    } finally {
      setIsTesting(false);
    }
  };

  // 토글 핸들러
  const handleToggle = (field: keyof SlackSettings) => {
    setSettings((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin">
          <Icon name="sync" size="xl" className="text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background-white dark:bg-background-dark">
      {/* 헤더 */}
      <div className="p-6 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
            <Icon name="tag" size="md" className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text dark:text-white">Slack 연동 설정</h1>
            <p className="text-sm text-text-secondary">프로젝트 알림을 Slack으로 받아보세요</p>
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* 연동 활성화 */}
          <div className="bg-surface dark:bg-surface-dark rounded-xl p-6 border border-border dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name="power_settings_new" size="md" className={settings.isEnabled ? "text-success" : "text-text-secondary"} />
                <div>
                  <h3 className="font-semibold text-text dark:text-white">Slack 알림</h3>
                  <p className="text-sm text-text-secondary">알림 기능을 켜거나 끕니다</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle("isEnabled")}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.isEnabled ? "bg-success" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.isEnabled ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 웹훅 설정 */}
          <div className="bg-surface dark:bg-surface-dark rounded-xl p-6 border border-border dark:border-border-dark space-y-4">
            <h3 className="font-semibold text-text dark:text-white flex items-center gap-2">
              <Icon name="link" size="sm" className="text-primary" />
              웹훅 설정
            </h3>

            {/* 웹훅 URL */}
            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-2">
                웹훅 URL <span className="text-error">*</span>
              </label>
              <input
                type="url"
                value={settings.webhookUrl}
                onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-2.5 rounded-lg bg-background-white dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-text-secondary">
                Slack App에서 Incoming Webhooks를 활성화하고 URL을 복사해주세요
              </p>
            </div>

            {/* 채널명 */}
            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-2">
                채널명 (선택)
              </label>
              <input
                type="text"
                value={settings.channelName}
                onChange={(e) => setSettings({ ...settings, channelName: e.target.value })}
                placeholder="#project-alerts"
                className="w-full px-4 py-2.5 rounded-lg bg-background-white dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <p className="mt-1.5 text-xs text-text-secondary">
                알림을 받을 채널 이름 (표시용, 실제 채널은 웹훅에서 결정됩니다)
              </p>
            </div>

            {/* 테스트 버튼 */}
            <Button
              variant="outline"
              size="sm"
              leftIcon="send"
              onClick={handleTest}
              disabled={isTesting || !settings.webhookUrl}
            >
              {isTesting ? "전송 중..." : "테스트 메시지 전송"}
            </Button>
          </div>

          {/* 알림 조건 */}
          <div className="bg-surface dark:bg-surface-dark rounded-xl p-6 border border-border dark:border-border-dark space-y-4">
            <h3 className="font-semibold text-text dark:text-white flex items-center gap-2">
              <Icon name="notifications" size="sm" className="text-primary" />
              알림 조건
            </h3>
            <p className="text-sm text-text-secondary">어떤 이벤트가 발생했을 때 알림을 받을지 선택하세요</p>

            <div className="space-y-3">
              {/* Task 완료 */}
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-background-white dark:hover:bg-background-dark cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Icon name="check_circle" size="sm" className="text-success" />
                  <div>
                    <p className="text-sm font-medium text-text dark:text-white">Task 완료</p>
                    <p className="text-xs text-text-secondary">Task가 완료 상태로 변경될 때</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyTaskCompleted}
                  onChange={() => handleToggle("notifyTaskCompleted")}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </label>

              {/* Task 생성 */}
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-background-white dark:hover:bg-background-dark cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Icon name="add_task" size="sm" className="text-info" />
                  <div>
                    <p className="text-sm font-medium text-text dark:text-white">Task 생성</p>
                    <p className="text-xs text-text-secondary">새로운 Task가 생성될 때</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyTaskCreated}
                  onChange={() => handleToggle("notifyTaskCreated")}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </label>

              {/* Task 지연 */}
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-background-white dark:hover:bg-background-dark cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Icon name="schedule" size="sm" className="text-warning" />
                  <div>
                    <p className="text-sm font-medium text-text dark:text-white">Task 지연</p>
                    <p className="text-xs text-text-secondary">Task 마감일이 초과될 때</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyTaskDelayed}
                  onChange={() => handleToggle("notifyTaskDelayed")}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </label>

              {/* 이슈 등록 */}
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-background-white dark:hover:bg-background-dark cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Icon name="bug_report" size="sm" className="text-error" />
                  <div>
                    <p className="text-sm font-medium text-text dark:text-white">이슈 등록</p>
                    <p className="text-xs text-text-secondary">새로운 이슈가 등록될 때</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyIssueCreated}
                  onChange={() => handleToggle("notifyIssueCreated")}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </label>

              {/* 이슈 해결 */}
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-background-white dark:hover:bg-background-dark cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Icon name="verified" size="sm" className="text-success" />
                  <div>
                    <p className="text-sm font-medium text-text dark:text-white">이슈 해결</p>
                    <p className="text-xs text-text-secondary">이슈가 해결될 때</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyIssueResolved}
                  onChange={() => handleToggle("notifyIssueResolved")}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </label>

              {/* 프로젝트 진행률 */}
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-background-white dark:hover:bg-background-dark cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Icon name="trending_up" size="sm" className="text-primary" />
                  <div>
                    <p className="text-sm font-medium text-text dark:text-white">프로젝트 진행률 변경</p>
                    <p className="text-xs text-text-secondary">프로젝트 진행률이 변경될 때</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyProjectProgress}
                  onChange={() => handleToggle("notifyProjectProgress")}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* 추가 옵션 */}
          <div className="bg-surface dark:bg-surface-dark rounded-xl p-6 border border-border dark:border-border-dark space-y-4">
            <h3 className="font-semibold text-text dark:text-white flex items-center gap-2">
              <Icon name="tune" size="sm" className="text-primary" />
              추가 옵션
            </h3>

            {/* 긴급 시 멘션 */}
            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-background-white dark:hover:bg-background-dark cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <Icon name="campaign" size="sm" className="text-error" />
                <div>
                  <p className="text-sm font-medium text-text dark:text-white">긴급 시 @channel 멘션</p>
                  <p className="text-xs text-text-secondary">긴급/높은 우선순위 이슈 시 채널 전체에 알림</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.mentionOnUrgent}
                onChange={() => handleToggle("mentionOnUrgent")}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </label>

            {/* 일일 리포트 */}
            <div className="p-3">
              <div className="flex items-center gap-3 mb-3">
                <Icon name="summarize" size="sm" className="text-info" />
                <div>
                  <p className="text-sm font-medium text-text dark:text-white">일일 리포트</p>
                  <p className="text-xs text-text-secondary">매일 지정된 시간에 프로젝트 현황 요약 전송</p>
                </div>
              </div>
              <input
                type="time"
                value={settings.dailyReportTime || ""}
                onChange={(e) => setSettings({ ...settings, dailyReportTime: e.target.value || null })}
                className="px-3 py-2 rounded-lg bg-background-white dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <p className="mt-1.5 text-xs text-text-secondary">
                비워두면 일일 리포트가 비활성화됩니다
              </p>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="primary"
              size="md"
              leftIcon="save"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "저장 중..." : "설정 저장"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
