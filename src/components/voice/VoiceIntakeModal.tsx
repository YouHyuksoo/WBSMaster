/**
 * @file src/components/voice/VoiceIntakeModal.tsx
 * @description
 * 음성 공통 파이프라인 모달입니다: 녹음 업로드 → OpenAI 전사(긴 녹음은 서버가 잘라서) → 고른 종류로 AI 정리 → 등록.
 *
 * 초보자 가이드:
 * - 종류(회의록 · 인터뷰 · 요구사항 · 참고자료)는 모달에서 고른다. 기본값은 모달을 연 화면의 종류(defaultKind).
 * - 회의록 · 인터뷰: 결과를 그 등록 창으로 넘긴다. 연 화면이 같은 종류면 onOpenDraft 로 바로, 아니면 그 화면으로 이동해 연다.
 * - 요구사항: 찾은 요구사항을 골라 바로 등록한다. 참고자료: 요약과 녹음 파일을 문서함 "참고자료" 로 바로 등록한다.
 * - 전사 방식(VoiceOptions): 고품질(gpt-4o-transcribe + 용어 힌트, 기본) · 화자 구분("[화자 A] ...", 힌트 미지원).
 *   용어 힌트는 종류별 기본 · 직접 입력 · 없음 중에서 고른다.
 * - 녹음은 200MB 까지. OpenAI 키 · 모델은 기준 설정 > 음성 설정을 쓰며 녹음 내용이 OpenAI 로 전송된다.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Icon, Modal } from "@/components/ui";
import { useVoiceIntakeJob } from "@/hooks/useVoiceIntake";
import { customerRequirementKeys } from "@/hooks/useCustomerRequirements";
import { documentKeys } from "@/hooks/useDocuments";
import { api, type VoiceIntakeStatus, type VoiceKind } from "@/lib/api";
import { VOICE_ACCEPT, VOICE_DEFAULT_HINTS, VOICE_KIND_INFO, validateVoiceFile, type VoiceMode } from "@/lib/voice-intake-rules";
import { VoiceOptions, type HintMode } from "./VoiceOptions";
import { VoiceDraftPreview } from "./VoiceDraftPreview";
import { VoiceProgress } from "./VoiceProgress";
import { referenceDescription, registerRequirements } from "./voice-register";
import { stashVoiceDraft, VOICE_TARGET_HREF } from "./voice-handoff";

export interface VoiceIntakeModalProps {
  isOpen: boolean;
  projectId: string | null;
  defaultKind: VoiceKind;
  onClose: () => void;
  /** 이 화면에서 바로 여는 등록 창 (예: 인터뷰 화면 → interview) */
  onOpenDraft?: Partial<Record<"meeting" | "interview", (status: VoiceIntakeStatus) => void>>;
}

const KINDS: VoiceKind[] = ["meeting", "interview", "requirement", "reference"];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 열려 있을 때만 본문을 그린다 (열 때마다 입력 초기화) */
export function VoiceIntakeModal(props: VoiceIntakeModalProps) {
  return props.isOpen ? <Body {...props} /> : null;
}

