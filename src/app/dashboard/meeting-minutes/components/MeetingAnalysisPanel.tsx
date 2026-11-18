/**
 * @file src/app/dashboard/meeting-minutes/components/MeetingAnalysisPanel.tsx
 * @description
 * 회의록 그리드 오른쪽의 AI 분석 패널입니다. 선택한 회의록의 요약 · 해설 · 논리적 모순 · 액션 항목 · 추가 확인 사항을 보여 줍니다.
 *
 * 초보자 가이드:
 * - 그리드에서 행을 클릭하면 그 회의록이 선택되어 여기에 보인다. page.tsx 가 회의록이 바뀔 때 key 로 패널을 새로 그린다.
 * - "AI 분석" 버튼 → POST 로 분석 시작(202) → 끝날 때까지 3초마다 조회 (hooks: useMeetingMinuteAnalysis).
 * - 결과는 서버에 저장되어 다른 사람도 같은 분석을 본다. 분석 뒤 회의록이 바뀌면 "다시 분석" 을 권한다.
 * - AI 는 로그인 사용자의 AI 설정(설정 페이지)을 쓴다. 설정이 없으면 서버 오류 문구를 그대로 보여 준다.
 * - 결과가 있으면 머리의 "크게 보기"(open_in_full) 버튼으로 넓은 모달(Modal size="full")에서 2단으로 본다.
 *   모달도 같은 조회 · 실행 상태를 쓰므로 모달에서 "다시 분석" 해도 패널과 함께 바뀐다.
 */

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Icon, Button, Modal } from "@/components/ui";
import { useMeetingMinuteAnalysis, useAnalyzeMeetingMinute } from "@/hooks";
import type { MeetingMinuteAnalysis } from "@/lib/api";
import { formatDate, formatTimeRange, type MeetingMinute } from "../types";
import { MeetingAnalysisSections } from "./MeetingAnalysisSections";

