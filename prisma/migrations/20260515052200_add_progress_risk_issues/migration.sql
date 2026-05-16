CREATE TYPE "ProgressRiskIssueStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'WAITING_DECISION',
  'RESOLVED',
  'CLOSED'
);

CREATE TABLE "progress_risk_issues" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "stageCategory" "StageCategory" NOT NULL,
  "majorCategory" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isScheduleRisk" BOOLEAN NOT NULL DEFAULT true,
  "targetDate" TIMESTAMP(3),
  "status" "ProgressRiskIssueStatus" NOT NULL DEFAULT 'OPEN',
  "needsEscalation" BOOLEAN NOT NULL DEFAULT false,
  "assignee" TEXT,
  "decisionMaker" TEXT,
  "submittedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedDate" TIMESTAMP(3),
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "progress_risk_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "progress_risk_issues_projectId_idx" ON "progress_risk_issues"("projectId");
CREATE INDEX "progress_risk_issues_projectId_stageCategory_majorCategory_idx"
  ON "progress_risk_issues"("projectId", "stageCategory", "majorCategory");
CREATE INDEX "progress_risk_issues_status_idx" ON "progress_risk_issues"("status");
CREATE INDEX "progress_risk_issues_isScheduleRisk_idx" ON "progress_risk_issues"("isScheduleRisk");

ALTER TABLE "progress_risk_issues"
  ADD CONSTRAINT "progress_risk_issues_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
