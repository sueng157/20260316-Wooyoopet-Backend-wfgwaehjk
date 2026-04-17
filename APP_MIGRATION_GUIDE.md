# 우유펫 모바일 앱 API 전환 가이드

> **작성일**: 2026-04-17
> **최종 업데이트**: 2026-04-17 (초안 — 구조 및 규칙 확정, 본문 작성 예정)
> **대상 독자**: 외주 개발자 (React Native/Expo 앱 코드 수정 담당)
> **전제 조건**: Supabase 프로젝트 설정 완료, Step 2.5 RPC 13개 배포 완료
> **관련 문서**: `MIGRATION_PLAN.md` (설계서), `APP_MIGRATION_CODE.md` (코드 예시), `RPC_PHP_MAPPING.md` (RPC 매핑), `DB_MAPPING_REFERENCE.md` (테이블 대조표)

---

## 0. 문서 규칙 및 표기법

> 이 섹션은 본 문서(`APP_MIGRATION_GUIDE.md`)와 코드 예시 문서(`APP_MIGRATION_CODE.md`) 전체에 적용되는 규칙입니다.
> 문서 작성자뿐 아니라 코드를 수정하는 개발자도 반드시 숙지해야 합니다.

### 0-1. 용어 매핑표

기존 PHP/MariaDB 코드에서 사용하던 용어를 Supabase 전환 후의 용어로 통일합니다.

| 기존 용어 (PHP/MariaDB) | 전환 후 용어 (Supabase) | 설명 |
|------------------------|----------------------|------|
| `mb_id` (폰번호 문자열) | `auth.uid()` (UUID) | 사용자 식별자. Supabase Auth JWT에서 자동 추출 |
| `mb_no` (정수 PK) | `members.id` (UUID) | 회원 테이블 PK |
| `apiClient.post()` / `apiClient.get()` | `supabase.from().select()` / `.insert()` / `.update()` / `.delete()` | 자동 API 호출 |
| `apiClient.post('api/xxx.php')` (RPC 대상) | `supabase.rpc('app_함수명', { params })` | RPC 호출 |
| `apiClient.post('api/xxx.php')` (EF 대상) | `supabase.functions.invoke('함수명', { body })` | Edge Function 호출 |
| `FormData` | JSON `body` 또는 Supabase query builder | 요청 형식 |
| `partner` (PHP 변수명) | `kindergarten` | 유치원 (돌봄 파트너) |
| `protector` (PHP 변수명) | `guardian` | 보호자 (반려동물 주인) |
| `payment_request` (PHP 테이블) | `reservation` / `reservations` | 돌봄 예약 |
| `inicis_payments` (PHP 테이블) | `payments` | 결제 |
| `settlement_info` (PHP 테이블) | `settlement_infos` | 정산 계좌 정보 |
| `g5_write_partner` (MariaDB) | `kindergartens` | 유치원 테이블 |
| `g5_write_animal` (MariaDB) | `pets` | 반려동물 테이블 |
| `g5_member` (MariaDB) | `members` | 회원 테이블 |
| `wr_id` (MariaDB PK) | `id` (UUID) | 각 테이블 PK |
| `wr_subject`, `wr_content` 등 | 의미 있는 컬럼명 (`name`, `description` 등) | 컬럼명 정규화 |
| `WebSocket (wss://...)` | Supabase Realtime | 실시간 통신 |
| `PHP callback (inicis_payment.php)` | Edge Function (`inicis-callback`) | PG 결제 콜백 |

### 0-2. 코드 표기 규칙

| 항목 | 규칙 | 예시 |
|------|------|------|
| **import 경로** | `@/` 별칭 사용 (tsconfig paths) | `import { supabase } from '@/lib/supabase'` |
| **Supabase 클라이언트 위치** | `lib/supabase.ts` (신규 생성) | — |
| **타입 정의 위치** | `types/` 디렉토리 (기존 구조 유지) | `types/petType.ts` |
| **hook 파일 위치** | `hooks/` 디렉토리 (기존 구조 유지) | `hooks/usePetList.ts` |
| **유틸리티 위치** | `utils/` 디렉토리 (기존 구조 유지) | `utils/fetchPartnerList.ts` |
| **상태 관리** | Jotai atom + MMKV 유지 | `states/userAtom.ts` |
| **타입 선언** | `interface` 사용 (기존 앱 코드 관례) | `interface PetType { ... }` |
| **에러 처리** | `try/catch` + `Alert.alert()` (기존 패턴 유지) | — |
| **환경 변수 접두사** | `EXPO_PUBLIC_` (Expo 규칙) | `EXPO_PUBLIC_SUPABASE_URL` |
| **null/undefined 처리** | optional chaining (`?.`) + nullish coalescing (`??`) | `data?.name ?? ''` |
| **함수 선언** | hook 내부: `const fn = useCallback(async () => { ... }, [deps])` | 기존 패턴 유지 |
| **날짜 처리** | `Date` 객체 또는 기존 `handleDate.ts` 유틸리티 | `calculateAge(birthDay)` |
| **Supabase 쿼리 체이닝** | 한 줄이 길어지면 메서드별 줄바꿈 | `.from('pets')` → `.select('*')` → `.eq('member_id', userId)` |
| **단건 조회** | 결과가 1건인 경우 반드시 `.single()` 사용 | 배열 대신 객체로 반환. 빠뜨리면 앱 크래시 |

