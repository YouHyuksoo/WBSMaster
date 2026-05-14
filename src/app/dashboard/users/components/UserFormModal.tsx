/**
 * @file src/app/dashboard/users/components/UserFormModal.tsx
 * @description 사용자 추가/수정 모달 (mode로 분기)
 *
 * 초보자 가이드:
 * 1. **mode**: "create" or "edit"
 * 2. **editingUser**: edit 모드 초기값
 * 3. **isOpen**: 외부에서 제어
 * 4. **ImageCropper**: 아바타 이미지 크롭 + Supabase 업로드(/api/upload)
 */
"use client";

import { useState, useEffect } from "react";
import { Icon, Button, Input, ImageCropper, useToast } from "@/components/ui";
import { useCreateUser, useUpdateUser } from "@/hooks";
import type { Affiliation, User } from "@/lib/api";
import { USER_ROLE_CONFIG, AFFILIATION_CONFIG } from "../constants";

interface Props {
  mode: "create" | "edit";
  isOpen: boolean;
  editingUser?: User | null;
  onClose: () => void;
}

export function UserFormModal({ mode, isOpen, editingUser, onClose }: Props) {
  const toast = useToast();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("USER");
  const [affiliation, setAffiliation] = useState<Affiliation | null>(null);
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 모달이 열릴 때 초기값 셋업
  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && editingUser) {
      setEmail(editingUser.email);
      setName(editingUser.name || "");
      setRole(editingUser.role);
      setAffiliation(editingUser.affiliation || null);
      setAvatar(editingUser.avatar || "");
      setPassword("");
    } else {
      setEmail("");
      setName("");
      setRole("USER");
      setAffiliation(null);
      setAvatar("");
      setPassword("");
    }
  }, [mode, editingUser, isOpen]);

  const handleImageCropComplete = async (blob: Blob) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "업로드 실패");
      }
      const { url } = await res.json();
      setAvatar(url);
      setShowImageCropper(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.", "업로드 실패");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }
    try {
      if (mode === "create") {
        await createUser.mutateAsync({
          email,
          name: name || undefined,
          avatar: avatar || undefined,
          affiliation: affiliation || undefined,
        });
        toast.success("사용자가 등록되었습니다.");
      } else if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser.id,
          data: {
            email,
            name: name || undefined,
            role,
            avatar: avatar || undefined,
            affiliation: affiliation || undefined,
            password: password.trim() !== "" ? password : undefined,
          },
        });
        toast.success("사용자 정보가 저장되었습니다.");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.", "저장 실패");
    }
  };

  if (!isOpen) return null;

  const isLoading = mode === "create" ? createUser.isPending : updateUser.isPending;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text dark:text-white">
              {mode === "create" ? "사용자 추가" : "사용자 수정"}
            </h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text dark:hover:text-white">
              <Icon name="close" size="md" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 아바타 영역 */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                {avatar ? (
                  <img src={avatar} alt="아바타" className="size-24 rounded-full object-cover border-2 border-border dark:border-border-dark" />
                ) : (
                  <div className="size-24 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-3xl">
                    {name?.charAt(0) || email?.charAt(0) || "?"}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowImageCropper(true)}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Icon name="add_a_photo" size="md" className="text-white" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowImageCropper(true)}
                className="text-sm text-primary hover:underline flex items-center gap-1"
                disabled={isUploadingImage}
              >
                <Icon name="edit" size="xs" />
                {isUploadingImage ? "업로드 중..." : mode === "create" ? "사진 설정" : "사진 변경"}
              </button>
              {mode === "edit" && avatar && (
                <button type="button" onClick={() => setAvatar("")} className="text-xs text-error hover:underline">
                  사진 제거
                </button>
              )}
            </div>

            <Input label="이메일 *" leftIcon="email" type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="이름" leftIcon="person" placeholder="사용자 이름" value={name} onChange={(e) => setName(e.target.value)} />

            {mode === "edit" && (
              <div>
                <Input label="비밀번호 (변경 시에만 입력)" leftIcon="lock" type="password" placeholder="변경하지 않으려면 비워두세요" value={password} onChange={(e) => setPassword(e.target.value)} />
                <p className="text-xs text-text-secondary mt-1">비밀번호를 변경하지 않으려면 비워두세요.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-2">소속</label>
              <select
                value={affiliation || ""}
                onChange={(e) => setAffiliation((e.target.value as Affiliation) || null)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
              >
                <option value="">선택 안함</option>
                {Object.entries(AFFILIATION_CONFIG).map(([aff, config]) => (
                  <option key={aff} value={aff}>{config.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-2">시스템 역할</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
              >
                {Object.entries(USER_ROLE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label} - {config.description}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" fullWidth onClick={onClose}>취소</Button>
              <Button variant="primary" fullWidth type="submit" disabled={isLoading}>
                {isLoading ? "저장 중..." : mode === "create" ? "등록" : "저장"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {showImageCropper && (
        <ImageCropper
          onCropComplete={handleImageCropComplete}
          onClose={() => setShowImageCropper(false)}
          onError={(message) => toast.error(message, "이미지 오류")}
          aspectRatio={1}
          cropShape="round"
        />
      )}
    </>
  );
}
