/**
 * @file src/app/dashboard/as-is-analysis/components/IssueTable.tsx
 * @description
 * 이슈/Pain Point 테이블 컴포넌트입니다.
 * 현행 업무의 문제점과 개선사항을 테이블 형태로 표시하며 CRUD 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **이슈 유형**: Pain Point/병목/Gap/기타
 * 2. **우선순위**: 상/중/하
 * 3. **이슈 내용**: 문제점 상세 설명
 * 4. **영향도**: 업무에 미치는 영향
 * 5. **개선 제안**: 해결 방안
 *
 * @example
 * <IssueTable unitAnalysis={unitAnalysis} />
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES, ISSUE_TYPES, PRIORITIES, ISSUE_TYPE_OPTIONS, PRIORITY_OPTIONS } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsIssue } from "../hooks/useAsIsAnalysis";
import type { AsIsUnitAnalysis, AsIsIssue, AsIsIssueType, Priority } from "../types";

interface IssueTableProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/** 폼 데이터 타입 */
interface FormData {
  issueType: string;
  title: string;
  description: string;
  impact: string;
  frequency: string;
  priority: string;
  suggestedFix: string;
  remarks: string;
}

/** 초기 폼 데이터 */
const initialFormData: FormData = {
  issueType: "PAIN_POINT",
  title: "",
  description: "",
  impact: "",
  frequency: "",
  priority: "MEDIUM",
  suggestedFix: "",
  remarks: "",
};

/**
 * 이슈/Pain Point 테이블 컴포넌트
 */
export function IssueTable({ unitAnalysis }: IssueTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AsIsIssue | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const issues = unitAnalysis.issues || [];

  // CRUD 훅 사용
  const { create, update, delete: remove, isCreating, isUpdating, isDeleting } = useAsIsIssue();

  // 이슈 유형 라벨 가져오기
  const getIssueTypeLabel = (type: string) => {
    const config = ISSUE_TYPES[type as AsIsIssueType];
    return config ? config.label : type;
  };

  // 우선순위 설정 가져오기
  const getPriorityConfig = (priority: string) => {
    const config = PRIORITIES[priority as Priority];
    return config || { label: priority, color: "text-text-secondary", bgColor: "bg-slate-100", icon: "remove", value: priority };
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
  const handleEdit = (item: AsIsIssue) => {
    setEditingItem(item);
    setFormData({
      issueType: item.issueType,
      title: item.title,
      description: item.description || "",
      impact: item.impact || "",
      frequency: item.frequency || "",
      priority: item.priority || "MEDIUM",
      suggestedFix: item.suggestedFix || "",
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
    if (!formData.title.trim()) {
      alert("이슈 제목은 필수 항목입니다.");
      return;
    }

    if (editingItem) {
      // 수정
      update(
        {
          id: editingItem.id,
          data: {
            issueType: formData.issueType,
            title: formData.title,
            description: formData.description || undefined,
            impact: formData.impact || undefined,
            frequency: formData.frequency || undefined,
            priority: formData.priority || undefined,
            suggestedFix: formData.suggestedFix || undefined,
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
          issueType: formData.issueType,
          title: formData.title,
          description: formData.description || undefined,
          impact: formData.impact || undefined,
          frequency: formData.frequency || undefined,
          priority: formData.priority || undefined,
          suggestedFix: formData.suggestedFix || undefined,
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
    <div className={`rounded-xl border ${SECTION_STYLES.issue.borderColor} ${SECTION_STYLES.issue.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-red-200 dark:border-red-800">
        <SectionHeader
          style={SECTION_STYLES.issue}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          rightElement={
            <div className="flex items-center gap-2">
              {/* 이슈 통계 */}
              {issues.length > 0 && (
                <div className="flex items-center gap-3 mr-2">
                  {PRIORITY_OPTIONS.map((option) => {
                    const count = issues.filter((i) => i.priority === option.value).length;
                    const config = PRIORITIES[option.value];
                    if (count === 0) return null;
                    return (
                      <div key={option.value} className="flex items-center gap-1">
                        <span className={`size-2 rounded-full ${config.bgColor}`} />
                        <span className="text-xs text-text-secondary">
                          {config.label}: {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button variant="outline" size="sm" leftIcon="add" onClick={handleAdd} disabled={isPending}>
                이슈 추가
              </Button>
            </div>
          }
        />
      </div>

      {/* 테이블 */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {issues.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="warning" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 이슈가 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;이슈 추가&apos; 버튼을 클릭하여 문제점을 기록하세요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-red-100/50 dark:bg-red-900/20 text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-4 py-3 text-left w-24">우선순위</th>
                  <th className="px-4 py-3 text-left w-24">유형</th>
                  <th className="px-4 py-3 text-left">이슈 내용</th>
                  <th className="px-4 py-3 text-left w-40">영향도</th>
                  <th className="px-4 py-3 text-left w-48">개선 제안</th>
                  <th className="px-4 py-3 text-center w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const priorityConfig = getPriorityConfig(issue.priority || "MEDIUM");
                  return (
                    <tr
                      key={issue.id}
                      className="border-t border-red-100 dark:border-red-900/50 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}
                        >
                          {issue.priority === "HIGH" && (
                            <Icon name="keyboard_double_arrow_up" size="xs" />
                          )}
                          {issue.priority === "MEDIUM" && (
                            <Icon name="remove" size="xs" />
                          )}
                          {issue.priority === "LOW" && (
                            <Icon name="keyboard_double_arrow_down" size="xs" />
                          )}
                          {priorityConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-text-secondary">
                          {getIssueTypeLabel(issue.issueType)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-text dark:text-white">
                            {issue.title}
                          </p>
                          {issue.description && (
                            <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                              {issue.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {issue.impact || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {issue.suggestedFix || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {deleteConfirmId === issue.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDelete(issue.id)}
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
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(issue)}
                              disabled={isPending}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            >
                              <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(issue.id)}
                              disabled={isPending}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            >
                              <Icon name="delete" size="xs" className="text-text-secondary hover:text-error" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                  {editingItem ? "이슈 수정" : "이슈 추가"}
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
                      이슈 유형
                    </label>
                    <select
                      value={formData.issueType}
                      onChange={(e) => handleInputChange("issueType", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {ISSUE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      우선순위
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange("priority", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    이슈 제목 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="이슈 제목을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    상세 설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="문제점을 상세히 설명하세요"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      영향도
                    </label>
                    <Input
                      value={formData.impact}
                      onChange={(e) => handleInputChange("impact", e.target.value)}
                      placeholder="업무에 미치는 영향"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      발생 빈도
                    </label>
                    <Input
                      value={formData.frequency}
                      onChange={(e) => handleInputChange("frequency", e.target.value)}
                      placeholder="예: 매일, 주 1회"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    개선 제안
                  </label>
                  <textarea
                    value={formData.suggestedFix}
                    onChange={(e) => handleInputChange("suggestedFix", e.target.value)}
                    placeholder="해결 방안을 제안하세요"
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
