-- 업무 변경과 지식 전송 이벤트를 같은 트랜잭션에 기록한다. 원본 데이터는 수정하지 않는다.
CREATE TABLE IF NOT EXISTS knowledge_outbox (
  id BIGSERIAL PRIMARY KEY, "projectId" TEXT NOT NULL, model TEXT NOT NULL,
  "recordId" TEXT NOT NULL, operation TEXT NOT NULL CHECK (operation IN ('upsert','delete')),
  payload JSONB NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "deliveredAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS knowledge_outbox_pending ON knowledge_outbox (id) WHERE "deliveredAt" IS NULL;
CREATE INDEX IF NOT EXISTS knowledge_outbox_project ON knowledge_outbox ("projectId", "deliveredAt");

CREATE OR REPLACE FUNCTION knowledge_targets() RETURNS JSONB LANGUAGE sql IMMUTABLE AS $targets$
SELECT $json${"projects":{"model":"Project","table":"projects","fields":["id","name","description","status","startDate","endDate","progress","purpose","successIndicators","futureVision","ownerId"],"references":{"ownerId":"users"}},"users":{"model":"User","table":"users","fields":["id","name","affiliation"],"references":{}},"tasks":{"model":"Task","table":"tasks","fields":["id","title","description","status","priority","progress","startDate","dueDate","actualStartDate","actualEndDate","order","isAiGenerated","flowX","flowY","projectId","assigneeId","creatorId","requirementId","wbsItemId","completedAt"],"references":{"assigneeId":"users","creatorId":"users","wbsItemId":"wbs_items","requirementId":"requirements","projectId":"projects"}},"task_connections":{"model":"TaskConnection","table":"task_connections","fields":["id","label","type","color","animated","sourceHandle","targetHandle","fromTaskId","toTaskId","projectId"],"references":{"fromTaskId":"tasks","toTaskId":"tasks","projectId":"projects"}},"task_assignees":{"model":"TaskAssignee","table":"task_assignees","fields":["id","assignedAt","taskId","userId"],"references":{"userId":"users","taskId":"tasks"},"parent":{"table":"tasks","field":"taskId"}},"requirements":{"model":"Requirement","table":"requirements","fields":["id","code","title","description","status","priority","category","requestDate","dueDate","isDelayed","projectId","requesterId","assigneeId"],"references":{"assigneeId":"users","requesterId":"users","projectId":"projects"}},"team_members":{"model":"TeamMember","table":"team_members","fields":["id","role","customRole","department","position","joinedAt","projectId","userId"],"references":{"userId":"users","projectId":"projects"}},"wbs_items":{"model":"WbsItem","table":"wbs_items","fields":["id","code","name","description","level","order","status","progress","startDate","endDate","actualStartDate","actualEndDate","weight","deliverableName","parentId","projectId"],"references":{"parentId":"wbs_items","projectId":"projects"}},"wbs_assignees":{"model":"WbsAssignee","table":"wbs_assignees","fields":["id","assignedAt","wbsItemId","userId"],"references":{"userId":"users","wbsItemId":"wbs_items"},"parent":{"table":"wbs_items","field":"wbsItemId"}},"issues":{"model":"Issue","table":"issues","fields":["id","code","title","description","status","priority","category","type","resolution","reportDate","dueDate","resolvedDate","isDelayed","projectId","reporterId","assigneeId"],"references":{"assigneeId":"users","reporterId":"users","projectId":"projects"}},"timeline_rows":{"model":"TimelineRow","table":"timeline_rows","fields":["id","name","color","order","isDefault","parentId","projectId"],"references":{"parentId":"timeline_rows","projectId":"projects"}},"milestones":{"model":"Milestone","table":"milestones","fields":["id","name","description","startDate","endDate","status","color","order","projectId","rowId"],"references":{"rowId":"timeline_rows","projectId":"projects"}},"pinpoints":{"model":"Pinpoint","table":"pinpoints","fields":["id","name","description","date","color","projectId","rowId"],"references":{"rowId":"timeline_rows","projectId":"projects"}},"weekly_reports":{"model":"WeeklyReport","table":"weekly_reports","fields":["id","year","weekNumber","weekStart","weekEnd","issueContent","status","submittedAt","userId","projectId"],"references":{"userId":"users","projectId":"projects"}},"weekly_report_items":{"model":"WeeklyReportItem","table":"weekly_report_items","fields":["id","type","category","title","description","targetDate","remarks","isAdditional","isCompleted","progress","linkedTaskId","linkedWbsId","order","reportId"],"references":{"linkedTaskId":"tasks","linkedWbsId":"wbs_items","reportId":"weekly_reports"},"parent":{"table":"weekly_reports","field":"reportId"}},"customer_requirements":{"model":"CustomerRequirement","table":"customer_requirements","fields":["id","sequence","code","category","functionName","content","requestDate","requester","solution","applyStatus","remarks","toBeCode","completeDate","projectId"],"references":{"projectId":"projects"}},"documents":{"model":"Document","table":"documents","fields":["id","name","description","category","version","sourceType","tags","isFavorite","isPersonal","order","projectId","createdById"],"references":{"createdById":"users","projectId":"projects"}},"equipments":{"model":"Equipment","table":"equipments","fields":["id","code","name","type","status","positionX","positionY","description","location","lineCode","divisionCode","manufacturer","modelNumber","serialNumber","purchaseDate","warrantyEndDate","ipAddress","portNumber","isLogTarget","isInterlockTarget","isBarcodeEnabled","systemType","projectId"],"references":{"projectId":"projects"}},"equipment_properties":{"model":"EquipmentProperty","table":"equipment_properties","fields":["id","key","value","valueType","unit","order","equipmentId"],"references":{"equipmentId":"equipments"},"parent":{"table":"equipments","field":"equipmentId"}},"equipment_connections":{"model":"EquipmentConnection","table":"equipment_connections","fields":["id","label","type","order","color","animated","sourceHandle","targetHandle","fromEquipmentId","toEquipmentId"],"references":{"fromEquipmentId":"equipments","toEquipmentId":"equipments"},"parent":{"table":"equipments","field":"fromEquipmentId"}},"interviews":{"model":"Interview","table":"interviews","fields":["id","sequence","code","title","interviewDate","interviewer","interviewee","category","currentProcess","painPoints","desiredResults","technicalConstraints","questions","transferStatus","transferredTo","transferredType","transferredAt","remarks","projectId"],"references":{"projectId":"projects"}},"meeting_minutes":{"model":"MeetingMinute","table":"meeting_minutes","fields":["id","sequence","code","title","meetingDate","startTime","endTime","location","author","attendees","remarks","projectId"],"references":{"projectId":"projects"}},"meeting_minute_items":{"model":"MeetingMinuteItem","table":"meeting_minute_items","fields":["id","sortOrder","content","assignee","dueDate","status","minuteId"],"references":{"minuteId":"meeting_minutes"},"parent":{"table":"meeting_minutes","field":"minuteId"}},"field_issues":{"model":"FieldIssue","table":"field_issues","fields":["id","sequence","code","category","title","description","registeredDate","issuer","requirementCode","assignee","status","targetDate","completedDate","proposedSolution","finalSolution","remarks","projectId"],"references":{"projectId":"projects"}},"discussion_items":{"model":"DiscussionItem","table":"discussion_items","fields":["id","code","title","description","status","stage","priority","options","decision","convertedToType","convertedToCode","referenceNote","reportDate","dueDate","resolvedDate","requesterName","projectId","reporterId","assigneeId"],"references":{"assigneeId":"users","reporterId":"users","projectId":"projects"}},"as_is_overviews":{"model":"AsIsOverview","table":"as_is_overviews","fields":["id","customerName","author","createdDate","projectId"],"references":{"projectId":"projects"}},"as_is_overview_items":{"model":"AsIsOverviewItem","table":"as_is_overview_items","fields":["id","asIsManagementNo","majorCategory","middleCategory","taskName","currentMethod","issueSummary","details","remarks","order","overviewId"],"references":{"overviewId":"as_is_overviews"},"parent":{"table":"as_is_overviews","field":"overviewId"}},"progress_stage_defs":{"model":"ProgressStageDef","table":"progress_stage_defs","fields":["id","projectId","category","name","order"],"references":{"projectId":"projects"}},"progress_category_plans":{"model":"ProgressCategoryPlan","table":"progress_category_plans","fields":["id","projectId","category","openDate"],"references":{"projectId":"projects"}},"progress_risk_issues":{"model":"ProgressRiskIssue","table":"progress_risk_issues","fields":["id","projectId","stageCategory","majorCategory","title","description","isScheduleRisk","targetDate","status","needsEscalation","assignee","decisionMaker","submittedDate","resolvedDate","remarks"],"references":{"projectId":"projects"}},"progress_tasks":{"model":"ProgressTask","table":"progress_tasks","fields":["id","projectId","code","name","category","description","order","startDate","endDate","actualStartDate","actualEndDate","stageCategory","currentStageId","status","progress","effortMd","predecessorId","isParallel"],"references":{"currentStageId":"progress_stage_defs","predecessorId":"progress_tasks","projectId":"projects"}},"progress_task_assignees":{"model":"ProgressTaskAssignee","table":"progress_task_assignees","fields":["id","taskId","userId","role","allocationPct","assignedAt"],"references":{"userId":"users","taskId":"progress_tasks"},"parent":{"table":"progress_tasks","field":"taskId"}},"progress_task_stage_details":{"model":"ProgressTaskStageDetail","table":"progress_task_stage_details","fields":["id","taskId","stageId","status","description","issue","assigneeUserId"],"references":{"assigneeUserId":"users","stageId":"progress_stage_defs","taskId":"progress_tasks"},"parent":{"table":"progress_tasks","field":"taskId"}}}$json$::jsonb;
$targets$;

CREATE OR REPLACE FUNCTION knowledge_enqueue(tbl TEXT, row_data JSONB, op TEXT, forced_project TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $capture$
DECLARE spec JSONB; scope TEXT; safe JSONB; person TEXT; target RECORD; ref TEXT; other RECORD; scopes TEXT[]; q TEXT;
BEGIN
  spec := knowledge_targets()->tbl;
  IF spec IS NULL OR row_data->>'id' IS NULL THEN RETURN; END IF;
  IF tbl = 'users' AND forced_project IS NULL THEN
    -- 팀원뿐 아니라 담당자·작성자 등 실제 참조가 있는 프로젝트에도 이름 변경을 반영한다.
    scopes := ARRAY[]::TEXT[];
    FOR other IN SELECT key,value FROM jsonb_each(knowledge_targets()) WHERE key <> 'users' LOOP
      FOR ref IN SELECT key FROM jsonb_each_text(other.value->'references') WHERE value='users' LOOP
        IF other.key='projects' THEN
          q := format('SELECT id AS scope FROM public.%I WHERE %I=$1',other.key,ref);
        ELSIF other.value ? 'parent' THEN
          q := format('SELECT p."projectId" AS scope FROM public.%I r JOIN public.%I p ON p.id=r.%I WHERE r.%I=$1',other.key,other.value->'parent'->>'table',other.value->'parent'->>'field',ref);
        ELSE
          q := format('SELECT "projectId" AS scope FROM public.%I WHERE %I=$1',other.key,ref);
        END IF;
        FOR target IN EXECUTE q USING row_data->>'id' LOOP scopes := array_append(scopes,target.scope); END LOOP;
      END LOOP;
    END LOOP;
    FOR target IN SELECT DISTINCT unnest(scopes) AS id LOOP
      IF target.id IS NOT NULL THEN PERFORM knowledge_enqueue(tbl,row_data,op,target.id); END IF;
    END LOOP;
    RETURN;
  END IF;
  scope := forced_project;
  IF scope IS NULL THEN
    IF tbl = 'projects' THEN scope := row_data->>'id';
    ELSIF row_data ? 'projectId' THEN scope := row_data->>'projectId';
    ELSIF spec ? 'parent' THEN
      EXECUTE format('SELECT "projectId" FROM public.%I WHERE id = $1', spec->'parent'->>'table')
        INTO scope USING row_data->>(spec->'parent'->>'field');
    END IF;
  END IF;
  IF scope IS NULL THEN RETURN; END IF;
  SELECT coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) INTO safe
    FROM jsonb_each(row_data) e WHERE (spec->'fields') ? e.key;
  -- 개인 문서를 공용으로 노출하지 않는다. 공용→개인 전환도 삭제 이벤트가 된다.
  IF (tbl = 'documents' AND coalesce((row_data->>'isPersonal')::boolean,false))
     OR (tbl = 'equipment_properties' AND row_data->>'key' ~* '(password|secret|token|credential|api.?key|비밀번호)') THEN op := 'delete'; END IF;
  INSERT INTO knowledge_outbox ("projectId",model,"recordId",operation,payload)
    VALUES (scope,tbl,row_data->>'id',op,CASE WHEN op='delete' THEN '{}'::jsonb ELSE safe END);
  PERFORM pg_notify('knowledge_changed','');
  -- 참조되는 사람은 이름만 같은 프로젝트 안에 색인한다. 인증 정보는 whitelist 밖이다.
  IF op = 'upsert' AND tbl <> 'users' THEN
    FOR ref IN SELECT key FROM jsonb_each_text(spec->'references') WHERE value='users' LOOP
      person := row_data->>ref;
      IF person IS NOT NULL THEN
        FOR target IN SELECT to_jsonb(u) AS data FROM users u WHERE id=person LOOP
          PERFORM knowledge_enqueue('users',target.data,'upsert',scope);
        END LOOP;
      END IF;
    END LOOP;
  END IF;
END;
$capture$;

CREATE OR REPLACE FUNCTION knowledge_capture_change() RETURNS trigger LANGUAGE plpgsql AS $trigger$
DECLARE spec JSONB; parent_field TEXT; child RECORD; item RECORD; scope_changed BOOLEAN;
BEGIN
  -- 부모가 실제로 사라지기 전에 하위 자료의 이전 프로젝트를 보존한다.
  scope_changed := false;
  IF TG_OP='UPDATE' THEN scope_changed := (to_jsonb(OLD)->>'projectId') IS DISTINCT FROM (to_jsonb(NEW)->>'projectId'); END IF;
  IF TG_OP='DELETE' OR scope_changed THEN
    FOR child IN SELECT key,value FROM jsonb_each(knowledge_targets()) WHERE value->'parent'->>'table'=TG_TABLE_NAME LOOP
      FOR item IN EXECUTE format('SELECT to_jsonb(r) AS data FROM public.%I r WHERE r.%I=$1',child.key,child.value->'parent'->>'field') USING OLD.id LOOP
        PERFORM knowledge_enqueue(child.key,item.data,'delete',to_jsonb(OLD)->>'projectId');
        IF scope_changed THEN PERFORM knowledge_enqueue(child.key,item.data,'upsert',to_jsonb(NEW)->>'projectId'); END IF;
      END LOOP;
    END LOOP;
  END IF;
  IF TG_OP='DELETE' THEN
    PERFORM knowledge_enqueue(TG_TABLE_NAME,to_jsonb(OLD),'delete'); RETURN OLD;
  END IF;
  IF TG_OP='UPDATE' THEN
    spec := knowledge_targets()->TG_TABLE_NAME;
    parent_field := spec->'parent'->>'field';
    IF (to_jsonb(OLD)->>'projectId') IS DISTINCT FROM (to_jsonb(NEW)->>'projectId')
       OR (parent_field IS NOT NULL AND (to_jsonb(OLD)->>parent_field) IS DISTINCT FROM (to_jsonb(NEW)->>parent_field)) THEN
      PERFORM knowledge_enqueue(TG_TABLE_NAME,to_jsonb(OLD),'delete');
    END IF;
  END IF;
  PERFORM knowledge_enqueue(TG_TABLE_NAME,to_jsonb(NEW),'upsert'); RETURN NEW;
END;
$trigger$;

DROP TRIGGER IF EXISTS knowledge_change ON public."projects";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."projects";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."projects";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."projects" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."projects" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."users";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."users";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."users";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."users" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."users" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."tasks";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."tasks";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."tasks";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."tasks" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."tasks" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."task_connections";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."task_connections";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."task_connections";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."task_connections" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."task_connections" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."task_assignees";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."task_assignees";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."task_assignees";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."task_assignees" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."task_assignees" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."requirements";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."requirements";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."requirements";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."requirements" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."requirements" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."team_members";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."team_members";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."team_members";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."team_members" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."team_members" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."wbs_items";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."wbs_items";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."wbs_items";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."wbs_items" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."wbs_items" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."wbs_assignees";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."wbs_assignees";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."wbs_assignees";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."wbs_assignees" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."wbs_assignees" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."issues";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."issues";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."issues";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."issues" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."issues" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."timeline_rows";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."timeline_rows";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."timeline_rows";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."timeline_rows" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."timeline_rows" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."milestones";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."milestones";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."milestones";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."milestones" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."milestones" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."pinpoints";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."pinpoints";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."pinpoints";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."pinpoints" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."pinpoints" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."weekly_reports";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."weekly_reports";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."weekly_reports";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."weekly_reports" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."weekly_reports" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."weekly_report_items";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."weekly_report_items";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."weekly_report_items";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."weekly_report_items" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."weekly_report_items" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."customer_requirements";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."customer_requirements";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."customer_requirements";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."customer_requirements" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."customer_requirements" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."documents";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."documents";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."documents";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."documents" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."documents" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."equipments";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."equipments";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."equipments";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."equipments" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."equipments" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."equipment_properties";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."equipment_properties";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."equipment_properties";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."equipment_properties" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."equipment_properties" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."equipment_connections";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."equipment_connections";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."equipment_connections";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."equipment_connections" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."equipment_connections" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."interviews";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."interviews";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."interviews";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."interviews" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."interviews" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."meeting_minutes";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."meeting_minutes";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."meeting_minutes";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."meeting_minutes" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."meeting_minutes" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."meeting_minute_items";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."meeting_minute_items";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."meeting_minute_items";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."meeting_minute_items" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."meeting_minute_items" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."field_issues";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."field_issues";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."field_issues";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."field_issues" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."field_issues" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."discussion_items";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."discussion_items";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."discussion_items";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."discussion_items" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."discussion_items" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."as_is_overviews";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."as_is_overviews";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."as_is_overviews";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."as_is_overviews" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."as_is_overviews" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."as_is_overview_items";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."as_is_overview_items";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."as_is_overview_items";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."as_is_overview_items" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."as_is_overview_items" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."progress_stage_defs";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."progress_stage_defs";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."progress_stage_defs";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."progress_stage_defs" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."progress_stage_defs" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."progress_category_plans";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."progress_category_plans";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."progress_category_plans";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."progress_category_plans" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."progress_category_plans" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."progress_risk_issues";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."progress_risk_issues";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."progress_risk_issues";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."progress_risk_issues" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."progress_risk_issues" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."progress_tasks";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."progress_tasks";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."progress_tasks";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."progress_tasks" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."progress_tasks" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."progress_task_assignees";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."progress_task_assignees";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."progress_task_assignees";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."progress_task_assignees" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."progress_task_assignees" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();

DROP TRIGGER IF EXISTS knowledge_change ON public."progress_task_stage_details";
DROP TRIGGER IF EXISTS knowledge_change_write ON public."progress_task_stage_details";
DROP TRIGGER IF EXISTS knowledge_change_delete ON public."progress_task_stage_details";
CREATE TRIGGER knowledge_change_write AFTER INSERT OR UPDATE ON public."progress_task_stage_details" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
CREATE TRIGGER knowledge_change_delete BEFORE DELETE ON public."progress_task_stage_details" FOR EACH ROW EXECUTE FUNCTION knowledge_capture_change();
