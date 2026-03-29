-- ============================================================
-- 예약 상태 '관리자취소' 추가
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 기존 CHECK 제약조건 제거
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;

-- 새 CHECK 제약조건 생성 (9개 상태)
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check
  CHECK (status IN (
    '수락대기',
    '예약확정',
    '돌봄진행중',
    '돌봄완료',
    '보호자취소',
    '유치원취소',
    '유치원거절',
    '노쇼',
    '관리자취소'
  ));

-- 확인 쿼리
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'reservations_status_check';
