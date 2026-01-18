/**
 * @file src/app/dashboard/as-is-analysis/components/InterviewCards.tsx
 * @description
 * 현업 인터뷰 결과 카드형 컴포넌트입니다.
 * 인터뷰 내용을 카드 형태로 표시하며 CRUD 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **인터뷰 대상자**: 이름, 부서, 직책
 * 2. **인터뷰 내용**: 주제 및 내용
 * 3. **주요 발견사항**: 핵심 인사이트
 * 4. **개선 제안**: 도출된 개선점
 *
 * @example
 * <InterviewCards unitAnalysis={unitAnalysis} />
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsInterview } from "../hooks/useAsIsAnalysis";
import type { AsIsUnitAnalysis, AsIsInterview } from "../types";

interface InterviewCardsProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/** 폼 데이터 타입 */
interface FormData {
  interviewee: string;
  department: string;
  position: string;
  interviewDate: string;
  topic: string;
  content: string;
  keyFindings: string;
  suggestions: string;
  remarks: string;
}

/** 초기 폼 데이터 */
const initialFormData: FormData = {
  interviewee: "",
  department: "",
  position: "",
  interviewDate: "",
  topic: "",
  content: "",
  keyFindings: "",
  suggestions: "",
  remarks: "",
};

/**
 * 현업 인터뷰 결과 카드형 컴포넌트
 */
