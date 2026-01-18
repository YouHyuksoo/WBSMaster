/**
 * @file src/app/dashboard/as-is-analysis/hooks/useAsIsAnalysis.ts
 * @description
 * AS-IS 현행 분석 11개 섹션의 CRUD 훅을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **Responsibility (R&R)**: 역할과 책임 정의
 * 2. **Interview**: 현업 인터뷰 결과
 * 3. **Issue**: 이슈/Pain Point
 * 4. **Document**: 문서 목록 (수기/엑셀)
 * 5. **DocumentAnalysis**: 문서 구조 분석 (수기/엑셀)
 * 6. **Function**: 기능 목록 (시스템)
 * 7. **Screen**: 화면 목록 (시스템)
 * 8. **Interface**: 인터페이스 (시스템)
 * 9. **DataModel**: 데이터 모델 (시스템)
 * 10. **CodeDefinition**: 코드 정의서 (시스템)
 * 11. **FlowChartDetail**: Flow Chart 상세
 *
 * @example
 * const { create, update, delete: remove, isCreating } = useAsIsResponsibility();
 * create({ unitAnalysisId: "...", role: "담당자", responsibility: "업무" });
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AsIsResponsibility,
  AsIsInterview,
  AsIsIssue,
  AsIsDocument,
  AsIsDocumentAnalysis,
  AsIsFunction,
  AsIsScreen,
  AsIsInterface,
  AsIsDataModel,
  AsIsCodeDefinition,
  AsIsFlowChartDetail,
} from "../types";

// ============================================
// 공통 API 함수
// ============================================

/** 공통 POST 요청 */
async function apiPost<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "생성 실패");
  }
  return res.json();
}

/** 공통 PATCH 요청 */
async function apiPatch<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "수정 실패");
  }
  return res.json();
}

/** 공통 DELETE 요청 */
async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "삭제 실패");
  }
}

// ============================================
// 1. R&R 정의 (AsIsResponsibility)
// ============================================

export interface CreateResponsibilityRequest {
  unitAnalysisId: string;
  role: string;
  department?: string;
  responsibility: string;
  authority?: string;
  remarks?: string;
}

export interface UpdateResponsibilityRequest {
  role?: string;
  department?: string;
  responsibility?: string;
  authority?: string;
  remarks?: string;
  order?: number;
}

