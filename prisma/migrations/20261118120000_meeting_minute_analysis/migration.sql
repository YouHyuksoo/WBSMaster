-- CreateTable
CREATE TABLE "meeting_minute_analyses" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "result" JSONB,
    "error" TEXT,
    "sourceHash" TEXT NOT NULL,
    "model" TEXT,
    "requestedById" TEXT,
    "requestedByName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "minuteId" TEXT NOT NULL,

    CONSTRAINT "meeting_minute_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_minute_analyses_minuteId_key" ON "meeting_minute_analyses"("minuteId");

-- AddForeignKey
ALTER TABLE "meeting_minute_analyses" ADD CONSTRAINT "meeting_minute_analyses_minuteId_fkey" FOREIGN KEY ("minuteId") REFERENCES "meeting_minutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