export function InterviewCards({ unitAnalysis }: InterviewCardsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AsIsInterview | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const interviews = unitAnalysis.interviews || [];

  // CRUD 훅 사용
  const { create, update, delete: remove, isCreating, isUpdating, isDeleting } = useAsIsInterview();

  // 날짜 포맷팅 (표시용)
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // 날짜 포맷팅 (input용 YYYY-MM-DD)
  const formatDateForInput = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  /**
   * 모달 열기 (추가)
   */
  const handleAdd = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  /**
   * 모달 열기 (수정)
   */
  const handleEdit = (item: AsIsInterview) => {
    setEditingItem(item);
    setFormData({
      interviewee: item.interviewee,
      department: item.department || "",
      position: item.position || "",
      interviewDate: formatDateForInput(item.interviewDate),
      topic: item.topic || "",
      content: item.content,
      keyFindings: item.keyFindings || "",
      suggestions: item.suggestions || "",
      remarks: item.remarks || "",
    });
    setShowModal(true);
  };

  /**
   * 모달 닫기
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(initialFormData);
  };

  /**
   * 폼 입력 핸들러
   */
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * 저장 (생성/수정)
   */
  const handleSave = () => {
    if (!formData.interviewee.trim() || !formData.content.trim()) {
      alert("인터뷰 대상자와 내용은 필수 항목입니다.");
      return;
    }

    if (editingItem) {
      // 수정
      update(
        {
          id: editingItem.id,
          data: {
            interviewee: formData.interviewee,
            department: formData.department || undefined,
            position: formData.position || undefined,
            interviewDate: formData.interviewDate || undefined,
            topic: formData.topic || undefined,
            content: formData.content,
            keyFindings: formData.keyFindings || undefined,
            suggestions: formData.suggestions || undefined,
            remarks: formData.remarks || undefined,
          },
        },
        {
          onSuccess: () => handleCloseModal(),
        }
      );
    } else {
      // 생성
      create(
        {
          unitAnalysisId: unitAnalysis.id,
          interviewee: formData.interviewee,
          department: formData.department || undefined,
          position: formData.position || undefined,
          interviewDate: formData.interviewDate || undefined,
          topic: formData.topic || undefined,
          content: formData.content,
          keyFindings: formData.keyFindings || undefined,
          suggestions: formData.suggestions || undefined,
          remarks: formData.remarks || undefined,
        },
        {
          onSuccess: () => handleCloseModal(),
        }
      );
    }
  };

  /**
   * 삭제 확인
   */
  const handleDelete = (id: string) => {
    remove(id, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  };

  const isPending = isCreating || isUpdating || isDeleting;

  return (
    <div className={`rounded-xl border ${SECTION_STYLES.interview.borderColor} ${SECTION_STYLES.interview.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-orange-200 dark:border-orange-800">
        <SectionHeader
          style={SECTION_STYLES.interview}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          rightElement={
            <Button variant="outline" size="sm" leftIcon="add" onClick={handleAdd} disabled={isPending}>
              인터뷰 추가
            </Button>
          }
        />
      </div>

      {/* 카드 목록 */}
      {!isCollapsed && (
        <div className="p-4">
          {interviews.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="mic" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 인터뷰가 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;인터뷰 추가&apos; 버튼을 클릭하여 인터뷰 결과를 기록하세요
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="bg-white dark:bg-slate-900 rounded-lg border border-orange-200 dark:border-orange-800 overflow-hidden"
                >
                  {/* 카드 헤더 */}
                  <div className="p-4 border-b border-orange-100 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                          <Icon name="person" size="sm" className="text-orange-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-text dark:text-white">
                            {interview.interviewee}
                          </h4>
                          <p className="text-xs text-text-secondary">
                            {interview.department}
                            {interview.position && ` / ${interview.position}`}
                          </p>
                        </div>
                      </div>
                      {deleteConfirmId === interview.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(interview.id)}
                            disabled={isDeleting}
                            className="p-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            <Icon name="check" size="xs" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1 rounded bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          >
                            <Icon name="close" size="xs" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(interview)}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50"
                          >
                            <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(interview.id)}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          >
                            <Icon name="delete" size="xs" className="text-text-secondary hover:text-error" />
                          </button>
                        </div>
                      )}
                    </div>
                    {interview.interviewDate && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-text-secondary">
                        <Icon name="calendar_today" size="xs" />
                        <span>{formatDate(interview.interviewDate)}</span>
                      </div>
                    )}
                  </div>

                  {/* 카드 본문 */}
                  <div className="p-4 space-y-3">
                    {interview.topic && (
                      <div>
                        <span className="text-xs font-semibold text-orange-600 uppercase">
                          주제
                        </span>
                        <p className="text-sm text-text dark:text-white mt-0.5">
                          {interview.topic}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-semibold text-text-secondary uppercase">
                        내용
                      </span>
                      <p className="text-sm text-text dark:text-white mt-0.5 line-clamp-3">
                        {interview.content}
                      </p>
                    </div>
                    {interview.keyFindings && (
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start gap-1.5">
                          <Icon name="lightbulb" size="xs" className="text-amber-600 mt-0.5" />
                          <div>
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                              주요 발견사항
                            </span>
                            <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                              {interview.keyFindings}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {interview.suggestions && (
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-1.5">
                          <Icon name="tips_and_updates" size="xs" className="text-blue-600 mt-0.5" />
                          <div>
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                              개선 제안
                            </span>
                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">
                              {interview.suggestions}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
                <h3 className="text-lg font-bold text-text dark:text-white">
                  {editingItem ? "인터뷰 수정" : "인터뷰 추가"}
                </h3>
                <button onClick={handleCloseModal} className="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark">
                  <Icon name="close" size="sm" className="text-text-secondary" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      인터뷰 대상자 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.interviewee}
                      onChange={(e) => handleInputChange("interviewee", e.target.value)}
                      placeholder="예: 홍길동"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      인터뷰 일자
                    </label>
                    <Input
                      type="date"
                      value={formData.interviewDate}
                      onChange={(e) => handleInputChange("interviewDate", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      부서
                    </label>
                    <Input
                      value={formData.department}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      placeholder="예: 생산관리팀"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      직책
                    </label>
                    <Input
                      value={formData.position}
                      onChange={(e) => handleInputChange("position", e.target.value)}
                      placeholder="예: 팀장"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    주제
                  </label>
                  <Input
                    value={formData.topic}
                    onChange={(e) => handleInputChange("topic", e.target.value)}
                    placeholder="인터뷰 주제"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleInputChange("content", e.target.value)}
                    placeholder="인터뷰 내용을 입력하세요"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    주요 발견사항
                  </label>
                  <textarea
                    value={formData.keyFindings}
                    onChange={(e) => handleInputChange("keyFindings", e.target.value)}
                    placeholder="핵심 인사이트"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    개선 제안
                  </label>
                  <textarea
                    value={formData.suggestions}
                    onChange={(e) => handleInputChange("suggestions", e.target.value)}
                    placeholder="도출된 개선점"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    비고
                  </label>
                  <Input
                    value={formData.remarks}
                    onChange={(e) => handleInputChange("remarks", e.target.value)}
                    placeholder="추가 메모"
                  />
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border dark:border-border-dark">
                <Button variant="outline" onClick={handleCloseModal} disabled={isPending}>
                  취소
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isCreating || isUpdating}
                  disabled={isPending}
                >
                  {editingItem ? "수정" : "추가"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
