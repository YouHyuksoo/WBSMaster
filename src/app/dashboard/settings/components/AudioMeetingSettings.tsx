/**
 * @file src/app/dashboard/settings/components/AudioMeetingSettings.tsx
 * @description
 * 기준 설정 > 음성 회의록 설정 카드입니다 (전사 모델 · 회의록 정리 모델 · OpenAI API 키).
 *
 * 초보자 가이드:
 * - 회의록관리 > "음성으로 작성" 이 이 설정을 쓴다 (src/app/api/meeting-minutes/audio/route.ts).
 * - 음성은 OpenAI 만 쓴다 (2026-11-09 Gemini 제거): 전사 /v1/audio/transcriptions(25MB 이하) + 정리 OpenAI 채팅 모델.
 * - AI 어시스턴트 채팅의 음성 입력 · 답변 읽기도 여기 OpenAI 키를 쓴다 (src/lib/openai-voice.ts).
 * - 저장된 키는 다시 보여 주지 않고 끝 4자리만 보여 준다. 새 키를 넣었을 때만 바꾼다.
 * - "연결 테스트" 는 OpenAI 모델 목록 조회(과금 없음)로 키 · 모델 사용 가능 여부를 확인한다.
 * - API: GET/PATCH /api/ai-settings/audio, POST /api/ai-settings/audio/test
 */

"use client";

import { useEffect, useState } from "react";
import { Icon, Button, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { AUDIO_MODEL_SUGGESTIONS } from "@/lib/meeting-minutes-audio-models";

interface AudioSettings {
  audioTranscribeModel: string;
  audioSummaryModel: string;
  hasOpenaiKey: boolean;
  openaiKeyHint: string | null;
}

const inputClass =
  "w-full px-3 py-2.5 rounded-lg bg-white dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm";

export function AudioMeetingSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState<AudioSettings | null>(null);
  const [newKey, setNewKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/api/ai-settings/audio")
      .then(async (r) => (r.ok ? setSettings(await r.json()) : setLoadError("음성 회의록 설정을 불러오지 못했습니다.")))
      .catch(() => setLoadError("음성 회의록 설정을 불러오지 못했습니다."));
  }, []);

  if (loadError) return <Card><p className="p-6 text-sm text-error">{loadError}</p></Card>;
  if (!settings) {
    return (
      <Card>
        <div className="flex items-center justify-center py-10">
          <Icon name="progress_activity" size="lg" className="text-primary animate-spin" />
        </div>
      </Card>
    );
  }

  const set = <K extends keyof AudioSettings>(k: K, v: AudioSettings[K]) => setSettings((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai-settings/audio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioTranscribeModel: settings.audioTranscribeModel,
          audioSummaryModel: settings.audioSummaryModel,
          ...(newKey.trim() ? { openaiApiKey: newKey.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장하지 못했습니다.");
      setSettings(data);
      setNewKey("");
      toast.success("음성 회의록 설정을 저장했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const removeKey = async () => {
    const res = await fetch("/api/ai-settings/audio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openaiApiKey: null }),
    });
    if (res.ok) {
      setSettings(await res.json());
      toast.success("OpenAI API 키를 삭제했습니다.");
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai-settings/audio/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: newKey.trim() || undefined,
          transcribeModel: settings.audioTranscribeModel,
          summaryModel: settings.audioSummaryModel,
        }),
      });
      setTestResult(await res.json());
    } catch {
      setTestResult({ ok: false, message: "연결 테스트를 하지 못했습니다." });
    } finally {
      setTesting(false);
    }
  };

  const suggestions = AUDIO_MODEL_SUGGESTIONS;

  return (
    <Card>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
            <Icon name="graphic_eq" size="sm" className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text dark:text-white">음성 회의록</h2>
            <p className="text-sm text-text-secondary">회의록 음성 작성 · AI 어시스턴트 음성 입력/읽기에 쓸 OpenAI 모델과 키를 설정합니다</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-text dark:text-white mb-2">음성 인식(전사) 모델</span>
            <input list="audio-transcribe-models" value={settings.audioTranscribeModel} onChange={(e) => set("audioTranscribeModel", e.target.value)} className={inputClass} />
            <datalist id="audio-transcribe-models">{suggestions.transcribe.map((m) => <option key={m} value={m} />)}</datalist>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-text dark:text-white mb-2">회의록 정리 모델</span>
            <input list="audio-summary-models" value={settings.audioSummaryModel} onChange={(e) => set("audioSummaryModel", e.target.value)} className={inputClass} />
            <datalist id="audio-summary-models">{suggestions.summary.map((m) => <option key={m} value={m} />)}</datalist>
          </label>
        </div>
        <div className="space-y-2">
          <span className="block text-sm font-medium text-text dark:text-white">OpenAI API 키</span>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="password"
              autoComplete="off"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={settings.hasOpenaiKey ? `등록됨 ${settings.openaiKeyHint} — 바꾸려면 새 키 입력` : "sk-... (platform.openai.com 에서 발급)"}
              className={inputClass}
              aria-label="OpenAI API 키"
            />
            <Button variant="outline" className="shrink-0 whitespace-nowrap" leftIcon={testing ? "progress_activity" : "wifi_tethering"} onClick={test} disabled={testing || (!newKey.trim() && !settings.hasOpenaiKey)}>
              연결 테스트
            </Button>
            {settings.hasOpenaiKey && (
              <Button variant="ghost" className="shrink-0 whitespace-nowrap" leftIcon="delete" onClick={removeKey}>
                키 삭제
              </Button>
            )}
          </div>
          <p className="text-xs text-text-secondary">
            AI 어시스턴트의 OpenAI 키와 같은 칸에 저장됩니다. 파일은 25MB 이하만 전사할 수 있습니다.
          </p>
          {testResult && (
            <p className={`text-sm ${testResult.ok ? "text-green-600 dark:text-green-400" : "text-error"}`}>{testResult.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="primary" onClick={save} disabled={saving} leftIcon={saving ? "progress_activity" : "save"}>
            음성 회의록 설정 저장
          </Button>
        </div>
      </div>
    </Card>
  );
}
