/**
 * @file src/app/page.tsx
 * @description
 * WBS Master 랜딩 페이지입니다.
 * 서비스 소개, 주요 기능, CTA 등을 포함합니다.
 *
 * 섹션 구성:
 * 1. Hero - 메인 타이틀, CTA 버튼, 대시보드 이미지
 * 2. Features - 주요 기능 3가지 소개
 * 3. Showcase - 드래그 앤 드롭 인터페이스 소개
 * 4. CTA - 회원가입 유도
 *
 * 초보자 가이드:
 * - 각 섹션은 독립적인 컴포넌트로 분리 가능
 * - 텍스트 수정: 해당 섹션의 문자열 변경
 * - 이미지 변경: Image src 또는 background-image URL 변경
 *
 * 유지보수 팁:
 * - Tailwind CSS v4 문법: 그라데이션 적용 시 `bg-gradient-to-*` 대신 `bg-linear-to-*`를 사용합니다.
 */

"use client";

import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Icon,
  useToast,
} from "@/components/ui";

/** 기능 카드 데이터 */
const features = [
  {
    icon: "account_tree",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-primary",
    title: "WBS Visualization",
    description:
      "동적인 Tree 및 Gantt 뷰로 프로젝트 구조를 시각화하세요. 병목 현상을 즉시 파악할 수 있습니다.",
  },
  {
    icon: "group",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
    title: "Task Management",
    description:
      "태스크를 할당하고, 진행 상황을 추적하며, 팀과 실시간으로 협업하세요. 모든 사람이 목표에 집중할 수 있습니다.",
  },
  {
    icon: "auto_awesome",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
    title: "AI Assistant",
    description:
      "한 줄의 텍스트 프롬프트로 포괄적인 WBS 구조를 즉시 생성하세요. AI가 분해 로직을 처리합니다.",
  },
];

/**
 * 랜딩 페이지 컴포넌트
 */
