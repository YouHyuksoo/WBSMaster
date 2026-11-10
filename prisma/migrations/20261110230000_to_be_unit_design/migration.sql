-- TO-BE 설계 2단계 (단위업무 설계): 개선 매핑 · 프로세스 정의 테이블 2개 + 열거형 1개. 기존 테이블은 바꾸지 않는다.

-- CreateEnum
CREATE TYPE "ToBeFixResult" AS ENUM ('RESOLVED', 'PARTIAL', 'OPEN');

-- CreateTable
CREATE TABLE "to_be_issue_fixes" (
    "id" TEXT NOT NULL,
    "toBeItemId" TEXT NOT NULL,
    "asIsIssueId" TEXT,
    "issueTitle" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "result" "ToBeFixResult" NOT NULL DEFAULT 'OPEN',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "to_be_issue_fixes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "to_be_processes" (
    "id" TEXT NOT NULL,
    "toBeItemId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT,
    "system" TEXT,
    "input" TEXT,
    "output" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "to_be_processes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "to_be_issue_fixes_toBeItemId_idx" ON "to_be_issue_fixes"("toBeItemId");

-- CreateIndex
CREATE INDEX "to_be_issue_fixes_asIsIssueId_idx" ON "to_be_issue_fixes"("asIsIssueId");

-- CreateIndex
CREATE INDEX "to_be_processes_toBeItemId_idx" ON "to_be_processes"("toBeItemId");

-- AddForeignKey
ALTER TABLE "to_be_issue_fixes" ADD CONSTRAINT "to_be_issue_fixes_toBeItemId_fkey" FOREIGN KEY ("toBeItemId") REFERENCES "to_be_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "to_be_issue_fixes" ADD CONSTRAINT "to_be_issue_fixes_asIsIssueId_fkey" FOREIGN KEY ("asIsIssueId") REFERENCES "as_is_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "to_be_processes" ADD CONSTRAINT "to_be_processes_toBeItemId_fkey" FOREIGN KEY ("toBeItemId") REFERENCES "to_be_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