### 0-3. 코드 블록 표기 형식

문서 전체에서 코드 비교는 아래 형식을 따릅니다.

**모든 API에 응답 매핑 테이블을 작성한다.** 외주 개발자가 Supabase에 익숙하지 않으므로, 복사-붙여넣기만으로 작업할 수 있도록 모든 API의 응답 필드 대응표를 빠짐없이 제공한다.

각 API 섹션의 구조:

---

#### API #N. {PHP 파일명} → {Supabase 대응}

**전환 방식**: 자동 API / RPC / Edge Function / Supabase Auth / 앱 직접 호출
**난이도**: 쉬움 / 중 / 상
**관련 파일**: `hooks/useXxx.ts`, `app/xxx/index.tsx`
**Supabase 테이블**: `table_name`

**Before** (현재 PHP API 호출):

```typescript
// 파일: utils/apiClient.ts 또는 hooks/useXxx.ts
const response = await apiClient.post('api/xxx.php', { ... });
```

**After** (Supabase 전환 후):

```typescript
// 파일: hooks/useXxx.ts (수정) 또는 lib/supabase.ts (신규)
const { data, error } = await supabase.from('table').select('*');
```

**변환 포인트**:
- 포인트 1
- 포인트 2

**응답 매핑**:

| PHP 응답 필드 | Supabase 응답 필드 | 변환 필요 |
|---|---|---|
| `result.field` | `data.column` | 예/아니오 |

---

### 0-4. Supabase 클라이언트 초기화 (공통)

전환 후 앱 전체에서 사용할 Supabase 클라이언트 설정입니다.

```typescript
// 파일: lib/supabase.ts (신규 생성)
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { storage } from '@/storage/storage'  // 기존 MMKV storage 인스턴스

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// MMKV → Supabase Auth storage 어댑터
// Supabase Auth는 웹 표준(localStorage) 인터페이스를 요구하지만,
// MMKV는 getString/set/delete 메서드를 사용하므로 이름을 변환해준다.
const mmkvStorageAdapter = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: mmkvStorageAdapter,  // MMKV 어댑터 사용
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,    // React Native에서는 false
  },
})
```

```
// .env 변경 사항
// 삭제:
EXPO_PUBLIC_API_URL=https://woo1020.iwinv.net
EXPO_PUBLIC_WEBSOCKET_URL=wss://wooyoopet.store/ws

// 추가:
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 0-5. 전환 순서 권장 사항

```
Phase A: 인증 + 단순 CRUD (가장 먼저, 영향도 낮음)
  → 1장 인증 + 3장~10장 자동 API (44개)
  → apiClient.ts 와 supabase.ts 공존 가능 (점진적 전환)

Phase B: RPC 조회 (Step 2.5 함수 사용)
  → 11장 유치원/보호자 + 12장 예약 조회 + 13장 리뷰/정산/교육 (13개 RPC)
  → 기존 hook 파일에서 apiClient → supabase.rpc() 교체

Phase C: 채팅 (Realtime 전환, 복잡도 높음)
  → 14장 채팅 시스템 전체 (9개 API)
  → useChat.ts 대규모 리팩터링 필요

Phase D: 결제/예약 + Edge Functions (가장 마지막, 위험도 높음)
  → 15장 결제/예약 (5개) + 16장 Edge Function 인터페이스 (7개)
  → WebView 결제 흐름 변경 + Edge Function 연동
```

### 0-6. 패키지 의존성 변경

```
// 추가 설치 필요
yarn add @supabase/supabase-js react-native-url-polyfill

