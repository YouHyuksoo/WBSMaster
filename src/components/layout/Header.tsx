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

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui";

/** 네비게이션 링크 목록 */
const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#solutions", label: "Solutions" },
  { href: "#pricing", label: "Pricing", isSpecial: true },
  { href: "#about", label: "About" },
];

/**
 * 헤더 컴포넌트
 */
export function Header() {
  const [showPricingPopup, setShowPricingPopup] = useState(false);

  /** Pricing 클릭 핸들러 */
  const handlePricingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowPricingPopup(true);
    // 2.5초 후 자동으로 닫기
    setTimeout(() => setShowPricingPopup(false), 2500);
  };

  return (
    <>
      {/* Pricing 팝업 오버레이 */}
      {showPricingPopup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowPricingPopup(false)}
        >
          <div
            className="relative bg-gradient-to-br from-primary via-purple-500 to-pink-500 p-1 rounded-3xl shadow-2xl animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-900 rounded-[22px] px-12 py-10 text-center">
              {/* 아이콘 */}
              <div className="mb-4 flex justify-center">
                <div className="size-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center animate-pulse shadow-lg shadow-green-500/30">
                  <Icon name="celebration" size="2xl" className="text-white" />
                </div>
              </div>
              {/* 메시지 */}
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-pink-500 mb-2">
                지금은 공짜에요!
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                무료로 모든 기능을 이용하세요 🎉
              </p>
              {/* 닫기 버튼 */}
              <button
                onClick={() => setShowPricingPopup(false)}
                className="mt-6 px-6 py-2 rounded-full bg-gradient-to-r from-primary to-purple-500 text-white font-semibold hover:opacity-90 transition-opacity"
              >
                알겠어요!
              </button>
            </div>
          </div>
        </div>
      )}

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
        {navLinks.map((link) =>
          link.isSpecial ? (
            <button
              key={link.href}
              onClick={handlePricingClick}
              className="text-sm font-medium text-text hover:text-primary transition-colors"
            >
              {link.label}
            </button>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          )
        )}
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
    </>
  );
}
