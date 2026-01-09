/**
 * @file src/components/dashboard/ProjectOverviewModal.tsx
 * @description
 * 프로젝트 개요를 보여주는 모달 컴포넌트입니다.
 * 프로젝트 목적, 조직도, 성공지표, 미래 비전 등을 표시하고 편집할 수 있습니다.
 *
 * 주요 기능:
 * - 프로젝트 개요 정보 표시 (뷰 모드)
 * - 프로젝트 개요 편집 (편집 모드)
 * - 조직도 시각화
 * - 미래 비전 이미지 표시
 *
 * @example
 * <ProjectOverviewModal
 *   project={project}
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSave={handleSave}
 * />
 */

"use client";

import { useState, useEffect } from "react";
import { Icon, Button } from "@/components/ui";

/** 조직도 멤버 타입 */
interface OrgMember {
  id: string;
  role: string;      // 역할 (PM, PL, 개발자 등)
  name: string;      // 이름
  department?: string; // 부서
}

/** 프로젝트 개요 데이터 타입 */
interface ProjectOverviewData {
  purpose?: string | null;
  organizationChart?: OrgMember[] | null;
  successIndicators?: string[];
  futureVision?: string | null;
  visionImage?: string | null;
}

/** 프로젝트 타입 (개요 정보 포함) */
interface ProjectWithOverview {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  progress?: number;
  purpose?: string | null;
  organizationChart?: OrgMember[] | null;
  successIndicators?: string[];
  futureVision?: string | null;
  visionImage?: string | null;
}

interface ProjectOverviewModalProps {
  project: ProjectWithOverview;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectOverviewData) => Promise<void>;
}

/**
 * 프로젝트 개요 모달 컴포넌트
 */