// 제거 가능 (전환 완료 후)
yarn remove react-use-websocket   // WebSocket → Supabase Realtime
// @tosspayments/widget-sdk-react-native  // 이미 미사용, 제거 권장
```

### 0-7. 번호 체계

본 문서의 API 번호는 `MIGRATION_PLAN.md §5 API 전환 매핑표`의 번호(#1~#66)와 **동일**합니다.
`APP_MIGRATION_CODE.md`의 코드 블록 번호도 같은 번호를 사용합니다.

### 0-8. 문서 역할 분담

| 문서 | 역할 | 내용 |
|------|------|------|
| `APP_MIGRATION_GUIDE.md` (본 문서) | **이해용** | 도메인별 개요 설명, 아키텍처 변경 설명, 주의사항, 타입 변경 요약. 개별 API 코드를 반복하지 않고 CODE.md를 참조 |
| `APP_MIGRATION_CODE.md` | **복붙용** | API별 Before/After 코드 전문, 변환 포인트, 응답 매핑 테이블. 외주 개발자가 복사-붙여넣기로 바로 적용 가능 |

- GUIDE.md의 각 API 섹션에서는 "무엇이 바뀌고 왜 바뀌는지"를 설명하고, 코드 예시는 `> 📝 코드 예시: APP_MIGRATION_CODE.md #N 참조` 형태로 링크한다.
- CODE.md에 코드 전문이 있으므로, GUIDE.md에서 동일 코드를 중복 작성하지 않는다.

---

## 목차

