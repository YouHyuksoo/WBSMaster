CREATE TABLE "progress_task_stage_details" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "description" TEXT,
  "issue" TEXT,
  "assigneeUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "progress_task_stage_details_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "progress_task_stage_details_taskId_stageId_key"
  ON "progress_task_stage_details"("taskId", "stageId");
CREATE INDEX "progress_task_stage_details_stageId_idx"
  ON "progress_task_stage_details"("stageId");
CREATE INDEX "progress_task_stage_details_assigneeUserId_idx"
  ON "progress_task_stage_details"("assigneeUserId");

ALTER TABLE "progress_task_stage_details"
  ADD CONSTRAINT "progress_task_stage_details_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "progress_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "progress_task_stage_details"
  ADD CONSTRAINT "progress_task_stage_details_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "progress_stage_defs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "progress_task_stage_details"
  ADD CONSTRAINT "progress_task_stage_details_assigneeUserId_fkey"
  FOREIGN KEY ("assigneeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
