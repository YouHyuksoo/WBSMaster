/**
 * @file src/app/dashboard/components/index.ts
 * @description
 * 대시보드 컴포넌트 모듈 내보내기
 */

export { default as StatCard } from "./StatCard";
export type { StatCardProps } from "./StatCard";

export { default as ProjectCard } from "./ProjectCard";
export type { ProjectCardProps, ProjectWithWbs, OrgMember } from "./ProjectCard";

export { default as TodayScheduleSection } from "./TodayScheduleSection";
export type { Schedule } from "./TodayScheduleSection";

export { default as WbsStatsSection } from "./WbsStatsSection";
export type { WbsStats, WbsAssignee } from "./WbsStatsSection";

export { default as TaskStatsSection } from "./TaskStatsSection";

export { default as IssueStatsSection } from "./IssueStatsSection";
export type { IssueStats } from "./IssueStatsSection";

export { default as RequirementStatsSection } from "./RequirementStatsSection";
export type { ReqStats } from "./RequirementStatsSection";

export { default as WbsScheduleOverviewSection } from "./WbsScheduleOverviewSection";
