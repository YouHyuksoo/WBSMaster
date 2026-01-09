/**
 * @file src/app/dashboard/chat/page.tsx
 * @description
 * AI 어시스턴트 채팅 페이지입니다.
 * 프로젝트 상황을 질문하고 데이터 분석 결과를 받습니다.
 *
 * 초보자 가이드:
 * 1. **메시지 영역**: 대화 기록 표시 (마크다운 + 차트)
 * 2. **입력 영역**: 메시지 입력 및 전송
 * 3. **프로젝트 선택**: 특정 프로젝트 컨텍스트로 질문
 *
 * 기능:
 * - 마크다운 렌더링 (react-markdown)
 * - 차트 표시 (Recharts)
 * - SQL 쿼리 표시
 * - 대화 기록 관리
 */

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import ReactECharts from "echarts-for-react";
import "echarts-gl";
import { Icon, Button, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useProject } from "@/contexts";
import { api, AiPersona } from "@/lib/api";
import { ExcelMappingModal } from "./components/ExcelMappingModal";

/**
 * 마인드맵 노드 타입
 * 진행률, 담당자, 완료일자 정보 포함
 */
interface MindmapNode {
  name: string;
  children?: MindmapNode[];
  value?: number;
  /** 진행률 (0-100) */
  progress?: number;
  /** 담당자 이름 */
  assignee?: string;
  /** 종료일/완료일 */
  endDate?: string;
  /** 상태 */
  status?: string;
  itemStyle?: {
    color?: string;
  };
}

/**
 * 피드백 타입
 */
type FeedbackRating = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | null;

/**
 * 채팅 메시지 타입
 */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sqlQuery?: string;
  chartType?: "bar" | "bar3d" | "line" | "pie" | "area" | "mindmap";
  chartData?: Record<string, unknown>[];
  mindmapData?: MindmapNode;
  createdAt: string;
  processingTimeMs?: number;
  feedback?: {
    rating: FeedbackRating;
    comment?: string;
  };
}

/**
 * 차트 색상 팔레트
 */
const CHART_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

/**
 * 채팅 페이지 컴포넌트
 */
