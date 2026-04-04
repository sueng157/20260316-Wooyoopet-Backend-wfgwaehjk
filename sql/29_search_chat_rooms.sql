-- ============================================================
-- SQL 29: 채팅관리 — 채팅내역 통합 검색 함수
-- ============================================================
-- 실행 방법: Supabase SQL Editor에 전체 복사하여 실행
-- 목적: 조인 테이블(members, kindergartens) 기준 ILIKE 검색 지원
-- 의존: public.is_admin() 함수 (11_auth_setup.sql에서 생성됨)
-- 참고: search_reservations / search_payments 와 동일 패턴
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_chat_rooms(
  p_status         text DEFAULT NULL,
  p_has_report     text DEFAULT NULL,
  p_search_type    text DEFAULT NULL,
  p_search_keyword text DEFAULT NULL,
  p_page           int  DEFAULT 1,
  p_per_page       int  DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_offset      int;
  v_total       bigint;
  v_rows        json;
  v_has_report  boolean;
BEGIN
  -- 관리자 권한 체크
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  -- 신고 여부 boolean 변환
  IF p_has_report = '있음' THEN
    v_has_report := true;
  ELSIF p_has_report = '없음' THEN
    v_has_report := false;
  ELSE
    v_has_report := NULL;
  END IF;

  -- 총 건수 카운트
  EXECUTE '
    SELECT COUNT(*)
    FROM chat_rooms cr
    JOIN members g ON g.id = cr.guardian_id
    JOIN kindergartens k ON k.id = cr.kindergarten_id
    WHERE ($1 IS NULL OR cr.status = $1)
      AND ($2 IS NULL OR cr.has_report = $2)
      AND (
        $3 IS NULL OR $4 IS NULL
        OR ($3 = ''보호자 닉네임'' AND g.nickname ILIKE ''%'' || $4 || ''%'')
        OR ($3 = ''유치원명'' AND k.name ILIKE ''%'' || $4 || ''%'')
      )
  '
  INTO v_total
  USING p_status, v_has_report, p_search_type, p_search_keyword;

  -- 데이터 조회
  EXECUTE '
    SELECT json_agg(t)
    FROM (
      SELECT
        cr.id,
        cr.status,
        cr.has_report,
        cr.last_message,
        cr.last_message_at,
        cr.created_at,
        cr.guardian_id,
        cr.kindergarten_id,
        json_build_object(
          ''name'', g.name,
          ''nickname'', g.nickname
        ) AS guardian,
        json_build_object(
          ''name'', k.name
        ) AS kindergartens,
        (
          SELECT json_agg(json_build_object(
            ''id'', rv.id,
            ''requested_at'', rv.requested_at
          ) ORDER BY rv.requested_at DESC)
          FROM chat_room_reservations crr
          JOIN reservations rv ON rv.id = crr.reservation_id
          WHERE crr.chat_room_id = cr.id
        ) AS reservations
      FROM chat_rooms cr
      JOIN members g ON g.id = cr.guardian_id
      JOIN kindergartens k ON k.id = cr.kindergarten_id
      WHERE ($1 IS NULL OR cr.status = $1)
        AND ($2 IS NULL OR cr.has_report = $2)
        AND (
          $3 IS NULL OR $4 IS NULL
          OR ($3 = ''보호자 닉네임'' AND g.nickname ILIKE ''%'' || $4 || ''%'')
          OR ($3 = ''유치원명'' AND k.name ILIKE ''%'' || $4 || ''%'')
        )
      ORDER BY cr.last_message_at DESC NULLS LAST
      LIMIT $5 OFFSET $6
    ) t
  '
  INTO v_rows
  USING p_status, v_has_report, p_search_type, p_search_keyword,
        p_per_page, v_offset;

  RETURN json_build_object(
    'data', COALESCE(v_rows, '[]'::json),
    'count', v_total
  );
END;
$$;
