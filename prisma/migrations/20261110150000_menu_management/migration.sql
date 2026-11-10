-- 메뉴 관리 (HANES 방식): 그룹 · 배치 · 역할별 권한 · 즐겨찾기 (2026-11-10)
-- 새 테이블만 추가한다. 기존 테이블은 바꾸지 않는다.

-- CreateTable
CREATE TABLE "menu_categories" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "menu_category_items" (
    "menuCode" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_category_items_pkey" PRIMARY KEY ("menuCode")
);

-- CreateTable
CREATE TABLE "role_menu_permissions" (
    "role" "UserRole" NOT NULL,
    "menuCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_menu_permissions_pkey" PRIMARY KEY ("role","menuCode")
);

-- CreateTable
CREATE TABLE "user_menu_favorite_folders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_menu_favorite_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_menu_favorites" (
    "userId" TEXT NOT NULL,
    "menuCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_menu_favorites_pkey" PRIMARY KEY ("userId","menuCode")
);

-- CreateIndex
CREATE INDEX "menu_category_items_categoryCode_idx" ON "menu_category_items"("categoryCode");

-- CreateIndex
CREATE INDEX "user_menu_favorite_folders_userId_idx" ON "user_menu_favorite_folders"("userId");

-- CreateIndex
CREATE INDEX "user_menu_favorites_folderId_idx" ON "user_menu_favorites"("folderId");

-- AddForeignKey
ALTER TABLE "menu_category_items" ADD CONSTRAINT "menu_category_items_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "menu_categories"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_menu_favorite_folders" ADD CONSTRAINT "user_menu_favorite_folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_menu_favorites" ADD CONSTRAINT "user_menu_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_menu_favorites" ADD CONSTRAINT "user_menu_favorites_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "user_menu_favorite_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- 처음 배치: 지금까지 코드에 고정돼 있던 좌측 메뉴와 같다 (src/lib/menu/menu-config.ts DEFAULT_MENU_LAYOUT)
INSERT INTO "menu_categories" ("code","label","icon","sortOrder","isActive","updatedAt") VALUES ('__ROOT__','메뉴',NULL,0,true,CURRENT_TIMESTAMP) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('DASHBOARD','__ROOT__',10,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('WBS','__ROOT__',20,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('MILESTONE','__ROOT__',30,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('PROGRESS_RISK','__ROOT__',40,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('TASK','__ROOT__',50,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('SCHEDULE','__ROOT__',60,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('INTERVIEW','__ROOT__',70,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('MEETING_MINUTE','__ROOT__',80,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('AS_IS','__ROOT__',90,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('CUSTOMER_REQ','__ROOT__',100,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('FIELD_ISSUE','__ROOT__',110,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('DISCUSSION','__ROOT__',120,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('PROCESS_VERIFICATION','__ROOT__',130,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('EQUIPMENT','__ROOT__',140,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('WEEKLY_REPORT','__ROOT__',150,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('DOCUMENT','__ROOT__',160,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('AI_CHAT','__ROOT__',170,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_categories" ("code","label","icon","sortOrder","isActive","updatedAt") VALUES ('SYSTEM','시스템관리','admin_panel_settings',10,true,CURRENT_TIMESTAMP) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('SETTINGS','SYSTEM',10,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('USER_PROJECT','SYSTEM',20,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('CHAT_ANALYTICS','SYSTEM',30,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('REQUIREMENT_CHECK','SYSTEM',40,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('ISSUE_CHECK','SYSTEM',50,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('SLACK','SYSTEM',60,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('BACKUP','SYSTEM',70,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('SYS_MENU','SYSTEM',80,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;
INSERT INTO "menu_category_items" ("menuCode","categoryCode","sortOrder","updatedAt") VALUES ('SYS_ROLE','SYSTEM',90,CURRENT_TIMESTAMP) ON CONFLICT ("menuCode") DO NOTHING;

-- 처음 권한: USER · GUEST 는 지금처럼 ADMIN 전용(systemOnly) 화면을 뺀 모든 메뉴를 쓴다. ADMIN 은 행 없이 전부 허용
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','DASHBOARD') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','WBS') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','MILESTONE') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','PROGRESS_RISK') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','TASK') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','SCHEDULE') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','INTERVIEW') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','MEETING_MINUTE') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','AS_IS') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','CUSTOMER_REQ') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','FIELD_ISSUE') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','DISCUSSION') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','PROCESS_VERIFICATION') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','EQUIPMENT') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','WEEKLY_REPORT') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','DOCUMENT') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','AI_CHAT') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','SETTINGS') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','CHAT_ANALYTICS') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','REQUIREMENT_CHECK') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','ISSUE_CHECK') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','SLACK') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('USER','BACKUP') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','DASHBOARD') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','WBS') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','MILESTONE') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','PROGRESS_RISK') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','TASK') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','SCHEDULE') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','INTERVIEW') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','MEETING_MINUTE') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','AS_IS') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','CUSTOMER_REQ') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','FIELD_ISSUE') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','DISCUSSION') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','PROCESS_VERIFICATION') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','EQUIPMENT') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','WEEKLY_REPORT') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','DOCUMENT') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','AI_CHAT') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','SETTINGS') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','CHAT_ANALYTICS') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','REQUIREMENT_CHECK') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','ISSUE_CHECK') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','SLACK') ON CONFLICT DO NOTHING;
INSERT INTO "role_menu_permissions" ("role","menuCode") VALUES ('GUEST','BACKUP') ON CONFLICT DO NOTHING;
