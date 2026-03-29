-- ============================================================
-- 우유펫(WOOYOOPET) — payments 테이블 금액 내역 컬럼 추가
-- Supabase SQL Editor에서 실행
-- ============================================================
-- 목적: 결제금액(amount)의 구성 내역을 개별 컬럼으로 관리
--   amount = care_fee + walk_fee + pickup_fee (의미상 관계, 제약조건 없음)
-- 기존 데이터: DEFAULT 0으로 영향 없음
-- ============================================================

-- 1. 돌봄비 (시간 기반 돌봄 비용)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS care_fee integer NOT NULL DEFAULT 0;

-- 2. 산책비 (산책 횟수 × 단가)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS walk_fee integer NOT NULL DEFAULT 0;

-- 3. 픽업/드랍비
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS pickup_fee integer NOT NULL DEFAULT 0;

-- ============================================================
-- 컬럼 코멘트
-- ============================================================
COMMENT ON COLUMN payments.care_fee   IS '돌봄비 (시간 기반 돌봄 비용)';
COMMENT ON COLUMN payments.walk_fee   IS '산책비 (산책 횟수 × 단가)';
COMMENT ON COLUMN payments.pickup_fee IS '픽업/드랍비';

-- ============================================================
-- 검증 쿼리 (실행 후 컬럼 추가 확인용)
-- ============================================================
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'payments'
--   AND column_name IN ('care_fee', 'walk_fee', 'pickup_fee')
-- ORDER BY column_name;

-- ============================================================
-- 기존 테스트 데이터 금액 내역은 DB에서 직접 입력
-- amount = care_fee + walk_fee + pickup_fee 관계에 맞게 분배
-- ============================================================
