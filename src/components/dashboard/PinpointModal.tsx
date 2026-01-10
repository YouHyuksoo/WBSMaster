/**
 * @file src/components/dashboard/PinpointModal.tsx
 * @description
 * 핀포인트 추가/수정 모달 컴포넌트입니다.
 * 핀포인트의 이름, 날짜, 색상, 설명을 입력받습니다.
 *
 * 초보자 가이드:
 * 1. **isOpen**: 모달 열기/닫기
 * 2. **pinpoint**: 수정할 핀포인트 (null이면 신규 생성)
 * 3. **onClose**: 모달 닫기 콜백
 * 4. **onSave**: 저장 콜백
 *
 * 수정 방법:
 * - 입력 필드 추가: 폼에 새로운 input 추가
 * - 색상 선택지 변경: colorOptions 배열 수정
 */

"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";

interface PinpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinpoint?: {
    id: string;
    name: string;
    date: string;
    color: string;
    description?: string | null;
  } | null;
  defaultDate?: string; // 신규 생성시 기본 날짜
  onSave: (data: {
    name: string;
    date: string;
    color: string;
    description?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

const colorOptions = [
  { name: "빨강", value: "#EF4444" },
  { name: "주황", value: "#F97316" },
  { name: "노랑", value: "#EAB308" },
  { name: "녹색", value: "#22C55E" },
  { name: "파랑", value: "#3B82F6" },
  { name: "보라", value: "#A855F7" },
  { name: "핑크", value: "#EC4899" },
  { name: "회색", value: "#6B7280" },
];

export function PinpointModal({
  isOpen,
  onClose,
  pinpoint,
  defaultDate,
  onSave,
  isLoading,
}: PinpointModalProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [color, setColor] = useState("#EF4444");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  // 모달 열릴 때 초기값 설정
  useEffect(() => {
    if (isOpen) {
      if (pinpoint) {
        setName(pinpoint.name);
        setDate(pinpoint.date.split("T")[0]); // ISO 날짜 포맷
        setColor(pinpoint.color);
        setDescription(pinpoint.description || "");
      } else {
        // 신규 생성: 기본값
        setName("");
        setDate(defaultDate || new Date().toISOString().split("T")[0]);
        setColor("#EF4444");
        setDescription("");
      }
      setError("");
    }
  }, [isOpen, pinpoint, defaultDate]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("이름을 입력하세요.");
      return;
    }

    if (!date) {
      setError("날짜를 선택하세요.");
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        date,
        color,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError("저장에 실패했습니다.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={pinpoint ? "핀포인트 수정" : "핀포인트 추가"}
      size="sm"
    >
      <div className="space-y-4">
        {/* 이름 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            이름 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 오픈, 베타, 런칭"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* 날짜 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            날짜 *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* 색상 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            색상
          </label>
          <div className="grid grid-cols-4 gap-2">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setColor(option.value)}
                className={`p-3 rounded-md border-2 transition-all ${
                  color === option.value
                    ? "border-slate-900 dark:border-white scale-105"
                    : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                }`}
                style={{ backgroundColor: option.value }}
                title={option.name}
              >
                {color === option.value && (
                  <Icon name="check" size="sm" className="text-white" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            설명 (선택)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="핀포인트에 대한 추가 설명"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md disabled:opacity-50"
          >
            {isLoading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
