-- CreateTable
CREATE TABLE "equipment_plcs" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "protocol" TEXT,
    "ipAddress" TEXT,
    "port" INTEGER,
    "station" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_plcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_tags" (
    "id" TEXT NOT NULL,
    "plcId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "dataType" TEXT,
    "unit" TEXT,
    "decimalPlaces" TEXT,
    "byteSize" TEXT,
    "settingValue" TEXT,
    "productionHistory" TEXT,
    "accessMode" TEXT,
    "notes" TEXT,
    "sourceFile" TEXT,
    "sourceSheet" TEXT,
    "sourceRow" INTEGER,
    "sourceData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_alarms" (
    "id" TEXT NOT NULL,
    "plcId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "linkedAddress" TEXT,
    "category" TEXT,
    "message" TEXT NOT NULL,
    "legacyMessage" TEXT,
    "notes" TEXT,
    "sourceFile" TEXT,
    "sourceSheet" TEXT,
    "sourceRow" INTEGER,
    "sourceData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_alarms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_plcs_equipmentId_name_key" ON "equipment_plcs"("equipmentId", "name");

-- CreateIndex
CREATE INDEX "equipment_tags_plcId_address_idx" ON "equipment_tags"("plcId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_tags_plcId_sourceSheet_sourceRow_key" ON "equipment_tags"("plcId", "sourceSheet", "sourceRow");

-- CreateIndex
CREATE INDEX "equipment_alarms_plcId_address_idx" ON "equipment_alarms"("plcId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_alarms_plcId_sourceSheet_sourceRow_key" ON "equipment_alarms"("plcId", "sourceSheet", "sourceRow");

-- AddForeignKey
ALTER TABLE "equipment_plcs" ADD CONSTRAINT "equipment_plcs_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_tags" ADD CONSTRAINT "equipment_tags_plcId_fkey" FOREIGN KEY ("plcId") REFERENCES "equipment_plcs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_alarms" ADD CONSTRAINT "equipment_alarms_plcId_fkey" FOREIGN KEY ("plcId") REFERENCES "equipment_plcs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
