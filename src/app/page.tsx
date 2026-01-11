/**
 * @file src/app/page.tsx
 * @description
 * WBS Master 랜딩 페이지입니다.
 * Framer Motion을 활용한 역동적인 애니메이션이 적용되어 있습니다.
 *
 * 섹션 구성:
 * 1. Hero - 메인 타이틀, CTA 버튼, 대시보드 이미지 (순차 등장 애니메이션)
 * 2. Features - 주요 기능 3가지 소개 (스크롤 트리거 애니메이션)
 * 3. Stats - 통계 수치 (카운팅 애니메이션)
 * 4. Showcase - 드래그 앤 드롭 인터페이스 소개
 * 5. CTA - 회원가입 유도
 */

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
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

/** 통계 데이터 */
const stats = [
  { value: 10000, suffix: "+", label: "활성 사용자" },
  { value: 50000, suffix: "+", label: "생성된 프로젝트" },
  { value: 99.9, suffix: "%", label: "가동률" },
  { value: 4.9, suffix: "/5", label: "사용자 평점" },
];

/** 애니메이션 variants */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

/** 카운팅 애니메이션 훅 */
function useCountUp(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!startOnView || !isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // easeOutExpo
      const easeProgress = 1 - Math.pow(2, -10 * progress);
      setCount(easeProgress * end);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration, isInView, startOnView]);

  return { count, ref };
}

/** 통계 카드 컴포넌트 */
function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const { count, ref } = useCountUp(value);
  const displayValue = value < 100 ? count.toFixed(1) : Math.floor(count).toLocaleString();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="text-center"
    >
      <div className="text-4xl md:text-5xl font-black text-primary mb-2">
        {displayValue}{suffix}
      </div>
      <div className="text-text-secondary">{label}</div>
    </motion.div>
  );
}

/**
 * 랜딩 페이지 컴포넌트
 */
