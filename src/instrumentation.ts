/**
 * @file src/instrumentation.ts
 * @description Next.js 서버 시작 시 지식관리 커밋 알림 작업자를 연결합니다.
 * 초보자 가이드:
 * - Edge/빌드 중에는 실행하지 않고, 연결 설정이 있을 때만 활성화됩니다.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { startKnowledgeWorker } = await import("@/lib/knowledge/worker");
    await startKnowledgeWorker();
  }
}
