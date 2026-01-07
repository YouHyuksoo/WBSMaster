/**
 * @file src/app/dashboard/help/page.tsx
 * @description
 * 도움말 페이지입니다.
 * 사용자 가이드 및 FAQ를 제공합니다.
 *
 * 초보자 가이드:
 * 1. **가이드**: 주요 기능별 사용 방법
 * 2. **FAQ**: 자주 묻는 질문
 * 3. **문의**: 지원팀 연락처
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input, Card } from "@/components/ui";

/** FAQ 항목 */
interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

/** FAQ 데이터 */
const faqItems: FAQItem[] = [
  {
    category: "시작하기",
    question: "WBS란 무엇인가요?",
    answer: "WBS(Work Breakdown Structure)는 프로젝트의 전체 작업 범위를 계층적으로 분해한 구조입니다. 프로젝트를 더 작고 관리하기 쉬운 작업 단위로 나누어 일정, 비용, 자원을 효과적으로 관리할 수 있습니다.",
  },
  {
    category: "시작하기",
    question: "새 프로젝트는 어떻게 만드나요?",
    answer: "대시보드에서 '새 프로젝트' 버튼을 클릭하거나, 프로젝트 목록 페이지에서 '+' 버튼을 눌러 새 프로젝트를 생성할 수 있습니다. 프로젝트 이름, 설명, 시작일, 종료일을 입력하면 됩니다.",
  },
  {
    category: "작업 관리",
    question: "작업을 추가하려면 어떻게 하나요?",
    answer: "WBS 보기에서 '작업 추가' 버튼을 클릭하거나, 작업 목록에서 상위 작업을 선택한 후 하위 작업을 추가할 수 있습니다. 칸반 보드에서도 각 컬럼의 '+' 버튼으로 작업을 추가할 수 있습니다.",
  },
  {
    category: "작업 관리",
    question: "작업 일정을 변경하려면 어떻게 하나요?",
    answer: "간트 차트에서 작업 바를 드래그하여 일정을 변경하거나, 작업을 클릭하여 상세 패널에서 시작일과 종료일을 직접 수정할 수 있습니다.",
  },
  {
    category: "팀 협업",
    question: "팀원을 초대하려면 어떻게 하나요?",
    answer: "'프로젝트 멤버 등록' 메뉴에서 '멤버 초대' 버튼을 클릭하고, 초대할 팀원의 이메일 주소와 역할을 입력하면 초대 메일이 발송됩니다.",
  },
  {
    category: "팀 협업",
    question: "작업 담당자를 변경하려면 어떻게 하나요?",
    answer: "작업을 클릭하여 상세 패널을 열고, '담당자' 필드에서 새로운 담당자를 선택하면 됩니다. 담당자 변경 시 해당 팀원에게 알림이 전송됩니다.",
  },
  {
    category: "설정",
    question: "휴무일 설정은 어떻게 하나요?",
    answer: "'휴무 달력' 메뉴에서 공휴일, 회사 휴무, 개인 휴가를 등록할 수 있습니다. 등록된 휴무일은 간트 차트 일정 계산에서 자동으로 제외됩니다.",
  },
  {
    category: "설정",
    question: "알림 설정을 변경하려면 어떻게 하나요?",
    answer: "'기준 설정' 메뉴의 '알림 설정' 섹션에서 이메일 알림, Slack 연동, 마감일 알림 등을 설정할 수 있습니다.",
  },
];

/** 가이드 카테고리 */
const guides = [
  {
    title: "시작하기",
    icon: "rocket_launch",
    color: "from-blue-500 to-indigo-600",
    items: ["프로젝트 생성", "WBS 구조 만들기", "작업 추가", "담당자 지정"],
  },
  {
    title: "간트 차트",
    icon: "calendar_view_week",
    color: "from-purple-500 to-pink-600",
    items: ["타임라인 보기", "일정 조정", "의존성 설정", "진행률 추적"],
  },
  {
    title: "칸반 보드",
    icon: "view_kanban",
    color: "from-orange-500 to-red-600",
    items: ["상태별 관리", "작업 이동", "필터링", "우선순위 설정"],
  },
  {
    title: "팀 협업",
    icon: "group",
    color: "from-green-500 to-teal-600",
    items: ["멤버 초대", "역할 관리", "작업 할당", "코멘트 달기"],
  },
];

/**
 * 도움말 페이지
 */
export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // FAQ 카테고리 목록
  const categories = [...new Set(faqItems.map((item) => item.category))];

  // 필터링된 FAQ
  const filteredFAQ = faqItems.filter((item) => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text dark:text-white mb-2">도움말 센터</h1>
        <p className="text-text-secondary">
          WBS Master 사용에 필요한 모든 정보를 찾아보세요
        </p>
      </div>

      {/* 검색 */}
      <div className="max-w-xl mx-auto">
        <Input
          leftIcon="search"
          placeholder="질문을 검색하세요..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 빠른 가이드 */}
      <div>
        <h2 className="text-xl font-bold text-text dark:text-white mb-4">빠른 시작 가이드</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {guides.map((guide) => (
            <Card key={guide.title} className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
              <div className={`h-2 bg-gradient-to-r ${guide.color}`} />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`size-10 rounded-lg bg-gradient-to-br ${guide.color} flex items-center justify-center`}>
                    <Icon name={guide.icon} size="sm" className="text-white" />
                  </div>
                  <h3 className="font-bold text-text dark:text-white">{guide.title}</h3>
                </div>
                <ul className="space-y-1">
                  {guide.items.map((item) => (
                    <li key={item} className="text-sm text-text-secondary flex items-center gap-2">
                      <Icon name="arrow_right" size="xs" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text dark:text-white">자주 묻는 질문</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-primary text-white"
                  : "bg-surface dark:bg-surface-dark text-text-secondary hover:text-text dark:hover:text-white"
              }`}
            >
              전체
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-white"
                    : "bg-surface dark:bg-surface-dark text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredFAQ.map((item, index) => (
            <div
              key={index}
              className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                className="w-full px-5 py-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-surface dark:bg-background-dark text-text-secondary">
                    {item.category}
                  </span>
                  <span className="font-medium text-text dark:text-white">{item.question}</span>
                </div>
                <Icon
                  name={expandedFAQ === index ? "expand_less" : "expand_more"}
                  size="sm"
                  className="text-text-secondary"
                />
              </button>
              {expandedFAQ === index && (
                <div className="px-5 pb-4 pt-0">
                  <p className="text-text-secondary leading-relaxed pl-[calc(theme(spacing.3)+theme(spacing.2)+4ch)]">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 추가 지원 */}
      <Card>
        <div className="p-6 text-center">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="support_agent" size="lg" className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-text dark:text-white mb-2">
            더 도움이 필요하신가요?
          </h3>
          <p className="text-text-secondary mb-4">
            원하는 답을 찾지 못하셨다면 지원팀에 문의해주세요
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="ghost" leftIcon="mail">
              이메일 문의
            </Button>
            <Button variant="primary" leftIcon="chat">
              실시간 채팅
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
