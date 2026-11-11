-- AlterTable
ALTER TABLE "chat_histories" ADD COLUMN     "intakeDraftId" TEXT;

-- CreateTable
CREATE TABLE "chat_attachments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_intake_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL DEFAULT '[]',
    "attachmentIds" TEXT[],
    "startRequestId" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "duplicates" JSONB NOT NULL DEFAULT '[]',
    "actionId" TEXT,
    "result" JSONB,
    "leaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_intake_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_intake_events" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_intake_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_attachments_storageKey_key" ON "chat_attachments"("storageKey");

-- CreateIndex
CREATE INDEX "chat_attachments_userId_projectId_idx" ON "chat_attachments"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_intake_drafts_actionId_key" ON "chat_intake_drafts"("actionId");

-- CreateIndex
CREATE INDEX "chat_intake_drafts_userId_projectId_status_idx" ON "chat_intake_drafts"("userId", "projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "chat_intake_drafts_userId_projectId_startRequestId_key" ON "chat_intake_drafts"("userId", "projectId", "startRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_intake_events_draftId_requestId_key" ON "chat_intake_events"("draftId", "requestId");

-- AddForeignKey
ALTER TABLE "chat_attachments" ADD CONSTRAINT "chat_attachments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_attachments" ADD CONSTRAINT "chat_attachments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_intake_drafts" ADD CONSTRAINT "chat_intake_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_intake_drafts" ADD CONSTRAINT "chat_intake_drafts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_intake_events" ADD CONSTRAINT "chat_intake_events_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "chat_intake_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
