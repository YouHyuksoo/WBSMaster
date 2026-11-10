-- TO-BE 설계 1단계 (docs/specs/2026-11-10-to-be-design.md): 새 테이블 3개 + 메뉴 배치 · 권한
-- 기존 테이블은 바꾸지 않는다.

-- CreateEnum
CREATE TYPE "ToBeChangeType" AS ENUM ('NEW', 'IMPROVE', 'KEEP', 'RETIRE');

-- CreateEnum
CREATE TYPE "ToBeTargetMethod" AS ENUM ('SYSTEM', 'AUTO', 'POP', 'PDA', 'MANUAL');

-- CreateEnum
CREATE TYPE "ToBeStatus" AS ENUM ('DRAFT', 'REVIEW', 'CONFIRMED');

-- CreateTable
CREATE TABLE "to_be_overviews" (
    "id" TEXT NOT NULL,
    "author" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "to_be_overviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "to_be_items" (
    "id" TEXT NOT NULL,
    "toBeManagementNo" TEXT NOT NULL,
    "majorCategory" "AsIsMajorCategory" NOT NULL,
    "middleCategory" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "changeType" "ToBeChangeType" NOT NULL DEFAULT 'IMPROVE',
    "targetMethod" "ToBeTargetMethod" NOT NULL DEFAULT 'SYSTEM',
    "summary" TEXT,
    "priority" TEXT,
    "status" "ToBeStatus" NOT NULL DEFAULT 'DRAFT',
    "sfrCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "flowChartData" JSONB,
    "swimlaneData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "overviewId" TEXT NOT NULL,

    CONSTRAINT "to_be_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "to_be_as_is_links" (
    "toBeItemId" TEXT NOT NULL,
    "asIsItemId" TEXT NOT NULL,

    CONSTRAINT "to_be_as_is_links_pkey" PRIMARY KEY ("toBeItemId","asIsItemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "to_be_overviews_projectId_key" ON "to_be_overviews"("projectId");

-- CreateIndex
CREATE INDEX "to_be_items_overviewId_idx" ON "to_be_items"("overviewId");

-- CreateIndex
CREATE UNIQUE INDEX "to_be_items_overviewId_toBeManagementNo_key" ON "to_be_items"("overviewId", "toBeManagementNo");

-- CreateIndex
CREATE INDEX "to_be_as_is_links_asIsItemId_idx" ON "to_be_as_is_links"("asIsItemId");

-- AddForeignKey
ALTER TABLE "to_be_overviews" ADD CONSTRAINT "to_be_overviews_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "to_be_items" ADD CONSTRAINT "to_be_items_overviewId_fkey" FOREIGN KEY ("overviewId") REFERENCES "to_be_overviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "to_be_as_is_links" ADD CONSTRAINT "to_be_as_is_links_toBeItemId_fkey" FOREIGN KEY ("toBeItemId") REFERENCES "to_be_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "to_be_as_is_links" ADD CONSTRAINT "to_be_as_is_links_asIsItemId_fkey" FOREIGN KEY ("asIsItemId") REFERENCES "as_is_overview_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 메뉴: 단독 메뉴에서 AS-IS 분석 바로 뒤 (운영에서 순서를 바꿨어도 AS-IS 뒤에 오도록 그 순서 + 5)
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('TO_BE','__ROOT__',(SELECT COALESCE((SELECT "sortOrder" FROM "menu_category_items" WHERE "menuCode"='AS_IS'),95) + 5),CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','TO_BE') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','TO_BE') ON CONFLICT DO NOTHING;
