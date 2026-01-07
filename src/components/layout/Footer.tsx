/**
 * @file src/components/layout/Footer.tsx
 * @description
 * 랜딩 페이지 푸터 컴포넌트입니다.
 * 로고, 설명, 링크 목록, 소셜 미디어 아이콘을 포함합니다.
 *
 * 초보자 가이드:
 * 1. **footerLinks**: 푸터에 표시될 링크 카테고리
 * 2. **소셜 미디어**: Twitter, GitHub 링크
 *
 * 수정 방법:
 * - 링크 추가: footerLinks 배열에 항목 추가
 * - 저작권 연도: 하단 copyright 텍스트 수정
 */

import Link from "next/link";
import { Icon } from "@/components/ui";

/** 푸터 링크 카테고리 */
const footerLinks = {
  product: {
    title: "PRODUCT",
    links: [
      { href: "#", label: "Features" },
      { href: "#", label: "Pricing" },
      { href: "#", label: "Integrations" },
      { href: "#", label: "Changelog" },
    ],
  },
  company: {
    title: "COMPANY",
    links: [
      { href: "#", label: "About Us" },
      { href: "#", label: "Careers" },
      { href: "#", label: "Blog" },
      { href: "#", label: "Contact" },
    ],
  },
  legal: {
    title: "LEGAL",
    links: [
      { href: "#", label: "Privacy Policy" },
      { href: "#", label: "Terms of Service" },
    ],
  },
};

/**
 * 푸터 컴포넌트
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12 px-6">
      <div className="container mx-auto max-w-[1200px]">
        {/* 상단 영역 */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          {/* 로고 및 설명 */}
          <div className="flex flex-col gap-4 max-w-xs">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
                <Icon name="account_tree" size="sm" />
              </div>
              <span className="text-lg font-bold text-text">WBS Master</span>
            </Link>
            <p className="text-sm text-text-secondary">
              프로젝트 분해 및 관리를 위한 최고의 도구. 팀이 더 적은 혼란으로 더
              많은 것을 달성할 수 있도록 지원합니다.
            </p>
          </div>

          {/* 링크 목록 */}
          <div className="flex flex-wrap gap-12 sm:gap-20">
            {Object.values(footerLinks).map((category) => (
              <div key={category.title} className="flex flex-col gap-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-text">
                  {category.title}
                </h4>
                {category.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 하단 영역 */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-secondary">
          {/* 저작권 및 제작사 */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p>© 2025 WBS Master. All rights reserved.</p>
            <span className="hidden sm:inline text-border">|</span>
            <p className="flex items-center gap-1">
              <span>Developed by</span>
              <span className="font-semibold text-text dark:text-white">지성솔루션컨설팅</span>
            </p>
          </div>

          {/* 소셜 미디어 링크 */}
          <div className="flex gap-4">
            {/* Twitter */}
            <Link
              href="#"
              className="hover:text-primary transition-colors"
              title="Twitter"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </Link>
            {/* GitHub */}
            <Link
              href="#"
              className="hover:text-primary transition-colors"
              title="GitHub"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
