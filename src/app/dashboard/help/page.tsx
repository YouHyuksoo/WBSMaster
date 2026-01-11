/**
 * @file src/app/dashboard/help/page.tsx
 * @description
 * WBS Master 도움말 센터 페이지입니다.
 * 사용자 가이드, FAQ, 단축키, 기능별 상세 설명을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **activeTab**: 현재 선택된 탭 (가이드/FAQ/단축키/업데이트)
 * 2. **guides**: 기능별 상세 사용법
 * 3. **faqItems**: 자주 묻는 질문 목록
 * 4. **shortcuts**: 키보드 단축키 정보
 *
 * 수정 방법:
 * - 새로운 FAQ 추가: faqItems 배열에 객체 추가
 * - 가이드 추가: detailedGuides 배열에 새 가이드 객체 추가
 * - 단축키 추가: shortcuts 배열에 새 단축키 객체 추가
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input, Card } from "@/components/ui";

/** 탭 타입 정의 */
type TabType = "guide" | "faq" | "shortcuts" | "updates";

/** FAQ 항목 인터페이스 */
interface FAQItem {
  question: string;
  answer: string;
  category: string;
  tags?: string[];
}

/** 상세 가이드 인터페이스 */
interface DetailedGuide {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  sections: {
    title: string;
    content: string;
    tips?: string[];
  }[];
}

