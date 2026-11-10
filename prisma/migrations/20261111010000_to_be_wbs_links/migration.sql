-- TO-BE 설계 3단계 (추적표): TO-BE 업무 ↔ WBS 작업 연결 테이블 1개. 기존 테이블은 바꾸지 않는다.

-- CreateTable
CREATE TABLE "to_be_wbs_links" (
    "toBeItemId" TEXT NOT NULL,
    "wbsItemId" TEXT NOT NULL,

    CONSTRAINT "to_be_wbs_links_pkey" PRIMARY KEY ("toBeItemId","wbsItemId")
);

-- CreateIndex
CREATE INDEX "to_be_wbs_links_wbsItemId_idx" ON "to_be_wbs_links"("wbsItemId");

-- AddForeignKey
ALTER TABLE "to_be_wbs_links" ADD CONSTRAINT "to_be_wbs_links_toBeItemId_fkey" FOREIGN KEY ("toBeItemId") REFERENCES "to_be_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "to_be_wbs_links" ADD CONSTRAINT "to_be_wbs_links_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "wbs_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
