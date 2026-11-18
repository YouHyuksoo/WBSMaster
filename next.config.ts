/**
 * @file next.config.ts
 * @description
 * Next.js 설정 파일입니다.
 * Turbopack, 이미지 최적화 등의 설정을 관리합니다.
 *
 * 초보자 가이드:
 * - turbopack.root: 프로젝트 루트 디렉토리 지정 (lockfile 경고 해결)
 * - images: 외부 이미지 도메인 허용 설정
 * - env: 헤더 로고 옆 앱 버전(package.json version + 빌드한 git 커밋 · 시각). 빌드할 때 값이 박힌다.
 */

import type { NextConfig } from "next";
import { execSync } from "child_process";
import pkg from "./package.json";

/** 빌드한 커밋 (git 이 없으면 빈 값) */
function gitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

/** 빌드 시각 "2026-11-18 15:50" (빌드한 서버의 현지 시각, 화면에서 다시 바꾸지 않아 서버 · 브라우저 표시가 같다) */
function buildTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_COMMIT: gitCommit(),
    NEXT_PUBLIC_BUILD_TIME: buildTime(),
  },
  serverExternalPackages: ["pdf-parse", "mammoth"],
  transpilePackages: ["@jisung/ui"],
  // Turbopack 설정 - 프로젝트 루트 명시 (lockfile 경고 해결)
  turbopack: {
    root: __dirname,
  },

  // 개발 환경에서 허용할 Origin (WSL2/외부 IP 접근 시 경고 해결)
  allowedDevOrigins: ["172.23.208.1", "172.19.48.1", "10.7.119.148"],

  // 이미지 최적화 설정 (외부 이미지 사용 시)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
