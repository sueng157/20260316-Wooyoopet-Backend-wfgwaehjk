# APP_MIGRATION_GUIDE.md + APP_MIGRATION_CODE.md 전수 점검

## 배경

우유펫 모바일 앱(React Native/Expo)의 PHP/MariaDB → Supabase 전환 프로젝트에서, 외주 개발자에게 전달할 두 문서의 초안 작성이 완료되었다.

- **APP_MIGRATION_GUIDE.md** (이하 GUIDE, ~2,800줄): 도메인별 아키텍처 변경 설명, 주의사항, 타입 변경 요약
- **APP_MIGRATION_CODE.md** (이하 CODE, ~6,370줄): API별 Before/After 코드 전문, 변환 포인트, 응답 매핑 테이블

두 문서는 R1~R6 총 6라운드에 나누어 작성되었고, 66개 API(67헤더, #44b 포함) 전환 코드를 포함한다.

**문서의 목적**: Supabase 방식이 익숙하지 않은 외주 개발자가, 기존 PHP API 호출 방식을 Supabase 방식으로 수정할 수 있도록 **구체적이고 명확한 가이드**를 제공하는 것.

## 점검 중점사항 (4가지)

### 점검 1: 변환 코드의 명확성
- CODE.md의 모든 API에 **그대로 복사-붙여넣기 가능한** Before/After 코드가 있는가?
- "이런 방식으로 작성하세요"라는 추상적 안내만 있고 실제 코드가 빠진 API가 없는가?
- 외주 개발자가 직접 고민해야 하는 모호한 부분(예: "적절히 처리", "상황에 따라 분기" 등)이 있는가?
- After 코드에 `// TODO`, 빈 함수 body, 미완성 로직이 남아 있지 않은가?

### 점검 2: 코드 일관성 (R1~R6 간)
- Supabase 클라이언트 import 방식이 전 코드에서 동일한가? (`import { supabase } from '@/lib/supabase'`)
- 에러 처리 패턴이 일관적인가? (try/catch + Alert.alert vs 다른 패턴 혼재)
- 단건 조회 시 `.single()` / `.maybeSingle()` 사용이 일관적인가?
- `null` 체크, optional chaining 사용이 일관적인가?
- 자동 API의 query builder 체이닝 스타일이 통일되어 있는가?
- RPC 호출 시 파라미터 전달 방식이 일관적인가?
- 상태 업데이트(setState) 패턴이 일관적인가?
- UPSERT 시 `onConflict` 사용 패턴이 동일한 상황에서 동일하게 적용되었는가?

### 점검 3: DB 스키마 정합성 (테이블명·컬럼명 전수 조사)

CODE.md에서 사용하는 모든 테이블명·컬럼명이 실제 Supabase DB 스키마와 정확히 일치하는지 검증한다. 기존 MariaDB/PHP에서 쓰던 용어가 잔존하는지 전수 조사한다.

**실제 DB에 존재하는 테이블 목록 (총 47개)**:
```
admin_accounts, admin_login_logs, audit_logs,
banners, banks,
chat_messages, chat_room_members, chat_room_reservations, chat_rooms, chat_templates,
checklist_items, checklists,
education_completions, education_quizzes, education_topics,
faqs, favorite_kindergartens, favorite_pets, fcm_tokens, feedbacks,
guardian_reviews,
kindergarten_resident_pets, kindergarten_reviews, kindergarten_status_logs, kindergartens,
member_blocks, member_status_logs, member_term_agreements, members,
notices, notifications, noshow_records,
payments, pet_breeds, pets, pledge_items, pledges,
refunds, report_logs, reports, reservation_status_logs, reservations,
scheduler_history, setting_change_logs, settlement_info_logs, settlement_infos, settlements,
term_versions, terms
```

**주요 테이블 컬럼 (test_data INSERT 기준)**:

members:
```
id, name, nickname, nickname_tag, profile_image, birth_date, gender, carrier, phone,
current_mode, status, suspend_reason, suspend_start, suspend_end, withdrawn_at, withdraw_reason,
identity_verified, identity_method, identity_verified_at, identity_carrier,
address_road, address_complex, address_building_dong, address_building_ho,
address_auth_status, address_auth_date, noshow_count, noshow_sanction, noshow_sanction_end, created_at
+ DDL 추가: latitude, longitude, language, app_version, chat_notify, reservation_notify,
  checkinout_notify, review_notify, new_kindergarten_notify, address_direct, address_doc_urls
```

kindergartens:
```
id, member_id, name, description, photo_urls, business_status,
address_road, address_jibun, address_complex, address_building_dong, address_building_ho,
address_auth_status, address_auth_date, freshness_current, freshness_initial,
price_small_1h, price_small_24h, price_small_walk, price_small_pickup,
price_medium_1h, price_medium_24h, price_medium_walk, price_medium_pickup,
price_large_1h, price_large_24h, price_large_walk, price_large_pickup,
settlement_status, inicis_status, inicis_submall_code, seller_id,
noshow_count, noshow_sanction, created_at
+ DDL 추가: latitude, longitude, registration_status, address_doc_urls
```

pets:
```
id, member_id, name, photo_urls, breed, gender, birth_date, weight, size_class,
is_neutered, is_vaccinated, is_representative, description, created_at
+ DDL 추가: deleted (boolean), is_birth_date_unknown, is_draft
```

reservations:
```
id, member_id, pet_id, kindergarten_id, status, requested_at,
checkin_scheduled, checkout_scheduled, checkin_actual, checkout_actual,
walk_count, pickup_requested, reject_reason, reject_detail, rejected_at,
guardian_checkout_confirmed, kg_checkout_confirmed, created_at
+ DDL 추가: reminder_start_sent_at, reminder_end_sent_at, care_start_sent_at, care_end_sent_at
```

payments:
```
id, member_id, kindergarten_id, pet_id, reservation_id,
P_STATUS, P_TID, P_MID, P_OID, P_AMT, P_UNAME, P_MNAME, P_NOTI,
P_AUTH_DT, P_TYPE, cancel_reason, cancel_amount, canceled_at, paid_at, created_at
```

settlement_infos:
```
id, kindergarten_id, member_id, operator_name, operator_birth_date, bank, account_number,
account_holder, business_type, business_number, status, created_at
```

guardian_reviews / kindergarten_reviews:
```
id, kindergarten_id 또는 pet_id, member_id, reservation_id, content,
image_urls, selected_tags, satisfaction, written_at
```

chat_rooms: `id, guardian_id, kindergarten_id, status, created_at`
chat_messages: `id, chat_room_id, sender_id, content, type, image_urls, created_at`
chat_room_members: `id, chat_room_id, member_id, last_read_message_id, is_muted, joined_at`
chat_templates: `id, member_id, type, content, display_order, created_at`

notifications: `id, member_id, title, content, type, data, created_at`
fcm_tokens: `id, member_id, token, created_at`
favorite_kindergartens: `id, member_id, kindergarten_id, is_favorite, created_at, updated_at`
favorite_pets: `id, member_id, pet_id, is_favorite, created_at, updated_at`
member_blocks: `id, blocker_id, blocked_id, blocked_at, unblocked_at`
banners: `id, title, image_url, link_url, visibility, display_order, start_date, end_date, created_at`
notices: `id, title, content, visibility, is_pinned, created_at`
faqs: `id, category, target, question, answer, display_order, created_at`
terms: `id, title, slug, content, is_required, display_order, created_at`
term_versions: `id, term_id, version, content, created_at`
education_topics: `id, title, description, thumbnail_url, display_order, created_at`
education_quizzes: `id, education_topic_id, question, options, answer, explanation, display_order`
education_completions: `id, member_id, education_topic_id, completed_at`
member_term_agreements: `id, member_id, term_id, agreed_at`

**internal 스키마 VIEW 3개**:
- `internal.members_public_profile`
- `internal.pets_public_info`
- `internal.settlement_infos_public`

**Storage 버킷**: `profile-images`, `pet-images`, `kindergarten-images`, `chat-files`, `review-images`, `address-docs`

**점검 대상**:
- CODE.md `.from('테이블명')` 에서 사용된 테이블명이 위 목록에 있는가?
- `.select('컬럼명')`, `.eq('컬럼명', value)`, `.update({ 컬럼: value })` 등에서 사용된 컬럼명이 실제 스키마와 일치하는가?
- 기존 MariaDB 용어(mb_id, mb_no, wr_id, wr_subject, g5_*, partner, protector, animal, payment_request 등)가 코드 내에 잔존하지 않는가? (Before 블록이나 주석/설명은 제외, After 코드 내 실제 Supabase 호출에서만 검사)
- RPC 호출 시 파라미터명(p_kindergarten_id, p_member_id 등)이 실제 SQL 함수 시그니처와 일치하는가?

**실제 RPC 함수 시그니처 (sql/44_*.sql 기준)**:
```
app_get_kindergarten_detail(p_kindergarten_id uuid)
app_get_kindergartens(p_latitude double precision DEFAULT NULL, p_longitude double precision DEFAULT NULL, p_limit int DEFAULT 200)
app_get_guardian_detail(p_member_id uuid)
app_get_guardians(p_latitude double precision DEFAULT NULL, p_longitude double precision DEFAULT NULL, p_limit int DEFAULT 200)
app_get_reservations_guardian(p_status text DEFAULT NULL, p_pet_id uuid DEFAULT NULL, p_page int DEFAULT 1, p_per_page int DEFAULT 50)
app_get_reservations_kindergarten(p_status text DEFAULT NULL, p_pet_id uuid DEFAULT NULL, p_page int DEFAULT 1, p_per_page int DEFAULT 50)
app_get_reservation_detail(p_reservation_id uuid)
app_withdraw_member(p_reason text DEFAULT NULL)
app_set_representative_pet(p_pet_id uuid)
app_get_guardian_reviews(p_kindergarten_id uuid, p_page int DEFAULT 1, p_per_page int DEFAULT 20)
app_get_settlement_summary(p_start_date text DEFAULT NULL, p_end_date text DEFAULT NULL, p_page int DEFAULT 1, p_per_page int DEFAULT 20)
app_get_education_with_progress(p_kindergarten_id uuid)
app_get_kindergarten_reviews(p_pet_id uuid, p_page int DEFAULT 1, p_per_page int DEFAULT 20)
```

### 점검 4: Step 4 미구현 RPC/EF 기록 완전성

두 문서에서 호출하기로 되어 있지만 아직 SQL/EF 코드가 구현되지 않은 함수들이 Step 4 작업 계획에 빠짐없이 등록되어 있는지 확인한다.

**현재 구현 완료된 RPC (SQL 존재, 13개)**:
```
#1  app_get_kindergarten_detail    (sql/44_01)
#2  app_get_kindergartens          (sql/44_02)
#3  app_get_guardian_detail        (sql/44_03)
#4  app_get_guardians              (sql/44_04)
#5  app_get_reservations_guardian  (sql/44_05)
#5b app_get_reservations_kindergarten (sql/44_05b)
#6  app_get_reservation_detail     (sql/44_06)
#7  app_withdraw_member            (sql/44_07)
#8  app_set_representative_pet     (sql/44_08)
#9  app_get_guardian_reviews        (sql/44_09)
#10 app_get_settlement_summary     (sql/44_10)
#11 app_get_education_with_progress(sql/44_11)
#12 app_get_kindergarten_reviews   (sql/44_12)
```

**Step 4 구현 예정 (MIGRATION_PLAN.md 기준, 10개)**:
```
4-1  inicis-callback (Edge Function)
4-2  send-chat-message (Edge Function)
4-3  create-reservation (Edge Function)
4-4  complete-care (Edge Function)
4-5  send-alimtalk (Edge Function)
4-6  send-push (Edge Function)
4-7  scheduler (Edge Function)
4-8  app_create_chat_room (RPC, SECURITY DEFINER)
4-9  app_get_chat_rooms (RPC)
4-10 app_get_blocked_list (RPC, SECURITY DEFINER)
```

**점검 대상**:
- CODE.md에서 `supabase.rpc('함수명')` 또는 `supabase.functions.invoke('함수명')` 으로 호출하는 모든 함수가 위 "구현 완료 13개" 또는 "Step 4 예정 10개"에 포함되어 있는가?
- GUIDE.md에서 언급하는 RPC/EF가 동일하게 매칭되는가?
- 혹시 문서에서 호출하지만 어디에도 기록되지 않은 "유령 함수"가 없는가?
- 반대로 Step 4 목록에는 있지만 문서에서 전혀 언급되지 않는 항목은 없는가?

## 참조 문서 (같은 저장소 내)

점검 중 교차 검증이 필요한 경우 아래 문서를 참조:
- `MIGRATION_PLAN.md` — 전체 설계서, Step 1~5 작업 계획, API 매핑표, Step 4 구현 대상 표
- `RPC_PHP_MAPPING.md` — RPC 16개 PHP 원본 매핑표 (파라미터 시그니처 포함)
- `DB_MAPPING_REFERENCE.md` — MariaDB→Supabase 테이블·컬럼 대조표
- `MOBILE_APP_ANALYSIS.md` — 앱 소스코드 분석, 62개 PHP API 목록
- `sql/44_*.sql` — 실제 RPC 함수 SQL (파라미터명·반환 구조 확인 원본)
- `sql/43_01_app_rls_policies.sql` — RLS 정책 원본
- `sql/41_*.sql`, `sql/42_*.sql` — 테이블 생성 DDL, 컬럼 추가 DDL

## 작업 방식

1. **문서 분량이 크므로 직접 작업량을 나누어 진행**한다. CODE.md는 §1~§6 / §7~§13으로, GUIDE.md는 §0~§8 / §9~§16+부록으로 나누는 등 자유롭게 분할한다.
2. **각 점검 항목(1~4)별로 발견 사항을 정리**하고, 발견된 문제에 대해 `[치명]` / `[중요]` / `[경미]` / `[제안]` 등급을 부여한다.
   - `[치명]`: 외주 개발자가 코드를 복붙했을 때 런타임 에러 또는 데이터 무결성 문제 발생
   - `[중요]`: 코드는 동작하지만 의도와 다른 결과(잘못된 컬럼, 누락된 필터 등)
   - `[경미]`: 동작에 영향 없지만 일관성·가독성 문제
   - `[제안]`: 개선하면 좋지만 현재 상태로도 문제없음
3. **최소 2회 이상 반복 점검**한다. 1차에서 놓칠 수 있는 부분을 2차에서 잡는다. 1차는 순방향(API #1→#66), 2차는 점검항목별 횡단 비교(예: 모든 `.single()` 사용처만 모아서 비교, 모든 RPC 파라미터만 모아서 비교).
4. 시간·크레딧 제한 없으니 꼼꼼하게 진행한다.
5. 최종 결과는 아래 형식으로 정리:

```
## 점검 결과 요약

### 통계
- 총 점검 API: N개
- 발견 이슈: [치명] N건, [중요] N건, [경미] N건, [제안] N건

### [치명] 이슈 목록
| # | 위치 | 내용 | 수정 방향 |
|---|------|------|----------|
| 1 | CODE.md #XX | ... | ... |

### [중요] 이슈 목록
(동일 형식)

### [경미] 이슈 목록
(동일 형식)

### [제안] 목록
(동일 형식)

### 점검 2: 일관성 분석 결과
(패턴별 비교 결과)

### 점검 4: Step 4 함수 추적 결과
(함수별 매칭 결과 표)
```
