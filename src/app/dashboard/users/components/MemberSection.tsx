/**
 * @file src/app/dashboard/users/components/MemberSection.tsx
 * @description 우측 하단 — 선택된 프로젝트의 멤버 목록 + 인라인 편집/제거
 *
 * 초보자 가이드:
 * 1. **project=null**: 프로젝트 선택 안 함 안내
 * 2. **useMembers**: projectId로 그 프로젝트 멤버만 조회
 * 3. **현재 사용자**: 본인 OWNER 행 [×] 비활성화 판정
 * 4. **제거 모달**: ConfirmModal로 확인 후 useRemoveMember
 */
"use client";

import { useState } from "react";
import { Icon, ConfirmModal, useToast } from "@/components/ui";
import { useMembers, useRemoveMember, useCurrentUser } from "@/hooks";
import type { TeamMember, Project } from "@/lib/api";
import { MemberRow } from "./MemberRow";

interface Props {
  project: Project | null;
}

export function MemberSection({ project }: Props) {
  const toast = useToast();
  const { data: currentUser } = useCurrentUser();
  const { data: members = [], isLoading } = useMembers(project ? { projectId: project.id } : undefined);
  const remove = useRemoveMember();

  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);

  const handleConfirmRemove = async () => {
    if (!removingMember) return;
    try {
      await remove.mutateAsync(removingMember.id);
      toast.success(`${removingMember.user?.name || "멤버"} 제거 완료`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "제거 실패");
    } finally {
      setRemovingMember(null);
    }
  };

  if (!project) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center text-text-secondary">
        <Icon name="touch_app" size="xl" className="mb-3" />
        <p>위에서 프로젝트를 선택하세요.</p>
      </div>
    );
  }

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl flex flex-col">
      <div className="p-4 border-b border-border dark:border-border-dark">
        <h3 className="font-bold text-text dark:text-white">
          {project.name} 멤버 <span className="text-text-secondary text-sm font-normal">({members.length}명)</span>
        </h3>
      </div>
      <div className="max-h-[40vh] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-text-secondary">로딩 중...</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            <Icon name="group_off" size="xl" className="mb-3" />
            <p>등록된 멤버가 없습니다.</p>
            <p className="text-xs mt-1">좌측에서 사용자를 선택해 추가하세요.</p>
          </div>
        ) : (
          members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              currentUserId={currentUser?.id ?? ""}
              onRequestRemove={(member) => setRemovingMember(member)}
            />
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={!!removingMember}
        title="멤버 제거"
        message={`"${removingMember?.user?.name || "멤버"}"를 이 프로젝트에서 제거하시겠습니까?`}
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemovingMember(null)}
        confirmText="제거"
        cancelText="취소"
        variant="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
}