/** 단축키 그룹 인터페이스 */
interface ShortcutGroup {
  title: string;
  icon: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

/** 업데이트 항목 인터페이스 */
interface UpdateItem {
  version: string;
  date: string;
  type: "feature" | "improvement" | "fix";
  title: string;
  description: string;
}

/** FAQ 데이터 */
const faqItems: FAQItem[] = [
  // 시작하기 카테고리
  {
    category: "시작하기",
    question: "WBS란 무엇인가요?",
    answer:
      "WBS(Work Breakdown Structure)는 프로젝트의 전체 작업 범위를 계층적으로 분해한 구조입니다. 프로젝트를 더 작고 관리하기 쉬운 작업 단위로 나누어 일정, 비용, 자원을 효과적으로 관리할 수 있습니다. WBS Master에서는 트리 구조로 이를 시각화하여 직관적으로 관리할 수 있습니다.",
    tags: ["기본개념", "프로젝트관리"],
  },
  {
    category: "시작하기",
    question: "새 프로젝트는 어떻게 만드나요?",
    answer:
      "대시보드 상단의 '새 프로젝트' 버튼을 클릭하거나, 좌측 사이드바의 프로젝트 드롭다운에서 '+ 새 프로젝트'를 선택하세요. 프로젝트 이름, 설명, 시작일, 종료일을 입력하고 저장하면 바로 사용을 시작할 수 있습니다.",
    tags: ["프로젝트", "생성"],
  },
  {
    category: "시작하기",
    question: "대시보드에서 어떤 정보를 확인할 수 있나요?",
    answer:
      "대시보드에서는 현재 프로젝트의 전체 현황을 한눈에 파악할 수 있습니다. 작업 진행률, 요구사항 현황, 이슈 통계, 오늘의 할일, 마감 임박 작업 등 핵심 지표를 카드 형태로 보여줍니다. 각 카드를 클릭하면 상세 페이지로 이동합니다.",
    tags: ["대시보드", "현황"],
  },
  // WBS 관리 카테고리
  {
    category: "WBS 관리",
    question: "작업을 추가하려면 어떻게 하나요?",
    answer:
      "WBS 보기에서 '+ 작업 추가' 버튼을 클릭하거나, 기존 작업 옆의 '더보기' 메뉴에서 '하위 작업 추가'를 선택하세요. 작업명, 담당자, 시작일, 종료일, 예상 공수를 입력하여 새 작업을 생성할 수 있습니다.",
    tags: ["작업", "추가"],
  },
  {
    category: "WBS 관리",
    question: "작업 간의 의존성은 어떻게 설정하나요?",
    answer:
      "작업 상세 패널에서 '의존성' 탭을 선택하고, 선행 작업이나 후행 작업을 지정할 수 있습니다. 의존성이 설정되면 간트 차트에서 연결선으로 표시되며, 선행 작업이 완료되어야 후행 작업을 시작할 수 있습니다.",
    tags: ["의존성", "선행작업"],
  },
  {
    category: "WBS 관리",
    question: "작업의 진행률은 어떻게 업데이트하나요?",
    answer:
      "작업을 클릭하여 상세 패널을 열고, 진행률 슬라이더를 조절하거나 직접 퍼센트 값을 입력하세요. 하위 작업이 있는 경우, 하위 작업들의 진행률을 기반으로 자동 계산되도록 설정할 수도 있습니다.",
    tags: ["진행률", "업데이트"],
  },
  {
    category: "WBS 관리",
    question: "작업 일정을 변경하려면 어떻게 하나요?",
    answer:
      "간트 차트에서 작업 바를 좌우로 드래그하여 시작일을 조정하거나, 바의 끝을 드래그하여 기간을 변경할 수 있습니다. 또는 작업 상세 패널에서 날짜를 직접 수정할 수 있습니다. 변경 시 의존성이 있는 작업들도 자동으로 조정됩니다.",
    tags: ["일정", "간트차트"],
  },
  // 요구사항 관리
  {
    category: "요구사항",
    question: "요구사항은 어떻게 등록하나요?",
    answer:
      "요구사항 메뉴에서 '+ 요구사항 추가' 버튼을 클릭합니다. 제목, 상세 설명, 우선순위, 유형(기능/비기능), 관련 작업을 입력하세요. 등록된 요구사항은 작업과 연결하여 추적성을 유지할 수 있습니다.",
    tags: ["요구사항", "등록"],
  },
  {
    category: "요구사항",
    question: "요구사항과 작업을 연결하려면 어떻게 하나요?",
    answer:
      "요구사항 상세 보기에서 '연결된 작업' 섹션의 '+ 작업 연결' 버튼을 클릭하고, 연결할 작업을 선택하세요. 반대로 작업 상세에서도 요구사항을 연결할 수 있습니다. 이를 통해 요구사항-작업 간 추적 매트릭스를 자동 생성할 수 있습니다.",
    tags: ["연결", "추적"],
  },
  // 이슈 관리
  {
    category: "이슈 관리",
    question: "이슈를 등록하려면 어떻게 하나요?",
    answer:
      "칸반 보드에서 '+ 이슈 추가' 버튼을 클릭하거나, 이슈 목록에서 추가할 수 있습니다. 제목, 상세 설명, 우선순위, 담당자, 관련 작업을 입력하세요. 이슈는 백로그 → 진행중 → 검토중 → 완료 순으로 진행됩니다.",
    tags: ["이슈", "버그"],
  },
  {
    category: "이슈 관리",
    question: "이슈의 우선순위는 어떻게 정하나요?",
    answer:
      "이슈 생성 시 또는 상세 패널에서 우선순위를 긴급/높음/보통/낮음 중 선택할 수 있습니다. 긴급 이슈는 빨간색으로 표시되며, 칸반 보드에서 상단에 정렬됩니다. 우선순위별 필터링도 가능합니다.",
    tags: ["우선순위", "분류"],
  },
  // 팀 협업
  {
    category: "팀 협업",
    question: "팀원을 프로젝트에 추가하려면 어떻게 하나요?",
    answer:
      "'프로젝트 멤버 등록' 메뉴에서 '+ 멤버 추가' 버튼을 클릭하세요. 멤버 이름, 이메일, 역할(관리자/멤버/열람자)을 입력하면 됩니다. 멤버별로 접근 권한을 다르게 설정할 수 있습니다.",
    tags: ["멤버", "초대"],
  },
  {
    category: "팀 협업",
    question: "작업 담당자를 변경하려면 어떻게 하나요?",
    answer:
      "작업 상세 패널에서 담당자 필드의 드롭다운을 열고 새 담당자를 선택하세요. 담당자 변경 시 해당 멤버에게 알림이 전송됩니다. 칸반 보드의 드래그 앤 드롭으로도 담당자별 열에서 이동하여 변경할 수 있습니다.",
    tags: ["담당자", "할당"],
  },
  // 설정
  {
    category: "설정",
    question: "휴무일 설정은 어떻게 하나요?",
    answer:
      "'휴무 달력' 메뉴에서 공휴일, 회사 휴무, 개인 휴가를 등록할 수 있습니다. 캘린더에서 날짜를 클릭하거나 '+ 휴무일 추가' 버튼을 사용하세요. 등록된 휴무일은 작업 일정 계산 시 자동으로 제외되어 실제 작업일 기준으로 일정이 계산됩니다.",
    tags: ["휴무일", "달력"],
  },
  {
    category: "설정",
    question: "다크 모드로 변경하려면 어떻게 하나요?",
    answer:
      "우측 상단의 테마 토글 버튼(해/달 아이콘)을 클릭하면 라이트/다크 모드를 전환할 수 있습니다. 설정은 브라우저에 저장되어 다음 접속 시에도 유지됩니다. 시스템 설정을 따르도록 자동으로 설정할 수도 있습니다.",
    tags: ["다크모드", "테마"],
  },
  {
    category: "설정",
    question: "데이터를 내보내기/백업하려면 어떻게 하나요?",
    answer:
      "'기준 설정' 메뉴에서 '데이터 내보내기'를 선택하세요. JSON, CSV, Excel 형식으로 내보낼 수 있으며, 프로젝트 전체 또는 특정 기간/범위를 선택할 수 있습니다. 정기 백업 스케줄도 설정 가능합니다.",
    tags: ["내보내기", "백업"],
  },
  // Slack 연동
  {
    category: "Slack 연동",
    question: "WBS Master용 Slack 워크스페이스는 무엇인가요?",
    answer:
      "WBS Master는 'HaengSungMesV2' 워크스페이스의 '#mesv2' 채널을 통해 프로젝트 알림을 받습니다. 팀원들은 이 워크스페이스에 가입하여 실시간으로 프로젝트 업데이트를 받아볼 수 있습니다.",
    tags: ["Slack", "워크스페이스", "채널"],
  },
  {
    category: "Slack 연동",
    question: "Slack을 PC에 설치하려면 어떻게 하나요?",
    answer:
      "1) 웹브라우저에서 https://slack.com/downloads 에 접속합니다. 2) 운영체제(Windows/Mac/Linux)에 맞는 버전을 다운로드합니다. 3) 다운로드된 설치 파일을 실행하여 설치를 완료합니다. 4) 설치 후 Slack을 실행하고 'HaengSungMesV2' 워크스페이스에 로그인합니다. 5) 좌측 채널 목록에서 '#mesv2' 채널에 참여합니다.",
    tags: ["Slack", "PC", "설치", "Windows", "Mac"],
  },
  {
    category: "Slack 연동",
    question: "Slack을 휴대폰에 설치하려면 어떻게 하나요?",
    answer:
      "1) iPhone: App Store에서 'Slack'을 검색하여 설치합니다. Android: Play Store에서 'Slack'을 검색하여 설치합니다. 2) 앱을 실행하고 '로그인' 버튼을 탭합니다. 3) 워크스페이스 이름에 'HaengSungMesV2'를 입력하고 계속합니다. 4) 이메일과 비밀번호로 로그인합니다. 5) 좌측 메뉴에서 '#mesv2' 채널을 찾아 참여합니다. 6) 알림 설정에서 푸시 알림을 활성화하면 실시간으로 알림을 받을 수 있습니다.",
    tags: ["Slack", "모바일", "설치", "iPhone", "Android"],
  },
  {
    category: "Slack 연동",
    question: "Slack 워크스페이스에 초대받으려면 어떻게 하나요?",
    answer:
      "관리자에게 가입하려는 이메일 주소를 전달하면 초대 메일이 발송됩니다. 메일함에서 'Slack 초대' 메일을 확인하고, '초대 수락' 버튼을 클릭하세요. 계정 생성 후 자동으로 'HaengSungMesV2' 워크스페이스에 참여됩니다. 이후 '#mesv2' 채널에 참여하면 됩니다.",
    tags: ["Slack", "초대", "가입"],
  },
  {
    category: "Slack 연동",
    question: "Slack 알림은 어떻게 설정하나요?",
    answer:
      "'Slack 연동' 메뉴에서 Slack 웹훅 URL을 입력하면 됩니다. Slack 앱에서 Incoming Webhooks를 활성화하고, '#mesv2' 채널을 선택한 후 생성된 웹훅 URL을 복사하여 붙여넣으세요. 설정 후 테스트 메시지를 보내 연동이 정상적으로 되었는지 확인할 수 있습니다.",
    tags: ["Slack", "알림", "웹훅"],
  },
  {
    category: "Slack 연동",
    question: "Slack 웹훅 URL은 어디서 얻나요?",
    answer:
      "Slack 앱에서 Apps → Incoming Webhooks를 검색하여 추가합니다. 'Add New Webhook to Workspace'를 클릭하고, '#mesv2' 채널을 선택하면 웹훅 URL이 생성됩니다. 이 URL(https://hooks.slack.com/services/...)을 복사하여 WBS Master의 Slack 설정에 붙여넣으세요.",
    tags: ["Slack", "웹훅", "설정"],
  },
  {
    category: "Slack 연동",
    question: "어떤 알림을 Slack으로 받을 수 있나요?",
    answer:
      "작업 완료, 작업 생성, 작업 지연, 이슈 등록, 이슈 해결, 프로젝트 진행률 변경 등 다양한 이벤트에 대한 알림을 설정할 수 있습니다. 각 알림은 개별적으로 켜거나 끌 수 있으며, 긴급 이슈 발생 시 @channel 멘션 옵션도 제공됩니다.",
    tags: ["Slack", "알림", "이벤트"],
  },
  {
    category: "Slack 연동",
    question: "Slack 알림이 오지 않아요. 어떻게 해야 하나요?",
    answer:
      "먼저 '테스트 메시지 보내기' 버튼으로 연동 상태를 확인하세요. 웹훅 URL이 올바른지, Slack 앱의 Incoming Webhooks가 활성화되어 있는지, '#mesv2' 채널에 앱이 추가되어 있는지 확인해주세요. '알림 활성화' 토글이 켜져 있는지도 확인하세요. 모바일에서는 Slack 앱의 알림 설정도 확인해주세요.",
    tags: ["Slack", "문제해결", "트러블슈팅"],
  },
];

/** 상세 가이드 데이터 */
const detailedGuides: DetailedGuide[] = [
  {
    id: "dashboard",
    title: "대시보드",
    icon: "dashboard",
    color: "from-blue-500 to-indigo-600",
    description: "프로젝트의 전체 현황을 한눈에 파악하세요",
    sections: [
      {
        title: "핵심 지표 카드",
        content:
          "대시보드 상단에는 4개의 핵심 지표 카드가 표시됩니다. 전체 작업 진행률, 요구사항 달성률, 활성 이슈 수, 오늘 마감 작업 수를 빠르게 확인할 수 있습니다. 각 카드를 클릭하면 해당 상세 페이지로 이동합니다.",
        tips: [
          "작업 진행률이 일정보다 늦을 경우 빨간색 경고 표시가 나타납니다",
          "숫자 위에 마우스를 올리면 세부 수치가 툴팁으로 표시됩니다",
        ],
      },
      {
        title: "오늘의 할일",
        content:
          "오늘 마감인 작업과 오늘 시작해야 하는 작업이 리스트로 표시됩니다. 체크박스를 클릭하여 완료 처리하거나, 작업을 클릭하여 상세 정보를 확인할 수 있습니다.",
        tips: [
          "드래그하여 작업 순서를 변경할 수 있습니다",
          "⌘/Ctrl + Enter로 빠르게 완료 처리할 수 있습니다",
        ],
      },
      {
        title: "마감 임박 작업",
        content:
          "향후 7일 이내에 마감되는 작업들이 마감일 순으로 정렬되어 표시됩니다. 담당자, 진행률, D-day를 함께 확인할 수 있어 우선순위 결정에 도움이 됩니다.",
      },
      {
        title: "이슈 현황",
        content:
          "진행 중인 이슈들이 우선순위별로 분류되어 표시됩니다. 긴급 이슈가 있을 경우 별도의 알림 배너로 강조됩니다.",
      },
    ],
  },
  {
    id: "wbs",
    title: "WBS 관리",
    icon: "account_tree",
    color: "from-green-500 to-teal-600",
    description: "작업 분해 구조를 체계적으로 관리하세요",
    sections: [
      {
        title: "트리 구조 보기",
        content:
          "WBS는 트리 형태로 표시되어 프로젝트의 계층 구조를 직관적으로 파악할 수 있습니다. 각 노드를 클릭하면 확장/축소되며, 드래그 앤 드롭으로 구조를 변경할 수 있습니다.",
        tips: [
          "Shift + 클릭으로 전체 하위 항목을 한 번에 펼치거나 접을 수 있습니다",
          "더블 클릭으로 빠르게 이름을 수정할 수 있습니다",
        ],
      },
      {
        title: "작업 추가 및 편집",
        content:
          "작업 추가 버튼 또는 컨텍스트 메뉴를 통해 새 작업을 생성합니다. 작업명, 담당자, 기간, 예상 공수 등을 입력하며, 저장 후에도 클릭하여 언제든 수정할 수 있습니다.",
        tips: [
          "Tab 키로 하위 작업을 빠르게 추가할 수 있습니다",
          "Enter 키로 동일 레벨의 새 작업을 추가합니다",
        ],
      },
      {
        title: "간트 차트 뷰",
        content:
          "우측의 간트 차트에서 작업의 일정을 시각적으로 확인할 수 있습니다. 작업 바를 드래그하여 일정을 조정하고, 의존성 연결선을 통해 작업 간의 관계를 파악할 수 있습니다.",
        tips: [
          "마우스 휠로 타임라인 확대/축소가 가능합니다",
          "오늘 날짜는 빨간색 세로선으로 표시됩니다",
        ],
      },
      {
        title: "필터 및 검색",
        content:
          "상단의 필터 옵션을 사용하여 담당자별, 상태별, 기간별로 작업을 필터링할 수 있습니다. 검색창에서 작업명으로 빠르게 찾을 수도 있습니다.",
      },
    ],
  },
  {
    id: "requirements",
    title: "요구사항 관리",
    icon: "description",
    color: "from-purple-500 to-pink-600",
    description: "프로젝트 요구사항을 체계적으로 추적하세요",
    sections: [
      {
        title: "요구사항 목록",
        content:
          "모든 요구사항이 테이블 형태로 표시됩니다. ID, 제목, 유형, 우선순위, 상태, 연결된 작업 수를 한눈에 확인할 수 있으며, 컬럼 헤더를 클릭하여 정렬할 수 있습니다.",
        tips: [
          "컬럼 너비를 드래그하여 조절할 수 있습니다",
          "행을 더블 클릭하면 편집 모드로 전환됩니다",
        ],
      },
      {
        title: "요구사항 상세",
        content:
          "요구사항을 클릭하면 우측에 상세 패널이 열립니다. 상세 설명, 연결된 작업, 이력, 첨부파일을 확인하고 편집할 수 있습니다.",
      },
      {
        title: "추적 매트릭스",
        content:
          "요구사항-작업 간의 연결을 매트릭스 형태로 시각화합니다. 커버리지 분석을 통해 누락된 요구사항이나 연결되지 않은 작업을 식별할 수 있습니다.",
      },
    ],
  },
  {
    id: "kanban",
    title: "칸반 보드",
    icon: "view_kanban",
    color: "from-orange-500 to-red-600",
    description: "이슈와 작업을 시각적으로 관리하세요",
    sections: [
      {
        title: "보드 구성",
        content:
          "칸반 보드는 기본적으로 백로그, 진행중, 검토중, 완료의 4개 컬럼으로 구성됩니다. 각 컬럼에서 이슈/작업 카드를 확인하고, 드래그 앤 드롭으로 상태를 변경할 수 있습니다.",
        tips: [
          "컬럼을 추가하거나 이름을 변경할 수 있습니다",
          "WIP(작업 중 항목) 제한을 설정할 수 있습니다",
        ],
      },
      {
        title: "카드 관리",
        content:
          "각 카드에는 제목, 담당자 아바타, 우선순위 라벨, 마감일이 표시됩니다. 카드를 클릭하면 상세 모달이 열리며, 설명 편집, 댓글 추가, 첨부파일 업로드가 가능합니다.",
        tips: [
          "카드에 라벨을 추가하여 분류할 수 있습니다",
          "체크리스트로 하위 작업을 관리할 수 있습니다",
        ],
      },
      {
        title: "필터링 및 검색",
        content:
          "담당자, 라벨, 우선순위, 마감일로 카드를 필터링할 수 있습니다. 필터 조합으로 원하는 카드만 보드에 표시할 수 있습니다.",
      },
    ],
  },
  {
    id: "members",
    title: "프로젝트 멤버",
    icon: "group",
    color: "from-cyan-500 to-blue-600",
    description: "팀원을 초대하고 역할을 관리하세요",
    sections: [
      {
        title: "멤버 목록",
        content:
          "프로젝트에 참여 중인 모든 멤버가 표시됩니다. 이름, 이메일, 역할, 할당된 작업 수, 마지막 활동 시간을 확인할 수 있습니다.",
      },
      {
        title: "역할 및 권한",
        content:
          "관리자, 멤버, 열람자 세 가지 역할이 있습니다. 관리자는 모든 기능을 사용할 수 있고, 멤버는 작업을 생성/수정할 수 있으며, 열람자는 보기만 가능합니다.",
        tips: [
          "커스텀 역할을 생성하여 세분화된 권한을 설정할 수 있습니다",
        ],
      },
      {
        title: "멤버 초대",
        content:
          "이메일 주소를 입력하여 새 멤버를 초대할 수 있습니다. 초대 링크가 발송되며, 수락 시 자동으로 프로젝트에 추가됩니다.",
      },
    ],
  },
  {
    id: "holidays",
    title: "휴무 달력",
    icon: "event_busy",
    color: "from-rose-500 to-pink-600",
    description: "휴무일과 일정을 효과적으로 관리하세요",
    sections: [
      {
        title: "휴무일 등록",
        content:
          "달력에서 날짜를 클릭하거나 '+ 추가' 버튼으로 휴무일을 등록합니다. 공휴일, 회사 휴무, 개인 휴가를 구분하여 등록할 수 있습니다.",
        tips: [
          "드래그로 여러 날을 한 번에 선택하여 등록할 수 있습니다",
          "반복 휴무(매주 토요일 등)를 설정할 수 있습니다",
        ],
      },
      {
        title: "일정 계산 연동",
        content:
          "등록된 휴무일은 WBS 작업 일정 계산 시 자동으로 제외됩니다. '5일 작업'을 설정하면 휴무일을 제외한 실제 작업일 5일이 적용됩니다.",
      },
    ],
  },
  {
    id: "milestones",
    title: "마일스톤",
    icon: "flag_circle",
    color: "from-indigo-500 to-violet-600",
    description: "프로젝트 주요 이정표를 시각적으로 관리하세요",
    sections: [
      {
        title: "타임라인 뷰",
        content:
          "마일스톤과 핀포인트가 타임라인 형태로 시각화됩니다. 가로 스크롤로 전체 프로젝트 일정을 확인하고, 마일스톤 바를 드래그하여 일정을 조정할 수 있습니다.",
        tips: [
          "마일스톤 바의 양 끝을 드래그하여 기간을 조절할 수 있습니다",
          "오늘 날짜는 빨간색 세로선으로 표시됩니다",
        ],
      },
      {
        title: "마일스톤 관리",
        content:
          "마일스톤은 프로젝트의 주요 단계를 나타냅니다. 이름, 시작일, 종료일, 상태(대기/진행중/완료/지연)를 설정할 수 있으며, 행(Row)별로 그룹화하여 관리할 수 있습니다.",
        tips: [
          "상태에 따라 마일스톤 색상이 다르게 표시됩니다",
          "마감일이 지난 미완료 마일스톤은 자동으로 '지연' 상태로 표시됩니다",
        ],
      },
      {
        title: "핀포인트 활용",
        content:
          "핀포인트는 특정 날짜의 이벤트를 표시합니다. 중요 회의, 릴리즈 일정, 검수일 등 단일 날짜 이벤트를 마킹할 때 사용합니다.",
      },
    ],
  },
  {
    id: "customer-requirements",
    title: "고객요구사항",
    icon: "contact_page",
    color: "from-teal-500 to-cyan-600",
    description: "고객의 요구사항을 체계적으로 관리하세요",
    sections: [
      {
        title: "요구사항 등록",
        content:
          "고객으로부터 접수된 요구사항을 등록합니다. 접수일, 요청자, 제목, 상세 내용, 희망 완료일을 입력하고, 담당자와 우선순위를 지정할 수 있습니다.",
        tips: [
          "사업단위별로 요구사항을 분류할 수 있습니다",
          "엑셀 파일로 일괄 가져오기가 가능합니다",
        ],
      },
      {
        title: "상태 관리",
        content:
          "요구사항의 상태를 '접수됨', '분석중', '개발중', '테스트', '완료', '보류', '반려' 등으로 관리합니다. 상태 배지를 클릭하면 드롭다운에서 빠르게 변경할 수 있습니다.",
      },
      {
        title: "통계 대시보드",
        content:
          "상단의 통계 카드에서 전체 요구사항 수, 상태별 건수, 완료율을 한눈에 확인할 수 있습니다. 필터와 검색을 활용하여 원하는 요구사항만 조회할 수 있습니다.",
      },
    ],
  },
  {
    id: "process-verification",
    title: "기능추적표",
    icon: "fact_check",
    color: "from-amber-500 to-orange-600",
    description: "MES 공정 기능을 체계적으로 검증하세요",
    sections: [
      {
        title: "카테고리 관리",
        content:
          "공정별로 카테고리를 생성하고 검증 항목을 등록합니다. 대분류/중분류/소분류로 계층화하여 체계적으로 관리할 수 있습니다.",
        tips: [
          "카테고리는 드래그 앤 드롭으로 순서를 변경할 수 있습니다",
          "엑셀 템플릿을 다운로드하여 일괄 등록할 수 있습니다",
        ],
      },
      {
        title: "검증 항목 체크",
        content:
          "각 기능 항목별로 검증 상태(미검증/진행중/완료/N/A)를 관리합니다. 검증 일자, 담당자, 비고를 기록하여 이력을 추적할 수 있습니다.",
      },
      {
        title: "진행률 모니터링",
        content:
          "카테고리별, 전체 검증 진행률이 자동으로 계산됩니다. 프로그레스 바로 시각화되어 현재 검증 상태를 한눈에 파악할 수 있습니다.",
      },
    ],
  },
  {
    id: "issues",
    title: "이슈사항 점검표",
    icon: "bug_report",
    color: "from-red-500 to-rose-600",
    description: "프로젝트 이슈를 추적하고 해결하세요",
    sections: [
      {
        title: "이슈 등록",
        content:
          "발생한 이슈를 등록합니다. 제목, 상세 내용, 우선순위(긴급/높음/보통/낮음), 담당자, 관련 요구사항을 입력합니다. 파일 첨부도 가능합니다.",
        tips: [
          "이슈 코드는 자동으로 생성됩니다",
          "관련 요구사항과 연결하여 추적성을 유지하세요",
        ],
      },
      {
        title: "상태 관리",
        content:
          "이슈 상태를 '등록', '분석중', '해결중', '해결완료', '재오픈', '보류', '종료'로 관리합니다. 탭으로 활성/종료 이슈를 구분하여 볼 수 있습니다.",
      },
      {
        title: "이력 추적",
        content:
          "이슈의 상태 변경, 담당자 변경, 코멘트 추가 등 모든 활동이 이력으로 기록됩니다. 해결 일자와 소요 시간도 자동으로 계산됩니다.",
      },
    ],
  },
  {
    id: "weekly-report",
    title: "주간 업무보고",
    icon: "assignment",
    color: "from-blue-500 to-cyan-600",
    description: "주간 업무 내용을 체계적으로 보고하세요",
    sections: [
      {
        title: "보고서 작성",
        content:
          "금주 완료 업무, 금주 진행 업무, 차주 예정 업무를 구분하여 작성합니다. 담당자, 업무 내용, 진척률을 입력하고 특이사항을 기록할 수 있습니다.",
        tips: [
          "이전 주 보고서를 복사하여 새 보고서를 시작할 수 있습니다",
          "WBS 작업과 연결하여 자동으로 진척률을 반영할 수 있습니다",
        ],
      },
      {
        title: "AI 요약 기능",
        content:
          "AI가 주간 보고서 내용을 자동으로 요약해줍니다. 주요 성과, 이슈, 다음 주 계획을 핵심 포인트로 정리하여 빠른 리뷰가 가능합니다.",
      },
      {
        title: "보고서 내보내기",
        content:
          "작성한 보고서를 엑셀, PDF 형식으로 내보낼 수 있습니다. 템플릿 형식을 유지하여 기존 보고 체계와 호환됩니다.",
      },
    ],
  },
  {
    id: "documents",
    title: "문서함 관리",
    icon: "folder_copy",
    color: "from-violet-500 to-purple-600",
    description: "프로젝트 문서를 효율적으로 관리하세요",
    sections: [
      {
        title: "공용 문서함",
        content:
          "프로젝트 팀 전체가 공유하는 문서를 등록합니다. 설계서, 매뉴얼, 회의록, 보고서 등 문서 유형별로 분류하여 관리할 수 있습니다. 모든 프로젝트 멤버가 열람할 수 있습니다.",
        tips: [
          "OneDrive, Google Drive, SharePoint 링크를 등록할 수 있습니다",
          "문서 클릭 시 미리보기 모달에서 바로 확인할 수 있습니다",
        ],
      },
      {
        title: "개인 문서함",
        content:
          "본인만 볼 수 있는 개인 문서를 관리합니다. 작업 중인 초안, 개인 메모, 참고 자료 등을 다른 사람에게 공개하지 않고 보관할 수 있습니다.",
        tips: [
          "개인 문서함은 본인 외에는 조회할 수 없습니다",
          "필요시 공용 문서함으로 이동할 수 있습니다",
        ],
      },
      {
        title: "즐겨찾기 및 검색",
        content:
          "자주 사용하는 문서는 즐겨찾기에 등록하여 빠르게 접근할 수 있습니다. 문서명, 설명, 태그로 검색하고 유형/소스별로 필터링할 수 있습니다.",
      },
    ],
  },
  {
    id: "slack",
    title: "Slack 연동",
    icon: "chat",
    color: "from-purple-500 to-violet-600",
    description: "Slack으로 프로젝트 알림을 받아보세요",
    sections: [
      {
        title: "워크스페이스 및 채널 정보",
        content:
          "WBS Master는 'HaengSungMesV2' 워크스페이스의 '#mesv2' 채널을 통해 프로젝트 알림을 전송합니다. 팀원들은 이 워크스페이스에 가입하여 실시간으로 프로젝트 업데이트, 작업 변경, 이슈 발생 등의 알림을 받아볼 수 있습니다.",
        tips: [
          "워크스페이스: HaengSungMesV2",
          "알림 채널: #mesv2",
          "가입 문의는 관리자에게 이메일로 요청하세요",
        ],
      },
      {
        title: "PC에 Slack 설치하기",
        content:
          "1) 웹브라우저에서 https://slack.com/downloads 에 접속합니다. 2) 사용 중인 운영체제(Windows/Mac/Linux)에 맞는 버전의 다운로드 버튼을 클릭합니다. 3) Windows의 경우 SlackSetup.exe 파일이 다운로드되며, 실행하여 설치를 완료합니다. 4) 설치 완료 후 Slack을 실행하면 워크스페이스 로그인 화면이 나타납니다. 5) 워크스페이스 이름에 'HaengSungMesV2'를 입력하고 계속 버튼을 클릭합니다. 6) 이메일과 비밀번호를 입력하여 로그인합니다. 7) 좌측 채널 목록에서 '#mesv2'를 찾아 클릭하여 참여합니다.",
        tips: [
          "Windows 10/11, macOS 10.15 이상, Ubuntu 18.04 이상 지원",
          "웹 브라우저에서도 slack.com으로 접속하여 사용 가능합니다",
          "자동 실행 설정: 설정 → 일반 → 시스템 시작 시 Slack 열기",
        ],
      },
      {
        title: "휴대폰에 Slack 설치하기",
        content:
          "iPhone의 경우: 1) App Store를 열고 'Slack'을 검색합니다. 2) 'Slack' 앱(보라색 # 아이콘)을 찾아 '받기' 버튼을 탭합니다. 3) 설치가 완료되면 '열기'를 탭합니다. Android의 경우: 1) Play Store를 열고 'Slack'을 검색합니다. 2) 'Slack' 앱을 찾아 '설치' 버튼을 탭합니다. 3) 설치가 완료되면 '열기'를 탭합니다. 공통: 4) '로그인' 버튼을 탭합니다. 5) 워크스페이스 URL에 'haengsungmesv2.slack.com'을 입력합니다. 6) 이메일과 비밀번호로 로그인합니다. 7) 좌측 메뉴에서 '#mesv2' 채널을 찾아 탭하여 참여합니다. 8) 설정 → 알림에서 푸시 알림을 '모든 새 메시지'로 설정하면 실시간 알림을 받을 수 있습니다.",
        tips: [
          "iOS 15.0 이상, Android 8.0 이상 필요",
          "알림이 오지 않으면: 설정 → 알림 → Slack → 알림 허용 확인",
          "배터리 절약 모드에서는 알림이 지연될 수 있습니다",
        ],
      },
      {
        title: "워크스페이스 초대 및 가입",
        content:
          "아직 워크스페이스에 가입하지 않은 경우, 관리자에게 가입할 이메일 주소를 전달하여 초대를 요청하세요. 초대 메일이 발송되면 메일함에서 'Slack에서 HaengSungMesV2 워크스페이스에 초대합니다' 제목의 메일을 확인합니다. '초대 수락' 버튼을 클릭하면 계정 생성 페이지로 이동합니다. 이름, 비밀번호를 설정하면 자동으로 워크스페이스에 참여됩니다. 가입 후 '#mesv2' 채널에 참여하여 프로젝트 알림을 받기 시작하세요.",
        tips: [
          "초대 메일이 스팸함에 있을 수 있으니 확인해보세요",
          "초대 링크는 7일간 유효합니다",
          "이미 Slack 계정이 있다면 기존 계정으로 로그인 가능합니다",
        ],
      },
      {
        title: "Slack 웹훅 설정 (관리자용)",
        content:
          "Slack 연동을 위해 Incoming Webhooks 앱을 설정해야 합니다. 1) Slack 워크스페이스에 로그인합니다. 2) 좌측 하단의 'Apps'를 클릭하고 'Incoming Webhooks'를 검색하여 추가합니다. 3) 'Add to Slack' 버튼을 클릭합니다. 4) 'Post to Channel'에서 '#mesv2'를 선택합니다. 5) 'Add Incoming WebHooks Integration' 버튼을 클릭합니다. 6) 생성된 웹훅 URL(https://hooks.slack.com/services/...)을 복사합니다. 7) WBS Master의 'Slack 연동' 메뉴에서 이 URL을 붙여넣습니다.",
        tips: [
          "웹훅 URL은 보안 정보이므로 외부에 공유하지 마세요",
          "웹훅 URL은 https://hooks.slack.com/services/로 시작합니다",
          "하나의 웹훅은 하나의 채널에만 연결됩니다",
        ],
      },
      {
        title: "알림 종류 및 설정",
        content:
          "WBS Master에서 설정 가능한 Slack 알림: 1) 작업 완료 - 담당자와 작업명이 포함된 완료 메시지 2) 작업 생성 - 새 작업 등록 시 알림 3) 작업 지연 - 마감일 초과 시 경고 알림 4) 이슈 등록 - 새 이슈 생성 시 제목, 우선순위, 담당자 정보 전송 5) 이슈 해결 - 이슈 완료 시 알림 6) 프로젝트 진행률 - 주요 마일스톤 달성 시 알림. 각 알림은 개별적으로 켜거나 끌 수 있습니다.",
        tips: [
          "'테스트 메시지 보내기'로 연동이 정상인지 확인하세요",
          "긴급 이슈 시 @channel 멘션을 활성화하면 팀원 모두에게 알림",
          "알림 시간대를 설정하여 업무 시간에만 알림을 받을 수 있습니다",
        ],
      },
      {
        title: "문제 해결",
        content:
          "알림이 오지 않는 경우 확인 사항: 1) WBS Master의 '알림 활성화' 토글이 켜져 있는지 확인 2) 웹훅 URL이 정확히 입력되었는지 확인 (복사/붙여넣기 추천) 3) Slack 앱에서 Incoming Webhooks가 활성화되어 있는지 확인 4) '#mesv2' 채널에 앱이 추가되어 있는지 확인 5) 모바일의 경우 Slack 앱의 알림 권한이 허용되어 있는지 확인 6) 배터리 절약 모드/방해 금지 모드가 꺼져 있는지 확인. '테스트 메시지 보내기' 버튼으로 연동 상태를 점검할 수 있습니다.",
        tips: [
          "웹훅 URL을 재생성하면 기존 URL은 더 이상 작동하지 않습니다",
          "채널이 private인 경우 앱을 채널에 수동으로 추가해야 합니다",
          "Slack 서버 상태: status.slack.com 에서 확인 가능",
        ],
      },
    ],
  },
];

/** 단축키 데이터 */
const shortcuts: ShortcutGroup[] = [
  {
    title: "전역 단축키",
    icon: "keyboard",
    shortcuts: [
      { keys: ["⌘/Ctrl", "K"], description: "빠른 검색 열기" },
      { keys: ["⌘/Ctrl", "N"], description: "새 작업 추가" },
      { keys: ["⌘/Ctrl", "S"], description: "변경사항 저장" },
      { keys: ["⌘/Ctrl", "/"], description: "단축키 도움말 표시" },
      { keys: ["Esc"], description: "모달/패널 닫기" },
    ],
  },
  {
    title: "탐색",
    icon: "explore",
    shortcuts: [
      { keys: ["G", "D"], description: "대시보드로 이동" },
      { keys: ["G", "W"], description: "WBS 보기로 이동" },
      { keys: ["G", "K"], description: "칸반 보드로 이동" },
      { keys: ["G", "R"], description: "요구사항으로 이동" },
      { keys: ["G", "H"], description: "도움말로 이동" },
    ],
  },
  {
    title: "WBS & 간트 차트",
    icon: "account_tree",
    shortcuts: [
      { keys: ["Tab"], description: "하위 작업 추가" },
      { keys: ["Enter"], description: "동일 레벨 작업 추가" },
      { keys: ["Delete"], description: "선택한 작업 삭제" },
      { keys: ["←", "→"], description: "타임라인 이동" },
      { keys: ["Shift", "클릭"], description: "다중 선택" },
      { keys: ["+", "-"], description: "확대/축소" },
    ],
  },
  {
    title: "칸반 보드",
    icon: "view_kanban",
    shortcuts: [
      { keys: ["N"], description: "새 카드 추가" },
      { keys: ["E"], description: "카드 편집" },
      { keys: ["F"], description: "필터 패널 열기" },
      { keys: ["↑", "↓"], description: "카드 선택 이동" },
      { keys: ["Space"], description: "카드 상세 열기" },
    ],
  },
  {
    title: "편집",
    icon: "edit",
    shortcuts: [
      { keys: ["⌘/Ctrl", "Z"], description: "실행 취소" },
      { keys: ["⌘/Ctrl", "Shift", "Z"], description: "다시 실행" },
      { keys: ["⌘/Ctrl", "C"], description: "복사" },
      { keys: ["⌘/Ctrl", "V"], description: "붙여넣기" },
      { keys: ["⌘/Ctrl", "D"], description: "복제" },
    ],
  },
];

/** 업데이트 내역 데이터 */
const updates: UpdateItem[] = [
  {
    version: "1.5.0",
    date: "2026-01-05",
    type: "feature",
    title: "AI 어시스턴트 도입",
    description:
      "AI 채팅 기능이 추가되었습니다. 프로젝트 현황 분석, 작업 추천, 일정 최적화 등을 AI와 대화하며 진행할 수 있습니다.",
  },
  {
    version: "1.4.2",
    date: "2026-01-02",
    type: "improvement",
    title: "대시보드 성능 개선",
    description:
      "대시보드 로딩 속도가 40% 향상되었습니다. 대용량 프로젝트에서도 빠르게 현황을 확인할 수 있습니다.",
  },
  {
    version: "1.4.1",
    date: "2025-12-28",
    type: "fix",
    title: "간트 차트 드래그 버그 수정",
    description:
      "간트 차트에서 작업 바를 드래그할 때 간헐적으로 위치가 초기화되는 문제를 수정했습니다.",
  },
  {
    version: "1.4.0",
    date: "2025-12-20",
    type: "feature",
    title: "요구사항 추적 매트릭스",
    description:
      "요구사항과 작업 간의 연결을 매트릭스로 시각화하는 기능이 추가되었습니다. 커버리지 분석도 지원됩니다.",
  },
  {
    version: "1.3.5",
    date: "2025-12-15",
    type: "improvement",
    title: "다크 모드 개선",
    description:
      "다크 모드의 색상 대비를 개선하여 가독성을 높였습니다. 차트와 그래프도 다크 모드에 최적화되었습니다.",
  },
];

/**
 * 도움말 페이지 컴포넌트
 */
export default function HelpPage() {
  // 상태 관리
  const [activeTab, setActiveTab] = useState<TabType>("guide");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);

