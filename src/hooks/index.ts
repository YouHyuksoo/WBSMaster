/**
 * @file src/hooks/index.ts
 * @description
 * React Query hooks 내보내기 파일입니다.
 *
 * 초보자 가이드:
 * - 모든 hooks를 한 곳에서 import할 수 있습니다.
 *
 * @example
 * import { useProjects, useTasks, useCreateProject } from '@/hooks';
 */

// 프로젝트 hooks
export {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  projectKeys,
} from "./useProjects";

// 태스크 hooks
export {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useNudgeTask,
  taskKeys,
} from "./useTasks";

// 요구사항 hooks
export {
  useRequirements,
  useRequirement,
  useCreateRequirement,
  useUpdateRequirement,
  useDeleteRequirement,
  useRequirementStats,
  requirementKeys,
} from "./useRequirements";

// 휴일/일정 hooks
export {
  useHolidays,
  useHoliday,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  useTodaySchedules,
  holidayKeys,
} from "./useHolidays";

// 멤버 hooks
export {
  useMembers,
  useMember,
  useInviteMember,
  useUpdateMember,
  useRemoveMember,
  memberKeys,
} from "./useMembers";

// 사용자 hooks
export {
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  userKeys,
} from "./useUsers";

// WBS hooks (계층형 구조)
export {
  useWbsItems,
  useWbsItem,
  useCreateWbsItem,
  useUpdateWbsItem,
  useDeleteWbsItem,
  useChangeWbsLevel,
  useWbsStats,
  wbsKeys,
} from "./useWbs";

// 이슈 hooks
export {
  useIssues,
  useIssue,
  useCreateIssue,
  useUpdateIssue,
  useDeleteIssue,
  useIssueStats,
  issueKeys,
} from "./useIssues";

// 현재 사용자 hook
export { useCurrentUser, currentUserKeys } from "./useCurrentUser";

// 주간보고 hooks
export {
  useWeeklyReports,
  useWeeklyReport,
  useCreateWeeklyReport,
  useUpdateWeeklyReport,
  useDeleteWeeklyReport,
  useAutoLoadData,
  useWeeklyReportItems,
  useCreateReportItem,
  useUpdateReportItem,
  useDeleteReportItem,
  useBulkCreateReportItems,
  weeklyReportKeys,
} from "./useWeeklyReports";

// 핀포인트 hooks
export {
  usePinpoints,
  useCreatePinpoint,
  useUpdatePinpoint,
  useDeletePinpoint,
  pinpointKeys,
} from "./usePinpoints";

// 주간보고 취합 hooks
export {
  useWeeklySummaries,
  useWeeklySummary,
  useCreateWeeklySummary,
  useUpdateWeeklySummary,
  useDeleteWeeklySummary,
  useAnalyzeWeeklySummary,
} from "./useWeeklySummaries";

// 고객요구사항 hooks
export {
  useCustomerRequirements,
  useCustomerRequirement,
  useCreateCustomerRequirement,
  useUpdateCustomerRequirement,
  useDeleteCustomerRequirement,
  useImportCustomerRequirements,
  customerRequirementKeys,
} from "./useCustomerRequirements";

// 문서함 hooks
export {
  useDocuments,
  useDocument,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  useToggleFavorite,
  documentKeys,
} from "./useDocuments";

// 현업이슈 hooks
export {
  useFieldIssues,
  useFieldIssue,
  useCreateFieldIssue,
  useUpdateFieldIssue,
  useDeleteFieldIssue,
  useImportFieldIssues,
  fieldIssueKeys,
} from "./useFieldIssues";
