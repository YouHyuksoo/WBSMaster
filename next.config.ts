/**
 * @file next.config.ts
 * @description
 * Next.js 설정 파일입니다.
 * Turbopack, 이미지 최적화 등의 설정을 관리합니다.
 *
 * 초보자 가이드:
 * - turbopack.root: 프로젝트 루트 디렉토리 지정 (lockfile 경고 해결)
 * - images: 외부 이미지 도메인 허용 설정
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack 설정 - 프로젝트 루트 명시 (lockfile 경고 해결)
  turbopack: {
    root: __dirname,
  },

  // 이미지 최적화 설정 (외부 이미지 사용 시)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
