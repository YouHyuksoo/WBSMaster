/**
 * @file src/app/dashboard/layout.tsx
 * @description
 * 대시보드 영역의 공통 레이아웃입니다.
 * 사이드바, 헤더를 포함한 대시보드 레이아웃을 적용합니다.
 *
 * 초보자 가이드:
 * 1. **DashboardLayout**: 사이드바와 헤더가 포함된 레이아웃 컴포넌트
 * 2. **ProjectProvider**: 프로젝트 선택 상태 전역 관리
 * 3. **children**: /dashboard/* 경로의 페이지 컴포넌트
 *
 * 수정 방법:
 * - 인증 체크 추가: 이 파일에서 세션 확인 로직 추가
 */

import { DashboardLayout } from "@/components/layout";
import { ProjectProvider } from "@/contexts";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </ProjectProvider>
  );
}