export default function LandingPage() {
  const toast = useToast();

  /** 영업팀 문의 클릭 핸들러 */
  const handleSalesClick = () => {
    toast.info("영업팀은 오늘도 한잔 마시고 있는중... 🍺");
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      {/* 헤더 */}
      <Header />

      {/* 메인 콘텐츠 */}
      <main className="flex-1">
        {/* ========================================
            Hero 섹션
            ======================================== */}
        <section className="relative px-6 py-12 lg:py-24 overflow-hidden">
          {/* 배경 그라데이션 효과 */}
          <div className="absolute -top-20 -right-20 size-[500px] rounded-full bg-primary/10 dark:bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute top-40 -left-20 size-[300px] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-3xl pointer-events-none" />

          <div className="container mx-auto max-w-[1200px]">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* 좌측: 텍스트 콘텐츠 */}
              <div className="flex flex-col gap-6 lg:w-1/2">
                {/* 배지 */}
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  <Icon name="verified" size="xs" />
                  <span>AI-Powered Project Management 2.0</span>
                </div>

                {/* 메인 타이틀 */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight text-text">
                  Master Your Projects with{" "}
                  <span className="text-primary">Intelligent WBS</span>
                </h1>

                {/* 설명 */}
                <p className="text-lg text-text-secondary max-w-[540px] leading-relaxed">
                  복잡한 목표를 실행 가능한 태스크로 변환하세요. 동적인 Gantt
                  차트로 성공을 시각화하고, AI가 몇 초 만에 워크플로우를
                  구조화합니다.
                </p>

                {/* CTA 버튼 */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link href="/login">
                    <Button variant="primary" size="lg">
                      무료로 시작하기
                    </Button>
                  </Link>
                  <Button variant="secondary" size="lg" leftIcon="play_circle">
                    데모 보기
                  </Button>
                </div>

                {/* 신뢰 지표 */}
                <div className="flex items-center gap-4 text-sm text-text-secondary pt-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="size-8 rounded-full border-2 border-background-white bg-card flex items-center justify-center"
                      >
                        <Icon
                          name="person"
                          size="xs"
                          className="text-text-secondary"
                        />
                      </div>
                    ))}
                  </div>
                  <p>10,000명 이상의 프로젝트 매니저가 신뢰합니다</p>
                </div>
              </div>

              {/* 우측: 대시보드 이미지 */}
              <div className="lg:w-1/2 w-full">
                <div className="relative rounded-xl bg-linear-to-br from-gray-100 to-gray-200 dark:from-[#1e2936] dark:to-[#111827] p-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                  <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-[1px] z-0 rounded-xl" />
                  <div className="relative z-10 w-full aspect-4/3 rounded-lg bg-card overflow-hidden shadow-inner border border-white/50 dark:border-white/5">
                    {/* 윈도우 컨트롤 버튼 */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between bg-background-white/90 dark:bg-card/90 backdrop-blur-sm p-3 rounded-md shadow-sm border border-border">
                      <div className="flex gap-2">
                        <div className="size-3 rounded-full bg-red-400" />
                        <div className="size-3 rounded-full bg-yellow-400" />
                        <div className="size-3 rounded-full bg-green-400" />
                      </div>
                      <div className="h-2 w-20 bg-border rounded-full" />
                    </div>
                    {/* 대시보드 미리보기 콘텐츠 */}
                    <div className="pt-16 px-4 pb-4 h-full flex flex-col gap-3">
                      <div className="flex gap-3 flex-1">
                        <div className="flex-1 bg-primary/10 rounded-lg p-3">
                          <div className="h-2 w-16 bg-primary/30 rounded mb-2" />
                          <div className="h-2 w-24 bg-primary/20 rounded" />
                        </div>
                        <div className="flex-1 bg-green-500/10 rounded-lg p-3">
                          <div className="h-2 w-16 bg-green-500/30 rounded mb-2" />
                          <div className="h-2 w-20 bg-green-500/20 rounded" />
                        </div>
                      </div>
                      <div className="h-24 bg-border/50 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================
            Features 섹션
            ======================================== */}
        <section
          id="features"
          className="py-20 bg-background-white dark:bg-[#15202b]"
        >
          <div className="container mx-auto max-w-[1200px] px-6">
            {/* 섹션 헤더 */}
            <div className="mb-16 text-center max-w-[760px] mx-auto">
              <h2 className="text-3xl font-bold tracking-tight text-text mb-4">
                Why WBS Master?
              </h2>
              <p className="text-lg text-text-secondary">
                복잡한 프로젝트를 분해하고, 책임을 할당하며, 타임라인을
                효율적으로 관리하는 데 필요한 모든 것을 제공합니다.
              </p>
            </div>

            {/* 기능 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature) => (
                <Card key={feature.title} hover>
                  <CardHeader>
                    <div
                      className={`flex size-12 items-center justify-center rounded-xl ${feature.iconBg}`}
                    >
                      <Icon
                        name={feature.icon}
                        size="lg"
                        className={feature.iconColor}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="text-xl font-bold text-text mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-text-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================
            Showcase 섹션
            ======================================== */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-[1000px]">
            <div className="overflow-hidden rounded-2xl bg-card shadow-xl border border-border">
              <div className="flex flex-col md:flex-row">
                {/* 이미지 영역 */}
                <div className="md:w-1/2 h-64 md:h-auto bg-linear-to-br from-primary/20 to-purple-500/20 relative group flex items-center justify-center">
                  <div className="text-center p-8">
                    <Icon
                      name="drag_indicator"
                      size="2xl"
                      className="text-primary mb-4"
                    />
                    <p className="text-text-secondary">
                      드래그 앤 드롭 인터페이스
                    </p>
                  </div>
                </div>

                {/* 텍스트 영역 */}
                <div className="flex flex-col justify-center p-8 md:p-12 md:w-1/2">
                  <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    <Icon name="drag_indicator" size="sm" />
                    <span>Drag & Drop Interface</span>
                  </div>
                  <h3 className="text-2xl font-bold text-text mb-4">
                    직관적인 계획 경험
                  </h3>
                  <p className="text-text-secondary mb-8 leading-relaxed">
                    현대적인 프로젝트 매니저를 위해 설계된 직관적인 드래그 앤
                    드롭 인터페이스를 경험하세요. 복잡한 메뉴를 탐색하지 않고도
                    태스크를 재구성하고, 타임라인을 조정하며, 의존성을
                    업데이트할 수 있습니다.
                  </p>
                  <Link
                    href="#"
                    className="inline-flex items-center font-bold text-primary hover:text-primary-hover transition-colors"
                  >
                    자세히 보기
                    <Icon name="arrow_forward" size="sm" className="ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================
            CTA 섹션
            ======================================== */}
        <section className="py-24 px-6 bg-linear-to-b from-background to-background-white dark:from-background dark:to-[#0d1218]">
          <div className="container mx-auto max-w-[800px] text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-text mb-6">
              워크플로우를 간소화할 준비가 되셨나요?
            </h2>
            <p className="text-lg text-text-secondary mb-10 max-w-[600px] mx-auto">
              오늘 수천 명의 프로젝트 매니저와 함께 계획 프로세스를
              최적화하세요. 10000 년동안 무료 체험을 시작하세요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button variant="primary" size="lg">
                  지금 가입하기
                </Button>
              </Link>
              <Button variant="outline" size="lg" onClick={handleSalesClick}>
                영업팀 문의
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <Footer />
    </div>
  );
}