export function useAsIsResponsibility() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateResponsibilityRequest) =>
      apiPost<AsIsResponsibility>("/api/as-is-analysis/responsibilities", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResponsibilityRequest }) =>
      apiPatch<AsIsResponsibility>(`/api/as-is-analysis/responsibilities/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/responsibilities/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// 2. 현업 인터뷰 (AsIsInterview)
// ============================================

export interface CreateInterviewRequest {
  unitAnalysisId: string;
  interviewee: string;
  department?: string;
  position?: string;
  interviewDate?: string;
  topic?: string;
  content: string;
  keyFindings?: string;
  suggestions?: string;
  remarks?: string;
}

export interface UpdateInterviewRequest {
  interviewee?: string;
  department?: string;
  position?: string;
  interviewDate?: string;
  topic?: string;
  content?: string;
  keyFindings?: string;
  suggestions?: string;
  remarks?: string;
  order?: number;
}

export function useAsIsInterview() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateInterviewRequest) =>
      apiPost<AsIsInterview>("/api/as-is-analysis/interviews", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInterviewRequest }) =>
      apiPatch<AsIsInterview>(`/api/as-is-analysis/interviews/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/interviews/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// 3. 이슈/Pain Point (AsIsIssue)
// ============================================

export interface CreateAsIsIssueRequest {
  unitAnalysisId: string;
  issueType?: string;
  title: string;
  description?: string;
  impact?: string;
  frequency?: string;
  priority?: string;
  suggestedFix?: string;
  remarks?: string;
}

export interface UpdateAsIsIssueRequest {
  issueType?: string;
  title?: string;
  description?: string;
  impact?: string;
  frequency?: string;
  priority?: string;
  suggestedFix?: string;
  remarks?: string;
  order?: number;
}

export function useAsIsIssue() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateAsIsIssueRequest) =>
      apiPost<AsIsIssue>("/api/as-is-analysis/issues", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAsIsIssueRequest }) =>
      apiPatch<AsIsIssue>(`/api/as-is-analysis/issues/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/issues/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// 4. 문서 목록 (AsIsDocument) - 수기/엑셀
// ============================================

export interface CreateAsIsDocumentRequest {
  unitAnalysisId: string;
  documentName: string;
  documentType?: string;
  purpose?: string;
  creator?: string;
  frequency?: string;
  storageLocation?: string;
  retentionPeriod?: string;
  remarks?: string;
}

export interface UpdateAsIsDocumentRequest {
  documentName?: string;
  documentType?: string;
  purpose?: string;
  creator?: string;
  frequency?: string;
  storageLocation?: string;
  retentionPeriod?: string;
  remarks?: string;
  order?: number;
}

export function useAsIsDocument() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateAsIsDocumentRequest) =>
      apiPost<AsIsDocument>("/api/as-is-analysis/documents", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAsIsDocumentRequest }) =>
      apiPatch<AsIsDocument>(`/api/as-is-analysis/documents/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/documents/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// 5. 문서 구조 분석 (AsIsDocumentAnalysis) - 수기/엑셀
// ============================================

export interface CreateDocumentAnalysisRequest {
  unitAnalysisId: string;
  documentName: string;
  fieldName: string;
  dataType?: string;
  sampleData?: string;
  isMandatory?: boolean;
  validationRule?: string;
  remarks?: string;
}

export interface UpdateDocumentAnalysisRequest {
  documentName?: string;
  fieldName?: string;
  dataType?: string;
  sampleData?: string;
  isMandatory?: boolean;
  validationRule?: string;
  remarks?: string;
  order?: number;
}

export function useAsIsDocumentAnalysis() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateDocumentAnalysisRequest) =>
      apiPost<AsIsDocumentAnalysis>("/api/as-is-analysis/document-analyses", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentAnalysisRequest }) =>
      apiPatch<AsIsDocumentAnalysis>(`/api/as-is-analysis/document-analyses/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/document-analyses/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// 6. 기능 목록 (AsIsFunction) - 시스템
// ============================================

export interface CreateAsFunctionRequest {
  unitAnalysisId: string;
  functionId?: string;
  functionName: string;
  description?: string;
  module?: string;
  usageFrequency?: string;
  userCount?: string;
  importance?: string;
  remarks?: string;
}

export interface UpdateAsFunctionRequest {
  functionId?: string;
  functionName?: string;
  description?: string;
  module?: string;
  usageFrequency?: string;
  userCount?: string;
  importance?: string;
  remarks?: string;
  order?: number;
}

export function useAsIsFunction() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateAsFunctionRequest) =>
      apiPost<AsIsFunction>("/api/as-is-analysis/functions", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAsFunctionRequest }) =>
      apiPatch<AsIsFunction>(`/api/as-is-analysis/functions/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/functions/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// 7. 화면 목록 (AsIsScreen) - 시스템
// ============================================

export interface CreateAsScreenRequest {
  unitAnalysisId: string;
  screenId?: string;
  screenName: string;
  description?: string;
  menuPath?: string;
  screenType?: string;
  relatedFunction?: string;
  remarks?: string;
}

export interface UpdateAsScreenRequest {
  screenId?: string;
  screenName?: string;
  description?: string;
  menuPath?: string;
  screenType?: string;
  relatedFunction?: string;
  remarks?: string;
  order?: number;
}

export function useAsIsScreen() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateAsScreenRequest) =>
      apiPost<AsIsScreen>("/api/as-is-analysis/screens", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAsScreenRequest }) =>
      apiPatch<AsIsScreen>(`/api/as-is-analysis/screens/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/screens/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// 8. 인터페이스 (AsIsInterface) - 시스템
// ============================================

export interface CreateAsInterfaceRequest {
  unitAnalysisId: string;
  interfaceId?: string;
  interfaceName: string;
  description?: string;
  sourceSystem?: string;
  targetSystem?: string;
  interfaceType?: string;
  protocol?: string;
  frequency?: string;
  dataVolume?: string;
  remarks?: string;
}

export interface UpdateAsInterfaceRequest {
  interfaceId?: string;
  interfaceName?: string;
  description?: string;
  sourceSystem?: string;
  targetSystem?: string;
  interfaceType?: string;
  protocol?: string;
  frequency?: string;
  dataVolume?: string;
  remarks?: string;
  order?: number;
}

export function useAsIsInterface() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateAsInterfaceRequest) =>
      apiPost<AsIsInterface>("/api/as-is-analysis/interfaces", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAsInterfaceRequest }) =>
      apiPatch<AsIsInterface>(`/api/as-is-analysis/interfaces/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/interfaces/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// 9. 데이터 모델 (AsIsDataModel) - 시스템
// ============================================

export interface CreateAsDataModelRequest {
  unitAnalysisId: string;
  tableName: string;
  tableNameKr?: string;
  description?: string;
  columnName?: string;
  columnNameKr?: string;
  dataType?: string;
  length?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  remarks?: string;
}

export interface UpdateAsDataModelRequest {
  tableName?: string;
  tableNameKr?: string;
  description?: string;
  columnName?: string;
  columnNameKr?: string;
  dataType?: string;
  length?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  remarks?: string;
  order?: number;
}

export function useAsIsDataModel() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateAsDataModelRequest) =>
      apiPost<AsIsDataModel>("/api/as-is-analysis/data-models", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAsDataModelRequest }) =>
      apiPatch<AsIsDataModel>(`/api/as-is-analysis/data-models/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/data-models/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// 10. 코드 정의서 (AsIsCodeDefinition) - 시스템
// ============================================

export interface CreateCodeDefinitionRequest {
  unitAnalysisId: string;
  codeGroup: string;
  codeGroupName?: string;
  codeValue: string;
  codeName: string;
  description?: string;
  isActive?: boolean;
  remarks?: string;
}

export interface UpdateCodeDefinitionRequest {
  codeGroup?: string;
  codeGroupName?: string;
  codeValue?: string;
  codeName?: string;
  description?: string;
  isActive?: boolean;
  remarks?: string;
  order?: number;
}

export function useAsIsCodeDefinition() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateCodeDefinitionRequest) =>
      apiPost<AsIsCodeDefinition>("/api/as-is-analysis/code-definitions", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCodeDefinitionRequest }) =>
      apiPatch<AsIsCodeDefinition>(`/api/as-is-analysis/code-definitions/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/code-definitions/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// 11. Flow Chart 상세 (AsIsFlowChartDetail)
// ============================================

export interface CreateFlowChartDetailRequest {
  unitAnalysisId: string;
  nodeId?: string;
  stepNumber?: number;
  processName: string;
  description?: string;
  responsible?: string;
  systemUsed?: string;
  inputData?: string;
  outputData?: string;
  remarks?: string;
}

export interface UpdateFlowChartDetailRequest {
  nodeId?: string;
  stepNumber?: number;
  processName?: string;
  description?: string;
  responsible?: string;
  systemUsed?: string;
  inputData?: string;
  outputData?: string;
  remarks?: string;
  order?: number;
}

export function useAsIsFlowChartDetail() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["as-is-unit-analysis"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateFlowChartDetailRequest) =>
      apiPost<AsIsFlowChartDetail>("/api/as-is-analysis/flow-chart-details", data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFlowChartDetailRequest }) =>
      apiPatch<AsIsFlowChartDetail>(`/api/as-is-analysis/flow-chart-details/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/as-is-analysis/flow-chart-details/${id}`),
    onSuccess: invalidate,
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