export function ProjectOverviewModal({
  project,
  isOpen,
  onClose,
  onSave,
}: ProjectOverviewModalProps) {
  // 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false);

  // 편집 데이터
  const [purpose, setPurpose] = useState(project.purpose || "");
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>(
    project.organizationChart || []
  );
  const [indicators, setIndicators] = useState<string[]>(
    project.successIndicators || []
  );
  const [newIndicator, setNewIndicator] = useState("");
  const [futureVision, setFutureVision] = useState(project.futureVision || "");
  const [visionImage, setVisionImage] = useState(project.visionImage || "");

  // 프로젝트가 변경되면 데이터 업데이트
  useEffect(() => {
    setPurpose(project.purpose || "");
    setOrgMembers(project.organizationChart || []);
    setIndicators(project.successIndicators || []);
    setFutureVision(project.futureVision || "");
    setVisionImage(project.visionImage || "");
  }, [project]);

  if (!isOpen) return null;

  /**
   * 조직도 멤버 추가
   */
  const handleAddMember = () => {
    setOrgMembers([
      ...orgMembers,
      { id: Date.now().toString(), role: "", name: "", department: "" },
    ]);
  };

  /**
   * 조직도 멤버 수정
   */
  const handleUpdateMember = (
    id: string,
    field: keyof OrgMember,
    value: string
  ) => {
    setOrgMembers(
      orgMembers.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  /**
   * 조직도 멤버 삭제
   */
  const handleRemoveMember = (id: string) => {
    setOrgMembers(orgMembers.filter((m) => m.id !== id));
  };

  /**
   * 성공지표 추가
   */
  const handleAddIndicator = () => {
    if (newIndicator.trim()) {
      setIndicators([...indicators, newIndicator.trim()]);
      setNewIndicator("");
    }
  };

  /**
   * 성공지표 삭제
   */
  const handleRemoveIndicator = (index: number) => {
    setIndicators(indicators.filter((_, i) => i !== index));
  };

  /**
   * 저장 핸들러
   */
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        purpose: purpose || null,
        organizationChart: orgMembers.length > 0 ? orgMembers : null,
        successIndicators: indicators,
        futureVision: futureVision || null,
        visionImage: visionImage || null,
      });
      setIsEditMode(false);
    } catch (error) {
      console.error("저장 실패:", error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 편집 취소
   */
  const handleCancelEdit = () => {
    // 원래 값으로 복원
    setPurpose(project.purpose || "");
    setOrgMembers(project.organizationChart || []);
    setIndicators(project.successIndicators || []);
    setFutureVision(project.futureVision || "");
    setVisionImage(project.visionImage || "");
    setIsEditMode(false);
  };

  /**
   * 상태에 따른 색상 반환
   */
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PLANNING: "bg-slate-500",
      ACTIVE: "bg-emerald-500",
      ON_HOLD: "bg-amber-500",
      COMPLETED: "bg-sky-500",
      CANCELLED: "bg-rose-500",
    };
    return colors[status] || "bg-slate-500";
  };

  /**
   * 개요 데이터가 비어있는지 확인
   */
  const hasOverviewData =
    project.purpose ||
    (project.organizationChart && project.organizationChart.length > 0) ||
    (project.successIndicators && project.successIndicators.length > 0) ||
    project.futureVision ||
    project.visionImage;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-background-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 - 은은한 배경 */}
        <div className="relative bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800 p-6 border-b border-border dark:border-border-dark">
          {/* 미묘한 배경 패턴 */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
            <div className="absolute inset-0" style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px), radial-gradient(circle at 80% 20%, currentColor 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />
          </div>

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`size-3 rounded-full ${getStatusColor(project.status)} shadow-sm`} />
                <h2 className="text-2xl font-bold tracking-tight text-text dark:text-white">
                  {project.name}
                </h2>
              </div>
              <p className="text-text-secondary text-sm line-clamp-2">
                {project.description || "프로젝트 설명이 없습니다."}
              </p>
              {(project.startDate || project.endDate) && (
                <div className="flex items-center gap-2 mt-3 text-text-secondary text-xs">
                  <Icon name="calendar_month" size="xs" />
                  <span>
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString("ko-KR")
                      : "시작일 미정"}{" "}
                    ~{" "}
                    {project.endDate
                      ? new Date(project.endDate).toLocaleDateString("ko-KR")
                      : "종료일 미정"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isEditMode && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                  title="편집"
                >
                  <Icon name="edit" size="sm" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-text-secondary hover:text-text dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Icon name="close" size="sm" />
              </button>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 편집 모드 */}
          {isEditMode ? (
            <>
              {/* 프로젝트 목적 */}
              <section>
                <label className="flex items-center gap-2 text-sm font-bold text-text dark:text-white mb-2">
                  <Icon name="flag" size="sm" className="text-primary" />
                  프로젝트 목적
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="프로젝트의 핵심 목적과 배경을 작성하세요..."
                  className="w-full px-4 py-3 rounded-xl bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white resize-none h-32 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </section>

              {/* 조직도 */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-text dark:text-white">
                    <Icon name="groups" size="sm" className="text-emerald-500" />
                    프로젝트 조직도
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon="add"
                    onClick={handleAddMember}
                  >
                    멤버 추가
                  </Button>
                </div>
                <div className="space-y-2">
                  {orgMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 p-3 bg-surface dark:bg-background-dark rounded-lg border border-border dark:border-border-dark"
                    >
                      <input
                        type="text"
                        value={member.role}
                        onChange={(e) =>
                          handleUpdateMember(member.id, "role", e.target.value)
                        }
                        placeholder="역할 (PM, PL 등)"
                        className="flex-1 px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary outline-none"
                      />
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) =>
                          handleUpdateMember(member.id, "name", e.target.value)
                        }
                        placeholder="이름"
                        className="flex-1 px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary outline-none"
                      />
                      <input
                        type="text"
                        value={member.department || ""}
                        onChange={(e) =>
                          handleUpdateMember(member.id, "department", e.target.value)
                        }
                        placeholder="부서"
                        className="flex-1 px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary outline-none"
                      />
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                      >
                        <Icon name="delete" size="sm" />
                      </button>
                    </div>
                  ))}
                  {orgMembers.length === 0 && (
                    <p className="text-sm text-text-secondary text-center py-4">
                      조직도 멤버를 추가해주세요.
                    </p>
                  )}
                </div>
              </section>

              {/* 성공지표 */}
              <section>
                <label className="flex items-center gap-2 text-sm font-bold text-text dark:text-white mb-2">
                  <Icon name="trending_up" size="sm" className="text-amber-500" />
                  성공지표
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newIndicator}
                    onChange={(e) => setNewIndicator(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddIndicator()}
                    placeholder="성공지표를 입력하고 Enter"
                    className="flex-1 px-4 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary outline-none"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon="add"
                    onClick={handleAddIndicator}
                  >
                    추가
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {indicators.map((indicator, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm"
                    >
                      {indicator}
                      <button
                        onClick={() => handleRemoveIndicator(idx)}
                        className="text-amber-500 hover:text-amber-700"
                      >
                        <Icon name="close" size="xs" />
                      </button>
                    </span>
                  ))}
                </div>
              </section>

              {/* 미래 비전 */}
              <section>
                <label className="flex items-center gap-2 text-sm font-bold text-text dark:text-white mb-2">
                  <Icon name="rocket_launch" size="sm" className="text-violet-500" />
                  추구하는 미래 모습
                </label>
                <textarea
                  value={futureVision}
                  onChange={(e) => setFutureVision(e.target.value)}
                  placeholder="프로젝트가 성공했을 때의 미래 모습을 그려보세요..."
                  className="w-full px-4 py-3 rounded-xl bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white resize-none h-32 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </section>

              {/* 비전 이미지 */}
              <section>
                <label className="flex items-center gap-2 text-sm font-bold text-text dark:text-white mb-2">
                  <Icon name="image" size="sm" className="text-sky-500" />
                  비전 이미지 URL
                </label>
                <input
                  type="url"
                  value={visionImage}
                  onChange={(e) => setVisionImage(e.target.value)}
                  placeholder="https://example.com/vision-image.jpg"
                  className="w-full px-4 py-3 rounded-xl bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                {visionImage && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-border dark:border-border-dark">
                    <img
                      src={visionImage}
                      alt="비전 이미지 미리보기"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </section>
            </>
          ) : (
            /* 뷰 모드 */
            <>
              {!hasOverviewData ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon name="article" size="xl" className="text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-text dark:text-white mb-2">
                    프로젝트 개요가 없습니다
                  </h3>
                  <p className="text-text-secondary mb-4">
                    프로젝트의 목적, 조직도, 성공지표 등을 추가해보세요.
                  </p>
                  <Button
                    variant="primary"
                    leftIcon="edit"
                    onClick={() => setIsEditMode(true)}
                  >
                    개요 작성하기
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 왼쪽 열 */}
                  <div className="space-y-6">
                    {/* 프로젝트 목적 */}
                    {project.purpose && (
                      <section className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/20">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-primary mb-3">
                          <Icon name="flag" size="sm" />
                          프로젝트 목적
                        </h3>
                        <p className="text-text dark:text-white leading-relaxed whitespace-pre-wrap">
                          {project.purpose}
                        </p>
                      </section>
                    )}

                    {/* 성공지표 */}
                    {project.successIndicators && project.successIndicators.length > 0 && (
                      <section className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 mb-3">
                          <Icon name="trending_up" size="sm" />
                          성공지표
                        </h3>
                        <ul className="space-y-2">
                          {project.successIndicators.map((indicator, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-text dark:text-white"
                            >
                              <Icon
                                name="check_circle"
                                size="sm"
                                className="text-amber-500 shrink-0 mt-0.5"
                              />
                              <span>{indicator}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* 조직도 */}
                    {project.organizationChart && project.organizationChart.length > 0 && (
                      <section className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                          <Icon name="groups" size="sm" />
                          프로젝트 조직도
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {project.organizationChart.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 bg-white dark:bg-surface-dark rounded-lg p-3 border border-emerald-100 dark:border-emerald-900"
                            >
                              <div className="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                  {member.name ? member.name.charAt(0) : "?"}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-text dark:text-white truncate">
                                  {member.name || "이름 없음"}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {member.role}
                                  {member.department && ` · ${member.department}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>

                  {/* 오른쪽 열 */}
                  <div className="space-y-6">
                    {/* 미래 비전 */}
                    {project.futureVision && (
                      <section className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-violet-200 dark:border-violet-800">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-400 mb-3">
                          <Icon name="rocket_launch" size="sm" />
                          추구하는 미래 모습
                        </h3>
                        <p className="text-text dark:text-white leading-relaxed whitespace-pre-wrap">
                          {project.futureVision}
                        </p>
                      </section>
                    )}

                    {/* 비전 이미지 */}
                    {project.visionImage && (
                      <section className="relative rounded-xl overflow-hidden border border-border dark:border-border-dark group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
                        <img
                          src={project.visionImage}
                          alt="프로젝트 비전"
                          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                          <div className="flex items-center gap-2 text-white text-sm">
                            <Icon name="image" size="sm" />
                            <span>비전 이미지</span>
                          </div>
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 푸터 (편집 모드일 때만) */}
        {isEditMode && (
          <div className="p-4 border-t border-border dark:border-border-dark bg-surface dark:bg-background-dark flex justify-end gap-3">
            <Button variant="ghost" onClick={handleCancelEdit}>
              취소
            </Button>
            <Button
              variant="primary"
              leftIcon="save"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
