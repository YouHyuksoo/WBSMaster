/**
 * @file src/app/dashboard/settings/components/ApiKeyProviderSettings.tsx
 * @description
 * 설정 > AI 어시스턴트에서 OpenAI · OpenRouter 처럼 "API 키 + 자유 입력 모델" 형태인
 * 제공자의 선택 버튼과 입력 패널입니다.
 *
 * 초보자 가이드:
 * - API_KEY_PROVIDERS: 제공자별 이름 · 색 · 키 발급 주소 · 추천 모델
 * - ProviderButton: 제공자 선택 줄의 버튼
 * - ApiKeyModelPanel: 선택 시 보이는 API 키 · 모델 입력 (모델은 datalist 추천 + 자유 입력)
 */
"use client";

import { useState } from "react";
import { Icon, Input } from "@/components/ui";

export type ApiKeyProviderId = "openai" | "openrouter";

interface ProviderMeta {
  name: string;
  subtitle: string;
  letter: string;
  /** 선택/hover 테두리 · 배경 · 로고 · 패널 · 링크 색 */
  selected: string;
  hover: string;
  logo: string;
  panel: string;
  link: string;
  keyUrl: string;
  keyUrlLabel: string;
  placeholder: string;
  models: string[];
  modelHint: string;
}

export const API_KEY_PROVIDERS: Record<ApiKeyProviderId, ProviderMeta> = {
  openai: {
    name: "OpenAI",
    subtitle: "OpenAI Platform",
    letter: "O",
    selected: "border-emerald-500 bg-emerald-500/10",
    hover: "hover:border-emerald-300",
    logo: "from-emerald-400 to-teal-600",
    panel: "bg-emerald-50 dark:bg-emerald-950/30",
    link: "text-emerald-600 dark:text-emerald-400",
    keyUrl: "https://platform.openai.com/api-keys",
    keyUrlLabel: "OpenAI Platform",
    placeholder: "gpt-4.1-mini",
    models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o", "gpt-5-mini", "gpt-5"],
    modelHint: "목록에 없는 모델명도 직접 입력할 수 있습니다",
  },
  openrouter: {
    name: "OpenRouter",
    subtitle: "여러 회사 모델 통합",
    letter: "R",
    selected: "border-violet-500 bg-violet-500/10",
    hover: "hover:border-violet-300",
    logo: "from-violet-400 to-indigo-600",
    panel: "bg-violet-50 dark:bg-violet-950/30",
    link: "text-violet-600 dark:text-violet-400",
    keyUrl: "https://openrouter.ai/settings/keys",
    keyUrlLabel: "OpenRouter",
    placeholder: "openai/gpt-4.1-mini",
    models: [
      "openrouter/free",
      "openai/gpt-4.1-mini",
      "openai/gpt-4o-mini",
      "anthropic/claude-sonnet-4",
      "google/gemini-2.5-flash",
      "mistralai/mistral-small",
      "deepseek/deepseek-chat",
    ],
    modelHint:
      "모델명은 \"회사/모델\" 형식입니다. 무료: \"회사/모델:free\" 또는 무료 모델 자동 선택 \"openrouter/free\" (openrouter.ai/models 에서 확인)",
  },
};

interface ButtonProps {
  id: ApiKeyProviderId;
  selected: boolean;
  hasKey: boolean;
  onSelect: () => void;
}

/** 제공자 선택 버튼 */
export function ProviderButton({ id, selected, hasKey, onSelect }: ButtonProps) {
  const m = API_KEY_PROVIDERS[id];
  return (
    <button
      onClick={onSelect}
      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
        selected ? m.selected : `border-border dark:border-border-dark ${m.hover}`
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-lg bg-gradient-to-br ${m.logo} flex items-center justify-center`}>
          <span className="text-white font-bold text-lg">{m.letter}</span>
        </div>
        <div className="text-left">
          <p className="font-medium text-text dark:text-white">{m.name}</p>
          <p className="text-xs text-text-secondary">{m.subtitle}</p>
        </div>
      </div>
      {hasKey && (
        <div className="mt-2 flex items-center gap-1 text-xs text-success">
          <Icon name="check_circle" size="xs" />
          <span>API 키 등록됨</span>
        </div>
      )}
    </button>
  );
}

interface PanelProps {
  id: ApiKeyProviderId;
  hasKey: boolean;
  newKey: string;
  onNewKeyChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
}

/** API 키 · 모델 입력 패널 */
export function ApiKeyModelPanel({ id, hasKey, newKey, onNewKeyChange, model, onModelChange }: PanelProps) {
  const m = API_KEY_PROVIDERS[id];
  const [showKey, setShowKey] = useState(false);
  const listId = `${id}-models`;
  return (
    <div className={`space-y-4 p-4 rounded-lg ${m.panel}`}>
      <div>
        <label className="block text-sm font-medium text-text dark:text-white mb-2">{m.name} API 키</label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            placeholder={hasKey ? "••••••••••••" : "API 키를 입력하세요"}
            value={newKey}
            onChange={(e) => onNewKeyChange(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
          >
            <Icon name={showKey ? "visibility_off" : "visibility"} size="sm" />
          </button>
        </div>
        <p className="text-xs text-text-secondary mt-1">
          <a href={m.keyUrl} target="_blank" rel="noopener noreferrer" className={`${m.link} hover:underline`}>
            {m.keyUrlLabel}
          </a>
          에서 API 키를 발급받으세요
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text dark:text-white mb-2">모델</label>
        <input
          list={listId}
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
          placeholder={m.placeholder}
        />
        <datalist id={listId}>
          {m.models.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="text-xs text-text-secondary mt-1">{m.modelHint}</p>
      </div>
    </div>
  );
}
