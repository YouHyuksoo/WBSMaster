/**
 * @file src/app/layout.tsx
 * @description
 * WBS Master 애플리케이션의 루트 레이아웃입니다.
 * 모든 페이지에 공통으로 적용되는 레이아웃, 폰트, 메타데이터를 정의합니다.
 *
 * 초보자 가이드:
 * 1. **metadata**: SEO 관련 정보 (title, description)
 * 2. **Inter 폰트**: 디자인 시스템의 기본 폰트
 * 3. **Material Symbols**: 아이콘 폰트
 * 4. **ThemeProvider**: 다크/라이트 테마 전환 (추후 추가)
 *
 * @example
 * // 이 레이아웃은 모든 하위 페이지에 자동 적용됩니다.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

/** Inter 폰트 설정 - 디자인 시스템 기본 폰트 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** 페이지 메타데이터 설정 */
export const metadata: Metadata = {
  title: "WBS Master - Intelligent Project Management",
  description:
    "Transform complex goals into actionable tasks. Visualize success with dynamic Gantt charts and let AI structure your workflow in seconds.",
  keywords: ["WBS", "프로젝트 관리", "간트 차트", "AI", "태스크 관리", "칸반"],
  authors: [{ name: "WBS Master Team" }],
  openGraph: {
    title: "WBS Master - Intelligent Project Management",
    description: "AI-Powered Project Management 2.0",
    type: "website",
  },
};

/**
 * 루트 레이아웃 컴포넌트
 * @param children - 하위 페이지 컴포넌트
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="light">
      <head>
        {/* Material Symbols Outlined 아이콘 폰트 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