/** 안내 줄 (상태색은 아이콘 · 글자, 면은 500/10) */
function Notice({ tone, icon, spin, children }: { tone: "info" | "warning" | "error"; icon: string; spin?: boolean; children: React.ReactNode }) {
  const toneClass = {
    info: "bg-primary/10 border-primary/20 text-primary",
    warning: "bg-warning/10 border-warning/20 text-warning",
    error: "bg-error/10 border-error/20 text-error",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-sm ${toneClass}`}>
      <Icon name={icon} size="xs" className={`mt-0.5 shrink-0 ${spin ? "animate-spin motion-reduce:animate-none" : ""}`} />
      <span>{children}</span>
    </div>
  );
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 상태 안내 + 결과 섹션 + 분석 정보 (패널 · 크게 보기 모달이 같이 쓴다) */
function AnalysisContent({
  analysis,
  running,
  startError,
  wide = false,
}: {
  analysis: MeetingMinuteAnalysis | null;
  running: boolean;
  startError: unknown;
  wide?: boolean;
}) {
  return (
    <>
      {startError ? (
        <Notice tone="error" icon="error">
          {startError instanceof Error ? startError.message : "분석을 시작하지 못했습니다."}
        </Notice>
      ) : null}
      {running && (
        <Notice tone="info" icon="progress_activity" spin>
          AI 가 회의록을 분석하고 있습니다. 보통 30초에서 1분 걸립니다.
        </Notice>
      )}
      {!running && analysis?.status === "ERROR" && (
        <Notice tone="error" icon="error">
          분석하지 못했습니다. {analysis.error}
        </Notice>
      )}
      {!running && analysis?.stale && analysis.result && (
        <Notice tone="warning" icon="update">
          분석한 뒤에 회의록이 바뀌었습니다. 다시 분석하면 최신 내용으로 정리합니다.
        </Notice>
      )}
      {analysis?.result && (
        <div className={running ? "opacity-50" : undefined}>
          <MeetingAnalysisSections result={analysis.result} wide={wide} />
        </div>
      )}
    </>
  );
}

/** 분석 정보 줄 (AI · 요청자 · 시각 + 확인 안내) */
function AnalysisMeta({ analysis }: { analysis: MeetingMinuteAnalysis }) {
  if (!analysis.result || !analysis.completedAt) return null;
  return (
    <>
      {[analysis.model, analysis.requestedByName, `${formatDateTime(analysis.completedAt)} 분석`].filter(Boolean).join(" · ")}
      <br />
      AI 가 만든 결과입니다. 원문과 대조해 확인하세요.
    </>
  );
}

export function MeetingAnalysisPanel({ minute }: { minute: MeetingMinute | null }) {
  const query = useMeetingMinuteAnalysis(minute?.id ?? null);
  const start = useAnalyzeMeetingMinute();
  const [enlarged, setEnlarged] = useState(false); // 크게 보기 모달
  const analysis = query.data?.analysis ?? null;
  const running = analysis?.status === "RUNNING" || start.isPending;
  const noItems = !!minute && minute.items.length === 0;

  const analyzeButton = minute && (
    <Button
      variant="outline"
      size="sm"
      leftIcon={running ? "hourglass_top" : analysis ? "refresh" : "psychology"}
      onClick={() => start.mutate(minute.id)}
      disabled={running || noItems || query.isLoading}
      title={noItems ? "회의 내용이 없어 분석할 수 없습니다" : undefined}
      className="shrink-0 whitespace-nowrap"
    >
      {running ? "분석 중" : analysis ? "다시 분석" : "AI 분석"}
    </Button>
  );

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl flex flex-col xl:max-h-[calc(100vh-7rem)]">
      {/* 머리: 제목 + 실행 버튼 */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border dark:border-border-dark">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text dark:text-white">
            <Icon name="psychology" size="xs" className="text-primary" />
            AI 분석
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary truncate" title={minute ? `${minute.code} ${minute.title}` : undefined}>
            {minute ? (
              <>
                <span className="font-mono tabular-nums">{minute.code}</span> {minute.title}
              </>
            ) : (
              "선택한 회의록 없음"
            )}
          </p>
        </div>
        {minute && (
          <div className="flex items-center gap-1 shrink-0">
            {analysis?.result && (
              <button
                type="button"
                onClick={() => setEnlarged(true)}
                aria-label="AI 분석 크게 보기"
                title="크게 보기"
                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icon name="open_in_full" size="xs" />
              </button>
            )}
            {analyzeButton}
          </div>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!minute && (
          <div className="py-10 text-center">
            <Icon name="ads_click" size="xl" className="text-text-secondary mx-auto mb-3" />
            <p className="text-sm text-text dark:text-white">목록에서 회의록을 고르세요.</p>
            <p className="mt-1 text-xs text-text-secondary">요약 · 해설 · 논리적 모순 · 액션 항목 · 추가 확인 사항을 여기서 봅니다.</p>
          </div>
        )}

        {minute && query.isLoading && <p className="text-sm text-text-secondary">분석 결과를 불러오는 중...</p>}
        {minute && query.error && (
          <Notice tone="error" icon="error">
            {query.error instanceof Error ? query.error.message : "분석 결과를 불러오지 못했습니다."}
          </Notice>
        )}

        {minute && !query.isLoading && !analysis && !running && (
          <div className="py-6 text-center">
            <Icon name="psychology" size="xl" className="text-text-secondary mx-auto mb-3" />
            <p className="text-sm text-text dark:text-white">아직 분석하지 않았습니다.</p>
            <p className="mt-1 text-xs text-text-secondary">
              {noItems ? "회의 내용을 먼저 입력하세요." : "AI 분석을 누르면 회의 내용을 읽고 요약과 확인할 점을 정리합니다."}
            </p>
          </div>
        )}

        <AnalysisContent analysis={analysis} running={running} startError={start.error} />
      </div>

      {/* 바닥: 분석 정보 */}
      {analysis?.result && analysis.completedAt && (
        <p className="px-4 py-2 border-t border-border dark:border-border-dark text-[11px] text-text-secondary">
          <AnalysisMeta analysis={analysis} />
        </p>
      )}

      {/* 크게 보기: 같은 조회 결과를 넓은 모달에 2단으로 (분석 중이면 여기서도 계속 갱신된다).
          패널을 감싼 sticky 영역이 쌓임 맥락을 만들어 모달이 좌측 메뉴 뒤로 깔리므로 body 로 portal 한다 */}
      {minute && enlarged && createPortal(
        <Modal isOpen={enlarged} onClose={() => setEnlarged(false)} title={`AI 분석 · ${minute.code} ${minute.title}`} size="full">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border dark:border-border-dark">
              <p className="text-sm text-text-secondary">
                {[formatDate(minute.meetingDate), formatTimeRange(minute.startTime, minute.endTime), minute.location, minute.author]
                  .filter((v) => v && v !== "-")
                  .join(" · ")}
                <span className="ml-2">회의 내용 {minute.items.length}건</span>
              </p>
              {analyzeButton}
            </div>
            <AnalysisContent analysis={analysis} running={running} startError={start.error} wide />
            {analysis && (
              <p className="pt-3 border-t border-border dark:border-border-dark text-xs text-text-secondary">
                <AnalysisMeta analysis={analysis} />
              </p>
            )}
          </div>
        </Modal>,
        document.body
      )}
    </div>
  );
}
