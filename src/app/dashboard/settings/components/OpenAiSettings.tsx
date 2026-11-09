/**
 * @file src/app/dashboard/settings/components/OpenAiSettings.tsx
 * @description
 * 설정 > AI 어시스턴트의 OpenAI 제공자 선택 버튼과 키·모델 입력 패널입니다.
 *
 * 초보자 가이드:
 * - OpenAiProviderButton: 제공자 선택 줄에 들어가는 버튼
 * - OpenAiSettingsPanel: OpenAI 선택 시 보이는 API 키 · 모델 입력
 * - 모델은 자주 바뀌므로 자유 입력 + 추천 목록(datalist)으로 받습니다.
 */
"use client";

import { useState } from "react";
import { Icon, Input } from "@/components/ui";

/** 추천 OpenAI 모델 (자유 입력 가능) */
const OPENAI_MODELS = ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o", "gpt-5-mini", "gpt-5"];

interface ButtonProps {
  selected: boolean;
  hasKey: boolean;
  onSelect: () => void;
}

/** 제공자 선택 버튼 */
export function OpenAiProviderButton({ selected, hasKey, onSelect }: ButtonProps) {
  return (
    <button
      onClick={onSelect}
      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-500/10"
          : "border-border dark:border-border-dark hover:border-emerald-300"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">O</span>
        </div>
        <div className="text-left">
          <p className="font-medium text-text dark:text-white">OpenAI</p>
          <p className="text-xs text-text-secondary">OpenAI Platform</p>
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
  hasKey: boolean;
  newKey: string;
  onNewKeyChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
}

/** API 키 · 모델 입력 패널 */
export function OpenAiSettingsPanel({ hasKey, newKey, onNewKeyChange, model, onModelChange }: PanelProps) {
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="space-y-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
      <div>
        <label className="block text-sm font-medium text-text dark:text-white mb-2">OpenAI API 키</label>
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
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            OpenAI Platform
          </a>
          에서 API 키를 발급받으세요
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text dark:text-white mb-2">모델</label>
        <input
          list="openai-models"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
          placeholder="gpt-4.1-mini"
        />
        <datalist id="openai-models">
          {OPENAI_MODELS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <p className="text-xs text-text-secondary mt-1">목록에 없는 모델명도 직접 입력할 수 있습니다</p>
      </div>
    </div>
  );
}
