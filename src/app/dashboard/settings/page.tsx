/**
 * @file src/app/dashboard/settings/page.tsx
 * @description
 * WBS 기준 설정 페이지입니다.
 * 프로젝트 작업 관리 기준 및 AI 어시스턴트 설정을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **작업 기준**: 작업 단위, 기본 기간 등
 * 2. **표시 설정**: 날짜/시간 형식
 * 3. **알림 설정**: 알림 수신 방법
 * 4. **AI 설정**: LLM 제공자, API 키, 모델 선택
 *
 * 수정 방법:
 * - 설정 항목 추가: settings 객체에 필드 추가
 * - LLM 모델 추가: GEMINI_MODELS, MISTRAL_MODELS 배열에 추가
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon, Button, Input, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api, AiPersona } from "@/lib/api";

/**
 * AI 설정 타입
 */
interface AiSettings {
  provider: "gemini" | "mistral";
  geminiApiKey: string | null;
  geminiModel: string;
  mistralApiKey: string | null;
  mistralModel: string;
  hasGeminiKey: boolean;
  hasMistralKey: boolean;
  sqlSystemPrompt: string;
  analysisSystemPrompt: string;
}

/**
 * Gemini 모델 목록
 */
const GEMINI_MODELS = [
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (빠름)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (고품질)" },
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (실험)" },
];

/**
 * Mistral 모델 목록
 */
const MISTRAL_MODELS = [
  { value: "mistral-small-latest", label: "Mistral Small (빠름)" },
  { value: "mistral-medium-latest", label: "Mistral Medium (균형)" },
  { value: "mistral-large-latest", label: "Mistral Large (고품질)" },
];

/**
 * 기준 설정 페이지
 */
