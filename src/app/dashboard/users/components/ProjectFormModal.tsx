/**
 * @file src/app/dashboard/users/components/ProjectFormModal.tsx
 * @description 프로젝트 생성 모달 (대시보드 메인에서 분리됨)
 *
 * 초보자 가이드:
 * 1. **onCreated**: 생성 후 새 프로젝트 ID 콜백 (자동 선택용)
 * 2. **생성자 자동 OWNER 등록**: 서버 API에서 처리 (변경 없음)
 */
"use client";

import { useState } from "react";
import { Icon, Button, Input, useToast } from "@/components/ui";
import { useCreateProject } from "@/hooks";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}

export function ProjectFormModal({ isOpen, onClose, onCreated }: Props) {
  const toast = useToast();
  const createProject = useCreateProject();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("프로젝트 이름을 입력해주세요.");
      return;
    }
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      toast.success("프로젝트가 생성되었습니다.");
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      onCreated?.(project.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "생성 실패", "프로젝트 생성 실패");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text dark:text-white">새 프로젝트</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text dark:hover:text-white">
            <Icon name="close" size="md" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="이름 *"
            leftIcon="folder"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-2">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="시작일"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="종료일"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth onClick={onClose}>
              취소
            </Button>
            <Button variant="primary" fullWidth type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "생성 중..." : "생성"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
