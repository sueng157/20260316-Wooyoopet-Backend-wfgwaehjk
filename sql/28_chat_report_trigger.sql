-- ============================================================
-- 28_chat_report_trigger.sql
-- chat_rooms.has_report 자동 갱신 트리거
--
-- has_report 의미: 해당 채팅방에 처리상태가 '접수' 또는 '처리중'인
--                  신고 건이 1건 이상 존재하면 true, 아니면 false
--
-- 트리거 시점: reports 테이블에 INSERT / UPDATE 발생 시
-- (신고 건은 물리 삭제 없이 상태 변경으로 처리하므로 DELETE 미포함)
-- ============================================================

-- 1. 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_chat_room_has_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_room_id uuid;
  v_has_active_report boolean;
BEGIN
  -- INSERT/UPDATE 모두 NEW 행의 chat_room_id 사용
  v_chat_room_id := NEW.chat_room_id;

  -- chat_room_id가 NULL이면 스킵
  IF v_chat_room_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- UPDATE 시 chat_room_id가 변경된 경우, 이전 채팅방도 재계산
  IF TG_OP = 'UPDATE' AND OLD.chat_room_id IS DISTINCT FROM NEW.chat_room_id THEN
    UPDATE chat_rooms
    SET has_report = EXISTS (
      SELECT 1 FROM reports
      WHERE reports.chat_room_id = OLD.chat_room_id
        AND reports.status IN ('접수', '처리중')
    )
    WHERE id = OLD.chat_room_id;
  END IF;

  -- 현재 chat_room_id에 대해 미처리 신고 존재 여부 재계산
  SELECT EXISTS (
    SELECT 1 FROM reports
    WHERE reports.chat_room_id = v_chat_room_id
      AND reports.status IN ('접수', '처리중')
  ) INTO v_has_active_report;

  -- chat_rooms 테이블 갱신
  UPDATE chat_rooms
  SET has_report = v_has_active_report
  WHERE id = v_chat_room_id;

  RETURN NEW;
END;
$$;

-- 2. 기존 트리거 존재 시 삭제
DROP TRIGGER IF EXISTS trg_update_chat_room_has_report ON reports;

-- 3. 트리거 생성 (INSERT, UPDATE만 커버)
CREATE TRIGGER trg_update_chat_room_has_report
  AFTER INSERT OR UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_has_report();

-- 4. 기존 데이터 일괄 보정 (1회성)
-- 트리거 생성 후, 현재 reports 상태를 기반으로 모든 chat_rooms의 has_report를 재계산
UPDATE chat_rooms
SET has_report = EXISTS (
  SELECT 1 FROM reports
  WHERE reports.chat_room_id = chat_rooms.id
    AND reports.status IN ('접수', '처리중')
);
