/**
 * @file src/app/dashboard/users/components/UserListRow.tsx
 * @description 좌측 사용자 1행 (체크박스 + 정보 + 수정/삭제 아이콘)
 *
 * 초보자 가이드:
 * 1. **체크박스**: 일괄 추가 대상 선택
 * 2. **참여 N개**: 그 사용자가 멤버로 등록된 프로젝트 수
 * 3. **이미 멤버 표시**: 선택된 프로젝트에 이미 등록된 경우 회색 처리 + 체크박스 비활성화
 */
"use client";

import { Icon } from "@/components/ui";
import type { User } from "@/lib/api";
import { USER_ROLE_CONFIG, AFFILIATION_CONFIG } from "../constants";

interface Props {
  user: User;
  checked: boolean;
  onToggle: () => void;
  membershipCount: number;
  isAlreadyMemberOfSelectedProject: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function UserListRow({
  user, checked, onToggle, membershipCount,
  isAlreadyMemberOfSelectedProject, onEdit, onDelete,
}: Props) {
  const role = USER_ROLE_CONFIG[user.role] || USER_ROLE_CONFIG.USER;
  const aff = user.affiliation ? AFFILIATION_CONFIG[user.affiliation] : null;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 border-b border-border dark:border-border-dark hover:bg-surface/50 dark:hover:bg-surface-dark/50 transition-colors ${
        isAlreadyMemberOfSelectedProject ? "opacity-50" : ""
      }`}
      title={isAlreadyMemberOfSelectedProject ? "이미 멤버" : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={isAlreadyMemberOfSelectedProject}
        className="size-4"
      />
      {user.avatar ? (
        <img src={user.avatar} alt={user.name || ""} className="size-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="size-9 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold shrink-0">
          {user.name?.charAt(0) || user.email.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text dark:text-white truncate">{user.name || "이름 없음"}</div>
        <div className="text-xs text-text-secondary truncate">{user.email}</div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1">
          {aff && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${aff.bgColor} ${aff.color}`}>{aff.label}</span>
          )}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${role.bgColor} ${role.color}`}>{role.label}</span>
        </div>
        <span className="text-[10px] text-text-secondary">참여 {membershipCount}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="수정">
          <Icon name="edit" size="sm" />
        </button>
        <button onClick={onDelete} className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors" title="삭제">
          <Icon name="delete" size="sm" />
        </button>
      </div>
    </div>
  );
}
