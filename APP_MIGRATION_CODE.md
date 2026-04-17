# 우유펫 모바일 앱 API 전환 코드 예시

> **작성일**: 2026-04-17
> **최종 업데이트**: 2026-04-17 (초안 — 구조 확정, 코드 작성 예정)
> **대상 독자**: 외주 개발자 (React Native/Expo 앱 코드 수정 담당)
> **관련 문서**: `APP_MIGRATION_GUIDE.md` (전환 가이드 — 규칙/표기법/아키텍처 설명), `MIGRATION_PLAN.md` (설계서)
> **표기 규칙**: `APP_MIGRATION_GUIDE.md §0`의 규칙을 따릅니다

---

## 사용법

1. 각 API의 **Before** 블록은 현재 PHP API 호출 코드입니다 (삭제 대상).
2. **After** 블록은 Supabase 전환 후 코드입니다 (교체 대상).
3. **변환 포인트**에 주의사항과 응답 필드 매핑을 정리했습니다.
4. API 번호(`#N`)는 `MIGRATION_PLAN.md §5`의 번호와 동일합니다.
5. 자세한 설명은 `APP_MIGRATION_GUIDE.md`의 해당 장을 참고하세요.

---

## 목차

| 분류 | API 번호 | 수량 |
|------|---------|------|
| [1. 인증/회원](#1-인증회원) | #1~#6 | 6개 |
| [2. 주소 인증](#2-주소-인증) | #7~#8 | 2개 |
| [3. 반려동물](#3-반려동물) | #9~#16 | 8개 |
| [4. 유치원/보호자](#4-유치원보호자) | #17~#21 | 5개 |
| [5. 채팅](#5-채팅) | #22~#33 | 12개 |
| [6. 결제/돌봄](#6-결제돌봄) | #34~#40 | 7개 |
| [7. 정산](#7-정산) | #41~#43 | 3개 |
| [8. 리뷰](#8-리뷰) | #44~#45 | 3개 |
| [9. 즐겨찾기](#9-즐겨찾기) | #46~#49 | 4개 |
| [10. 알림/FCM](#10-알림fcm) | #50~#52 | 3개 |
| [11. 콘텐츠](#11-콘텐츠) | #53~#57 | 5개 |
| [12. 차단](#12-차단) | #58~#60 | 3개 |
| [13. 기타](#13-기타) | #61~#66 | 6개 |

---

## 1. 인증/회원

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §1 인증 전환`

### API #1. alimtalk.php → Edge Function `send-alimtalk`

**전환 방식**: Edge Function | **난이도**: 중
**관련 파일**: `hooks/useJoin.ts` (추정)
**Supabase 대응**: Edge Function `send-alimtalk`

**Before**:
```typescript
// TODO: 기존 PHP 호출 코드
```

**After**:
```typescript
// TODO: supabase.functions.invoke('send-alimtalk', { body: { phone, template_code, variables } })
```

**변환 포인트**:
<!-- TODO -->

---

### API #2. auth_request.php → Supabase Auth

**전환 방식**: Supabase Auth | **난이도**: 중
**관련 파일**: `hooks/useJoin.ts`, 인증 관련 화면
**Supabase 대응**: `supabase.auth.signInWithOtp()` + `supabase.auth.verifyOtp()`

**Before**:
```typescript
// TODO: 기존 PHP 호출 코드 (auth_request.php)
```

**After**:
```typescript
// TODO: Supabase Auth Phone OTP 흐름
```

**변환 포인트**:
<!-- TODO -->

---

### API #3. set_join.php → Supabase Auth + members UPSERT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `utils/updateJoin.ts`
**Supabase 대응**: `supabase.auth.signUp()` → `members` UPSERT

**Before**:
```typescript
// TODO: 기존 updateJoin() 코드
```

**After**:
```typescript
// TODO: Supabase Auth signUp + members upsert
```

**변환 포인트**:
<!-- TODO -->

---

### API #4. set_member_leave.php → RPC `app_withdraw_member`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `app/user/withdraw/index.tsx` (추정)
**Supabase 대응**: `supabase.rpc('app_withdraw_member', { p_reason })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #5. set_mypage_mode_update.php → members UPDATE

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `app/(tabs)/mypage.tsx`
**Supabase 대응**: `supabase.from('members').update({ current_mode }).eq('id', userId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #6. set_profile_update.php → members UPDATE + Storage

**전환 방식**: 자동 API + Storage | **난이도**: 쉬움
**관련 파일**: `app/user/profile/edit.tsx` (추정)
**Supabase 대응**: Storage 업로드 → `members` UPDATE

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

## 2. 주소 인증

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §9 주소 인증 / 프로필 / 회원 관리`

### API #7. set_address_verification.php → members UPDATE + Storage

**전환 방식**: 자동 API + Storage | **난이도**: 쉬움
**관련 파일**: 주소 인증 화면
**Supabase 대응**: Storage `address-docs` 업로드 → `members` UPDATE (`address_doc_urls`)

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #8. kakao-address.php → 앱 직접 호출

**전환 방식**: 앱 직접 호출 | **난이도**: 쉬움
**관련 파일**: 주소 검색 화면
**Supabase 대응**: 없음 (서버 경유 불필요 — 앱에서 카카오 API 직접 호출)

**Before**:
```typescript
// TODO: apiClient.get('api/kakao-address.php', { keyword })
```

**After**:
```typescript
// TODO: 카카오 주소 JavaScript API 직접 호출 (WebView 또는 REST)
```

**변환 포인트**:
<!-- TODO -->

---

## 3. 반려동물

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §3 반려동물 CRUD`

### API #9. get_my_animal.php → pets SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `hooks/usePetList.ts` → `fetchPets()`
**Supabase 대응**: `supabase.from('pets').select('*').eq('member_id', userId).eq('deleted', false)`

**Before**:
```typescript
// TODO: apiClient.get('api/get_my_animal.php', { mb_id })
```

**After**:
```typescript
// TODO: supabase.from('pets').select()
```

**변환 포인트**:
<!-- TODO: wr_1~wr_11 → 정규 컬럼명 매핑표 -->

---

### API #10. get_animal_by_id.php → pets SELECT + favorite JOIN

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `hooks/usePetList.ts` (추정)
**Supabase 대응**: `supabase.from('pets').select('*, favorite_pets(*)').eq('id', petId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #11. get_animal_by_mb_id.php → pets SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `hooks/usePetList.ts` → `fetchPetsByMbId()`
**Supabase 대응**: `supabase.from('pets').select('*').eq('member_id', targetMemberId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #12. get_animal_kind.php → pet_breeds SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: 반려동물 등록/수정 화면
**Supabase 대응**: `supabase.from('pet_breeds').select('*').ilike('name', '%keyword%')`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #13. set_animal_insert.php → pets INSERT + Storage

**전환 방식**: 자동 API + Storage | **난이도**: 쉬움
**관련 파일**: `components/PetRegisterForm.tsx`
**Supabase 대응**: Storage `pet-images` 업로드 → `pets` INSERT

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO: Storage 업로드 + pets INSERT (4마리 제한 체크)
```

**변환 포인트**:
<!-- TODO -->

---

### API #14. set_animal_update.php → pets UPDATE + Storage

**전환 방식**: 자동 API + Storage | **난이도**: 쉬움
**관련 파일**: `components/PetRegisterForm.tsx`
**Supabase 대응**: Storage 이미지 교체 → `pets` UPDATE

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #15. set_animal_delete.php → pets UPDATE (soft delete)

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `hooks/usePetList.ts` → `deletePet()`
**Supabase 대응**: `supabase.from('pets').update({ deleted: true }).eq('id', petId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #16. set_first_animal_set.php → RPC `app_set_representative_pet`

**전환 방식**: RPC | **난이도**: 쉬움
**관련 파일**: `app/pet/default.tsx` (추정)
**Supabase 대응**: `supabase.rpc('app_set_representative_pet', { p_pet_id })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

## 4. 유치원/보호자

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §11 유치원/보호자 RPC`

### API #17. get_partner.php → RPC `app_get_kindergarten_detail`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `hooks/useKinderGarten.ts` → `fetchKindergarten()`
**Supabase 대응**: `supabase.rpc('app_get_kindergarten_detail', { p_kindergarten_member_id })`

**Before**:
```typescript
// TODO: apiClient.get('api/get_partner.php', { mb_id, user_id })
```

**After**:
```typescript
// TODO: supabase.rpc('app_get_kindergarten_detail', { p_kindergarten_member_id: memberId })
```

**변환 포인트**:
<!-- TODO: 응답 구조 변환 (partner/animals → kindergarten 응답), 필드 매핑 테이블 -->

---

### API #18. get_partner_list.php → RPC `app_get_kindergartens`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `utils/fetchPartnerList.ts`
**Supabase 대응**: `supabase.rpc('app_get_kindergartens')`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #19. get_protector.php → RPC `app_get_guardian_detail`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `hooks/useProtector.ts` → `fetchProtector()`
**Supabase 대응**: `supabase.rpc('app_get_guardian_detail', { p_guardian_member_id })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #20. get_protector_list.php → RPC `app_get_guardians`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `utils/fetchProtectorList.ts`
**Supabase 대응**: `supabase.rpc('app_get_guardians', { p_page, p_per_page })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #21. set_partner_update.php → kindergartens UPDATE + Storage

**전환 방식**: 자동 API + Storage | **난이도**: 중
**관련 파일**: `app/kindergarten/register.tsx`
**Supabase 대응**: Storage `kindergarten-images` 업로드 → `kindergartens` UPDATE + `settlement_infos` UPSERT

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

## 5. 채팅

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §14 채팅 전환`

### API #22. chat.php → create_room → RPC

**전환 방식**: RPC | **난이도**: 상
**관련 파일**: `hooks/useChat.ts`, 채팅 시작 화면
**Supabase 대응**: `supabase.rpc('app_create_chat_room', { p_target_member_id })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #23. chat.php → get_rooms → RPC

**전환 방식**: RPC | **난이도**: 상
**관련 파일**: `hooks/useChatRoom.ts` (추정)
**Supabase 대응**: `supabase.rpc('app_get_chat_rooms')`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #24. chat.php → get_messages → chat_messages SELECT

**전환 방식**: 자동 API | **난이도**: 중
**관련 파일**: `hooks/useChat.ts` → `getMessageHistory()`
**Supabase 대응**: `supabase.from('chat_messages').select('*').eq('room_id', roomId).order('created_at').range(from, to)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #25. chat.php → send_message → Edge Function `send-chat-message`

**전환 방식**: Edge Function | **난이도**: 상
**관련 파일**: `hooks/useChat.ts` → `send()`
**Supabase 대응**: `supabase.functions.invoke('send-chat-message', { body })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #26. chat.php → get_images → chat_messages SELECT (image)

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: 채팅 이미지 갤러리 화면
**Supabase 대응**: `supabase.from('chat_messages').select('image_urls').eq('room_id', roomId).not('image_urls', 'is', null)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #27. chat.php → leave_room → chat_rooms UPDATE

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `hooks/useChat.ts` → `leaveRoom()`
**Supabase 대응**: `supabase.from('chat_rooms').update({ deleted_at: new Date().toISOString() }).eq('id', roomId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #28. chat.php → muted → chat_room_members UPDATE

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `hooks/useChat.ts` → `mutedRoom()`
**Supabase 대응**: `supabase.from('chat_room_members').update({ is_muted }).eq('room_id', roomId).eq('member_id', userId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #29. read_chat.php → chat_room_members UPDATE

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `hooks/useChat.ts` → `readChat()`
**Supabase 대응**: `supabase.from('chat_room_members').update({ last_read_message_id }).eq('room_id', roomId).eq('member_id', userId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #30. get_message_template.php → chat_templates SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: 상용문구 관리 화면
**Supabase 대응**: `supabase.from('chat_templates').select('*').eq('member_id', userId).eq('type', 'custom')`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #31. set_message_template.php → chat_templates INSERT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: 상용문구 등록 화면
**Supabase 대응**: `supabase.from('chat_templates').insert({ member_id, type: 'custom', title, content })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #32. update_message_template.php → chat_templates UPDATE

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: 상용문구 수정 화면
**Supabase 대응**: `supabase.from('chat_templates').update({ title, content }).eq('id', templateId).eq('member_id', userId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #33. delete_message_template.php → chat_templates DELETE

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: 상용문구 삭제
**Supabase 대응**: `supabase.from('chat_templates').delete().eq('id', templateId).eq('member_id', userId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

## 6. 결제/돌봄

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §15 결제/예약 전환`

### API #34. inicis_payment.php → Edge Function `inicis-callback`

**전환 방식**: Edge Function | **난이도**: 상
**관련 파일**: `app/payment/inicisPayment.tsx`
**Supabase 대응**: Edge Function `inicis-callback` (PG사 직접 호출 — 앱에서는 WebView 콜백 URL만 변경)

**Before**:
```typescript
// TODO: WebView 콜백 URL 변경 (PHP → Edge Function)
```

**After**:
```typescript
// TODO: 콜백 URL을 Supabase Edge Function 엔드포인트로 교체
```

**변환 포인트**:
<!-- TODO -->

---

### API #35. set_inicis_approval.php → Edge Function (inicis-callback 내부)

**전환 방식**: Edge Function | **난이도**: 중
**관련 파일**: `app/payment/inicisApproval.tsx`
**Supabase 대응**: `inicis-callback` Edge Function 내부에서 처리 (별도 앱 호출 불필요)

**Before**:
```typescript
// TODO: apiClient.post('/api/set_inicis_approval.php', inicisPayload)
```

**After**:
```typescript
// TODO: Edge Function이 자동 처리 → 앱에서는 WebView 결과만 수신
```

**변환 포인트**:
<!-- TODO -->

---

### API #36. set_payment_request.php → Edge Function `create-reservation`

**전환 방식**: Edge Function | **난이도**: 상
**관련 파일**: `app/payment/inicisApproval.tsx`, `app/payment/request.tsx`
**Supabase 대응**: `supabase.functions.invoke('create-reservation', { body })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #37. get_payment_request.php → RPC `app_get_reservations` / `app_get_reservations_kindergarten`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `hooks/usePaymentRequestList.ts`
**Supabase 대응**: `supabase.rpc('app_get_reservations', { p_page, p_per_page })` (보호자) / `supabase.rpc('app_get_reservations_kindergarten', { ... })` (유치원)

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO: 보호자/유치원 분기 → 각각 다른 RPC 호출
```

**변환 포인트**:
<!-- TODO -->

---

### API #38. get_payment_request_by_id.php → RPC `app_get_reservation_detail`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `hooks/usePaymentRequest.ts`
**Supabase 대응**: `supabase.rpc('app_get_reservation_detail', { p_reservation_id })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #39. set_care_complete.php → Edge Function `complete-care`

**전환 방식**: Edge Function | **난이도**: 상
**관련 파일**: 돌봄 완료 화면
**Supabase 대응**: `supabase.functions.invoke('complete-care', { body: { reservation_id } })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #40. set_care_review.php → guardian_reviews / kindergarten_reviews INSERT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: 후기 작성 화면
**Supabase 대응**: `supabase.from('guardian_reviews').insert(...)` 또는 `supabase.from('kindergarten_reviews').insert(...)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

## 7. 정산

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §13 리뷰/정산/교육 RPC`

### API #41. get_settlement.php → RPC `app_get_settlement_summary`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `hooks/useSettlement.ts` (추정), `hooks/useSettlementInfo.ts`
**Supabase 대응**: `supabase.rpc('app_get_settlement_summary', { p_period_start, p_period_end, p_page, p_per_page })`

**Before**:
```typescript
// TODO: 2개 PHP (get_settlement + get_settlement_list) 호출
```

**After**:
```typescript
// TODO: 단일 RPC로 summary + period_summary + details 통합 조회
```

**변환 포인트**:
<!-- TODO -->

---

### API #42. get_settlement_info.php → settlement_infos SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `hooks/useSettlementInfo.ts`
**Supabase 대응**: `supabase.from('settlement_infos').select('*').eq('kindergarten_id', kindergartenId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #43. set_settlement_info.php → settlement_infos UPSERT

**전환 방식**: 자동 API | **난이도**: 중
**관련 파일**: `hooks/useSettlementInfo.ts`
**Supabase 대응**: `supabase.from('settlement_infos').upsert({ ... })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO: 주민번호 뒷자리 암호화 처리 (Edge Function 필요 여부) -->

---

## 8. 리뷰

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §13 리뷰/정산/교육 RPC`

### API #44. get_review.php (type=pet) → RPC `app_get_guardian_reviews`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `hooks/useReviewList.ts`
**Supabase 대응**: `supabase.rpc('app_get_guardian_reviews', { p_pet_id, p_page, p_per_page })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO: 태그 집계 구조 변경 -->

---

### API #44b. get_review.php (type=partner) → RPC `app_get_kindergarten_reviews`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `hooks/useReviewList.ts`
**Supabase 대응**: `supabase.rpc('app_get_kindergarten_reviews', { p_kindergarten_id, p_page, p_per_page })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO: is_guardian_only 필터 설명 -->

---

### API #45. set_review.php → guardian_reviews / kindergarten_reviews INSERT + Storage

**전환 방식**: 자동 API + Storage | **난이도**: 쉬움
**관련 파일**: 후기 작성 화면
**Supabase 대응**: Storage `review-images` 업로드 → reviews INSERT

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

## 9. 즐겨찾기

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §4 즐겨찾기 CRUD`

### API #46. set_partner_favorite_add.php → favorite_kindergartens UPSERT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `utils/handleFavorite.ts` → `addPartnerFavorite()`
**Supabase 대응**: `supabase.from('favorite_kindergartens').upsert({ member_id, kindergarten_id, is_favorite: true })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #47. set_partner_favorite_remove.php → favorite_kindergartens UPDATE (is_favorite=false)

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `utils/handleFavorite.ts` → `removePartnerFavorite()`
**Supabase 대응**: `supabase.from('favorite_kindergartens').update({ is_favorite: false }).eq('member_id', userId).eq('kindergarten_id', kgId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #48. set_user_favorite_add.php → favorite_pets UPSERT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `utils/handleFavorite.ts` → `addUserFavorite()`
**Supabase 대응**: `supabase.from('favorite_pets').upsert({ member_id, pet_id, is_favorite: true })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #49. set_user_favorite_remove.php → favorite_pets UPDATE (is_favorite=false)

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `utils/handleFavorite.ts` → `removeUserFavorite()`
**Supabase 대응**: `supabase.from('favorite_pets').update({ is_favorite: false }).eq('member_id', userId).eq('pet_id', petId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

## 10. 알림/FCM

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §5 알림/FCM`

### API #50. fcm_token.php → fcm_tokens UPSERT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `hooks/useFcmToken.ts` → `getFcmToken()`
**Supabase 대응**: `supabase.from('fcm_tokens').upsert({ member_id, token, platform, device_id })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #51. get_notification.php → notifications SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `hooks/useNotification.ts` (추정)
**Supabase 대응**: `supabase.from('notifications').select('*').eq('member_id', userId).order('created_at', { ascending: false })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #52. delete_notification.php → notifications DELETE

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: 알림 화면
**Supabase 대응**: `supabase.from('notifications').delete().eq('id', notificationId)` 또는 `.eq('member_id', userId)` (전체 삭제)

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

## 11. 콘텐츠

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §6 콘텐츠 조회`

### API #53. get_banner.php → banners SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**Supabase 대응**: `supabase.from('banners').select('*').eq('visible', true).order('sort_order')`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #54. get_notice.php → notices SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**Supabase 대응**: `supabase.from('notices').select('*').eq('visible', true).order('created_at', { ascending: false })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #55. get_notice_detail.php → notices SELECT (단건)

**전환 방식**: 자동 API | **난이도**: 쉬움
**Supabase 대응**: `supabase.from('notices').select('*').eq('id', noticeId).single()`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #56. get_faq.php → faqs SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**Supabase 대응**: `supabase.from('faqs').select('*').order('display_order')`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #57. get_policy.php → terms SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**Supabase 대응**: `supabase.from('terms').select('*').eq('category', category)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

## 12. 차단

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §7 차단/신고`

### API #58. set_block_user.php → member_blocks INSERT/DELETE (토글)

**전환 방식**: 자동 API | **난이도**: 쉬움
**Supabase 대응**: 차단 토글 (INSERT or DELETE)

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #59. get_block_user.php → member_blocks SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**Supabase 대응**: `supabase.from('member_blocks').select('*').eq('blocker_id', userId).eq('blocked_id', targetId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #60. get_blocked_list.php → member_blocks SELECT + members JOIN

**전환 방식**: 자동 API | **난이도**: 쉬움
**Supabase 대응**: `supabase.from('member_blocks').select('*, blocked:members!blocked_id(*)').eq('blocker_id', userId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

## 13. 기타

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §10 기타 자동 API`, `§13 리뷰/정산/교육 RPC`

### API #61. get_education.php → RPC `app_get_education_with_progress`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `app/kindergarten/tutorial/index.tsx`
**Supabase 대응**: `supabase.rpc('app_get_education_with_progress', { p_category })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #62. set_solved.php → education_completions INSERT

**전환 방식**: 자동 API | **난이도**: 쉬움
**Supabase 대응**: `supabase.from('education_completions').insert({ member_id, topic_id })`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #63. get_bank_list.php → banks SELECT

**전환 방식**: 자동 API | **난이도**: 쉬움
**Supabase 대응**: `supabase.from('banks').select('*').eq('is_active', true).order('sort_order')`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #64. get_favorite_animal_list.php → favorite_pets SELECT + pets JOIN

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: 유치원 모드 — 찜한 반려동물 목록
**Supabase 대응**: `supabase.from('favorite_pets').select('*, pet:pets(*)').eq('member_id', userId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #65. get_favorite_partner_list.php → favorite_kindergartens SELECT + kindergartens JOIN

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: 보호자 모드 — 찜한 유치원 목록
**Supabase 대응**: `supabase.from('favorite_kindergartens').select('*, kindergarten:kindergartens(*)').eq('member_id', userId)`

**Before**:
```typescript
// TODO
```

**After**:
```typescript
// TODO
```

**변환 포인트**:
<!-- TODO -->

---

### API #66. scheduler.php → Edge Function `scheduler`

**전환 방식**: Edge Function | **난이도**: 상
**Supabase 대응**: Edge Function `scheduler` (pg_cron 또는 외부 cron 트리거 — 앱에서 직접 호출하지 않음)

**Before**:
```
PHP cron job → scheduler.php
```

**After**:
```
pg_cron 또는 외부 cron → supabase.functions.invoke('scheduler')
```

**변환 포인트**:
<!-- TODO: 앱 코드 변경 없음 — 서버 설정만 필요 -->

---

## 부록: Storage 업로드 공통 패턴

> 여러 API에서 반복적으로 사용하는 Storage 업로드 패턴입니다.

```typescript
// TODO: 공통 Storage 업로드 헬퍼 함수
// uploadImage(bucket, path, file) → publicUrl
```

### 버킷 목록

| 버킷 | 용도 | 사용 API |
|------|------|---------|
| `profile-images` | 프로필 이미지 | #6 |
| `pet-images` | 반려동물 이미지 | #13, #14 |
| `kindergarten-images` | 유치원 이미지 | #21 |
| `chat-files` | 채팅 파일/이미지 | #25 |
| `review-images` | 후기 이미지 | #45 |
| `address-docs` | 주소 인증 서류 | #7 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-17 | 초안 — 66개 API 전체 플레이스홀더 확정, 번호 체계 `MIGRATION_PLAN.md §5`와 동기화 |
| 2026-04-17 | 리뷰 반영 — R4: 즐겨찾기 #46~#49 전환방식 수정 (DELETE→UPDATE is_favorite=false, INSERT→UPSERT is_favorite=true) |