  // FAQ 카테고리 목록
  const categories = [...new Set(faqItems.map((item) => item.category))];

  // 필터링된 FAQ
  const filteredFAQ = faqItems.filter((item) => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 선택된 가이드 데이터
  const activeGuide = detailedGuides.find((g) => g.id === selectedGuide);

  /** 탭 목록 */
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "guide", label: "사용 가이드", icon: "menu_book" },
    { id: "faq", label: "자주 묻는 질문", icon: "help" },
    { id: "shortcuts", label: "단축키", icon: "keyboard" },
    { id: "updates", label: "업데이트", icon: "new_releases" },
  ];

  /** 업데이트 타입별 스타일 */
  const updateTypeStyles = {
    feature: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      label: "새 기능",
    },
    improvement: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-600 dark:text-green-400",
      label: "개선",
    },
    fix: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-600 dark:text-orange-400",
      label: "버그 수정",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 영역 */}
      <div className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/5 dark:from-primary/20 dark:via-purple-500/10 dark:to-pink-500/10 border-b border-border dark:border-border-dark">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* 타이틀 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 dark:bg-primary/20 mb-4">
              <Icon name="support" size="lg" className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-text dark:text-white mb-3">
              도움말 센터
            </h1>
            <p className="text-text-secondary text-lg max-w-xl mx-auto">
              WBS Master를 더 효과적으로 사용하기 위한 가이드와 팁을 찾아보세요
            </p>
          </div>

          {/* 검색 */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Input
                leftIcon="search"
                placeholder="질문이나 기능을 검색하세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!py-4 !text-base !pl-12 !pr-4 !rounded-2xl shadow-lg dark:shadow-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text dark:hover:text-white transition-colors"
                >
                  <Icon name="close" size="sm" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border dark:border-border-dark">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedGuide(null);
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-md"
                    : "text-text-secondary hover:text-text dark:hover:text-white hover:bg-surface dark:hover:bg-surface-dark"
                }`}
              >
                <Icon name={tab.icon} size="sm" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 사용 가이드 탭 */}
        {activeTab === "guide" && !selectedGuide && (
          <div className="space-y-8">
            {/* 빠른 시작 배너 */}
            <Card className="overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 border-0">
              <div className="p-6 flex items-center gap-6">
                <div className="size-20 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon name="rocket_launch" size="lg" className="text-white" />
                </div>
                <div className="flex-1 text-white">
                  <h2 className="text-xl font-bold mb-2">처음 사용하시나요?</h2>
                  <p className="text-white/80 mb-4">
                    WBS Master의 핵심 기능을 5분 만에 알아보세요. 프로젝트 생성부터 팀 협업까지 단계별로 안내해드립니다.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="!bg-white !text-primary hover:!bg-white/90"
                    leftIcon="play_arrow"
                    onClick={() => setSelectedGuide("dashboard")}
                  >
                    시작하기
                  </Button>
                </div>
              </div>
            </Card>

            {/* 기능별 가이드 그리드 */}
            <div>
              <h2 className="text-xl font-bold text-text dark:text-white mb-4">
                기능별 상세 가이드
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {detailedGuides.map((guide) => (
                  <Card
                    key={guide.id}
                    className="overflow-hidden hover:border-primary/50 transition-all cursor-pointer group hover:shadow-lg dark:hover:shadow-primary/5"
                    onClick={() => setSelectedGuide(guide.id)}
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${guide.color}`} />
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div
                          className={`size-12 rounded-xl bg-gradient-to-br ${guide.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                        >
                          <Icon
                            name={guide.icon}
                            size="sm"
                            className="text-white"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-text dark:text-white mb-1 group-hover:text-primary transition-colors">
                            {guide.title}
                          </h3>
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {guide.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-sm text-primary font-medium">
                        <span>자세히 보기</span>
                        <Icon
                          name="arrow_forward"
                          size="xs"
                          className="ml-1 group-hover:translate-x-1 transition-transform"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 인기 질문 미리보기 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text dark:text-white">
                  자주 묻는 질문
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon="arrow_forward"
                  onClick={() => setActiveTab("faq")}
                >
                  전체 보기
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {faqItems.slice(0, 4).map((item, index) => (
                  <Card
                    key={index}
                    className="p-4 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setActiveTab("faq");
                      setExpandedFAQ(index);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon
                          name="help"
                          size="xs"
                          className="text-primary"
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-text dark:text-white mb-1 line-clamp-1">
                          {item.question}
                        </h3>
                        <p className="text-sm text-text-secondary line-clamp-2">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 선택된 가이드 상세 */}
        {activeTab === "guide" && selectedGuide && activeGuide && (
          <div className="space-y-6">
            {/* 뒤로가기 */}
            <button
              onClick={() => setSelectedGuide(null)}
              className="flex items-center gap-2 text-text-secondary hover:text-text dark:hover:text-white transition-colors"
            >
              <Icon name="arrow_back" size="sm" />
              <span>가이드 목록으로</span>
            </button>

            {/* 가이드 헤더 */}
            <div className="flex items-center gap-4">
              <div
                className={`size-16 rounded-2xl bg-gradient-to-br ${activeGuide.color} flex items-center justify-center`}
              >
                <Icon name={activeGuide.icon} size="md" className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text dark:text-white">
                  {activeGuide.title}
                </h1>
                <p className="text-text-secondary">{activeGuide.description}</p>
              </div>
            </div>

            {/* 목차 */}
            <Card className="p-4">
              <h3 className="font-bold text-text dark:text-white mb-3 flex items-center gap-2">
                <Icon name="list" size="sm" />
                목차
              </h3>
              <nav className="flex flex-wrap gap-2">
                {activeGuide.sections.map((section, index) => (
                  <a
                    key={index}
                    href={`#section-${index}`}
                    className="px-3 py-1.5 rounded-lg text-sm bg-surface dark:bg-surface-dark text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    {index + 1}. {section.title}
                  </a>
                ))}
              </nav>
            </Card>

            {/* 섹션별 내용 */}
            <div className="space-y-6">
              {activeGuide.sections.map((section, index) => (
                <Card key={index} id={`section-${index}`} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">{index + 1}</span>
                    </div>
                    <h2 className="text-lg font-bold text-text dark:text-white">
                      {section.title}
                    </h2>
                  </div>
                  <p className="text-text-secondary leading-relaxed mb-4">
                    {section.content}
                  </p>
                  {section.tips && section.tips.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon
                          name="lightbulb"
                          size="sm"
                          className="text-amber-600 dark:text-amber-400"
                        />
                        <span className="font-medium text-amber-700 dark:text-amber-300">
                          Pro 팁
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {section.tips.map((tip, tipIndex) => (
                          <li
                            key={tipIndex}
                            className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2"
                          >
                            <span className="mt-1">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* 관련 가이드 */}
            <div>
              <h3 className="font-bold text-text dark:text-white mb-4">
                관련 가이드
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {detailedGuides
                  .filter((g) => g.id !== selectedGuide)
                  .slice(0, 3)
                  .map((guide) => (
                    <Card
                      key={guide.id}
                      className="p-4 hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedGuide(guide.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-10 rounded-lg bg-gradient-to-br ${guide.color} flex items-center justify-center`}
                        >
                          <Icon
                            name={guide.icon}
                            size="xs"
                            className="text-white"
                          />
                        </div>
                        <span className="font-medium text-text dark:text-white">
                          {guide.title}
                        </span>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* FAQ 탭 */}
        {activeTab === "faq" && (
          <div className="space-y-6">
            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === "all"
                    ? "bg-primary text-white shadow-md"
                    : "bg-surface dark:bg-surface-dark text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                전체 ({faqItems.length})
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? "bg-primary text-white shadow-md"
                      : "bg-surface dark:bg-surface-dark text-text-secondary hover:text-text dark:hover:text-white"
                  }`}
                >
                  {category} ({faqItems.filter((i) => i.category === category).length})
                </button>
              ))}
            </div>

            {/* FAQ 리스트 */}
            <div className="space-y-3">
              {filteredFAQ.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="size-16 rounded-full bg-surface dark:bg-surface-dark flex items-center justify-center mx-auto mb-4">
                    <Icon name="search_off" size="lg" className="text-text-secondary" />
                  </div>
                  <h3 className="text-lg font-medium text-text dark:text-white mb-2">
                    검색 결과가 없습니다
                  </h3>
                  <p className="text-text-secondary">
                    다른 검색어를 입력하거나 카테고리를 변경해보세요
                  </p>
                </Card>
              ) : (
                filteredFAQ.map((item, index) => (
                  <Card
                    key={index}
                    className={`overflow-hidden transition-all ${
                      expandedFAQ === index ? "ring-2 ring-primary/30" : ""
                    }`}
                  >
                    <button
                      onClick={() =>
                        setExpandedFAQ(expandedFAQ === index ? null : index)
                      }
                      className="w-full px-6 py-5 flex items-start justify-between text-left hover:bg-surface/50 dark:hover:bg-surface-dark/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            expandedFAQ === index
                              ? "bg-primary text-white"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          <Icon name="help" size="sm" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-surface dark:bg-surface-dark text-text-secondary">
                              {item.category}
                            </span>
                            {item.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span className="font-medium text-text dark:text-white">
                            {item.question}
                          </span>
                        </div>
                      </div>
                      <Icon
                        name={expandedFAQ === index ? "expand_less" : "expand_more"}
                        size="sm"
                        className={`text-text-secondary flex-shrink-0 ml-4 transition-transform ${
                          expandedFAQ === index ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {expandedFAQ === index && (
                      <div className="px-6 pb-6 pt-0">
                        <div className="pl-14 border-l-2 border-primary/20 ml-5">
                          <p className="text-text-secondary leading-relaxed py-4">
                            {item.answer}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-text-secondary">
                              이 답변이 도움이 되었나요?
                            </span>
                            <button className="flex items-center gap-1 text-text-secondary hover:text-green-500 transition-colors">
                              <Icon name="thumb_up" size="xs" />
                              <span>예</span>
                            </button>
                            <button className="flex items-center gap-1 text-text-secondary hover:text-red-500 transition-colors">
                              <Icon name="thumb_down" size="xs" />
                              <span>아니오</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* 단축키 탭 */}
        {activeTab === "shortcuts" && (
          <div className="space-y-6">
            {/* 안내 배너 */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Icon name="info" size="sm" className="text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>⌘</strong>는 macOS에서, <strong>Ctrl</strong>은 Windows/Linux에서 사용합니다.
                  <strong className="ml-2">⌘/Ctrl + /</strong>로 언제든지 이 단축키 목록을 볼 수 있습니다.
                </p>
              </div>
            </Card>

            {/* 단축키 그룹 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shortcuts.map((group) => (
                <Card key={group.title} className="overflow-hidden">
                  <div className="px-5 py-4 bg-surface/50 dark:bg-surface-dark/50 border-b border-border dark:border-border-dark">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon name={group.icon} size="sm" className="text-primary" />
                      </div>
                      <h3 className="font-bold text-text dark:text-white">
                        {group.title}
                      </h3>
                    </div>
                  </div>
                  <div className="divide-y divide-border dark:divide-border-dark">
                    {group.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="px-5 py-3 flex items-center justify-between hover:bg-surface/30 dark:hover:bg-surface-dark/30 transition-colors"
                      >
                        <span className="text-text-secondary">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <span key={keyIndex} className="flex items-center">
                              <kbd className="px-2.5 py-1.5 text-xs font-mono font-medium bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg text-text dark:text-white shadow-sm">
                                {key}
                              </kbd>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="mx-1 text-text-secondary">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* 추가 팁 */}
            <Card className="p-6">
              <h3 className="font-bold text-text dark:text-white mb-4 flex items-center gap-2">
                <Icon name="tips_and_updates" size="sm" className="text-amber-500" />
                추가 팁
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Icon name="mouse" size="xs" className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text dark:text-white mb-1">
                      마우스 휠
                    </h4>
                    <p className="text-sm text-text-secondary">
                      간트 차트에서 마우스 휠로 타임라인을 확대/축소할 수 있습니다
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Icon name="touch_app" size="xs" className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text dark:text-white mb-1">
                      더블 클릭
                    </h4>
                    <p className="text-sm text-text-secondary">
                      작업명을 더블 클릭하면 바로 편집 모드로 전환됩니다
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Icon name="drag_indicator" size="xs" className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text dark:text-white mb-1">
                      드래그 앤 드롭
                    </h4>
                    <p className="text-sm text-text-secondary">
                      WBS 트리에서 항목을 드래그하여 구조를 변경할 수 있습니다
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <Icon name="right_click" size="xs" className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text dark:text-white mb-1">
                      우클릭 메뉴
                    </h4>
                    <p className="text-sm text-text-secondary">
                      대부분의 항목에서 우클릭으로 컨텍스트 메뉴를 열 수 있습니다
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 업데이트 탭 */}
        {activeTab === "updates" && (
          <div className="space-y-6">
            {/* 최신 버전 배너 */}
            <Card className="p-6 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-green-100 dark:bg-green-800/50 flex items-center justify-center">
                  <Icon name="verified" size="lg" className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-text dark:text-white">
                      현재 버전: v{updates[0].version}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                      최신
                    </span>
                  </div>
                  <p className="text-text-secondary">
                    최신 버전을 사용하고 계십니다. 새로운 기능과 개선사항을 확인해보세요.
                  </p>
                </div>
              </div>
            </Card>

            {/* 업데이트 타임라인 */}
            <div className="relative">
              {/* 세로선 */}
              <div className="absolute left-[1.625rem] top-0 bottom-0 w-0.5 bg-border dark:bg-border-dark" />

              <div className="space-y-6">
                {updates.map((update, index) => (
                  <div key={index} className="relative flex gap-6">
                    {/* 도트 */}
                    <div
                      className={`relative z-10 size-[3.25rem] rounded-full flex items-center justify-center flex-shrink-0 ${
                        index === 0
                          ? "bg-primary"
                          : "bg-surface dark:bg-surface-dark border-2 border-border dark:border-border-dark"
                      }`}
                    >
                      <Icon
                        name={
                          update.type === "feature"
                            ? "new_releases"
                            : update.type === "improvement"
                            ? "trending_up"
                            : "bug_report"
                        }
                        size="sm"
                        className={index === 0 ? "text-white" : "text-text-secondary"}
                      />
                    </div>

                    {/* 내용 */}
                    <Card className="flex-1 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text dark:text-white">
                            v{update.version}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              updateTypeStyles[update.type].bg
                            } ${updateTypeStyles[update.type].text}`}
                          >
                            {updateTypeStyles[update.type].label}
                          </span>
                        </div>
                        <span className="text-sm text-text-secondary">
                          {new Date(update.date).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <h3 className="font-medium text-text dark:text-white mb-2">
                        {update.title}
                      </h3>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {update.description}
                      </p>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* 이전 버전 보기 */}
            <div className="text-center">
              <Button variant="ghost" leftIcon="history">
                이전 업데이트 내역 보기
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 지원 섹션 */}
      <div className="bg-surface/50 dark:bg-surface-dark/50 border-t border-border dark:border-border-dark mt-12">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Card className="p-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                <Icon name="support_agent" size="lg" className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-text dark:text-white mb-3">
                더 도움이 필요하신가요?
              </h2>
              <p className="text-text-secondary mb-6">
                원하시는 답을 찾지 못하셨다면, AI 어시스턴트에게 물어보시거나 지원팀에 문의해주세요.
                평일 09:00 - 18:00에 빠르게 답변드립니다.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="primary" leftIcon="smart_toy" size="lg">
                  AI에게 질문하기
                </Button>
                <Button variant="secondary" leftIcon="mail" size="lg">
                  이메일 문의
                </Button>
                <Button variant="ghost" leftIcon="forum" size="lg">
                  커뮤니티 포럼
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
