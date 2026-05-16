CREATE TABLE "progress_category_plans" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "category" "StageCategory" NOT NULL,
  "openDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "progress_category_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "progress_category_plans_projectId_category_key"
  ON "progress_category_plans"("projectId", "category");

CREATE INDEX "progress_category_plans_projectId_idx"
  ON "progress_category_plans"("projectId");

ALTER TABLE "progress_category_plans"
  ADD CONSTRAINT "progress_category_plans_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
