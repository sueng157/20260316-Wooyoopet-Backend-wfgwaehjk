-- ============================================================
-- SQL 19: 결제관리 환불/위약금 통합 검색 함수
-- ============================================================
-- 실행 방법: Supabase SQL Editor에 전체 복사하여 실행
-- 목적: 조인 테이블(members, kindergartens, reservations, pets) 필터/검색 지원
-- 의존: public.is_admin() 함수 (11_auth_setup.sql에서 생성됨)
-- 참고: search_payments (sql/17) 와 동일한 패턴
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_refunds(
  p_date_from      text    DEFAULT NULL,
  p_date_to        text    DEFAULT NULL,
  p_status         text    DEFAULT NULL,
  p_requester      text    DEFAULT NULL,
  p_search_type    text    DEFAULT NULL,
  p_search_keyword text    DEFAULT NULL,
  p_page           int     DEFAULT 1,
  p_per_page       int     DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_offset   int;
  v_total    bigint;
  v_rows     json;
BEGIN
  -- 관리자 권한 체크
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  -- 총 건수 카운트
  SELECT COUNT(*)
  INTO v_total
  FROM refunds rf
  JOIN members m ON m.id = rf.member_id
  LEFT JOIN kindergartens k ON k.id = rf.kindergarten_id
  LEFT JOIN reservations rv ON rv.id = rf.reservation_id
  LEFT JOIN pets pt ON pt.id = rv.pet_id
  WHERE (p_date_from IS NULL OR rf.requested_at >= p_date_from::timestamptz)
    AND (p_date_to IS NULL OR rf.requested_at <= p_date_to::timestamptz)
    AND (p_status IS NULL OR rf.status = p_status)
    AND (p_requester IS NULL OR rf.requester = p_requester)
    AND (
      p_search_type IS NULL OR p_search_keyword IS NULL
      OR (p_search_type = '보호자 닉네임' AND m.nickname ILIKE '%' || p_search_keyword || '%')
      OR (p_search_type = '보호자 연락처' AND m.phone ILIKE '%' || p_search_keyword || '%')
      OR (p_search_type = '유치원명' AND k.name ILIKE '%' || p_search_keyword || '%')
      OR (p_search_type = '위약금 결제번호' AND FALSE)
    );

  -- 데이터 조회
  SELECT json_agg(t)
  INTO v_rows
  FROM (
    SELECT
      rf.id,
      rf.requested_at,
      rf.requester,
      rf.refund_amount,
      rf.penalty_amount,
      rf.status,
      rf.completed_at,
      rf.payment_id,
      json_build_object(
        'nickname', m.nickname,
        'phone', m.phone
      ) AS members,
      json_build_object(
        'name', k.name
      ) AS kindergartens,
      json_build_object(
        'name', pt.name
      ) AS pets
    FROM refunds rf
    JOIN members m ON m.id = rf.member_id
    LEFT JOIN kindergartens k ON k.id = rf.kindergarten_id
    LEFT JOIN reservations rv ON rv.id = rf.reservation_id
    LEFT JOIN pets pt ON pt.id = rv.pet_id
    WHERE (p_date_from IS NULL OR rf.requested_at >= p_date_from::timestamptz)
      AND (p_date_to IS NULL OR rf.requested_at <= p_date_to::timestamptz)
      AND (p_status IS NULL OR rf.status = p_status)
      AND (p_requester IS NULL OR rf.requester = p_requester)
      AND (
        p_search_type IS NULL OR p_search_keyword IS NULL
        OR (p_search_type = '보호자 닉네임' AND m.nickname ILIKE '%' || p_search_keyword || '%')
        OR (p_search_type = '보호자 연락처' AND m.phone ILIKE '%' || p_search_keyword || '%')
        OR (p_search_type = '유치원명' AND k.name ILIKE '%' || p_search_keyword || '%')
        OR (p_search_type = '위약금 결제번호' AND FALSE)
      )
    ORDER BY rf.requested_at DESC
    LIMIT p_per_page OFFSET v_offset
  ) t;

  RETURN json_build_object(
    'data', COALESCE(v_rows, '[]'::json),
    'count', v_total
  );
END;
$$;
