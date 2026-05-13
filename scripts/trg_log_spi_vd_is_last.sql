CREATE OR REPLACE TRIGGER TRG_LOG_SPI_VD_IS_LAST
BEFORE INSERT ON LOG_SPI_VD
FOR EACH ROW
DECLARE
  lvd_inspect_date     date;
BEGIN

-------------------------------------------------------------------------------
-- 작업일자 / 근무조 / 타임존 자동 설정
-- SPI_VD 는 INSPECTION_DATE(YYYY-MM-DD) 와 INSPECTION_END_TIME(HH24:MI:SS) 이 분리 저장됨
-- INSPECTION_DATE 에 쓰레기값(예: '-101') 이 섞여 있어 EXCEPTION 으로 방어 처리
-------------------------------------------------------------------------------
  if :NEW.INSPECTION_DATE is not null then
     begin
        if :NEW.INSPECTION_END_TIME is not null then
           lvd_inspect_date := to_date(:NEW.INSPECTION_DATE || ' ' || :NEW.INSPECTION_END_TIME, 'YYYY-MM-DD HH24:MI:SS');
        else
           lvd_inspect_date := to_date(:NEW.INSPECTION_DATE, 'YYYY-MM-DD');
        end if;
        :NEW.ACTUAL_DATE := f_get_work_actual_date(lvd_inspect_date, 'A');
        :NEW.SHIFT_CODE  := f_get_work_shift_code(lvd_inspect_date);
        :NEW.ZONE_CODE   := f_get_worktime_zone_hour(lvd_inspect_date);
     exception
        when others then
           null;  -- 쓰레기값 무시 (ACTUAL_DATE/SHIFT_CODE/ZONE_CODE 는 NULL 유지)
     end;
  end if;

-------------------------------------------------------------------------------
-- 듀얼 라인 라인 코드 분리 처리 Lane : Front Rear 로 구분
-------------------------------------------------------------------------------

  IF :new.line_code >= '11' then  -- 11 이상은 파나소닉 라인으로 판단

     if :new.lane = '1' then
         -- 그대로 라인코드 사용
         null ;
     else
          :new.line_code := trim(to_char( to_number(:new.line_code ) +1 , '00')) ;
     end if ;
  END IF ;

--  if ( :new.line_code = '11' ) then
--       :new.line_code := '12' ;
--  end if;


  UPDATE LOG_SPI_VD
     SET IS_LAST = 'N'
   WHERE ARRAY_BARCODE = :NEW.ARRAY_BARCODE   -- MASTER_BARCODE - ARRAY_BARCODE  : 1:N
     AND IS_LAST = 'Y';

  :NEW.IS_LAST := 'Y';

  IF :NEW.PCB_RESULT IS NOT NULL  AND UPPER(:NEW.PCB_RESULT) NOT IN ('PASS','OK','GOOD','Y') THEN
      P_AUTO_INSERT_QC(:NEW.ARRAY_BARCODE, :NEW.LOG_ID, :NEW.EQUIPMENT_ID, 'W030', :new.file_name);
  END IF;

       ----------------------------------------------------------
       -- 파나소닉 라인은 sp 운영을 안하기 때문에 JIG 사용횟수 처리
       -- 모비스는 웹서비호출을 통해처리 함
       ----------------------------------------------------------
        update imcn_jig x
        set x.hit_value = nvl(x.hit_value, 0) +1
        where line_code = :NEW.LINE_CODE
        and jig_type in ( 'M', 'S' ) ;  -- M:Metail Mask, S:Squeeze

       ----------------------------------------------------------

END;
/
