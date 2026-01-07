/**
 * @file src/components/layout/Header.tsx
 * @description
 * 랜딩 페이지 및 공통 헤더 컴포넌트입니다.
 * 로고, 네비게이션, 테마 토글, 사용자 메뉴를 포함합니다.
 *
 * 초보자 가이드:
 * 1. **로고**: WBS Master 로고 및 브랜드명
 * 2. **네비게이션**: Features, Solutions, Pricing, About 링크
 * 3. **우측 메뉴**: 언어 선택, 테마 토글, 알림, 사용자 프로필
 *
 * 수정 방법:
 * - 네비게이션 링크 추가: navLinks 배열에 항목 추가
 * - 로고 변경: Logo 부분 수정
 */

"use client";

import Link from "next/link";
import { Icon } from "@/components/ui";

/** 네비게이션 링크 목록 */
const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#solutions", label: "Solutions" },
  { href: "#pricing", label: "Pricing" },
  { href: "#about", label: "About" },
];

/**
 * 헤더 컴포넌트
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background-white/90 backdrop-blur-md px-4 py-3 lg:px-8 shadow-sm">
      {/* 로고 영역 */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3">
          {/* 로고 아이콘 */}
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="account_tree" size="lg" />
          </div>
          {/* 브랜드명 */}
          <h2 className="text-xl font-bold tracking-tight text-text">
            WBS Master
          </h2>
        </Link>
      </div>

      {/* 중앙 네비게이션 (데스크톱) */}
      <nav className="hidden lg:flex flex-1 items-center justify-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-text hover:text-primary transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* 우측 메뉴 */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* 언어 선택 버튼 */}
        <button
          className="hidden sm:flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="언어 변경"
        >
          <Icon name="language" size="sm" />
          <span>KO</span>
          <Icon name="expand_more" size="xs" className="text-text-secondary" />
        </button>

        {/* 테마 토글 버튼 */}
        <button
          className="flex items-center justify-center size-9 rounded-lg text-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="테마 변경"
          onClick={() => {
            document.documentElement.classList.toggle("dark");
          }}
        >
          <Icon name="dark_mode" size="sm" className="dark:hidden" />
          <Icon name="light_mode" size="sm" className="hidden dark:block" />
        </button>

        {/* 알림 버튼 */}
        <button
          className="relative flex items-center justify-center size-9 rounded-lg text-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="알림"
        >
          <Icon name="notifications" size="sm" />
          {/* 알림 뱃지 */}
          <span className="absolute top-2 right-2.5 size-2 bg-error rounded-full border border-background-white" />
        </button>

        {/* 구분선 */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* 사용자 프로필 버튼 */}
        <button className="flex items-center gap-3 rounded-lg py-1 pl-1 pr-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-left">
          {/* 아바타 */}
          <div className="relative size-9 rounded-full overflow-hidden border border-border bg-card flex items-center justify-center">
            <Icon name="person" size="sm" className="text-text-secondary" />
          </div>
          {/* 사용자 정보 (데스크톱) */}
          <div className="hidden md:flex flex-col">
            <p className="text-sm font-bold text-text leading-tight">Guest</p>
            <p className="text-[11px] font-medium text-text-secondary leading-tight">
              로그인 하기
            </p>
          </div>
          <Icon
            name="expand_more"
            size="sm"
            className="text-text-secondary group-hover:text-text transition-colors hidden md:block"
          />
        </button>
      </div>
    </header>
  );
}
