/**
 * @file src/app/dashboard/guide/components/GuideSection.tsx
 * @description
 * 가이드 섹션 컴포넌트 - 접고 펴기 기능 포함
 */

"use client";

import { Icon } from "@/components/ui";
import { useState, ReactNode } from "react";

interface GuideSectionProps {
  id: string;
  title: string;
  icon: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function GuideSection({ id, title, icon, children, defaultOpen = true }: GuideSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section id={id} className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden">
      {/* 헤더 (클릭 가능) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-surface/50 dark:hover:bg-background-dark/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon name={icon} className="text-primary" />
          <h2 className="text-xl font-bold text-text dark:text-white">{title}</h2>
        </div>
        <Icon
          name={isOpen ? "expand_less" : "expand_more"}
          className="text-text-secondary transition-transform"
        />
      </button>

      {/* 컨텐츠 */}
      {isOpen && (
        <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </section>
  );
}
