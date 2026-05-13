CREATE OR REPLACE TRIGGER TRG_LOG_ICT_IS_LAST
BEFORE INSERT ON LOG_ICT
FOR EACH ROW
DECLARE

  lvl_count            number;
  lvd_inspect_date     date;

BEGIN

-------------------------------------------------------------------------------
-- 작업일자 / 근무조 / 타임존 자동 설정 (SYSDATE 기준)
-- LOG_ICT 는 설비 로그에 문자형 날짜 컬럼이 없어 INSERT 시점의 SYSDATE 로 처리
-------------------------------------------------------------------------------
  lvd_inspect_date := SYSDATE;
  :NEW.ACTUAL_DATE := f_get_work_actual_date(lvd_inspect_date, 'A');
  :NEW.SHIFT_CODE  := f_get_work_shift_code(lvd_inspect_date);
  :NEW.ZONE_CODE   := f_get_worktime_zone_hour(lvd_inspect_date);

  -- IS_LAST 확인

  UPDATE LOG_ICT
     SET IS_LAST = 'N'
   WHERE BARCODE = :NEW.BARCODE
     AND IS_LAST = 'Y';

  :NEW.IS_LAST := 'Y';

  IF :NEW.RESULT IS NOT NULL
     AND UPPER(:NEW.RESULT) NOT IN ('PASS','OK','GOOD','Y') THEN
    P_AUTO_INSERT_QC(:NEW.BARCODE, :NEW.LOG_ID, :NEW.EQUIPMENT_ID, 'W110', :new.file_name);
  END IF;

  -- SAMPLE 확인

  select count(*)
    into lvl_count
    from imcn_sample
   where sample_barcode = :NEW.BARCODE
     and sample_type = 'C'
     and rownum = 1 ;

  if ( lvl_count > 0 ) then
       :NEW.IS_SAMPLE := 'Y';
  end if ;

END;
/
