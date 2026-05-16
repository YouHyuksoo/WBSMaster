CREATE TYPE "ProgressTaskStageDetailStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED'
);

ALTER TABLE "progress_task_stage_details"
  ADD COLUMN "status" "ProgressTaskStageDetailStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX "progress_task_stage_details_status_idx"
  ON "progress_task_stage_details"("status");
