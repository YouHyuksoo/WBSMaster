/**
 * @file src/app/(auth)/login/page.tsx
 * @description
 * 로그인 및 회원가입 페이지입니다.
 * 이메일/비밀번호를 통한 내부 인증을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **탭 전환**: Login / Sign Up 탭으로 모드 전환
 * 2. **폼 제출**: handleSubmit 함수에서 Supabase Auth 호출
 * 3. **회원가입**: 이메일 확인 없이 바로 로그인 가능
 *
 * 수정 방법:
 * - 폼 필드 추가: form 내에 Input 컴포넌트 추가
 * - 유효성 검사 추가: handleSubmit 함수에서 검증 로직 추가
 */

"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Icon, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/** 인증 모드 타입 */
type AuthMode = "login" | "signup";

/**
 * 로그인 폼 컴포넌트 (useSearchParams 사용)
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  // 상태 관리
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (authMode === "login") {
        // 로그인
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      } else {
        // 회원가입
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            // 이메일 확인 비활성화 (Supabase 설정에서도 변경 필요)
            emailRedirectTo: undefined,
          },
        });
        if (error) throw error;

        // 회원가입 성공 후 바로 로그인 시도
        if (data.user) {
          setSuccess("회원가입이 완료되었습니다! 로그인해주세요.");
          setAuthMode("login");
          setPassword("");
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "오류가 발생했습니다.";
      // 에러 메시지 한글화
      if (errorMessage.includes("Invalid login credentials")) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else if (errorMessage.includes("User already registered")) {
        setError("이미 등록된 이메일입니다.");
      } else if (errorMessage.includes("Password should be at least")) {
        setError("비밀번호는 최소 6자 이상이어야 합니다.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      {/* 좌측: 이미지 및 슬로건 영역 */}
      <div className="relative hidden w-0 flex-1 lg:block">
        {/* 배경 이미지 */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070')",
          }}
        />
        {/* 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-blue-900/60 mix-blend-multiply" />
        {/* 도트 패턴 */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* 콘텐츠 */}
        <div className="absolute bottom-0 left-0 right-0 p-16 text-white z-10 flex flex-col justify-end h-full">
          {/* 상단 배지 */}
          <div className="mb-auto mt-12 flex items-start">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <Icon name="auto_awesome" size="sm" className="text-white" />
              <span className="text-sm font-medium tracking-wide">
                AI-Powered Workflow
              </span>
            </div>
          </div>

          {/* 슬로건 */}
          <div className="max-w-xl">
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight mb-6">
              Plan smarter with <br /> Intelligent WBS.
            </h1>
            <p className="text-lg text-white/80 leading-relaxed mb-8 max-w-md font-medium">
              프로젝트 분해 구조를 간소화하고, 실시간으로 협업하며, AI가
              리소스 할당을 최적화하도록 하세요.
            </p>

            {/* 신뢰 지표 */}
            <div className="flex items-center gap-4 text-white/60 text-sm">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full ring-2 ring-primary bg-white/20 flex items-center justify-center"
                  >
                    <Icon name="person" size="xs" className="text-white/60" />
                  </div>
                ))}
              </div>
              <span>10,000명 이상의 PM이 신뢰합니다</span>
            </div>
          </div>
        </div>
      </div>

      {/* 우측: 로그인/회원가입 폼 */}
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-background-white dark:bg-background relative overflow-y-auto">
        <div className="mx-auto w-full max-w-sm lg:w-[420px]">
          {/* 헤더 */}
          <div className="mb-10">
            {/* 로고 */}
            <Link href="/" className="flex items-center gap-3 text-primary mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/30">
                <Icon name="account_tree" size="md" className="text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-text">
                WBS Master
              </span>
            </Link>

            <h2 className="text-3xl font-bold tracking-tight text-text">
              {authMode === "login" ? "다시 오신 것을 환영합니다" : "시작하기"}
            </h2>
            <p className="mt-3 text-base text-text-secondary">
              {authMode === "login"
                ? "계정에 로그인하세요."
                : "팀과 효율적으로 협업하세요."}
            </p>
          </div>

          {/* 탭 전환 */}
          <div className="mb-8 p-1.5 bg-[#f0f2f4] dark:bg-[#1c2730] rounded-xl flex">
            <button
              type="button"
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-center transition-all ${
                authMode === "login"
                  ? "bg-background-white dark:bg-background text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
              onClick={() => {
                setAuthMode("login");
                setError(null);
                setSuccess(null);
              }}
            >
              로그인
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-center transition-all ${
                authMode === "signup"
                  ? "bg-background-white dark:bg-background text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
              onClick={() => {
                setAuthMode("signup");
                setError(null);
                setSuccess(null);
              }}
            >
              회원가입
            </button>
          </div>

          {/* 성공 메시지 */}
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
              {success}
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {error}
            </div>
          )}

          {/* 로그인/회원가입 폼 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 이름 (회원가입 시) */}
            {authMode === "signup" && (
              <Input
                label="이름"
                type="text"
                leftIcon="person"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}

            {/* 이메일 */}
            <Input
              label="이메일 주소"
              type="email"
              leftIcon="mail"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            {/* 비밀번호 */}
            <div>
              <Input
                label="비밀번호"
                type="password"
                leftIcon="lock"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                required
              />
              {authMode === "signup" && (
                <p className="mt-2 text-xs text-text-secondary">
                  비밀번호는 최소 6자 이상이어야 합니다.
                </p>
              )}
            </div>

            {/* 제출 버튼 */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                rightIcon="arrow_forward"
              >
                {authMode === "login" ? "로그인" : "가입하기"}
              </Button>
            </div>
          </form>

          {/* 도움말 링크 */}
          <div className="mt-8 text-center">
            <p className="text-sm text-text-secondary">
              {authMode === "login" ? (
                <>
                  계정이 없으신가요?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="font-medium text-primary hover:text-primary-hover"
                  >
                    회원가입
                  </button>
                </>
              ) : (
                <>
                  이미 계정이 있으신가요?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="font-medium text-primary hover:text-primary-hover"
                  >
                    로그인
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 로딩 폴백 컴포넌트
 */
function LoginFormFallback() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background-white dark:bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-text-secondary">로딩 중...</p>
      </div>
    </div>
  );
}

/**
 * 로그인/회원가입 페이지 컴포넌트
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