export default function ChatPage() {
  const toast = useToast();
  const { selectedProject, projects } = useProject();

  // 상태
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // 페르소나 상태
  const [personas, setPersonas] = useState<AiPersona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);

  // 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fullscreenMindmap, setFullscreenMindmap] = useState<MindmapNode | null>(null);

  // 엑셀 파일 업로드 상태
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetType, setTargetType] = useState<"task" | "issue" | "requirement">("task");
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [excelParseResult, setExcelParseResult] = useState<{
    headers: string[];
    sampleData: Record<string, unknown>[];
    totalRows: number;
    rawData: Record<string, unknown>[];
  } | null>(null);
  const [suggestedMappings, setSuggestedMappings] = useState<Record<string, string>>({});

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 메시지 영역 스크롤
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * 채팅 기록 불러오기
   */
  const loadChatHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const params = new URLSearchParams();
      if (selectedProjectId) {
        params.append("projectId", selectedProjectId);
      }
      params.append("limit", "100");

      const res = await fetch(`/api/chat?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("채팅 기록 로드 실패:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // 선택된 프로젝트 동기화
  useEffect(() => {
    if (selectedProject) {
      setSelectedProjectId(selectedProject.id);
    }
  }, [selectedProject]);

  /**
   * 페르소나 목록 불러오기
   */
  const loadPersonas = useCallback(async () => {
    try {
      setIsLoadingPersonas(true);
      const data = await api.personas.list();
      setPersonas(data);
      // 기본 페르소나 선택
      const defaultPersona = data.find((p) => p.isDefault);
      if (defaultPersona && !selectedPersonaId) {
        setSelectedPersonaId(defaultPersona.id);
      }
    } catch (error) {
      console.error("페르소나 로드 실패:", error);
    } finally {
      setIsLoadingPersonas(false);
    }
  }, [selectedPersonaId]);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  /**
   * 메시지 전송
   */
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputMessage,
          projectId: selectedProjectId || null,
          personaId: selectedPersonaId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("[Chat] API 응답:", { chartType: data.chartType, hasMindmapData: !!data.mindmapData });
        const assistantMessage: ChatMessage = {
          id: data.id, // API 응답에서 ID 가져오기
          role: "assistant",
          content: data.content,
          sqlQuery: data.sqlQuery,
          chartType: data.chartType,
          chartData: data.chartData,
          mindmapData: data.mindmapData,
          createdAt: new Date().toISOString(),
          processingTimeMs: data.processingTimeMs, // 처리 시간 추가
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const error = await res.json();
        toast.error(error.error || "메시지 전송에 실패했습니다.");
      }
    } catch (error) {
      console.error("메시지 전송 실패:", error);
      toast.error("메시지 전송 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 엔터 키 핸들러
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * 파일 선택 핸들러
   * 엑셀 파일(.xlsx, .xls, .csv)만 허용
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 확장자 검증
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("지원하지 않는 파일 형식입니다. (.xlsx, .xls, .csv만 가능)");
      return;
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    setSelectedFile(file);
    // 입력 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = "";
  };

  /**
   * 엑셀 파일 업로드 및 파싱 처리
   */
  const handleExcelUpload = async () => {
    if (!selectedFile) return;

    // 프로젝트 선택 확인
    if (!selectedProjectId) {
      toast.error("프로젝트를 먼저 선택해주세요.");
      return;
    }

    setIsUploadingExcel(true);

    try {
      // 1. 파일 파싱 API 호출
      const formData = new FormData();
      formData.append("file", selectedFile);

      const parseRes = await fetch("/api/excel/parse", {
        method: "POST",
        body: formData,
      });

      if (!parseRes.ok) {
        const error = await parseRes.json();
        toast.error(error.error || "파일 파싱에 실패했습니다.");
        return;
      }

      const parseData = await parseRes.json();
      setExcelParseResult(parseData);

      // 2. LLM 컬럼 매핑 요청
      const mappingRes = await fetch("/api/excel/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: parseData.headers,
          sampleData: parseData.sampleData,
          targetType,
        }),
      });

      if (mappingRes.ok) {
        const mappingData = await mappingRes.json();
        setSuggestedMappings(mappingData.mappings || {});
      } else {
        // LLM 매핑 실패 시 빈 매핑으로 시작
        setSuggestedMappings({});
      }

      // 3. 매핑 모달 표시
      setShowMappingModal(true);

      // 4. 채팅에 사용자 메시지 추가
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: `📎 **${selectedFile.name}** 파일을 업로드했습니다.\n- 총 ${parseData.totalRows}건의 데이터\n- ${targetType === "task" ? "태스크" : targetType === "issue" ? "이슈" : "요구사항"}로 등록 예정`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

    } catch (error) {
      console.error("엑셀 업로드 실패:", error);
      toast.error("엑셀 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingExcel(false);
    }
  };

  /**
   * 매핑 확인 후 벌크 임포트 실행
   */
  const handleMappingConfirm = async (finalMappings: Record<string, string>) => {
    if (!excelParseResult || !selectedProjectId) return;

    setIsUploadingExcel(true);

    try {
      const res = await fetch("/api/excel/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          projectId: selectedProjectId,
          data: excelParseResult.rawData,
          mappings: finalMappings,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        // 성공 메시지 채팅에 추가
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: `✅ **엑셀 데이터 등록 완료**\n\n- 성공: **${result.success}건**\n- 실패: **${result.failed}건**${result.errors?.length > 0 ? `\n\n**오류 내역:**\n${result.errors.slice(0, 5).join("\n")}${result.errors.length > 5 ? `\n... 외 ${result.errors.length - 5}건` : ""}` : ""}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        toast.success(`${result.success}건 등록 완료!`);
      } else {
        toast.error(result.error || "등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("벌크 임포트 실패:", error);
      toast.error("등록 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingExcel(false);
      setShowMappingModal(false);
      setSelectedFile(null);
      setExcelParseResult(null);
      setSuggestedMappings({});
    }
  };

  /**
   * 채팅 기록 삭제 확인 모달 열기
   */
  const handleClearHistory = () => {
    setShowDeleteModal(true);
  };

  /**
   * 피드백 제출
   * @param messageId 메시지 ID
   * @param rating 피드백 평가 (POSITIVE/NEGATIVE)
   */
  const handleFeedback = async (messageId: string, rating: FeedbackRating) => {
    try {
      const res = await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatHistoryId: messageId,
          rating,
        }),
      });

      if (res.ok) {
        // 로컬 상태 업데이트
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, feedback: { rating, comment: msg.feedback?.comment } }
              : msg
          )
        );
        toast.success(rating === "POSITIVE" ? "감사합니다!" : "의견을 반영하겠습니다.");
      } else {
        const error = await res.json();
        toast.error(error.error || "피드백 제출에 실패했습니다.");
      }
    } catch (error) {
      console.error("피드백 제출 실패:", error);
      toast.error("피드백 제출 중 오류가 발생했습니다.");
    }
  };

  /**
   * 피드백 코멘트 제출
   * @param messageId 메시지 ID
   * @param comment 상세 코멘트
   */
  const handleFeedbackComment = async (messageId: string, comment: string) => {
    if (!comment.trim()) return;

    try {
      const message = messages.find((m) => m.id === messageId);
      const res = await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatHistoryId: messageId,
          rating: message?.feedback?.rating || "NEGATIVE",
          comment,
        }),
      });

      if (res.ok) {
        // 로컬 상태 업데이트
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, feedback: { ...msg.feedback, rating: msg.feedback?.rating || "NEGATIVE", comment } }
              : msg
          )
        );
        toast.success("상세 의견이 등록되었습니다.");
      }
    } catch (error) {
      console.error("피드백 코멘트 제출 실패:", error);
    }
  };

  /**
   * 채팅 기록 삭제 실행
   */
  const confirmClearHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) {
        params.append("projectId", selectedProjectId);
      }

      const res = await fetch(`/api/chat?${params.toString()}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessages([]);
        toast.success("채팅 기록이 삭제되었습니다.");
      }
    } catch (error) {
      console.error("채팅 기록 삭제 실패:", error);
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setShowDeleteModal(false);
    }
  };

  /**
   * 차트 렌더링
   */
  const renderChart = (chartType: string, chartData: Record<string, unknown>[]) => {
    if (!chartData || chartData.length === 0) return null;

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1F2937", border: "none" }}
                labelStyle={{ color: "#F9FAFB" }}
              />
              <Legend />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1F2937", border: "none" }}
                labelStyle={{ color: "#F9FAFB" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1F2937", border: "none" }}
                labelStyle={{ color: "#F9FAFB" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1F2937", border: "none" }}
                labelStyle={{ color: "#F9FAFB" }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS[0]}
                fill={CHART_COLORS[0]}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "bar3d":
        // ECharts 3D 바 차트 옵션
        const bar3dOption = {
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
          },
          xAxis3D: {
            type: "category",
            data: chartData.map((d) => d.name),
            axisLabel: { color: "#9CA3AF" },
          },
          yAxis3D: {
            type: "category",
            data: [""],
            axisLabel: { show: false },
          },
          zAxis3D: {
            type: "value",
            axisLabel: { color: "#9CA3AF" },
          },
          grid3D: {
            boxWidth: 200,
            boxDepth: 80,
            boxHeight: 100,
            viewControl: {
              alpha: 25,
              beta: 40,
              distance: 280,
              rotateSensitivity: 1,
              zoomSensitivity: 1,
            },
            light: {
              main: { intensity: 1.2, shadow: true },
              ambient: { intensity: 0.3 },
            },
            environment: "#1F2937",
          },
          series: [
            {
              type: "bar3D",
              data: chartData.map((d, i) => ({
                value: [i, 0, d.value],
                itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
              })),
              shading: "realistic",
              label: {
                show: true,
                formatter: (params: { value: number[] }) => String(params.value[2]),
                textStyle: { color: "#fff", fontSize: 12 },
              },
              emphasis: {
                itemStyle: { color: "#FFD700" },
              },
              barSize: 30,
            },
          ],
        };
        return (
          <ReactECharts
            option={bar3dOption}
            style={{ height: "350px", width: "100%" }}
            opts={{ renderer: "canvas" }}
          />
        );

      default:
        return null;
    }
  };

  /**
   * 마인드맵 렌더링
   * @param data 마인드맵 데이터
   * @param isFullscreen 전체화면 모드 여부
   */
  const renderMindmap = (data: MindmapNode, isFullscreen = false) => {
    if (!data) return null;

    // 노드 수에 따라 초기 깊이 조절
    const countNodes = (node: MindmapNode): number => {
      let count = 1;
      if (node.children) {
        node.children.forEach(child => count += countNodes(child));
      }
      return count;
    };
    const totalNodes = countNodes(data);
    // 노드가 많으면 초기에 접어서 보여주기
    const initialDepth = totalNodes > 50 ? 1 : totalNodes > 20 ? 2 : 3;

    // 현재 테마 감지 (dark 클래스 확인)
    const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const textColor = isDarkMode ? "#E5E7EB" : "#1F2937";
    const lineColor = isDarkMode ? "#6B7280" : "#9CA3AF";

    /**
     * 노드 라벨 포맷터 - 진행률, 담당자, 완료일 포함
     */
    const formatLabel = (params: { data: MindmapNode }) => {
      const { name, progress, assignee, endDate, status } = params.data;
      const parts: string[] = [];

      // 이름 (전체화면이 아니면 줄이기)
      let displayName = name;
      if (!isFullscreen && name.length > 20) {
        displayName = name.slice(0, 20) + "...";
      }
      parts.push(displayName);

      // 추가 정보 (있을 경우에만 표시)
      const infoParts: string[] = [];
      if (typeof progress === "number") {
        infoParts.push(`${progress}%`);
      }
      if (assignee) {
        infoParts.push(assignee);
      }
      if (endDate) {
        // 날짜 포맷: MM/DD
        const date = new Date(endDate);
        if (!isNaN(date.getTime())) {
          infoParts.push(`${date.getMonth() + 1}/${date.getDate()}`);
        }
      }

      // 추가 정보가 있으면 괄호로 표시
      if (infoParts.length > 0) {
        parts.push(`(${infoParts.join(" | ")})`);
      }

      return parts.join(" ");
    };

    /**
     * 툴팁 포맷터 - 상세 정보 표시
     */
    const formatTooltip = (params: { data: MindmapNode }) => {
      const { name, progress, assignee, endDate, status } = params.data;
      const lines: string[] = [`<strong>${name}</strong>`];

      if (typeof progress === "number") {
        const progressColor = progress >= 80 ? "#10B981" : progress >= 50 ? "#3B82F6" : progress >= 20 ? "#F59E0B" : "#EF4444";
        lines.push(`<span style="color:${progressColor}">진행률: ${progress}%</span>`);
      }
      if (assignee) {
        lines.push(`담당자: ${assignee}`);
      }
      if (endDate) {
        const date = new Date(endDate);
        if (!isNaN(date.getTime())) {
          const formatted = date.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
          lines.push(`완료일: ${formatted}`);
        }
      }
      if (status) {
        const statusMap: Record<string, string> = {
          PENDING: "대기",
          IN_PROGRESS: "진행중",
          COMPLETED: "완료",
          ON_HOLD: "보류",
        };
        lines.push(`상태: ${statusMap[status] || status}`);
      }

      return lines.join("<br/>");
    };

    /**
     * 노드 색상 결정 - 진행률 기반
     */
    const getNodeColor = (node: MindmapNode): string => {
      if (typeof node.progress === "number") {
        if (node.progress >= 100) return "#10B981"; // 완료 - 에메랄드
        if (node.progress >= 80) return "#3B82F6"; // 80% 이상 - 블루
        if (node.progress >= 50) return "#06B6D4"; // 50% 이상 - 시안
        if (node.progress >= 20) return "#F59E0B"; // 20% 이상 - 앰버
        return "#EF4444"; // 20% 미만 - 레드
      }
      return "#3B82F6"; // 기본 블루
    };

    /**
     * 데이터에 색상 정보 추가
     */
    const addColorToNodes = (node: MindmapNode): MindmapNode => {
      const color = getNodeColor(node);
      return {
        ...node,
        itemStyle: { color },
        children: node.children?.map(addColorToNodes),
      };
    };

    const coloredData = addColorToNodes(data);

    const mindmapOption = {
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
        borderColor: isDarkMode ? "#374151" : "#E5E7EB",
        textStyle: {
          color: isDarkMode ? "#E5E7EB" : "#1F2937",
        },
        formatter: formatTooltip,
      },
      series: [
        {
          type: "tree",
          data: [coloredData],
          top: "5%",
          left: isFullscreen ? "5%" : "10%",
          bottom: "5%",
          right: isFullscreen ? "20%" : "25%",
          symbolSize: isFullscreen ? 14 : 10,
          orient: "LR",
          label: {
            position: "left",
            verticalAlign: "middle",
            align: "right",
            fontSize: isFullscreen ? 13 : 11,
            color: textColor,
            formatter: formatLabel,
            rich: {
              progress: {
                color: "#3B82F6",
                fontSize: 10,
              },
            },
          },
          leaves: {
            label: {
              position: "right",
              verticalAlign: "middle",
              align: "left",
            },
          },
          emphasis: {
            focus: "descendant",
          },
          expandAndCollapse: true,
          animationDuration: 550,
          animationDurationUpdate: 750,
          initialTreeDepth: isFullscreen ? 2 : initialDepth,
          lineStyle: {
            color: lineColor,
            width: 1.5,
            curveness: 0.5,
          },
        },
      ],
      backgroundColor: "transparent",
    };

    const height = isFullscreen ? "calc(85vh - 100px)" : "500px";

    return (
      <ReactECharts
        option={mindmapOption}
        style={{ height, width: "100%" }}
        opts={{ renderer: "canvas" }}
      />
    );
  };

  /**
   * 예시 질문
   */
  const exampleQuestions = [
    "현재 프로젝트의 태스크 상태별 개수를 알려줘",
    "이번 주 마감인 태스크가 몇 개야?",
    "WBS 구조를 마인드맵으로 보여줘",
    "요구사항 우선순위별 분포를 차트로 보여줘",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Icon name="smart_toy" size="sm" className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text dark:text-white">AI 어시스턴트</h1>
            <p className="text-sm text-text-secondary">프로젝트 데이터를 분석하고 질문에 답합니다</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 페르소나 선택 */}
          <div className="relative">
            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              disabled={isLoadingPersonas}
              className="pl-9 pr-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm appearance-none min-w-[160px]"
            >
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
            <Icon
              name={personas.find((p) => p.id === selectedPersonaId)?.icon || "smart_toy"}
              size="xs"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
          </div>

          {/* 프로젝트 선택 */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm"
          >
            <option value="">전체 프로젝트</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {/* 기록 삭제 */}
          <Button variant="ghost" size="sm" onClick={handleClearHistory} leftIcon="delete">
            기록 삭제
          </Button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Icon name="progress_activity" size="lg" className="text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          // 빈 상태
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="size-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <Icon name="chat" size="lg" className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-text dark:text-white mb-2">
              무엇이든 물어보세요
            </h2>
            <p className="text-text-secondary mb-6 max-w-md">
              프로젝트 현황, 태스크 분석, 진행률 통계 등 데이터 기반의 질문에 답변합니다.
            </p>

            {/* 예시 질문 */}
            <div className="grid grid-cols-2 gap-3 max-w-xl">
              {exampleQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="p-3 text-left text-sm rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark hover:border-primary transition-colors"
                >
                  <Icon name="lightbulb" size="xs" className="text-warning mb-1" />
                  <p className="text-text dark:text-white">{question}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // 메시지 목록
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-white rounded-2xl rounded-br-md px-4 py-3"
                    : "bg-surface dark:bg-surface-dark rounded-2xl rounded-bl-md"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="p-4 space-y-4">
                    {/* 마크다운 렌더링 */}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // 코드 블록 스타일링
                          code: ({ className, children, ...props }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code
                                className="px-1.5 py-0.5 rounded bg-background-dark text-primary text-sm"
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <code
                                className="block p-3 rounded-lg bg-background-dark text-sm overflow-x-auto"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          // 테이블 스타일링
                          table: ({ children }) => (
                            <div className="overflow-x-auto">
                              <table className="min-w-full border-collapse">{children}</table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="px-3 py-2 text-left bg-background-dark border border-border-dark">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-3 py-2 border border-border-dark">{children}</td>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {/* SQL 쿼리 표시 */}
                    {message.sqlQuery && (
                      <details className="group">
                        <summary className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text">
                          <Icon name="code" size="xs" />
                          <span>실행된 SQL 쿼리</span>
                          <Icon
                            name="expand_more"
                            size="xs"
                            className="group-open:rotate-180 transition-transform"
                          />
                        </summary>
                        <pre className="mt-2 p-3 rounded-lg bg-background-dark text-sm overflow-x-auto">
                          <code className="text-green-400">{message.sqlQuery}</code>
                        </pre>
                      </details>
                    )}

                    {/* 차트 표시 */}
                    {message.chartType && message.chartType !== "mindmap" && message.chartData && (
                      <Card>
                        <div className="p-4">
                          {renderChart(message.chartType, message.chartData)}
                        </div>
                      </Card>
                    )}

                    {/* 마인드맵 표시 */}
                    {message.chartType === "mindmap" && message.mindmapData && (
                      <Card>
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 pb-2 border-b border-border-dark">
                            <div className="flex items-center gap-2">
                              <Icon name="account_tree" size="sm" className="text-primary" />
                              <span className="text-sm font-medium text-text dark:text-white">마인드맵</span>
                              <span className="text-xs text-text-secondary">(노드를 클릭하면 펼치기/접기)</span>
                            </div>
                            <button
                              onClick={() => setFullscreenMindmap(message.mindmapData!)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
                              title="전체화면으로 보기"
                            >
                              <Icon name="fullscreen" size="sm" />
                              <span>전체화면</span>
                            </button>
                          </div>
                          {renderMindmap(message.mindmapData)}
                        </div>
                      </Card>
                    )}

                    {/* 피드백 UI */}
                    <div className="mt-3 pt-3 border-t border-border dark:border-border-dark">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary">응답이 도움이 되었나요?</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleFeedback(message.id, "POSITIVE")}
                              className={`p-1.5 rounded-lg transition-all ${
                                message.feedback?.rating === "POSITIVE"
                                  ? "bg-emerald-500/20 text-emerald-500"
                                  : "text-text-secondary hover:text-emerald-500 hover:bg-emerald-500/10"
                              }`}
                              title="도움됨"
                            >
                              <Icon name="thumb_up" size="sm" />
                            </button>
                            <button
                              onClick={() => handleFeedback(message.id, "NEGATIVE")}
                              className={`p-1.5 rounded-lg transition-all ${
                                message.feedback?.rating === "NEGATIVE"
                                  ? "bg-rose-500/20 text-rose-500"
                                  : "text-text-secondary hover:text-rose-500 hover:bg-rose-500/10"
                              }`}
                              title="개선필요"
                            >
                              <Icon name="thumb_down" size="sm" />
                            </button>
                          </div>
                        </div>
                        {message.processingTimeMs && (
                          <span className="text-[10px] text-text-secondary">
                            {(message.processingTimeMs / 1000).toFixed(1)}초
                          </span>
                        )}
                      </div>
                      {/* 상세 피드백 입력 (부정적 피드백 시 표시) */}
                      {message.feedback?.rating === "NEGATIVE" && (
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="개선이 필요한 부분을 알려주세요..."
                            className="w-full px-3 py-2 text-xs rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary focus:ring-1 focus:ring-primary/50"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleFeedbackComment(message.id, e.currentTarget.value);
                                e.currentTarget.value = "";
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))
        )}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface dark:bg-surface-dark rounded-2xl rounded-bl-md p-4">
              <div className="flex items-center gap-2">
                <Icon name="progress_activity" size="sm" className="text-primary animate-spin" />
                <span className="text-text-secondary text-sm">분석 중...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 border-t border-border dark:border-border-dark">
        {/* 첨부된 파일 미리보기 */}
        {selectedFile && (
          <div className="mb-3 p-3 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Icon name="description" size="sm" className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text dark:text-white">{selectedFile.name}</p>
                  <p className="text-xs text-text-secondary">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* 등록 대상 선택 */}
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as "task" | "issue" | "requirement")}
                  className="px-3 py-1.5 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm"
                >
                  <option value="task">태스크로 등록</option>
                  <option value="issue">이슈로 등록</option>
                  <option value="requirement">요구사항으로 등록</option>
                </select>
                {/* 삭제 버튼 */}
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                  title="파일 제거"
                >
                  <Icon name="close" size="sm" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {/* 파일 첨부 버튼 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="md"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploadingExcel}
            title="엑셀 파일 첨부 (.xlsx, .xls, .csv)"
          >
            <Icon name="attach_file" size="sm" />
          </Button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedFile ? "파일과 함께 보낼 메시지를 입력하세요..." : "질문을 입력하세요... (Shift+Enter로 줄바꿈)"}
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>

          {/* 파일이 있으면 업로드 버튼, 없으면 전송 버튼 */}
          {selectedFile ? (
            <Button
              variant="primary"
              onClick={handleExcelUpload}
              disabled={isUploadingExcel || !selectedProjectId}
              leftIcon={isUploadingExcel ? "progress_activity" : "upload"}
            >
              {isUploadingExcel ? "처리중..." : "업로드"}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              leftIcon={isLoading ? "progress_activity" : "send"}
            >
              전송
            </Button>
          )}
        </div>

        <p className="text-xs text-text-secondary mt-2 text-center">
          AI 어시스턴트는 프로젝트 데이터를 분석하여 답변합니다. 민감한 정보는 입력하지 마세요.
        </p>
      </div>

      {/* 채팅 기록 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-xl max-w-sm w-full animate-slide-in-up">
            <div className="p-6">
              {/* 아이콘 */}
              <div className="flex justify-center mb-4">
                <div className="size-12 rounded-full bg-error/10 flex items-center justify-center">
                  <Icon name="delete" size="md" className="text-error" />
                </div>
              </div>

              {/* 제목 */}
              <h3 className="text-lg font-bold text-text dark:text-white text-center mb-2">
                채팅 기록 삭제
              </h3>

              {/* 메시지 */}
              <p className="text-text-secondary text-center mb-6">
                모든 채팅 기록이 삭제됩니다.<br />
                이 작업은 되돌릴 수 없습니다.
              </p>

              {/* 버튼 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteModal(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 !bg-error hover:!bg-error/90"
                  onClick={confirmClearHistory}
                >
                  삭제
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 전체화면 마인드맵 모달 */}
      {fullscreenMindmap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pt-16">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setFullscreenMindmap(null)}
          />
          {/* 모달 컨텐츠 - 헤더 영역 제외하고 표시 */}
          <div className="relative w-[92vw] h-[85vh] max-h-[calc(100vh-100px)] bg-background dark:bg-background-dark rounded-xl shadow-2xl overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border dark:border-border-dark">
              <div className="flex items-center gap-3">
                <Icon name="account_tree" size="sm" className="text-primary" />
                <h2 className="text-lg font-bold text-text dark:text-white">WBS 마인드맵</h2>
                <span className="text-xs text-text-secondary">(노드 클릭으로 펼치기/접기)</span>
              </div>
              <button
                onClick={() => setFullscreenMindmap(null)}
                className="p-1.5 hover:bg-surface dark:hover:bg-surface-dark rounded-lg transition-colors"
                title="닫기 (ESC)"
              >
                <Icon name="close" size="sm" className="text-text-secondary" />
              </button>
            </div>
            {/* 마인드맵 */}
            <div className="p-3 h-[calc(100%-56px)]">
              {renderMindmap(fullscreenMindmap, true)}
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 매핑 모달 */}
      {showMappingModal && excelParseResult && (
        <ExcelMappingModal
          isOpen={showMappingModal}
          onClose={() => {
            setShowMappingModal(false);
            setSelectedFile(null);
            setExcelParseResult(null);
            setSuggestedMappings({});
          }}
          headers={excelParseResult.headers}
          sampleData={excelParseResult.sampleData}
          totalRows={excelParseResult.totalRows}
          targetType={targetType}
          suggestedMappings={suggestedMappings}
          onConfirm={handleMappingConfirm}
          isLoading={isUploadingExcel}
        />
      )}
    </div>
  );
}
