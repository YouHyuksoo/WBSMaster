/**
 * @file src/app/dashboard/progress-risk/components/RiskIssueTab/RiskIssueCreateModal.tsx
 * @description 리스크 이슈 신규 등록 모달
 *
 * 초보자 가이드:
 * 1. **필수**: 카테고리 + 대분류 + 제목 (없으면 등록 버튼 비활성)
 * 2. **체크박스**: 일정리스크/에스컬레이션 (기본 일정리스크 ON)
 * 3. **성공 시**: form reset + toast + onClose
 */
import { useEffect, useState, type ReactNode } from "react";
import { Button, Icon, Input, useToast } from "@/components/ui";
import Modal from "@/components/ui/Modal";
import { useCreateProgressRiskIssue } from "@/hooks";
import type { StageCategory } from "@/lib/api";
import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER } from "@/lib/stage-categories";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  stageCategory: StageCategory;
  majorCategories: string[];
  defaultMajorCategory: string;
  onStageCategoryChange: (value: StageCategory) => void;
}

type Draft = {
  stageCategory: StageCategory;
  majorCategory: string;
  title: string;
  targetDate: string;
  assignee: string;
  decisionMaker: string;
  submittedDate: string;
  isScheduleRisk: boolean;
  needsEscalation: boolean;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text " +
  "dark:border-border-dark dark:bg-surface-dark dark:text-white " +
  "focus:outline-none focus:ring-2 focus:ring-primary/50";

export function RiskIssueCreateModal({
  isOpen, onClose, projectId, stageCategory, majorCategories, defaultMajorCategory, onStageCategoryChange,
}: Props) {
  const toast = useToast();
  const create = useCreateProgressRiskIssue();
  const [draft, setDraft] = useState<Draft>(() => ({
    stageCategory, majorCategory: defaultMajorCategory,
    title: "", targetDate: "", assignee: "", decisionMaker: "",
    submittedDate: todayISO(), isScheduleRisk: true, needsEscalation: false,
  }));

  useEffect(() => {
    if (isOpen) {
      setDraft((c) => ({ ...c, stageCategory, majorCategory: defaultMajorCategory, submittedDate: todayISO() }));
    }
  }, [isOpen, stageCategory, defaultMajorCategory]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const canSubmit = !!draft.majorCategory && !!draft.title.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await create.mutateAsync({
        projectId,
        stageCategory: draft.stageCategory,
        majorCategory: draft.majorCategory,
        title: draft.title.trim(),
        targetDate: draft.targetDate || undefined,
        assignee: draft.assignee || undefined,
        decisionMaker: draft.decisionMaker || undefined,
        submittedDate: draft.submittedDate || undefined,
        isScheduleRisk: draft.isScheduleRisk,
        needsEscalation: draft.needsEscalation,
      });
      toast.success("리스크 이슈가 등록되었습니다.");
      setDraft((c) => ({ ...c, title: "", targetDate: "", assignee: "", decisionMaker: "" }));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "리스크 이슈 등록 실패");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="리스크 이슈 등록" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="카테고리" required>
            <select
              value={draft.stageCategory}
              onChange={(e) => {
                const next = e.target.value as StageCategory;
                onStageCategoryChange(next);
                setDraft((c) => ({ ...c, stageCategory: next, majorCategory: "" }));
              }}
              className={SELECT_CLASS} aria-label="카테고리"
            >
              {STAGE_CATEGORY_ORDER.map((c) => <option key={c} value={c}>{STAGE_CATEGORY_LABEL[c]}</option>)}
            </select>
          </Field>
          <Field label="대분류" required>
            <select
              value={draft.majorCategory}
              onChange={(e) => set("majorCategory", e.target.value)}
              className={SELECT_CLASS} aria-label="대분류"
            >
              {majorCategories.length === 0 ? <option value="">대분류 없음</option> : (
                <>
                  <option value="">선택하세요</option>
                  {majorCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </>
              )}
            </select>
          </Field>
        </div>

        <Field label="이슈 제목" required>
          <Input value={draft.title} onChange={(e) => set("title", e.target.value)}
            placeholder="해결해야 할 이슈를 입력하세요" autoFocus />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="지정담당자">
            <Input value={draft.assignee} onChange={(e) => set("assignee", e.target.value)} placeholder="담당자" leftIcon="person" />
          </Field>
          <Field label="상위 결정권자">
            <Input value={draft.decisionMaker} onChange={(e) => set("decisionMaker", e.target.value)} placeholder="결정권자" leftIcon="gavel" />
          </Field>
          <Field label="해결 목표일">
            <Input type="date" value={draft.targetDate} onChange={(e) => set("targetDate", e.target.value)} aria-label="해결 목표일" />
          </Field>
          <Field label="제출일자">
            <Input type="date" value={draft.submittedDate} onChange={(e) => set("submittedDate", e.target.value)} aria-label="이슈 제출일자" />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface px-3 py-2 dark:border-border-dark dark:bg-background-dark">
          <CheckboxLabel checked={draft.isScheduleRisk} onChange={(v) => set("isScheduleRisk", v)} icon="schedule" iconColor="text-error" label="일정지연 리스크 대상" />
          <CheckboxLabel checked={draft.needsEscalation} onChange={(v) => set("needsEscalation", v)} icon="arrow_circle_up" iconColor="text-warning" label="에스컬레이션 필요" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button variant="primary" leftIcon="add" onClick={handleSubmit} disabled={!canSubmit} isLoading={create.isPending}>
            이슈 등록
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-xs font-semibold text-text-secondary">
        {label}{required && <span className="ml-1 text-error">*</span>}
      </span>
      {children}
    </label>
  );
}

function CheckboxLabel({ checked, onChange, icon, iconColor, label }: {
  checked: boolean; onChange: (v: boolean) => void; icon: string; iconColor: string; label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-text dark:text-white">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-primary" />
      <Icon name={icon} size="xs" className={iconColor} />
      {label}
    </label>
  );
}