function Body({ projectId, defaultKind, onClose, onOpenDraft }: VoiceIntakeModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<VoiceKind>(defaultKind);
  const [date, setDate] = useState(todayIso);
  const [mode, setMode] = useState<VoiceMode>("quality");
  const [hintMode, setHintMode] = useState<HintMode>("default");
  const [customHint, setCustomHint] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [refName, setRefName] = useState("");
  const [refPersonal, setRefPersonal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState<{ message: string; href: string } | null>(null);
  const job = useVoiceIntakeJob(jobId);

  const status = job.data;
  const draft = status?.stage === "done" ? status.draft : null;
  const busy = upload !== null || (!!jobId && !job.error && status?.stage !== "done" && status?.stage !== "error");
  const failMessage = error || status?.error || (job.error instanceof Error ? job.error.message : "");

  const begin = async () => {
    if (!projectId || !file) return;
    setError("");
    setJobId(null);
    setRegistered(null);
    setUpload(0);
    try {
      const hint = hintMode === "default" ? VOICE_DEFAULT_HINTS[kind] : hintMode === "custom" ? customHint.trim() : "";
      const { jobId: id } = await api.voiceIntake.start({ projectId, kind, date, mode, hint }, file, setUpload);
      setJobId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "녹음 파일을 올리지 못했습니다.");
    } finally {
      setUpload(null);
    }
  };

  // 정리가 끝나면 요구사항은 모두 선택, 참고자료는 제목을 문서명으로
  const [seenDraft, setSeenDraft] = useState<unknown>(null);
  if (draft && draft !== seenDraft) {
    setSeenDraft(draft);
    if (draft.kind === "requirement") setSelected(new Set(draft.requirements.map((_, i) => i)));
    if (draft.kind === "reference") setRefName(draft.reference.title);
  }

  const openDraft = (target: "meeting" | "interview") => {
    if (!status) return;
    const handler = onOpenDraft?.[target];
    if (handler) return handler(status);
    stashVoiceDraft(status);
    onClose();
    router.push(VOICE_TARGET_HREF[target]);
  };

  const register = async () => {
    if (!status || !draft || !projectId) return;
    setRegistering(true);
    setError("");
    try {
      if (draft.kind === "requirement") {
        const picked = draft.requirements.filter((_, i) => selected.has(i));
        const n = await registerRequirements(projectId, picked, date, status.fileName);
        queryClient.invalidateQueries({ queryKey: customerRequirementKeys.all });
        setRegistered({ message: `요구사항 ${n}건을 등록했습니다.`, href: "/dashboard/customer-requirements" });
      } else if (draft.kind === "reference") {
        await api.voiceIntake.registerDocument(status.id, {
          name: refName.trim() || draft.reference.title,
          description: referenceDescription(draft.reference, status.transcript, status.fileName),
          isPersonal: refPersonal,
        });
        queryClient.invalidateQueries({ queryKey: documentKeys.all });
        setRegistered({ message: `문서함 ${refPersonal ? "개인" : "공용"} 문서함에 참고자료로 등록했습니다.`, href: "/dashboard/documents" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록하지 못했습니다.");
    } finally {
      setRegistering(false);
    }
  };

  const info = VOICE_KIND_INFO[kind];

  return (
    <Modal isOpen onClose={onClose} title="음성으로 등록" size="xl" closeOnOverlayClick={!busy && !registering}>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          녹음(mp3 · m4a · wav 등, 200MB 이하)을 OpenAI 로 전사하고 고른 종류로 정리합니다. 20분이 넘는 녹음은 서버가 20분씩 나눠 전사합니다.
          기준 설정 &gt; 음성 인식의 OpenAI 키를 쓰며 녹음 내용이 OpenAI 로 전송됩니다.
        </p>

        {/* 종류 */}
        <fieldset disabled={busy || !!draft}>
          <legend className="block text-sm font-medium text-text dark:text-white mb-1">무엇으로 정리할까요?</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {KINDS.map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
                  kind === k ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border dark:border-border-dark text-text-secondary hover:border-primary/50"
                }`}>
                <Icon name={VOICE_KIND_INFO[k].icon} size="xs" />
                {VOICE_KIND_INFO[k].label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-text-secondary">{info.hint}</p>
        </fieldset>

        <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-border dark:border-border-dark rounded-lg cursor-pointer hover:border-primary">
          <Icon name="mic" size="lg" className="text-primary" />
          <span className="text-sm text-text dark:text-white break-all text-center">
            {file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)` : "녹음 파일 선택"}
          </span>
          <input type="file" accept={VOICE_ACCEPT} className="hidden" aria-label="녹음 파일" disabled={busy || !!draft}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              const problem = f ? validateVoiceFile(f) : null;
              setError(problem ?? "");
              setFile(problem ? null : f);
              e.target.value = "";
            }} />
        </label>

        <VoiceOptions
          disabled={busy || !!draft}
          date={date} onDate={setDate}
          mode={mode} onMode={setMode}
          hintMode={hintMode}
          onHintMode={(v) => {
            // 직접 입력을 처음 고르면 지금 종류의 기본 힌트를 채워 두고 고쳐 쓰게 한다
            if (v === "custom" && !customHint.trim()) setCustomHint(VOICE_DEFAULT_HINTS[kind]);
            setHintMode(v);
          }}
          defaultHint={VOICE_DEFAULT_HINTS[kind]}
          customHint={customHint} onCustomHint={setCustomHint}
        />

        <VoiceProgress upload={upload} status={status} failed={!!failMessage} />
        {failMessage && <p role="alert" className="px-3 py-2 rounded-lg border border-error/20 bg-error/10 text-sm text-error whitespace-pre-wrap">{failMessage}</p>}

        {status?.transcript && (
          <section>
            <h3 className="text-sm font-semibold text-text dark:text-white mb-1">전사문</h3>
            <pre className="max-h-[28vh] overflow-y-auto whitespace-pre-wrap break-words p-3 rounded-lg bg-surface dark:bg-background-dark text-sm leading-relaxed text-text dark:text-white font-sans">
              {status.transcript}
            </pre>
          </section>
        )}

        {draft && (
          <VoiceDraftPreview draft={draft} selected={selected}
            onToggle={(i) => setSelected((prev) => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); return next; })} />
        )}

        {draft?.kind === "reference" && !registered && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <label className="block">
              <span className="block text-sm font-medium text-text dark:text-white mb-1">문서명</span>
              <input value={refName} onChange={(e) => setRefName(e.target.value)}
                className="w-full px-3 py-2 bg-background-white dark:bg-background-dark border border-border dark:border-border-dark rounded-lg text-sm text-text dark:text-white" />
            </label>
            <label className="flex items-center gap-2 text-sm text-text dark:text-white pb-2">
              <input type="checkbox" className="accent-primary" checked={refPersonal} onChange={(e) => setRefPersonal(e.target.checked)} />
              개인 문서함에
            </label>
          </div>
        )}

        {registered && (
          <p role="status" className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-success/20 bg-success/10 text-sm text-success">
            <span className="flex items-center gap-1.5"><Icon name="check_circle" size="xs" />{registered.message}</span>
            <button type="button" className="underline" onClick={() => { onClose(); router.push(registered.href); }}>보러 가기</button>
          </p>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-border dark:border-border-dark">
          <Button type="button" variant="outline" onClick={onClose} disabled={registering}>닫기</Button>
          {!draft && (
            <Button type="button" variant="primary" leftIcon="graphic_eq" onClick={begin} disabled={!projectId || !file || busy}>
              {busy ? "처리 중..." : "전사 시작"}
            </Button>
          )}
          {(draft?.kind === "meeting" || draft?.kind === "interview") && (
            <Button type="button" variant="primary" leftIcon="edit_note" onClick={() => openDraft(draft.kind as "meeting" | "interview")}>
              {VOICE_KIND_INFO[draft.kind].target}으로
            </Button>
          )}
          {(draft?.kind === "requirement" || draft?.kind === "reference") && !registered && (
            <Button type="button" variant="primary" leftIcon="save" onClick={register}
              disabled={registering || (draft.kind === "requirement" && selected.size === 0)}>
              {registering ? "등록 중..." : draft.kind === "requirement" ? `선택한 요구사항 ${selected.size}건 등록` : "문서함에 등록"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
