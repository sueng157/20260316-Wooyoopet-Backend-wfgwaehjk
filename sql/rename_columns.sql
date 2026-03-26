-- ============================================================
-- 우유펫 (WOOYOOPET) — 컬럼명 리네이밍 SQL
-- 실행 환경: Supabase SQL Editor
-- 작성일: 2026-03-26
-- 목적: prefix 기반 네이밍 컨벤션 통일
-- ============================================================
-- 변경 대상: 7개 테이블, 총 30개 컬럼
-- ============================================================

BEGIN;

-- ============================================================
-- 1. members 테이블 (4개 컬럼 변경)
-- ============================================================
-- 주소 컬럼을 address_ prefix로 그룹핑
-- 동/호수는 address_building_ prefix로 지번 '동'(신길동 등)과 구분

ALTER TABLE members RENAME COLUMN road_address  TO address_road;
ALTER TABLE members RENAME COLUMN complex_name  TO address_complex;
ALTER TABLE members RENAME COLUMN building_dong TO address_building_dong;
ALTER TABLE members RENAME COLUMN building_ho   TO address_building_ho;


-- ============================================================
-- 2. kindergartens 테이블 (17개 컬럼 변경)
-- ============================================================

-- 2-1. 주소 (5개) — members와 동일 패턴
ALTER TABLE kindergartens RENAME COLUMN road_address  TO address_road;
ALTER TABLE kindergartens RENAME COLUMN jibun_address TO address_jibun;
ALTER TABLE kindergartens RENAME COLUMN complex_name  TO address_complex;
ALTER TABLE kindergartens RENAME COLUMN building_dong TO address_building_dong;
ALTER TABLE kindergartens RENAME COLUMN building_ho   TO address_building_ho;

-- 2-2. 신선도 (2개) — freshness_ prefix 그룹핑
ALTER TABLE kindergartens RENAME COLUMN freshness         TO freshness_current;
ALTER TABLE kindergartens RENAME COLUMN initial_freshness TO freshness_initial;

-- 2-3. 가격 (6개) — hourly→1h, daily→24h 간결화 (walk, pickup은 변경 없음)
ALTER TABLE kindergartens RENAME COLUMN price_small_hourly  TO price_small_1h;
ALTER TABLE kindergartens RENAME COLUMN price_small_daily   TO price_small_24h;
ALTER TABLE kindergartens RENAME COLUMN price_medium_hourly TO price_medium_1h;
ALTER TABLE kindergartens RENAME COLUMN price_medium_daily  TO price_medium_24h;
ALTER TABLE kindergartens RENAME COLUMN price_large_hourly  TO price_large_1h;
ALTER TABLE kindergartens RENAME COLUMN price_large_daily   TO price_large_24h;

-- 2-4. 사진 (1개) — JSONB URL 배열임을 명확히
ALTER TABLE kindergartens RENAME COLUMN photos TO photo_urls;


-- ============================================================
-- 3. pets 테이블 (1개 컬럼 변경)
-- ============================================================

ALTER TABLE pets RENAME COLUMN photos TO photo_urls;


-- ============================================================
-- 4. reservations 테이블 (1개 컬럼 변경)
-- ============================================================
-- has_pickup → pickup_requested: "요청됨" 의미 반영

ALTER TABLE reservations RENAME COLUMN has_pickup TO pickup_requested;


-- ============================================================
-- 5. settlement_infos 테이블 (2개 컬럼 변경)
-- ============================================================
-- 계좌: account_ prefix 그룹핑
-- 이니시스: inicis_ prefix 통일 (inicis_submall_code, inicis_status는 이미 적용됨)

ALTER TABLE settlement_infos RENAME COLUMN bank_name TO account_bank;
ALTER TABLE settlement_infos RENAME COLUMN seller_id TO inicis_seller_id;


-- ============================================================
-- 6. settlements 테이블 (2개 컬럼 변경)
-- ============================================================
-- settlement_infos와 동일 패턴

ALTER TABLE settlements RENAME COLUMN bank_name    TO account_bank;
ALTER TABLE settlements RENAME COLUMN submall_code TO inicis_submall_code;


-- ============================================================
-- 7. reports 테이블 (1개 컬럼 변경)
-- ============================================================
-- 제재(sanction) 관련 컬럼 그룹핑

ALTER TABLE reports RENAME COLUMN result TO sanction_result;


COMMIT;

-- ============================================================
-- 검증 쿼리 — 변경된 컬럼 확인
-- ============================================================
SELECT 
  table_name,
  column_name,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    -- members 변경 확인
    (table_name = 'members' AND column_name IN ('address_road','address_complex','address_building_dong','address_building_ho'))
    OR
    -- kindergartens 변경 확인
    (table_name = 'kindergartens' AND column_name IN ('address_road','address_jibun','address_complex','address_building_dong','address_building_ho','freshness_current','freshness_initial','price_small_1h','price_small_24h','price_medium_1h','price_medium_24h','price_large_1h','price_large_24h','photo_urls'))
    OR
    -- pets 변경 확인
    (table_name = 'pets' AND column_name = 'photo_urls')
    OR
    -- reservations 변경 확인
    (table_name = 'reservations' AND column_name = 'pickup_requested')
    OR
    -- settlement_infos 변경 확인
    (table_name = 'settlement_infos' AND column_name IN ('account_bank','inicis_seller_id'))
    OR
    -- settlements 변경 확인
    (table_name = 'settlements' AND column_name IN ('account_bank','inicis_submall_code'))
    OR
    -- reports 변경 확인
    (table_name = 'reports' AND column_name = 'sanction_result')
  )
ORDER BY table_name, ordinal_position;
