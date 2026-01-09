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

/**
 * 마인드맵 노드 타입
 */
interface MindmapNode {
  name: string;
  children?: MindmapNode[];
  value?: number;
  itemStyle?: {
    color?: string;
  };
}

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

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.content,
          sqlQuery: data.sqlQuery,
          chartType: data.chartType,
          chartData: data.chartData,
          mindmapData: data.mindmapData,
          createdAt: new Date().toISOString(),
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
   * 채팅 기록 삭제 확인 모달 열기
   */
  const handleClearHistory = () => {
    setShowDeleteModal(true);
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

    const mindmapOption = {
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        formatter: (params: { data: { name: string; value?: number } }) => {
          const { name, value } = params.data;
          return value ? `${name}: ${value}` : name;
        },
      },
      series: [
        {
          type: "tree",
          data: [data],
          top: "5%",
          left: isFullscreen ? "5%" : "10%",
          bottom: "5%",
          right: isFullscreen ? "15%" : "20%",
          symbolSize: isFullscreen ? 12 : 8,
          orient: "LR",
          label: {
            position: "left",
            verticalAlign: "middle",
            align: "right",
            fontSize: isFullscreen ? 14 : 11,
            color: "#E5E7EB",
            formatter: (params: { data: { name: string } }) => {
              const name = params.data.name;
              // 전체화면이 아니면 긴 이름 줄이기
              if (!isFullscreen && name.length > 15) {
                return name.slice(0, 15) + "...";
              }
              return name;
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
            color: "#6B7280",
            width: 1.5,
            curveness: 0.5,
          },
          itemStyle: {
            color: "#3B82F6",
            borderColor: "#3B82F6",
          },
        },
      ],
      backgroundColor: "transparent",
    };

    const height = isFullscreen ? "calc(100vh - 120px)" : "500px";

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
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요... (Shift+Enter로 줄바꿈)"
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>
          <Button
            variant="primary"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            leftIcon={isLoading ? "progress_activity" : "send"}
          >
            전송
          </Button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setFullscreenMindmap(null)}
          />
          {/* 모달 컨텐츠 */}
          <div className="relative w-[95vw] h-[95vh] bg-background dark:bg-background-dark rounded-xl shadow-2xl overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark">
              <div className="flex items-center gap-3">
                <Icon name="account_tree" size="md" className="text-primary" />
                <h2 className="text-xl font-bold text-text dark:text-white">WBS 마인드맵</h2>
                <span className="text-sm text-text-secondary">(노드를 클릭하면 펼치기/접기)</span>
              </div>
              <button
                onClick={() => setFullscreenMindmap(null)}
                className="p-2 hover:bg-surface dark:hover:bg-surface-dark rounded-lg transition-colors"
                title="닫기"
              >
                <Icon name="close" size="md" className="text-text-secondary" />
              </button>
            </div>
            {/* 마인드맵 */}
            <div className="p-4 h-[calc(100%-72px)]">
              {renderMindmap(fullscreenMindmap, true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
