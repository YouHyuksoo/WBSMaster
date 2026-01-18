/**
 * @file src/app/dashboard/guide/page.tsx
 * @description
 * MES 프로젝트 요청 분류 및 처리 최종 가이드 페이지
 * 인터랙티브한 HTML 컴포넌트로 구성
 */

"use client";

import { Icon } from "@/components/ui";
import { useState, useEffect, useRef } from "react";
import { GuideSection } from "./components/GuideSection";
import { ClassificationCard } from "./components/ClassificationCard";
import { ProcessSteps } from "./components/ProcessSteps";

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("classification");
  const mainContentRef = useRef<HTMLDivElement>(null);

  /** 목차 항목 */
  const tocItems = [
    { id: "classification", label: "3가지 분류 정의", icon: "category" },
    { id: "decision-flow", label: "분류 의사결정 플로우", icon: "account_tree" },
    { id: "interview-guide", label: "현업 인터뷰 분석", icon: "mic" },
    { id: "process", label: "실무 처리 절차", icon: "task_alt" },
    { id: "common-mistakes", label: "자주 틀리는 분류", icon: "warning" },
    { id: "checklist", label: "핵심 체크리스트", icon: "checklist" },
    { id: "examples", label: "실무 예시", icon: "description" },
    { id: "tips", label: "성공 팁", icon: "emoji_events" },
  ];

  /** 섹션으로 스크롤 */
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element && mainContentRef.current) {
      const container = mainContentRef.current;
      const elementTop = element.offsetTop;
      const offset = 100;

      container.scrollTo({
        top: elementTop - offset,
        behavior: "smooth",
      });
      setActiveSection(id);
    }
  };

  /** Intersection Observer로 현재 보이는 섹션 추적 */
  useEffect(() => {
    const options = {
      root: mainContentRef.current,
      rootMargin: "-100px 0px -66%",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, options);

    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-screen bg-background dark:bg-background-dark flex flex-col">
      <div className="max-w-[1600px] mx-auto flex-1 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="p-6 border-b border-border dark:border-border-dark flex-shrink-0">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Icon name="menu_book" size="lg" className="text-primary" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
              MES 프로젝트: 요청 분류 및 처리 가이드
            </span>
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            고객요청, 이슈, 협의요청을 정확히 분류하고 효율적으로 처리하는 방법
          </p>
        </div>

        {/* 메인 레이아웃 */}
        <div className="flex gap-6 p-6 flex-1 overflow-hidden">
          {/* 좌측 목차 */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 h-full overflow-y-auto sticky top-0">
              <h2 className="text-sm font-bold text-text dark:text-white mb-4 flex items-center gap-2">
                <Icon name="format_list_bulleted" size="sm" className="text-primary" />
                목차
              </h2>
              <nav className="space-y-1">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                      activeSection === item.id
                        ? "bg-primary/10 text-primary font-medium scale-105"
                        : "text-text-secondary hover:text-text dark:hover:text-white hover:bg-surface dark:hover:bg-background-dark"
                    }`}
                  >
                    <Icon name={item.icon} size="xs" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* 우측 컨텐츠 */}
          <main ref={mainContentRef} className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* 📌 3가지 분류 정의 */}
            <GuideSection id="classification" title="3가지 분류 정의" icon="category">
              <div className="space-y-5">
                <ClassificationCard
                  type="request"
                  title="고객요청 (Customer Request)"
                  emoji="1️⃣"
                  definition={[
                    "고객이 원하는 새로운 기능/프로세스 변경",
                    "계약서에 명시되거나 협의 과정에서 나온 요구사항",
                  ]}
                  features={[
                    "설계 변경 필요 (기능 레벨)",
                    "비용/일정 영향 큼",
                    "계약 범위 내/외 판단 필요",
                    "변경관리 프로세스 필수",
                  ]}
                  statusFlow={[
                    "REVIEWING (검토)",
                    "    ↓",
                    "APPROVED (승인) / REJECTED (거절)",
                    "    ↓",
                    "IN_DEVELOPMENT (개발)",
                    "    ↓",
                    "APPLIED (적용) / HOLD (보류)",
                  ]}
                  handler="PM + 고객 (변경관리 위원회)"
                  duration="1~4주 (협의 + 승인)"
                  examples={[
                    "IVI공정에서 수량 검수 자동화 기능 추가",
                    "보고서 형식을 PDF로 변경해달라",
                    "기계 5대 추가로 MES 연결",
                  ]}
                />

                <ClassificationCard
                  type="issue"
                  title="이슈 (Issue)"
                  emoji="2️⃣"
                  definition={[
                    "설계된 기능이 제대로 작동하지 않는 버그/결함",
                    "명확한 오류 발생, 재현 가능",
                  ]}
                  features={[
                    "코드 수정으로 해결 가능",
                    "심각도 기반 우선순위",
                    "계약 범위 내 (품질 문제)",
                    "즉시 처리 필요",
                  ]}
                  statusFlow={[
                    "OPEN (발견)",
                    "    ↓",
                    "IN_PROGRESS (수정 중)",
                    "    ↓",
                    "RESOLVED (해결) / WONT_FIX (수정 안함)",
                    "    ↓",
                    "CLOSED (완료)",
                  ]}
                  handler="개발팀 (기술 담당자)"
                  duration="심각도별 (즉시 ~ 1주)"
                  examples={[
                    "로그인 화면에서 특수문자 비밀번호 오류 (재현율 100%)",
                    "로그 시간이 UTC로 저장됨",
                    "바코드 스캔이 간헐적으로 실패",
                  ]}
                />

                <ClassificationCard
                  type="discussion"
                  title="협의요청 (Discussion Item)"
                  emoji="3️⃣"
                  definition={[
                    "버그도 아니고 새 기능도 아닌데, 어떻게 할지 결정이 필요한 사항",
                    "고객과 의사결정을 거쳐 최종 처리 방향 결정",
                  ]}
                  features={[
                    "어느 단계에서든 발생 (분석/설계/구현/테스트/운영)",
                    "여러 선택지 존재",
                    "기술적 제약/한계 포함 가능",
                    "최종적으로 고객요청 또는 BLOCKED로 변환",
                  ]}
                  statusFlow={[
                    "DISCUSSING (협의 중)",
                    "    ↓",
                    "(고객 의사결정)",
                    "    ↓",
                    "→ 고객요청 변환 (REQ-XXXX)",
                    "→ 업무협조 분해 (COOP-XXXX)",
                    "→ BLOCKED (지연/미적용)",
                    "→ 종료 (결정완료)",
                  ]}
                  handler="기술팀 + PM + 고객"
                  duration="2~7일 (분석 + 협의)"
                  examples={[
                    "데이터 시간 기준이 다른데 어떻게 통합할까?",
                    "구형 설비라 실시간 수집 불가능한데 어떻게?",
                    "화면 레이아웃 변경 요청이 들어왔는데 가능한가?",
                  ]}
                />
              </div>
            </GuideSection>

            {/* 🔍 분류 의사결정 플로우 */}
            <GuideSection id="decision-flow" title="분류 의사결정 플로우" icon="account_tree">
              <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 p-6 rounded-xl border border-primary/20">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-block px-6 py-3 bg-white dark:bg-surface-dark rounded-lg shadow-sm">
                      <p className="font-bold text-text dark:text-white">신청이 들어왔다</p>
                    </div>
                    <div className="my-3">
                      <Icon name="arrow_downward" className="text-text-secondary" />
                    </div>
                  </div>

                  {/* Q1 */}
                  <div className="bg-white dark:bg-surface-dark rounded-lg p-5 shadow-sm">
                    <p className="font-bold text-primary mb-2">Q1. 명확한 오류/버그가 있는가?</p>
                    <p className="text-xs text-text-secondary mb-3">(에러 메시지, 재현 가능, 설계와 다름)</p>
                    <div className="space-y-2 ml-4">
                      <div className="flex items-center gap-2">
                        <Icon name="check_circle" size="xs" className="text-success" />
                        <span className="text-sm text-success font-medium">YES → 이슈 (즉시 개발팀 할당)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="cancel" size="xs" className="text-text-secondary" />
                        <span className="text-sm text-text-secondary">NO → Q2로</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Icon name="arrow_downward" className="text-text-secondary" />
                  </div>

                  {/* Q2 */}
                  <div className="bg-white dark:bg-surface-dark rounded-lg p-5 shadow-sm">
                    <p className="font-bold text-primary mb-2">Q2. 고객이 새로운 기능을 원하는가?</p>
                    <p className="text-xs text-text-secondary mb-3">(새 기능 추가, 프로세스 변경, 기능 확장)</p>
                    <div className="space-y-2 ml-4">
                      <div className="flex items-center gap-2">
                        <Icon name="check_circle" size="xs" className="text-success" />
                        <span className="text-sm text-success font-medium">YES → 고객요청 (변경관리 프로세스)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="cancel" size="xs" className="text-text-secondary" />
                        <span className="text-sm text-text-secondary">NO → Q3으로</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Icon name="arrow_downward" className="text-text-secondary" />
                  </div>

                  {/* Q3 */}
                  <div className="bg-white dark:bg-surface-dark rounded-lg p-5 shadow-sm">
                    <p className="font-bold text-primary mb-2">Q3. 어떻게 할지 결정이 필요한가?</p>
                    <p className="text-xs text-text-secondary mb-3">(불명확함, 여러 선택지, 고객과 협의 필요)</p>
                    <div className="space-y-2 ml-4">
                      <div className="flex items-center gap-2">
                        <Icon name="check_circle" size="xs" className="text-success" />
                        <span className="text-sm text-success font-medium">YES → 협의요청 (PM이 주도)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="cancel" size="xs" className="text-text-secondary" />
                        <span className="text-sm text-text-secondary">NO → 기타 (프로젝트 관리/로깅)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GuideSection>

            {/* 🎤 현업 인터뷰 분석 가이드 */}
            <GuideSection id="interview-guide" title="현업 인터뷰 분석 가이드" icon="mic">
              <div className="space-y-5">
                {/* 왜 필요한가 */}
                <div className="bg-warning/5 border-l-4 border-warning rounded-r-xl p-5">
                  <h3 className="text-base font-bold text-warning mb-3">📌 왜 필요한가?</h3>
                  <p className="text-sm italic text-text dark:text-white mb-3">
                    "지금은 생산량을 수동으로 기록하는데요... 그래서 실수도 많고, 시간도 오래 걸리고... 이걸 자동으로 할 수 있으면 좋을 텐데..."
                  </p>
                  <div className="space-y-1.5 ml-4 text-sm">
                    <div className="flex items-start gap-2">
                      <Icon name="error_outline" size="xs" className="text-warning mt-0.5" />
                      <span className="text-text dark:text-white">여러 정보가 혼재 (현황 + 문제점 + 원하는 것 + 기술 제약)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Icon name="error_outline" size="xs" className="text-warning mt-0.5" />
                      <span className="text-text dark:text-white">어디까지가 요구사항인지 불명확</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Icon name="error_outline" size="xs" className="text-warning mt-0.5" />
                      <span className="text-text dark:text-white">정확한 분류 어려움</span>
                    </div>
                  </div>
                </div>

                {/* 5가지 카테고리 */}
                <div>
                  <h3 className="text-base font-bold text-text dark:text-white mb-3">1단계: 인터뷰 내용을 5가지로 분해</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { emoji: "1️⃣", title: "현재 운영 방식", subtitle: "AS-IS", color: "primary", items: ["누가?", "얼마나?", "어떤 도구?"] },
                      { emoji: "2️⃣", title: "문제점", subtitle: "Pain Points", color: "error", items: ["실수?", "시간?", "비용?"] },
                      { emoji: "3️⃣", title: "원하는 결과", subtitle: "TO-BE", color: "success", items: ["뭘?", "목표?", "언제?"] },
                      { emoji: "4️⃣", title: "기술적 제약", subtitle: "Technical Limits", color: "warning", items: ["시스템?", "모델?", "호환?"] },
                      { emoji: "5️⃣", title: "궁금한 점", subtitle: "Questions", color: "info", items: ["가능?", "비용?", "기간?"] },
                    ].map((category, idx) => (
                      <div key={idx} className={`p-3 bg-${category.color}/5 border border-${category.color}/20 rounded-lg hover:shadow-md transition-shadow`}>
                        <div className="text-lg mb-1">{category.emoji}</div>
                        <p className={`font-bold text-${category.color} text-xs mb-1`}>{category.title}</p>
                        <p className="text-[10px] text-text-secondary mb-2">{category.subtitle}</p>
                        <ul className="space-y-0.5">
                          {category.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="text-[10px] text-text dark:text-white">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 핵심 팁 */}
                <div className="bg-gradient-to-r from-success/10 to-success/5 border border-success/30 rounded-xl p-5">
                  <h3 className="text-base font-bold text-success mb-3 flex items-center gap-2">
                    <Icon name="tips_and_updates" size="sm" />
                    💡 핵심 팁
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-bold text-error mb-2 text-sm">❌ 하지 말 것</p>
                      <ul className="space-y-1 text-xs text-text dark:text-white ml-4">
                        <li>• 즉시 분류하기</li>
                        <li>• 바로 개발 가능성 판단하기</li>
                        <li>• 부분적 정보로 결정하기</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold text-success mb-2 text-sm">✅ 해야 할 것</p>
                      <ul className="space-y-1 text-xs text-text dark:text-white ml-4">
                        <li>• 5가지 카테고리로 분해하며 듣기</li>
                        <li>• "구체적으로 뭔가요?" 질문하기</li>
                        <li>• 정리 시트에 기록하기</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </GuideSection>

            {/* ✅ 실무 처리 절차 */}
            <GuideSection id="process" title="실무 처리 절차" icon="task_alt">
              <div className="space-y-5">
                <ProcessSteps
                  title="고객요청 처리"
                  color="primary"
                  steps={[
                    { title: "신청 접수 (접수자)", description: ["요청 내용, 출처, 영향도 정리"] },
                    { title: "PM 검토 (1일)", description: ["계약 범위 확인", "비용/일정 영향도 분석"] },
                    { title: "변경관리 회의 (1주)", description: ["고객 + PM + 기술리드", "범위/비용/일정 협상"] },
                    { title: "승인", description: ["APPROVED → 개발 일정 추가", "REJECTED → 고객 통보"] },
                    { title: "개발/테스트", description: ["IN_DEVELOPMENT → APPLIED"] },
                  ]}
                />

                <ProcessSteps
                  title="이슈 처리"
                  color="error"
                  steps={[
                    { title: "이슈 등록 (발견자)", description: ["제목, 설명, 재현 방법, 심각도 기입"] },
                    { title: "PM 심각도 판단 (1시간)", description: ["CRITICAL/HIGH/MEDIUM/LOW 결정", "응답 시간 설정"] },
                    { title: "개발팀 할당 (즉시)", description: ["OPEN → 담당자 배정", "원인 분석 시작"] },
                    { title: "수정 (심각도별)", description: ["IN_PROGRESS", "코드 수정 + 단위테스트"] },
                    { title: "QA 재검증 (1시간)", description: ["오류 재현 불가 확인", "RESOLVED"] },
                    { title: "배포 및 완료", description: ["CLOSED"] },
                  ]}
                />

                <ProcessSteps
                  title="협의요청 처리"
                  color="warning"
                  steps={[
                    { title: "협의 등록 (발견자)", description: ["DISCUSSING 상태로 등록", "협의 주제 명확히 정의"] },
                    { title: "분석 (기술팀/PM)", description: ["현황 파악", "선택지 최소 2개 이상 도출", "비용/일정 영향도 분석"] },
                    { title: "고객 협의 (PM 주도)", description: ["각 선택지 장단점 설명", "고객 피드백 수집"] },
                    { title: "의사결정 (고객)", description: ["선택지 중 선택", "또는 연기/거절 결정"] },
                    { title: "변환 처리", description: ["고객요청으로 변환 (REQ-XXXX)", "또는 업무협조로 분해 (COOP-XXXX)", "또는 BLOCKED 유지"] },
                  ]}
                />
              </div>
            </GuideSection>

            {/* 🚨 자주 틀리는 분류 */}
            <GuideSection id="common-mistakes" title="자주 틀리는 분류" icon="warning">
              <div className="space-y-4">
                {[
                  {
                    title: "협의요청을 고객요청으로",
                    situation: "지금 설계가 이렇게 되어 있는데, 고객이 다르게 하고 싶대요",
                    wrong: "설계 변경이 정해지지 않았는데 요청으로 등록",
                    right: ["PM이 '다르게'의 의미 명확화", "선택지 제시", "고객 의사결정 후 고객요청으로 변환"],
                  },
                  {
                    title: "협의요청을 이슈로",
                    situation: "분석 결과 현재 운영 방식으로는 이 부분이 불명확합니다",
                    wrong: "버그가 아니므로 개발팀이 해결 불가",
                    right: ["PM이 고객과 함께 의사결정", "명확한 방향 결정 후 진행"],
                  },
                  {
                    title: "이슈인데 협의요청으로",
                    situation: "로그인이 안 된다 (매번 발생, 에러 메시지 있음)",
                    wrong: "이미 버그가 명확함, 결정할 게 없음",
                    right: ["즉시 개발팀 할당", "빠른 수정"],
                  },
                ].map((mistake, idx) => (
                  <div key={idx} className="bg-error/5 border-l-4 border-error rounded-r-xl p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-error mb-2 text-sm">❌ {mistake.title}</h4>
                    <div className="space-y-2 text-xs">
                      <p className="text-text dark:text-white">
                        <strong>상황:</strong> "{mistake.situation}"
                      </p>
                      <p className="text-error">
                        <strong>❌ 틀린 이유:</strong> {mistake.wrong}
                      </p>
                      <div>
                        <p className="text-success font-bold mb-1">✅ 올바른 처리:</p>
                        <ul className="ml-4 space-y-0.5">
                          {mistake.right.map((item, itemIdx) => (
                            <li key={itemIdx} className="text-text dark:text-white">→ {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GuideSection>

            {/* 💡 핵심 체크리스트 */}
            <GuideSection id="checklist" title="핵심 체크리스트" icon="checklist">
              <div className="space-y-5">
                <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-5">
                  <h3 className="text-base font-bold text-text dark:text-white mb-4">신청을 받았을 때</h3>
                  <div className="space-y-3">
                    {[
                      { q: "버그인가?", yes: "이슈로 등록 (즉시 개발팀)", no: "2번으로" },
                      { q: "새 기능인가?", yes: "고객요청으로 등록 (변경관리)", no: "3번으로" },
                      { q: "결정 필요한가?", yes: "협의요청으로 등록 (PM + 고객)", no: "기타" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="size-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 text-sm">
                          <p className="font-bold text-text dark:text-white mb-1">{item.q}</p>
                          <p className="text-xs text-text-secondary">
                            <span className="text-success">✓ YES</span> → {item.yes}
                          </p>
                          <p className="text-xs text-text-secondary">
                            <span className="text-error">✗ NO</span> → {item.no}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { title: "이슈 등록 전", color: "error", items: ["재현 가능한가?", "에러 명확한가?", "코드로 해결?", "의사결정 불필요?"] },
                    { title: "고객요청 전", color: "primary", items: ["명시적 요청?", "새 기능/변경?", "설계 변경?", "비용/일정 영향?"] },
                    { title: "협의요청 전", color: "warning", items: ["버그 아님?", "명확 요청 아님?", "선택지 존재?", "의사결정 필요?"] },
                  ].map((checklist, idx) => (
                    <div key={idx} className={`bg-${checklist.color}/5 border border-${checklist.color}/20 rounded-xl p-4`}>
                      <h4 className={`font-bold text-${checklist.color} mb-3 text-sm`}>{checklist.title}</h4>
                      <ul className="space-y-1.5">
                        {checklist.items.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2 text-xs text-text dark:text-white">
                            <span className="text-text-secondary mt-0.5">☐</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </GuideSection>

            {/* 🎯 실무 예시 */}
            <GuideSection id="examples" title="실무 예시" icon="description">
              <div className="space-y-4">
                {[
                  {
                    title: "구형 설비의 기능 제약",
                    type: "협의요청",
                    color: "warning",
                    situation: "고객이 실시간 데이터 수집을 원하는데 구형 기계(2015)에는 네트워크 모듈이 없습니다",
                    process: ["PM이 기술팀과 분석 → 업그레이드 비용/기간 파악", "고객과 협의 → 옵션 제시 (업그레이드 ₩20M vs 수동입력 vs 포기)", "고객 선택 → 옵션 A", "변환 처리 → REQ-2026-001 + COOP-2026-001"],
                    result: "명확한 실행 계획 수립",
                  },
                  {
                    title: "명확한 버그",
                    type: "이슈",
                    color: "error",
                    situation: "로그인 화면에서 특수문자 비밀번호 입력하면 '형식 오류' 메시지 (재현율 100%)",
                    process: ["즉시 개발팀 할당", "1시간 내 원인 분석 (정규식 오류)", "4시간 내 수정 + 테스트", "QA 재검증 → 배포"],
                    result: "총 6시간 소요",
                  },
                ].map((example, idx) => (
                  <div key={idx} className={`bg-gradient-to-br from-${example.color}/10 to-${example.color}/5 border border-${example.color}/30 rounded-xl p-5 hover:shadow-lg transition-shadow`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`px-3 py-1 bg-${example.color}/20 text-${example.color} rounded-full text-xs font-bold`}>
                        {example.type}
                      </div>
                      <h4 className={`font-bold text-${example.color} flex-1`}>{example.title}</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-bold text-text dark:text-white mb-1 text-xs">상황</p>
                        <p className="text-text dark:text-white italic text-xs">"{example.situation}"</p>
                      </div>
                      <div>
                        <p className="font-bold text-text dark:text-white mb-1 text-xs">처리</p>
                        <ul className="space-y-1">
                          {example.process.map((step, stepIdx) => (
                            <li key={stepIdx} className="text-xs text-text dark:text-white flex items-start gap-2">
                              <span className="text-text-secondary">→</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-bold text-text dark:text-white mb-1 text-xs">결과</p>
                        <p className={`text-xs text-success font-medium`}>{example.result}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GuideSection>

            {/* 🚀 성공 팁 */}
            <GuideSection id="tips" title="성공 팁" icon="emoji_events">
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { title: "분류 핵심", icon: "checklist", color: "success", items: ["버그인가? → 이슈", "새 기능? → 고객요청", "결정 필요? → 협의요청"] },
                  { title: "협의요청 시", icon: "forum", color: "warning", items: ["PM이 주도", "선택지 제시", "고객과 협의", "명확한 결정"] },
                  { title: "상태 관리", icon: "track_changes", color: "primary", items: ["이슈: 빠른 처리", "고객요청: 명확한 결정", "협의요청: 변환 필수"] },
                ].map((tip, idx) => (
                  <div key={idx} className={`bg-gradient-to-br from-${tip.color}/10 to-${tip.color}/5 border border-${tip.color}/30 rounded-xl p-5 hover:scale-105 transition-transform`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name={tip.icon} className={`text-${tip.color}`} />
                      <h4 className={`font-bold text-${tip.color} text-sm`}>{tip.title}</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {tip.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-2 text-xs text-text dark:text-white">
                          <Icon name="arrow_forward" size="xs" className={`text-${tip.color} mt-0.5`} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-gradient-to-r from-primary/10 to-purple-500/10 border-2 border-primary/30 rounded-xl p-6 text-center">
                <p className="text-xl font-bold text-primary leading-relaxed">
                  정확한 분류 = 빠른 처리 = 프로젝트 성공 🎯
                </p>
              </div>
            </GuideSection>

            {/* 하단 안내 */}
            <div className="text-center text-text-secondary text-xs py-6">
              <p className="mb-1">이 가이드를 팀원과 공유하고 프로젝트 시작 전 함께 검토하세요.</p>
              <p className="text-[10px]">문서 버전: 2.0 | 최종 업데이트: 2026-01-18</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
