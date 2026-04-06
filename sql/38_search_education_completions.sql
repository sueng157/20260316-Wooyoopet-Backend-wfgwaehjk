-- ============================================================
-- SQL 38: 교육관리 — 이수현황 통합 검색 함수
-- ============================================================
-- 실행 방법: Supabase SQL Editor에 전체 복사하여 실행
-- 목적: 이수현황 목록 검색 — 이수상태 필터, 검색대상(유치원명/운영자 성명/운영자 연락처) 키워드 필터
-- 핵심: total_topics, progress_rate, completion_status는 DB 저장값 무시, RPC 내부에서 동적 재계산
-- 의존: public.is_admin() 함수 (11_auth_setup.sql에서 생성됨)
-- 참고: search_guardian_reviews (32_search_guardian_reviews.sql) 와 동일 패턴
-- ============================================================
-- 파라미터→$N 매핑 (COUNT / SELECT 공통):
--   $1  = p_completion_status
--   $2  = p_search_type
--   $3  = p_search_keyword
--   $4  = v_total_topics        (COUNT / SELECT 공통)
--   $5  = p_per_page            (SELECT 전용)
--   $6  = v_offset              (SELECT 전용)
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_education_completions(
  p_completion_status  text DEFAULT NULL,
  p_search_type        text DEFAULT NULL,
  p_search_keyword     text DEFAULT NULL,
  p_page               int  DEFAULT 1,
  p_per_page           int  DEFAULT 20
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
  v_total_topics bigint;
BEGIN
  -- 관리자 권한 체크
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  -- 공개 교육 주제 수 동적 계산
  SELECT COUNT(*) INTO v_total_topics
  FROM education_topics
  WHERE visibility = '공개';

  -- 총 건수 카운트 ($1~$4)
  EXECUTE '
    SELECT COUNT(*)
    FROM (
      SELECT
        ec.id,
        ec.completed_topics,
        ec.checklist_confirmed,
        ec.pledge_agreed,
        CASE
          WHEN ec.completed_topics >= $4 AND ec.checklist_confirmed = true AND ec.pledge_agreed = true THEN ''이수완료''
          WHEN ec.completed_topics > 0 THEN ''진행중''
          ELSE ''미시작''
        END AS dynamic_status
      FROM education_completions ec
      JOIN kindergartens kg ON kg.id = ec.kindergarten_id
      JOIN members m ON m.id = kg.member_id
      WHERE (
        $1 IS NULL
        OR (
          CASE
            WHEN ec.completed_topics >= $4 AND ec.checklist_confirmed = true AND ec.pledge_agreed = true THEN ''이수완료''
            WHEN ec.completed_topics > 0 THEN ''진행중''
            ELSE ''미시작''
          END
        ) = $1
      )
      AND (
        $2 IS NULL OR $3 IS NULL
        OR ($2 = ''유치원명''       AND kg.name  ILIKE ''%'' || $3 || ''%'')
        OR ($2 = ''운영자 성명''    AND m.name   ILIKE ''%'' || $3 || ''%'')
        OR ($2 = ''운영자 연락처''  AND m.phone  ILIKE ''%'' || $3 || ''%'')
      )
    ) sub
  '
  INTO v_total
  USING p_completion_status, p_search_type, p_search_keyword, v_total_topics;

  -- 데이터 조회 ($1~$6)
  EXECUTE '
    SELECT json_agg(t)
    FROM (
      SELECT
        ec.id,
        kg.name AS kindergarten_name,
        m.name AS owner_name,
        m.phone AS owner_phone,
        $4::bigint AS total_topics,
        ec.completed_topics,
        CASE WHEN $4 > 0
          THEN ROUND(ec.completed_topics::numeric / $4::numeric * 100)
          ELSE 0
        END AS progress_rate,
        ec.checklist_confirmed,
        ec.pledge_agreed,
        ec.all_completed_at,
        CASE
          WHEN ec.completed_topics >= $4 AND ec.checklist_confirmed = true AND ec.pledge_agreed = true THEN ''이수완료''
          WHEN ec.completed_topics > 0 THEN ''진행중''
          ELSE ''미시작''
        END AS completion_status
      FROM education_completions ec
      JOIN kindergartens kg ON kg.id = ec.kindergarten_id
      JOIN members m ON m.id = kg.member_id
      WHERE (
        $1 IS NULL
        OR (
          CASE
            WHEN ec.completed_topics >= $4 AND ec.checklist_confirmed = true AND ec.pledge_agreed = true THEN ''이수완료''
            WHEN ec.completed_topics > 0 THEN ''진행중''
            ELSE ''미시작''
          END
        ) = $1
      )
      AND (
        $2 IS NULL OR $3 IS NULL
        OR ($2 = ''유치원명''       AND kg.name  ILIKE ''%'' || $3 || ''%'')
        OR ($2 = ''운영자 성명''    AND m.name   ILIKE ''%'' || $3 || ''%'')
        OR ($2 = ''운영자 연락처''  AND m.phone  ILIKE ''%'' || $3 || ''%'')
      )
      ORDER BY ec.created_at DESC
      LIMIT $5 OFFSET $6
    ) t
  '
  INTO v_rows
  USING p_completion_status, p_search_type, p_search_keyword,
        v_total_topics, p_per_page, v_offset;

  RETURN json_build_object(
    'data', COALESCE(v_rows, '[]'::json),
    'count', v_total
  );
END;
$$;
