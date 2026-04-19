-- ============================================================
-- SQL 46-01: R4 스키마 업데이트 (결제/예약/돌봄 Edge Function 지원)
-- ============================================================
-- 실행 방법: Supabase SQL Editor에서 직접 실행
-- 목적:
--   C1: payments 테이블에 raw_response (jsonb) 컬럼 추가
--   C8: chat_messages.message_type CHECK 제약에 reservation_rejected,
--       reservation_cancelled 추가
-- 참조: STEP4_WORK_PLAN.md §§3-5, R4 코드 리뷰 C1/C8
-- ============================================================

-- ── C1: payments.raw_response 컬럼 추가 ──────────────────────
-- PG사(이니시스) 콜백 원본 POST 파라미터를 JSONB로 보존
-- inicis-callback Edge Function에서 전체 POST 데이터를 저장
-- 분쟁/디버깅 시 원본 데이터 참조용
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS raw_response jsonb DEFAULT NULL;

COMMENT ON COLUMN public.payments.raw_response
  IS 'PG사 결제 콜백 원본 응답 (이니시스 POST 파라미터 전체). 분쟁/디버깅용 보존 데이터. inicis-callback EF에서 기록.';

DO $$
BEGIN
  RAISE NOTICE 'C1: payments.raw_response (jsonb) 컬럼 추가 완료';
END $$;


-- ── C8: chat_messages.message_type CHECK 제약 업데이트 ────────
-- 기존 8종 → 10종으로 확대
-- 추가: reservation_rejected (예약 거절), reservation_cancelled (예약 취소)
-- create-reservation EF의 거절/취소 상태 변경 시 시스템 메시지에 사용

-- Step 1: 기존 CHECK 제약 삭제 (동적으로 이름 조회)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
    AND att.attrelid = con.conrelid
  WHERE con.conrelid = 'public.chat_messages'::regclass
    AND att.attname = 'message_type'
    AND con.contype = 'c'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.chat_messages DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'C8 Step 1: 기존 CHECK 제약 [%] 삭제', constraint_name;
  ELSE
    RAISE NOTICE 'C8 Step 1: message_type CHECK 제약 없음 (스킵)';
  END IF;
END $$;

-- Step 2: 10종 CHECK 제약 추가
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN (
    'text',                    -- 텍스트 메시지 (사용자 전송)
    'image',                   -- 이미지 메시지 (사용자 전송)
    'file',                    -- 동영상/파일 메시지 (사용자 전송)
    'reservation_request',     -- 예약 요청 (create-reservation EF)
    'reservation_confirmed',   -- 예약 확정 (create-reservation EF)
    'reservation_rejected',    -- 예약 거절 (create-reservation EF) [신규]
    'reservation_cancelled',   -- 예약 취소 (create-reservation EF) [신규]
    'care_start',              -- 돌봄 시작 (scheduler EF)
    'care_end',                -- 돌봄 종료 (complete-care EF)
    'review'                   -- 후기 작성 유도 (complete-care EF)
  ));

DO $$
BEGIN
  RAISE NOTICE 'C8 Step 2: message_type 10종 CHECK 제약 추가 완료';
  RAISE NOTICE '  추가된 타입: reservation_rejected, reservation_cancelled';
END $$;


-- ── 검증 쿼리 ───────────────────────────────────────────────
DO $$
DECLARE
  has_raw_response boolean;
  constraint_def text;
BEGIN
  -- payments.raw_response 컬럼 존재 확인
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'raw_response'
  ) INTO has_raw_response;

  -- message_type CHECK 제약 내용 확인
  SELECT cc.check_clause INTO constraint_def
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON cc.constraint_schema = tc.constraint_schema
    AND cc.constraint_name = tc.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'chat_messages'
    AND tc.constraint_name = 'chat_messages_message_type_check';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SQL 46-01: R4 스키마 업데이트 완료';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'payments.raw_response 존재: %', has_raw_response;
  RAISE NOTICE 'message_type CHECK: %', COALESCE(constraint_def, '(없음)');
  RAISE NOTICE '========================================';

  IF NOT has_raw_response THEN
    RAISE WARNING 'payments.raw_response 컬럼이 생성되지 않았습니다!';
  END IF;

  IF constraint_def IS NULL THEN
    RAISE WARNING 'chat_messages_message_type_check 제약이 존재하지 않습니다!';
  END IF;
END $$;
