/**
 * @file src/app/dashboard/users/components/MemberRow.tsx
 * @description 프로젝트 멤버 1행 — 역할 인라인 편집 + 제거
 *
 * 초보자 가이드:
 * 1. **역할 변경**: select 드롭다운 → 즉시 PATCH (useUpdateMember)
 * 2. **본인 OWNER**: 자기가 OWNER인 경우 [×] 비활성화 (실수 방지)
 * 3. **제거**: onRequestRemove 호출 → 부모(MemberSection)에서 확인 모달
 */
"use client";

import { Icon, useToast } from "@/components/ui";
import { useUpdateMember } from "@/hooks";
import type { TeamMember } from "@/lib/api";
import { MEMBER_ROLE_CONFIG } from "../constants";

interface Props {
  member: TeamMember;
  currentUserId: string;
  onRequestRemove: (member: TeamMember) => void;
}

export function MemberRow({ member, currentUserId, onRequestRemove }: Props) {
  const toast = useToast();
  const update = useUpdateMember();
  const roleConfig = MEMBER_ROLE_CONFIG[member.role] || MEMBER_ROLE_CONFIG.MEMBER;
  const isSelfOwner = member.userId === currentUserId && member.role === "OWNER";

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-border dark:border-border-dark hover:bg-surface/50 dark:hover:bg-surface-dark/50 transition-colors">
      {member.user?.avatar ? (
        <img src={member.user.avatar} alt={member.user.name || ""} className="size-8 rounded-full object-cover shrink-0" />
      ) : (
        <div className="size-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
          {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || "?"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-text dark:text-white truncate">
          {member.user?.name || "이름 없음"}
        </div>
        <div className="text-xs text-text-secondary truncate">{member.user?.email}</div>
      </div>
      <select
        value={member.role}
        onChange={async (e) => {
          try {
            await update.mutateAsync({ id: member.id, data: { role: e.target.value } });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "역할 변경 실패");
          }
        }}
        className={`px-2 py-1 rounded text-xs font-medium ${roleConfig.bgColor} ${roleConfig.color} border-0 cursor-pointer`}
      >
        {Object.entries(MEMBER_ROLE_CONFIG).map(([key, c]) => (
          <option key={key} value={key}>{c.label}</option>
        ))}
      </select>
      <button
        onClick={() => onRequestRemove(member)}
        disabled={isSelfOwner}
        className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={isSelfOwner ? "본인이 OWNER인 경우 제거할 수 없습니다" : "멤버 제거"}
      >
        <Icon name="close" size="sm" />
      </button>
    </div>
  );
}