| 장 | 제목 | 대응 서브태스크 | API 수 | 상태 |
|----|------|---------------|--------|------|
| 0 | 문서 규칙 및 표기법 | — | — | ✅ 확정 |
| 1 | 인증 전환 (mb_id → Supabase Auth) | 3-2 | 3개 (#1~#3) | ⬜ 예정 |
| 2 | apiClient 교체 (FormData → Supabase JS) | 3-1 | — (공통) | ⬜ 예정 |
| 3 | 반려동물 CRUD | 3-3 | 8개 (#9~#16) | ⬜ 예정 |
| 4 | 즐겨찾기 CRUD | 3-3 | 4개 (#46~#49) | ⬜ 예정 |
| 5 | 알림/FCM | 3-3 | 3개 (#50~#52) | ⬜ 예정 |
| 6 | 콘텐츠 조회 | 3-3 | 5개 (#53~#57) | ⬜ 예정 |
| 7 | 차단/신고 | 3-3 | 3개 (#58~#60) | ⬜ 예정 |
| 8 | 채팅 템플릿 | 3-3 | 4개 (#30~#33) | ⬜ 예정 |
| 9 | 주소 인증 / 프로필 / 회원 관리 | 3-3 | 6개 (#4~#8, #21) | ⬜ 예정 |
| 10 | 기타 자동 API | 3-3 | 12개 (#24, #26~#29, #40, #42~#43, #45, #62~#65) | ⬜ 예정 |
| 11 | 유치원/보호자 RPC | 3-4 | 4개 (#17~#20) | ⬜ 예정 |
| 12 | 예약 조회 RPC | 3-4 | 2개 (#37, #38) | ⬜ 예정 |
| 13 | 리뷰/정산/교육 RPC | 3-4 | 4개 (#41, #44, #44b, #61) | ⬜ 예정 |
| 14 | 채팅 전환 (WebSocket → Realtime) | 3-5 | 9개 (#22~#30) | ⬜ 예정 |
| 15 | 결제/예약 전환 | 3-6 | 5개 (#34~#38) | ⬜ 예정 |
| 16 | Edge Function 인터페이스 | 3-7 | 7개 (#25, #34~#36, #39, #1, #66) | ⬜ 예정 |
| A | 부록: 타입 정의 변경 총정리 | — | — | ⬜ 예정 |
| B | 부록: 환경 변수 / 패키지 체크리스트 | — | — | ⬜ 예정 |

> **참고**: 일부 API는 여러 장에서 다룹니다 (예: #37~#38은 12장 RPC + 15장 결제 양쪽에서 참조).
> 해당 API의 코드 예시는 `APP_MIGRATION_CODE.md`에서 한 번만 작성하고, 이 문서에서는 교차 참조합니다.

---

## 1. 인증 전환 (mb_id → Supabase Auth)

> **서브태스크**: 3-2
> **관련 API**: #1 alimtalk.php, #2 auth_request.php, #3 set_join.php
> **핵심 변경**: 폰번호 기반 수동 인증 → Supabase Phone OTP
> **영향 범위**: 모든 API 호출의 사용자 식별 방식 변경

### 1-1. 현재 인증 흐름 vs 전환 후 흐름

<!-- TODO: 현재 흐름 다이어그램 (alimtalk → auth_request → set_join) -->
<!-- TODO: 전환 후 흐름 다이어그램 (signInWithOtp → verifyOtp → members UPSERT) -->

### 1-2. API #1. alimtalk.php → Edge Function `send-alimtalk`

<!-- TODO: Before/After 코드, 변환 포인트 -->
<!-- 참조: APP_MIGRATION_CODE.md #1 -->

### 1-3. API #2. auth_request.php → Supabase Auth `signInWithOtp` + `verifyOtp`

<!-- TODO: Before/After 코드, 변환 포인트 -->
<!-- 참조: APP_MIGRATION_CODE.md #2 -->

### 1-4. API #3. set_join.php → Supabase Auth + members UPSERT

<!-- TODO: Before/After 코드, 변환 포인트 -->
<!-- 참조: APP_MIGRATION_CODE.md #3 -->

### 1-5. 인증 상태 관리 (userAtom 변경)

<!-- TODO: userAtom 구조 변경 (mb_id → Supabase session), onAuthStateChange 리스너 -->

### 1-6. 인증 전환 후 영향 범위

<!-- TODO: 모든 API 호출에서 mb_id 파라미터 제거 → auth.uid() 자동 적용 설명 -->

---

## 2. apiClient 교체 (FormData → Supabase JS)

> **서브태스크**: 3-1
> **핵심 변경**: `utils/apiClient.ts` → `lib/supabase.ts`
> **전환 전략**: 점진적 교체 (공존 → 전체 전환 → apiClient.ts 삭제)

### 2-1. 현재 apiClient 구조

<!-- TODO: apiClient.ts 분석 (BASE_URL, get/post 메서드, FormData 변환, 에러 처리) -->

### 2-2. Supabase JS 호출 패턴 요약

<!-- TODO: 4가지 패턴 비교표 (자동 API, RPC, Edge Function, Storage) -->

### 2-3. 점진적 전환 전략

<!-- TODO: Phase별 apiClient와 supabase 공존 방법, import 가이드 -->

### 2-4. 에러 처리 통합

<!-- TODO: apiClient 에러 형식 vs Supabase 에러 형식, 공통 에러 핸들러 -->

### 2-5. apiClient.ts 제거 시점

<!-- TODO: 모든 API 전환 완료 후 apiClient.ts 삭제 체크리스트 -->

---

## 3. 반려동물 CRUD

> **서브태스크**: 3-3 (자동 API)
> **관련 API**: #9~#16 (8개)
> **Supabase 테이블**: `pets`, `pet_breeds`, `favorite_pets`
> **관련 파일**: `hooks/usePetList.ts`, `types/petType.ts`

### 3-1. API #9. get_my_animal.php → pets SELECT

<!-- TODO: Before/After, 컬럼 매핑 (wr_1~wr_11 → 정규 컬럼명) -->
<!-- 참조: APP_MIGRATION_CODE.md #9 -->

### 3-2. API #10. get_animal_by_id.php → pets SELECT + favorite JOIN

<!-- 참조: APP_MIGRATION_CODE.md #10 -->

### 3-3. API #11. get_animal_by_mb_id.php → pets SELECT

<!-- 참조: APP_MIGRATION_CODE.md #11 -->

### 3-4. API #12. get_animal_kind.php → pet_breeds SELECT

<!-- 참조: APP_MIGRATION_CODE.md #12 -->

### 3-5. API #13. set_animal_insert.php → pets INSERT + Storage

<!-- TODO: Storage 업로드 패턴 (pet-images 버킷), 4마리 제한 체크 -->
<!-- 참조: APP_MIGRATION_CODE.md #13 -->

### 3-6. API #14. set_animal_update.php → pets UPDATE + Storage

<!-- 참조: APP_MIGRATION_CODE.md #14 -->

### 3-7. API #15. set_animal_delete.php → pets UPDATE (soft delete)

<!-- 참조: APP_MIGRATION_CODE.md #15 -->

### 3-8. API #16. set_first_animal_set.php → RPC `app_set_representative_pet`

<!-- 참조: APP_MIGRATION_CODE.md #16 -->

### 3-9. PetType 인터페이스 변경 요약

<!-- TODO: 기존 PetType vs 전환 후 PetType 비교표 -->

---

## 4. 즐겨찾기 CRUD

> **서브태스크**: 3-3 (자동 API)
> **관련 API**: #46~#49 (4개)
> **Supabase 테이블**: `favorite_kindergartens`, `favorite_pets`
> **관련 파일**: `utils/handleFavorite.ts`

### 4-1. API #46. set_partner_favorite_add.php → favorite_kindergartens UPSERT

<!-- 참조: APP_MIGRATION_CODE.md #46 -->

### 4-2. API #47. set_partner_favorite_remove.php → favorite_kindergartens UPDATE

<!-- 참조: APP_MIGRATION_CODE.md #47 -->

### 4-3. API #48. set_user_favorite_add.php → favorite_pets UPSERT

<!-- 참조: APP_MIGRATION_CODE.md #48 -->

### 4-4. API #49. set_user_favorite_remove.php → favorite_pets UPDATE

<!-- 참조: APP_MIGRATION_CODE.md #49 -->

---

## 5. 알림/FCM

> **서브태스크**: 3-3 (자동 API)
> **관련 API**: #50~#52 (3개)
> **Supabase 테이블**: `fcm_tokens`, `notifications`
> **관련 파일**: `hooks/useFcmToken.ts`, `hooks/useNotification.ts`

### 5-1. API #50. fcm_token.php → fcm_tokens UPSERT

<!-- 참조: APP_MIGRATION_CODE.md #50 -->

### 5-2. API #51. get_notification.php → notifications SELECT

<!-- 참조: APP_MIGRATION_CODE.md #51 -->

### 5-3. API #52. delete_notification.php → notifications DELETE

<!-- 참조: APP_MIGRATION_CODE.md #52 -->

---

## 6. 콘텐츠 조회

> **서브태스크**: 3-3 (자동 API)
> **관련 API**: #53~#57 (5개)
> **Supabase 테이블**: `banners`, `notices`, `faqs`, `terms`

### 6-1. API #53. get_banner.php → banners SELECT

<!-- 참조: APP_MIGRATION_CODE.md #53 -->

### 6-2. API #54. get_notice.php → notices SELECT

<!-- 참조: APP_MIGRATION_CODE.md #54 -->

### 6-3. API #55. get_notice_detail.php → notices SELECT (단건)

<!-- 참조: APP_MIGRATION_CODE.md #55 -->

### 6-4. API #56. get_faq.php → faqs SELECT

<!-- 참조: APP_MIGRATION_CODE.md #56 -->

### 6-5. API #57. get_policy.php → terms SELECT

<!-- 참조: APP_MIGRATION_CODE.md #57 -->

---

## 7. 차단/신고

> **서브태스크**: 3-3 (자동 API)
> **관련 API**: #58~#60 (3개)
> **Supabase 테이블**: `member_blocks`
> **관련 파일**: `hooks/useBlock.ts`

### 7-1. API #58. set_block_user.php → member_blocks INSERT/DELETE (토글)

<!-- 참조: APP_MIGRATION_CODE.md #58 -->

### 7-2. API #59. get_block_user.php → member_blocks SELECT

<!-- 참조: APP_MIGRATION_CODE.md #59 -->

### 7-3. API #60. get_blocked_list.php → member_blocks SELECT + members JOIN

<!-- 참조: APP_MIGRATION_CODE.md #60 -->

---

## 8. 채팅 템플릿

> **서브태스크**: 3-3 (자동 API)
> **관련 API**: #30~#33 (4개, #30 get + #31 insert + #32 update + #33 delete)
> **Supabase 테이블**: `chat_templates`

### 8-1. API #30. get_message_template.php → chat_templates SELECT

<!-- 참조: APP_MIGRATION_CODE.md #30 -->

### 8-2. API #31. set_message_template.php → chat_templates INSERT

<!-- 참조: APP_MIGRATION_CODE.md #31 -->

### 8-3. API #32. update_message_template.php → chat_templates UPDATE

<!-- 참조: APP_MIGRATION_CODE.md #32 -->

### 8-4. API #33. delete_message_template.php → chat_templates DELETE

<!-- 참조: APP_MIGRATION_CODE.md #33 -->

---

## 9. 주소 인증 / 프로필 / 회원 관리

> **서브태스크**: 3-3 (자동 API)
> **관련 API**: #4~#8, #21 (6개)
> **Supabase 테이블**: `members`, `kindergartens`
> **관련 파일**: `utils/updateJoin.ts`, 프로필/주소 관련 화면

### 9-1. API #4. set_member_leave.php → RPC `app_withdraw_member`

<!-- 참조: APP_MIGRATION_CODE.md #4 -->

### 9-2. API #5. set_mypage_mode_update.php → members UPDATE

<!-- 참조: APP_MIGRATION_CODE.md #5 -->

### 9-3. API #6. set_profile_update.php → members UPDATE + Storage

<!-- 참조: APP_MIGRATION_CODE.md #6 -->

### 9-4. API #7. set_address_verification.php → members UPDATE + Storage

<!-- 참조: APP_MIGRATION_CODE.md #7 -->

### 9-5. API #8. kakao-address.php → 앱 직접 호출 (서버 불필요)

<!-- 참조: APP_MIGRATION_CODE.md #8 -->

### 9-6. API #21. set_partner_update.php → kindergartens UPDATE + Storage

<!-- 참조: APP_MIGRATION_CODE.md #21 -->

---

## 10. 기타 자동 API

> **서브태스크**: 3-3 (자동 API)
> **관련 API**: #24, #26~#29, #40, #42~#43, #45, #62~#65 (12개)

### 10-1. 채팅 관련 자동 API

#### API #24. chat.php → get_messages → chat_messages SELECT

<!-- 참조: APP_MIGRATION_CODE.md #24 -->

#### API #26. chat.php → get_images → chat_messages SELECT (image)

<!-- 참조: APP_MIGRATION_CODE.md #26 -->

#### API #27. chat.php → leave_room → chat_rooms UPDATE

<!-- 참조: APP_MIGRATION_CODE.md #27 -->

#### API #28. chat.php → muted → chat_room_members UPDATE

<!-- 참조: APP_MIGRATION_CODE.md #28 -->

#### API #29. read_chat.php → chat_room_members UPDATE

<!-- 참조: APP_MIGRATION_CODE.md #29 -->

### 10-2. 돌봄/정산/리뷰 관련 자동 API

#### API #40. set_care_review.php → guardian_reviews / kindergarten_reviews INSERT

<!-- 참조: APP_MIGRATION_CODE.md #40 -->

#### API #42. get_settlement_info.php → settlement_infos SELECT

<!-- 참조: APP_MIGRATION_CODE.md #42 -->

#### API #43. set_settlement_info.php → settlement_infos UPSERT

<!-- 참조: APP_MIGRATION_CODE.md #43 -->

#### API #45. set_review.php → guardian_reviews / kindergarten_reviews INSERT + Storage

<!-- 참조: APP_MIGRATION_CODE.md #45 -->

### 10-3. 기타

#### API #62. set_solved.php → education_completions INSERT

<!-- 참조: APP_MIGRATION_CODE.md #62 -->

#### API #63. get_bank_list.php → banks SELECT

<!-- 참조: APP_MIGRATION_CODE.md #63 -->

#### API #64. get_favorite_animal_list.php → favorite_pets SELECT + pets JOIN

<!-- 참조: APP_MIGRATION_CODE.md #64 -->

#### API #65. get_favorite_partner_list.php → favorite_kindergartens SELECT + kindergartens JOIN

<!-- 참조: APP_MIGRATION_CODE.md #65 -->

---

## 11. 유치원/보호자 RPC

> **서브태스크**: 3-4 (RPC 호출)
> **관련 API**: #17~#20 (4개)
> **RPC 함수**: `app_get_kindergarten_detail`, `app_get_kindergartens`, `app_get_guardian_detail`, `app_get_guardians`
> **관련 파일**: `hooks/useKinderGarten.ts`, `utils/fetchPartnerList.ts`, `hooks/useProtector.ts`, `utils/fetchProtectorList.ts`

### 11-1. API #17. get_partner.php → RPC `app_get_kindergarten_detail`

<!-- TODO: PHP 호출 → supabase.rpc() 변환, 파라미터 매핑 (mb_id → p_kindergarten_member_id), 응답 구조 변환 -->
<!-- 참조: APP_MIGRATION_CODE.md #17 -->

### 11-2. API #18. get_partner_list.php → RPC `app_get_kindergartens`

<!-- 참조: APP_MIGRATION_CODE.md #18 -->

### 11-3. API #19. get_protector.php → RPC `app_get_guardian_detail`

<!-- 참조: APP_MIGRATION_CODE.md #19 -->

### 11-4. API #20. get_protector_list.php → RPC `app_get_guardians`

<!-- 참조: APP_MIGRATION_CODE.md #20 -->

### 11-5. 유치원/보호자 타입 변경 요약

<!-- TODO: PartnerType → KindergartenType 필드 매핑, ProtectorType → GuardianType 필드 매핑 -->

---

## 12. 예약 조회 RPC

> **서브태스크**: 3-4 (RPC 호출)
> **관련 API**: #37, #38 (2개)
> **RPC 함수**: `app_get_reservations`, `app_get_reservations_kindergarten`, `app_get_reservation_detail`
> **관련 파일**: `hooks/usePaymentRequestList.ts`, `hooks/usePaymentRequest.ts`

### 12-1. API #37. get_payment_request.php → RPC `app_get_reservations` (보호자) / `app_get_reservations_kindergarten` (유치원)

기존 PHP에서는 `get_payment_request.php` 하나로 `mb_id`/`to_mb_id` 파라미터로 보호자/유치원을 분기했으나, Supabase에서는 보호자/유치원 시점 차이가 커서 2개의 RPC로 분리되었습니다.
- **보호자 모드**: `supabase.rpc('app_get_reservations', { ... })` — 보호자가 요청한 예약 목록 (pet, kindergarten 정보 포함)
- **유치원 모드**: `supabase.rpc('app_get_reservations_kindergarten', { ... })` — 유치원에 들어온 예약 목록 (pet, member 정보 포함)

앱에서 현재 `systemMode` (보호자='1', 유치원='2')에 따라 호출할 RPC를 분기합니다.

<!-- TODO: Before/After 코드, 파라미터 매핑, 응답 매핑 -->

> 📝 코드 예시: `APP_MIGRATION_CODE.md` #37 참조

### 12-2. API #38. get_payment_request_by_id.php → RPC `app_get_reservation_detail`

<!-- 참조: APP_MIGRATION_CODE.md #38 -->

### 12-3. PaymentRequestType 변경 요약

<!-- TODO: 기존 PaymentRequestType vs 전환 후 ReservationType 비교표 -->

---

## 13. 리뷰/정산/교육 RPC

> **서브태스크**: 3-4 (RPC 호출)
> **관련 API**: #41, #44, #44b, #61 (4개, #16은 3장 반려동물 CRUD에 배치)
> **RPC 함수**: `app_get_settlement_summary`, `app_get_guardian_reviews`, `app_get_kindergarten_reviews`, `app_get_education_with_progress`

### 13-1. API #41. get_settlement.php → RPC `app_get_settlement_summary`

<!-- TODO: 2개 PHP (get_settlement + get_settlement_list) → 단일 RPC 통합 설명 -->
<!-- 참조: APP_MIGRATION_CODE.md #41 -->

### 13-2. API #44. get_review.php (type=pet) → RPC `app_get_guardian_reviews`

<!-- 참조: APP_MIGRATION_CODE.md #44 -->

### 13-3. API #44b. get_review.php (type=partner) → RPC `app_get_kindergarten_reviews`

<!-- 참조: APP_MIGRATION_CODE.md #44b -->

### 13-4. API #61. get_education.php → RPC `app_get_education_with_progress`

<!-- 참조: APP_MIGRATION_CODE.md #61 -->

---

## 14. 채팅 전환 (WebSocket → Realtime)

> **서브태스크**: 3-5
> **관련 API**: #22~#30 (9개)
> **핵심 변경**: WebSocket (`react-use-websocket`) → Supabase Realtime (`supabase.channel()`)
> **관련 파일**: `hooks/useChat.ts` (대규모 리팩터링), `components/ChatMessage.tsx`

### 14-1. 현재 채팅 아키텍처 vs 전환 후 아키텍처

<!-- TODO: WebSocket 기반 흐름 다이어그램 -->
<!-- TODO: Supabase Realtime 기반 흐름 다이어그램 -->

### 14-2. useChat.ts 리팩터링 가이드

<!-- TODO: 기존 useChat 구조 분석 → 전환 후 구조 설계 -->
<!-- TODO: Supabase Realtime subscription 패턴 -->

### 14-3. API #22. chat.php → create_room → RPC

<!-- 참조: APP_MIGRATION_CODE.md #22 -->

### 14-4. API #23. chat.php → get_rooms → RPC

<!-- 참조: APP_MIGRATION_CODE.md #23 -->

### 14-5. API #25. chat.php → send_message → Edge Function `send-chat-message`

<!-- 참조: APP_MIGRATION_CODE.md #25 -->

### 14-6. Realtime 구독 패턴 (메시지 수신)

<!-- TODO: supabase.channel() 구독 코드, onPostgresChanges vs broadcast -->

### 14-7. 이미지/파일 전송 (Storage 연동)

<!-- TODO: Storage 업로드 → chat_messages.image_urls 패턴 -->

### 14-8. 읽음 처리 / 미읽음 카운트

<!-- TODO: last_read_message_id UPDATE, unread_count 계산 -->

---

## 15. 결제/예약 전환

> **서브태스크**: 3-6
> **관련 API**: #34~#39 (6개)
> **핵심 변경**: PHP 콜백 → Edge Function, WebView 콜백 URL 변경
> **관련 파일**: `app/payment/inicisPayment.tsx`, `app/payment/inicisApproval.tsx`, `app/payment/request.tsx`

### 15-1. 현재 결제 흐름 vs 전환 후 흐름

<!-- TODO: 현재 흐름 (WebView → PHP callback → DB) -->
<!-- TODO: 전환 후 흐름 (WebView → Edge Function callback → DB) -->

### 15-2. API #34. inicis_payment.php → Edge Function `inicis-callback`

<!-- 참조: APP_MIGRATION_CODE.md #34 -->

### 15-3. API #35. set_inicis_approval.php → Edge Function (inicis-callback 내부)

<!-- 참조: APP_MIGRATION_CODE.md #35 -->

### 15-4. API #36. set_payment_request.php → Edge Function `create-reservation`

<!-- 참조: APP_MIGRATION_CODE.md #36 -->

### 15-5. API #39. set_care_complete.php → Edge Function `complete-care`

<!-- 참조: APP_MIGRATION_CODE.md #39 -->

### 15-6. WebView 콜백 URL 변경

<!-- TODO: INICIS_PAYMENT_URL 변경, 콜백 URL을 Edge Function 엔드포인트로 교체 -->

### 15-7. 테스트 MID / 상용 MID 전환

<!-- TODO: INIpayTest → wooyoope79 전환 가이드 -->

---

## 16. Edge Function 인터페이스 가이드

> **서브태스크**: 3-7
> **관련 Edge Function**: 7개
> **핵심**: `supabase.functions.invoke()` 호출 규격 정의 (입력/출력 스펙만, 구현은 Step 4)

### 16-1. Edge Function 호출 공통 패턴

```typescript
// 공통 호출 패턴
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { key: value },
})
```

### 16-2. inicis-callback (결제 콜백)

<!-- TODO: 입력 스펙, 출력 스펙, 호출 시점, 에러 처리 -->
<!-- 이 함수는 PG사가 직접 호출 → 앱에서 직접 호출하지 않음. WebView 콜백 URL만 변경 -->

### 16-3. send-chat-message (채팅 메시지 전송)

<!-- TODO: 입력 (room_id, content, message_type, file?), 출력, 에러 -->

### 16-4. create-reservation (예약 생성)

<!-- TODO: 입력 (kindergarten_id, pet_id, dates, price, payment_id, room_id?), 출력, 에러 -->

### 16-5. complete-care (돌봄 완료)

<!-- TODO: 입력 (reservation_id), 출력, 에러 -->

### 16-6. send-alimtalk (카카오 알림톡)

<!-- TODO: 입력 (phone, template_code, variables), 출력, 에러 -->

### 16-7. send-push (FCM 푸시)

<!-- TODO: 입력 (member_id/member_ids, title, body, data?), 출력, 에러 -->
<!-- 이 함수는 다른 Edge Function에서 내부 호출 → 앱에서 직접 호출하지 않음 -->

### 16-8. API #66. scheduler.php → Edge Function `scheduler`

<!-- TODO: pg_cron 또는 외부 cron 트리거 → 앱에서 직접 호출하지 않음 -->

---

## 부록 A. 타입 정의 변경 총정리

> 기존 `types/` 디렉토리의 인터페이스 변경 요약

### A-1. UserType 변경

<!-- TODO: 기존 vs 전환 후 필드 비교표 -->

### A-2. PetType / PetFormType 변경

<!-- TODO: wr_* 필드 → 정규 컬럼명 매핑 -->

### A-3. PartnerType / KindergartenType 변경

<!-- TODO: partner → kindergarten 용어 변환 + 필드 매핑 -->

### A-4. PaymentRequestType → ReservationType 변경

<!-- TODO: payment_request → reservation 용어 변환 -->

### A-5. ChatRoomType / MessageType 변경

<!-- TODO: WebSocket 메시지 → Supabase Realtime 메시지 형식 -->

### A-6. SettlementType 변경

<!-- TODO: RPC 응답에 맞춘 구조 변경 -->

### A-7. ReviewType 변경

<!-- TODO: 태그 구조 변경 -->

---

## 부록 B. 환경 변수 / 패키지 체크리스트

### B-1. 환경 변수 (.env)

| 변수 | 기존 | 전환 후 | 비고 |
|------|------|--------|------|
| `EXPO_PUBLIC_API_URL` | `https://woo1020.iwinv.net` | 삭제 | apiClient 삭제 시 |
| `EXPO_PUBLIC_WEBSOCKET_URL` | `wss://wooyoopet.store/ws` | 삭제 | Supabase Realtime 사용 |
| `EXPO_PUBLIC_SUPABASE_URL` | — | 추가 | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | — | 추가 | Supabase anon key |

### B-2. 패키지 변경

| 패키지 | 변경 | 비고 |
|--------|------|------|
| `@supabase/supabase-js` | 추가 | 핵심 의존성 |
| `react-native-url-polyfill` | 추가 | Supabase JS 필수 |
| `react-use-websocket` | 제거 (전환 완료 후) | Supabase Realtime으로 대체 |
| `@tosspayments/widget-sdk-react-native` | 제거 | 미사용 확인 |

### B-3. 전환 완료 후 삭제 파일

| 파일 | 이유 |
|------|------|
| `utils/apiClient.ts` | Supabase JS로 완전 대체 |
| `tossPay/` 디렉토리 | 미사용 |
| `app/payment/tossPay.tsx` | 미사용 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-17 | 초안 — 문서 구조, 규칙, 목차, 섹션 플레이스홀더 확정 |
| 2026-04-17 | 리뷰 반영 — Issue 1~4 (16-8 번호 명시, 9장/10장 API 재배치, 13장 #16 제거, 12장 #5b 명확화) + R1~R3,R5,R6 (쿼리 규칙, 응답 매핑 규칙, 문서 역할 분담, MMKV 어댑터, 코드 블록 렌더링) |
