CREATE OR REPLACE TRIGGER TRG_LOG_MOUNTER_BI
BEFORE INSERT ON LOG_MOUNTER
FOR EACH ROW
DECLARE
  lvd_inspect_date     date;
BEGIN

-------------------------------------------------------------------------------
-- 작업일자 / 근무조 / 타임존 자동 설정 (START_TIME 기준, 포맷: YYYY-MM-DD HH24:MI:SS)
-------------------------------------------------------------------------------
  if :NEW.START_TIME is not null then
     lvd_inspect_date := to_date(:NEW.START_TIME, 'YYYY-MM-DD HH24:MI:SS');
     :NEW.ACTUAL_DATE := f_get_work_actual_date(lvd_inspect_date, 'A');
     :NEW.SHIFT_CODE  := f_get_work_shift_code(lvd_inspect_date);
     :NEW.ZONE_CODE   := f_get_worktime_zone_hour(lvd_inspect_date);
  end if;

END;
/