export default function LandingPage() {
  const toast = useToast();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // 패럴렉스 효과
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.3]);

  /** 영업팀 문의 클릭 핸들러 */
  const handleSalesClick = () => {
    toast.info("영업팀은 오늘도 한잔 마시고 있는중... 🍺");
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      {/* 스크롤 진행 바 */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* 헤더 */}
      <Header />

      {/* 메인 콘텐츠 */}
      <main className="flex-1">
        {/* ========================================
            Hero 섹션
            ======================================== */}
        <section className="relative px-6 py-12 lg:py-24 overflow-hidden">
          {/* 애니메이션 배경 그라데이션 */}
          <motion.div
            className="absolute -top-20 -right-20 size-[500px] rounded-full bg-primary/10 dark:bg-primary/5 blur-3xl pointer-events-none"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-40 -left-20 size-[300px] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-3xl pointer-events-none"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -20, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-0 left-1/2 size-[400px] rounded-full bg-green-500/5 blur-3xl pointer-events-none"
            animate={{
              scale: [1, 1.1, 1],
              y: [0, -40, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="container mx-auto max-w-[1200px]"
            style={{ y: heroY, opacity: heroOpacity }}
          >
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* 좌측: 텍스트 콘텐츠 */}
              <motion.div
                className="flex flex-col gap-6 lg:w-1/2"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* 배지 */}
                <motion.div
                  variants={itemVariants}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary"
                >
                  <motion.span
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Icon name="verified" size="xs" />
                  </motion.span>
                  <span>AI-Powered Project Management 2.0</span>
                </motion.div>

                {/* 메인 타이틀 */}
                <motion.h1
                  variants={itemVariants}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight text-text"
                >
                  Master Your Projects with{" "}
                  <motion.span
                    className="text-primary inline-block"
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{ duration: 5, repeat: Infinity }}
                    style={{
                      backgroundImage: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)",
                      backgroundSize: "200% 100%",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Intelligent WBS
                  </motion.span>
                </motion.h1>

                {/* 설명 */}
                <motion.p
                  variants={itemVariants}
                  className="text-lg text-text-secondary max-w-[540px] leading-relaxed"
                >
                  복잡한 목표를 실행 가능한 태스크로 변환하세요. 동적인 Gantt
                  차트로 성공을 시각화하고, AI가 몇 초 만에 워크플로우를
                  구조화합니다.
                </motion.p>

                {/* CTA 버튼 */}
                <motion.div variants={itemVariants} className="flex flex-wrap gap-4 pt-2">
                  <Link href="/login">
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button variant="primary" size="lg">
                        무료로 시작하기
                      </Button>
                    </motion.div>
                  </Link>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button variant="secondary" size="lg" leftIcon="play_circle">
                      데모 보기
                    </Button>
                  </motion.div>
                </motion.div>

                {/* 신뢰 지표 */}
                <motion.div
                  variants={itemVariants}
                  className="flex items-center gap-4 text-sm text-text-secondary pt-4"
                >
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, x: -20 }}
                        animate={{ scale: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                        className="size-8 rounded-full border-2 border-background-white bg-card flex items-center justify-center"
                      >
                        <Icon
                          name="person"
                          size="xs"
                          className="text-text-secondary"
                        />
                      </motion.div>
                    ))}
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3 }}
                  >
                    10,000명 이상의 프로젝트 매니저가 신뢰합니다
                  </motion.p>
                </motion.div>
              </motion.div>

              {/* 우측: 대시보드 이미지 */}
              <motion.div
                className="lg:w-1/2 w-full"
                initial={{ opacity: 0, x: 50, rotateY: -10 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
              >
                <motion.div
                  className="relative rounded-xl bg-linear-to-br from-gray-100 to-gray-200 dark:from-[#1e2936] dark:to-[#111827] p-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
                  whileHover={{ scale: 1.02, rotateY: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-[1px] z-0 rounded-xl" />
                  <div className="relative z-10 w-full aspect-4/3 rounded-lg bg-card overflow-hidden shadow-inner border border-white/50 dark:border-white/5">
                    {/* 윈도우 컨트롤 버튼 */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between bg-background-white/90 dark:bg-card/90 backdrop-blur-sm p-3 rounded-md shadow-sm border border-border">
                      <div className="flex gap-2">
                        <motion.div
                          className="size-3 rounded-full bg-red-400"
                          whileHover={{ scale: 1.3 }}
                        />
                        <motion.div
                          className="size-3 rounded-full bg-yellow-400"
                          whileHover={{ scale: 1.3 }}
                        />
                        <motion.div
                          className="size-3 rounded-full bg-green-400"
                          whileHover={{ scale: 1.3 }}
                        />
                      </div>
                      <div className="h-2 w-20 bg-border rounded-full" />
                    </div>
                    {/* 대시보드 미리보기 콘텐츠 - 애니메이션 */}
                    <div className="pt-16 px-4 pb-4 h-full flex flex-col gap-3">
                      <div className="flex gap-3 flex-1">
                        <motion.div
                          className="flex-1 bg-primary/10 rounded-lg p-3"
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ delay: 1, duration: 0.8 }}
                        >
                          <motion.div
                            className="h-2 w-16 bg-primary/30 rounded mb-2"
                            animate={{ width: ["40%", "70%", "40%"] }}
                            transition={{ duration: 3, repeat: Infinity }}
                          />
                          <div className="h-2 w-24 bg-primary/20 rounded" />
                        </motion.div>
                        <motion.div
                          className="flex-1 bg-green-500/10 rounded-lg p-3"
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ delay: 1.2, duration: 0.8 }}
                        >
                          <motion.div
                            className="h-2 w-16 bg-green-500/30 rounded mb-2"
                            animate={{ width: ["30%", "60%", "30%"] }}
                            transition={{ duration: 4, repeat: Infinity }}
                          />
                          <div className="h-2 w-20 bg-green-500/20 rounded" />
                        </motion.div>
                      </div>
                      <motion.div
                        className="h-24 bg-border/50 rounded-lg overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.4 }}
                      >
                        {/* 간트 차트 모의 애니메이션 */}
                        <div className="p-3 space-y-2">
                          {[1, 2, 3].map((i) => (
                            <motion.div
                              key={i}
                              className="h-4 bg-primary/20 rounded"
                              initial={{ width: 0 }}
                              animate={{ width: `${30 + i * 20}%` }}
                              transition={{ delay: 1.5 + i * 0.2, duration: 0.8 }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ========================================
            Stats 섹션 (새로 추가)
            ======================================== */}
        <section className="py-16 border-y border-border bg-card/50">
          <div className="container mx-auto max-w-[1000px] px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <StatCard
                  key={stat.label}
                  value={stat.value}
                  suffix={stat.suffix}
                  label={stat.label}
                  delay={index * 0.1}
                />
              ))}
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
            <motion.div
              className="mb-16 text-center max-w-[760px] mx-auto"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold tracking-tight text-text mb-4">
                Why WBS Master?
              </h2>
              <p className="text-lg text-text-secondary">
                복잡한 프로젝트를 분해하고, 책임을 할당하며, 타임라인을
                효율적으로 관리하는 데 필요한 모든 것을 제공합니다.
              </p>
            </motion.div>

            {/* 기능 카드 그리드 */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  variants={cardVariants}
                  whileHover={{ y: -10, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card hover className="h-full">
                    <CardHeader>
                      <motion.div
                        className={`flex size-12 items-center justify-center rounded-xl ${feature.iconBg}`}
                        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Icon
                          name={feature.icon}
                          size="lg"
                          className={feature.iconColor}
                        />
                      </motion.div>
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
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ========================================
            Showcase 섹션
            ======================================== */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-[1000px]">
            <motion.div
              className="overflow-hidden rounded-2xl bg-card shadow-xl border border-border"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex flex-col md:flex-row">
                {/* 이미지 영역 */}
                <motion.div
                  className="md:w-1/2 h-64 md:h-auto bg-linear-to-br from-primary/20 to-purple-500/20 relative group flex items-center justify-center overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                >
                  {/* 플로팅 아이콘들 */}
                  <motion.div
                    className="absolute"
                    animate={{
                      y: [0, -20, 0],
                      rotate: [0, 10, 0],
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <Icon
                      name="drag_indicator"
                      size="2xl"
                      className="text-primary"
                    />
                  </motion.div>
                  {/* 배경 장식 */}
                  <motion.div
                    className="absolute w-32 h-32 bg-primary/20 rounded-full blur-2xl"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </motion.div>

                {/* 텍스트 영역 */}
                <motion.div
                  className="flex flex-col justify-center p-8 md:p-12 md:w-1/2"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
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
                  <motion.div whileHover={{ x: 5 }}>
                    <Link
                      href="#"
                      className="inline-flex items-center font-bold text-primary hover:text-primary-hover transition-colors"
                    >
                      자세히 보기
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Icon name="arrow_forward" size="sm" className="ml-1" />
                      </motion.span>
                    </Link>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ========================================
            CTA 섹션
            ======================================== */}
        <section className="py-24 px-6 bg-linear-to-b from-background to-background-white dark:from-background dark:to-[#0d1218] relative overflow-hidden">
          {/* 배경 장식 */}
          <motion.div
            className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
            }}
            transition={{ duration: 12, repeat: Infinity }}
          />

          <motion.div
            className="container mx-auto max-w-[800px] text-center relative z-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.h2
              className="text-3xl sm:text-4xl font-black text-text mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              워크플로우를 간소화할 준비가 되셨나요?
            </motion.h2>
            <motion.p
              className="text-lg text-text-secondary mb-10 max-w-[600px] mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              오늘 수천 명의 프로젝트 매니저와 함께 계획 프로세스를
              최적화하세요. 무료로 시작하세요.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/login">
                <motion.div
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button variant="primary" size="lg">
                    지금 가입하기
                  </Button>
                </motion.div>
              </Link>
              <motion.div
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button variant="outline" size="lg" onClick={handleSalesClick}>
                  영업팀 문의
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* 푸터 */}
      <Footer />
    </div>
  );
}