export default function SettingsPage() {
  const toast = useToast();

  // 일반 설정 상태
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

  // AI 설정 상태
  const [aiSettings, setAiSettings] = useState<AiSettings>({
    provider: "gemini",
    geminiApiKey: null,
    geminiModel: "gemini-1.5-flash",
    mistralApiKey: null,
    mistralModel: "mistral-small-latest",
    hasGeminiKey: false,
    hasMistralKey: false,
    sqlSystemPrompt: "",
    analysisSystemPrompt: "",
  });

  // 시스템 프롬프트 편집 상태
  const [showSystemPromptEditor, setShowSystemPromptEditor] = useState(false);

  // API 키 입력 상태 (새로 입력하는 경우)
  const [newGeminiKey, setNewGeminiKey] = useState("");
  const [newMistralKey, setNewMistralKey] = useState("");

  // 로딩 상태
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // API 키 표시 상태
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);

  // 페르소나 상태
  const [personas, setPersonas] = useState<AiPersona[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const [editingPersona, setEditingPersona] = useState<AiPersona | null>(null);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [personaForm, setPersonaForm] = useState({
    name: "",
    description: "",
    icon: "smart_toy",
    systemPrompt: "",
  });

  /**
   * AI 설정 불러오기
   */
  const loadAiSettings = useCallback(async () => {
    try {
      setIsLoadingAi(true);
      const res = await fetch("/api/ai-settings");
      if (res.ok) {
        const data = await res.json();
        setAiSettings(data);
      }
    } catch (error) {
      console.error("AI 설정 로드 실패:", error);
    } finally {
      setIsLoadingAi(false);
    }
  }, []);

  useEffect(() => {
    loadAiSettings();
  }, [loadAiSettings]);

  /**
   * 페르소나 목록 불러오기
   */
  const loadPersonas = useCallback(async () => {
    try {
      setIsLoadingPersonas(true);
      const data = await api.personas.list();
      setPersonas(data);
    } catch (error) {
      console.error("페르소나 로드 실패:", error);
    } finally {
      setIsLoadingPersonas(false);
    }
  }, []);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  /**
   * 페르소나 저장 (생성/수정)
   */
  const handleSavePersona = async () => {
    try {
      if (!personaForm.name || !personaForm.systemPrompt) {
        toast.error("이름과 시스템 프롬프트는 필수입니다.");
        return;
      }

      if (editingPersona) {
        // 수정
        await api.personas.update(editingPersona.id, personaForm);
        toast.success("페르소나가 수정되었습니다.");
      } else {
        // 생성
        await api.personas.create(personaForm);
        toast.success("페르소나가 생성되었습니다.");
      }

      setIsPersonaModalOpen(false);
      setEditingPersona(null);
      setPersonaForm({ name: "", description: "", icon: "smart_toy", systemPrompt: "" });
      loadPersonas();
    } catch (error) {
      console.error("페르소나 저장 실패:", error);
      toast.error("저장에 실패했습니다.");
    }
  };

  /**
   * 페르소나 삭제
   */
  const handleDeletePersona = async (id: string) => {
    if (!confirm("이 페르소나를 삭제하시겠습니까?")) return;

    try {
      await api.personas.delete(id);
      toast.success("페르소나가 삭제되었습니다.");
      loadPersonas();
    } catch (error) {
      console.error("페르소나 삭제 실패:", error);
      toast.error("삭제에 실패했습니다.");
    }
  };

  /**
   * 페르소나 편집 시작
   */
  const handleEditPersona = (persona: AiPersona) => {
    setEditingPersona(persona);
    setPersonaForm({
      name: persona.name,
      description: persona.description || "",
      icon: persona.icon || "smart_toy",
      systemPrompt: persona.systemPrompt,
    });
    setIsPersonaModalOpen(true);
  };

  /**
   * 새 페르소나 추가
   */
  const handleAddPersona = () => {
    setEditingPersona(null);
    setPersonaForm({ name: "", description: "", icon: "smart_toy", systemPrompt: "" });
    setIsPersonaModalOpen(true);
  };

  /**
   * 일반 설정 변경 핸들러
   */
  const handleChange = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * AI 설정 저장
   */
  const handleSaveAiSettings = async () => {
    try {
      setIsSavingAi(true);

      const payload: Record<string, unknown> = {
        provider: aiSettings.provider,
        geminiModel: aiSettings.geminiModel,
        mistralModel: aiSettings.mistralModel,
        sqlSystemPrompt: aiSettings.sqlSystemPrompt,
        analysisSystemPrompt: aiSettings.analysisSystemPrompt,
      };

      // 새로 입력된 API 키가 있으면 포함
      if (newGeminiKey) {
        payload.geminiApiKey = newGeminiKey;
      }
      if (newMistralKey) {
        payload.mistralApiKey = newMistralKey;
      }

      const res = await fetch("/api/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSettings(data);
        setNewGeminiKey("");
        setNewMistralKey("");
        toast.success("AI 설정이 저장되었습니다.");
      } else {
        const error = await res.json();
        toast.error(error.error || "저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("AI 설정 저장 실패:", error);
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingAi(false);
    }
  };

  /**
   * 연결 테스트
   */
  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);

      // 먼저 설정 저장
      await handleSaveAiSettings();

      // 간단한 테스트 메시지 전송
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "안녕하세요, 연결 테스트입니다." }),
      });

      if (res.ok) {
        toast.success("연결 테스트 성공! API가 정상 작동합니다.");
      } else {
        const error = await res.json();
        toast.error(error.error || "연결 테스트에 실패했습니다.");
      }
    } catch (error) {
      console.error("연결 테스트 실패:", error);
      toast.error("연결 테스트 중 오류가 발생했습니다.");
    } finally {
      setIsTestingConnection(false);
    }
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

      {/* AI 어시스턴트 설정 */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Icon name="smart_toy" size="sm" className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text dark:text-white">AI 어시스턴트</h2>
              <p className="text-sm text-text-secondary">LLM 제공자 및 API 키를 설정합니다</p>
            </div>
          </div>

          {isLoadingAi ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="progress_activity" size="lg" className="text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* LLM 제공자 선택 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-3">
                  LLM 제공자
                </label>
                <div className="flex gap-3">
                  {/* Gemini 버튼 */}
                  <button
                    onClick={() => setAiSettings((prev) => ({ ...prev, provider: "gemini" }))}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      aiSettings.provider === "gemini"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-border dark:border-border-dark hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">G</span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-text dark:text-white">Google Gemini</p>
                        <p className="text-xs text-text-secondary">Google AI Studio</p>
                      </div>
                    </div>
                    {aiSettings.hasGeminiKey && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-success">
                        <Icon name="check_circle" size="xs" />
                        <span>API 키 등록됨</span>
                      </div>
                    )}
                  </button>

                  {/* Mistral 버튼 */}
                  <button
                    onClick={() => setAiSettings((prev) => ({ ...prev, provider: "mistral" }))}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      aiSettings.provider === "mistral"
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-border dark:border-border-dark hover:border-orange-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">M</span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-text dark:text-white">Mistral AI</p>
                        <p className="text-xs text-text-secondary">Mistral Platform</p>
                      </div>
                    </div>
                    {aiSettings.hasMistralKey && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-success">
                        <Icon name="check_circle" size="xs" />
                        <span>API 키 등록됨</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Gemini 설정 */}
              {aiSettings.provider === "gemini" && (
                <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-2">
                      Gemini API 키
                    </label>
                    <div className="relative">
                      <Input
                        type={showGeminiKey ? "text" : "password"}
                        placeholder={aiSettings.hasGeminiKey ? "••••••••••••" : "API 키를 입력하세요"}
                        value={newGeminiKey}
                        onChange={(e) => setNewGeminiKey(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                      >
                        <Icon name={showGeminiKey ? "visibility_off" : "visibility"} size="sm" />
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Google AI Studio
                      </a>
                      에서 API 키를 발급받으세요
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-2">
                      모델 선택
                    </label>
                    <select
                      value={aiSettings.geminiModel}
                      onChange={(e) => setAiSettings((prev) => ({ ...prev, geminiModel: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                    >
                      {GEMINI_MODELS.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Mistral 설정 */}
              {aiSettings.provider === "mistral" && (
                <div className="space-y-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-2">
                      Mistral API 키
                    </label>
                    <div className="relative">
                      <Input
                        type={showMistralKey ? "text" : "password"}
                        placeholder={aiSettings.hasMistralKey ? "••••••••••••" : "API 키를 입력하세요"}
                        value={newMistralKey}
                        onChange={(e) => setNewMistralKey(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowMistralKey(!showMistralKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                      >
                        <Icon name={showMistralKey ? "visibility_off" : "visibility"} size="sm" />
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      <a
                        href="https://console.mistral.ai/api-keys/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-500 hover:underline"
                      >
                        Mistral Console
                      </a>
                      에서 API 키를 발급받으세요
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-2">
                      모델 선택
                    </label>
                    <select
                      value={aiSettings.mistralModel}
                      onChange={(e) => setAiSettings((prev) => ({ ...prev, mistralModel: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                    >
                      {MISTRAL_MODELS.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 시스템 프롬프트 설정 */}
              <div className="border-t border-border dark:border-border-dark pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-text dark:text-white">시스템 프롬프트</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      SQL 생성 및 결과 분석에 사용되는 AI 프롬프트를 커스터마이징합니다
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSystemPromptEditor(!showSystemPromptEditor)}
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                  >
                    <Icon name={showSystemPromptEditor ? "expand_less" : "expand_more"} size="sm" />
                    {showSystemPromptEditor ? "접기" : "편집"}
                  </button>
                </div>

                {showSystemPromptEditor && (
                  <div className="space-y-6 p-4 rounded-lg bg-surface/50 dark:bg-surface-dark/50">
                    {/* SQL 생성 시스템 프롬프트 */}
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-white mb-2">
                        SQL 생성 프롬프트
                      </label>
                      <textarea
                        value={aiSettings.sqlSystemPrompt}
                        onChange={(e) => setAiSettings((prev) => ({ ...prev, sqlSystemPrompt: e.target.value }))}
                        rows={10}
                        className="w-full px-4 py-3 rounded-lg bg-white dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs"
                        placeholder="SQL 생성에 사용할 시스템 프롬프트..."
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        사용자 질문을 SQL 쿼리로 변환할 때 사용됩니다
                      </p>
                    </div>

                    {/* 분석 시스템 프롬프트 */}
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-white mb-2">
                        결과 분석 프롬프트
                      </label>
                      <textarea
                        value={aiSettings.analysisSystemPrompt}
                        onChange={(e) => setAiSettings((prev) => ({ ...prev, analysisSystemPrompt: e.target.value }))}
                        rows={10}
                        className="w-full px-4 py-3 rounded-lg bg-white dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs"
                        placeholder="결과 분석에 사용할 시스템 프롬프트..."
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        SQL 실행 결과를 분석하고 응답을 생성할 때 사용됩니다
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Icon name="info" size="xs" />
                      <span>비워두면 기본 시스템 프롬프트가 사용됩니다</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI 설정 저장 버튼 */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || (!aiSettings.hasGeminiKey && !newGeminiKey && !aiSettings.hasMistralKey && !newMistralKey)}
                  leftIcon={isTestingConnection ? "progress_activity" : "network_check"}
                >
                  연결 테스트
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveAiSettings}
                  disabled={isSavingAi}
                  leftIcon={isSavingAi ? "progress_activity" : "save"}
                >
                  AI 설정 저장
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* AI 페르소나 관리 */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Icon name="face" size="sm" className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text dark:text-white">AI 페르소나</h2>
                <p className="text-sm text-text-secondary">AI 어시스턴트의 역할과 시스템 프롬프트를 관리합니다</p>
              </div>
            </div>
            <Button variant="primary" size="sm" leftIcon="add" onClick={handleAddPersona}>
              새 페르소나
            </Button>
          </div>

          {isLoadingPersonas ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="progress_activity" size="lg" className="text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personas.map((persona) => (
                <div
                  key={persona.id}
                  className="p-4 rounded-lg border border-border dark:border-border-dark bg-surface/50 dark:bg-surface-dark/50 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Icon name={persona.icon || "smart_toy"} size="sm" className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-text dark:text-white flex items-center gap-2">
                          {persona.name}
                          {persona.isDefault && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                              기본
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-text-secondary line-clamp-1">
                          {persona.description || "설명 없음"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditPersona(persona)}
                        className="p-1.5 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
                      >
                        <Icon name="edit" size="xs" className="text-text-secondary" />
                      </button>
                      {!persona.isDefault && (
                        <button
                          onClick={() => handleDeletePersona(persona.id)}
                          className="p-1.5 rounded-lg hover:bg-error/10 transition-colors"
                        >
                          <Icon name="delete" size="xs" className="text-error" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 p-2 rounded bg-background-dark/5 dark:bg-background-dark">
                    <p className="text-xs text-text-secondary font-mono line-clamp-2">
                      {persona.systemPrompt.substring(0, 100)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

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

      {/* 페르소나 편집 모달 */}
      {isPersonaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-border dark:border-border-dark">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-text dark:text-white">
                  {editingPersona ? "페르소나 수정" : "새 페르소나"}
                </h2>
                <button
                  onClick={() => setIsPersonaModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
                >
                  <Icon name="close" size="sm" className="text-text-secondary" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  페르소나 이름 <span className="text-error">*</span>
                </label>
                <Input
                  placeholder="예: PM 어시스턴트, 코드 리뷰어"
                  value={personaForm.name}
                  onChange={(e) => setPersonaForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  설명
                </label>
                <Input
                  placeholder="이 페르소나가 어떤 역할을 하는지 간단히 설명"
                  value={personaForm.description}
                  onChange={(e) => setPersonaForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* 아이콘 선택 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  아이콘
                </label>
                <div className="flex gap-2 flex-wrap">
                  {["smart_toy", "face", "account_tree", "description", "code", "bug_report", "analytics", "support_agent"].map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setPersonaForm((prev) => ({ ...prev, icon }))}
                      className={`size-10 rounded-lg flex items-center justify-center transition-all ${
                        personaForm.icon === icon
                          ? "bg-primary text-white"
                          : "bg-surface dark:bg-surface-dark text-text-secondary hover:bg-surface-hover"
                      }`}
                    >
                      <Icon name={icon} size="sm" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 시스템 프롬프트 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  시스템 프롬프트 <span className="text-error">*</span>
                </label>
                <textarea
                  placeholder="AI에게 전달할 역할과 지침을 입력하세요..."
                  value={personaForm.systemPrompt}
                  onChange={(e) => setPersonaForm((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                />
                <p className="text-xs text-text-secondary mt-2">
                  이 프롬프트는 모든 대화의 시작 부분에 AI에게 전달됩니다. 역할, 어조, 응답 형식 등을 지정하세요.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-border dark:border-border-dark flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsPersonaModalOpen(false)}>
                취소
              </Button>
              <Button variant="primary" onClick={handleSavePersona} leftIcon="save">
                {editingPersona ? "수정" : "생성"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
