# 우유펫 모바일 앱 API 전환 코드 예시

> **작성일**: 2026-04-17
> **최종 업데이트**: 2026-04-17 (R1 리뷰 반영 — Issue 2~8 일괄 수정)
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
>
> **#4~#6 선행 작성 사유**: 본 섹션의 #1~#3은 인증 전환 API이고, #4~#6은 GUIDE 기준으로는 §9(주소 인증/프로필/회원 관리)에 속합니다. 그러나 #4(회원 탈퇴)는 `supabase.auth.signOut()`과 밀접하고, #5(모드 전환)와 #6(프로필 수정)은 인증 완료 직후 호출되는 `members` 테이블 CRUD로서, **인증 흐름을 이해한 상태에서 바로 적용할 수 있는 자동 API 패턴 예시**입니다. Phase A에서 인증과 함께 전환하는 것을 권장하므로, R1에서 선행 작성합니다.

### API #1. alimtalk.php → Edge Function `send-alimtalk`

**전환 방식**: Edge Function (Supabase Auth 내부 훅) | **난이도**: 중
**관련 파일**: `hooks/useJoin.ts`, `app/authentication/authNumber.tsx`
**Supabase 대응**: `supabase.auth.signInWithOtp()` 내부에서 자동 호출 (앱 코드에서 직접 호출 없음)

**Before**:
```typescript
// 파일: hooks/useJoin.ts 또는 app/authentication/authNumber.tsx
// 인증번호 발송 (카카오 알림톡)
const sendAuthCode = async (phone: string) => {
  try {
    const authCode = Math.floor(100000 + Math.random() * 900000).toString()
    const response = await apiClient.get('api/alimtalk.php', {
      phone: phone,        // 수신 폰번호 (01012345678)
      auth_code: authCode, // 6자리 인증번호
    })
    if (response.result === 'Y') {
      // 인증번호 발송 성공 → 타이머 시작
      setAuthCode(authCode)  // 로컬에 저장 (확인용)
      startTimer()
    } else {
      Alert.alert('오류', '인증번호 발송에 실패했습니다')
    }
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
  }
}
```

**After**:
```typescript
// 파일: hooks/useAuth.ts (신규) 또는 hooks/useJoin.ts (수정)
import { supabase } from '@/lib/supabase'

// 인증번호 발송 (Supabase Auth Phone OTP)
// → Supabase Auth가 send-alimtalk Edge Function을 내부적으로 호출
// → 앱에서 alimtalk.php를 직접 호출하지 않음
const sendOtp = async (phone: string) => {
  try {
    // 국제번호 형식 변환: '01012345678' → '+821012345678'
    const formattedPhone = phone.startsWith('+82')
      ? phone
      : `+82${phone.replace(/^0/, '')}`

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    })

    if (error) {
      Alert.alert('오류', error.message)
      return
    }
    // OTP 발송 성공 → 타이머 시작
    startTimer()
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
  }
}
```

**변환 포인트**:
- **앱 코드에서 `alimtalk.php` 호출 완전 삭제** → `signInWithOtp` 한 줄로 대체
- 기존: 인증번호를 앱에서 생성하여 PHP로 전달 → 전환 후: Supabase Auth가 내부적으로 생성·발송
- 기존: 인증번호를 로컬 변수에 저장 (`setAuthCode`) → 전환 후: 저장 불필요 (Supabase가 서버에서 관리)
- 전화번호 포맷: `01012345678` → `+821012345678` 변환 필요
- `send-alimtalk` Edge Function은 Supabase Auth SMS 훅으로 동작 → 앱 개발자는 구현 불필요

**응답 매핑**:

| PHP 응답 필드 | Supabase 응답 필드 | 변환 필요 |
|---|---|---|
| `result` (`'Y'`/`'N'`) | `error` (`null`이면 성공) | 예 — `result === 'Y'` → `error === null` |
| `message` (에러 메시지) | `error.message` | 아니오 |
| `auth_code` (로컬 저장) | — (서버에서 관리, 앱에서 저장 불필요) | 예 — 삭제 |

---

### API #2. auth_request.php → Supabase Auth

**전환 방식**: Supabase Auth | **난이도**: 중
**관련 파일**: `hooks/useJoin.ts`, `app/authentication/authNumber.tsx`
**Supabase 대응**: `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`

**Before**:
```typescript
// 파일: hooks/useJoin.ts 또는 app/authentication/authNumber.tsx
// 인증번호 확인
const verifyAuthCode = async (phone: string, inputCode: string) => {
  try {
    const response = await apiClient.get('api/auth_request.php', {
      mb_id: phone,        // 폰번호 (= mb_id)
      auth_no: inputCode,  // 사용자가 입력한 인증번호
    })
    if (response.result === 'Y') {
      // 인증 성공 → 다음 단계(회원가입 또는 로그인)로 이동
      return true
    } else {
      Alert.alert('오류', '인증번호가 일치하지 않습니다')
      return false
    }
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
    return false
  }
}
```

**After**:
```typescript
// 파일: hooks/useAuth.ts (신규) 또는 hooks/useJoin.ts (수정)
import { supabase } from '@/lib/supabase'

// OTP 인증번호 확인 → 성공 시 즉시 JWT 세션 발급
const verifyOtp = async (phone: string, otpCode: string) => {
  try {
    const formattedPhone = phone.startsWith('+82')
      ? phone
      : `+82${phone.replace(/^0/, '')}`

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otpCode,     // 사용자가 입력한 6자리 OTP
      type: 'sms',
    })

    if (error) {
      Alert.alert('오류', '인증번호가 일치하지 않습니다')
      return null
    }

    // ✅ 인증 성공 → data.session에 JWT가 포함됨
    // onAuthStateChange 리스너가 자동으로 userAtom 업데이트
    return data.session  // { access_token, refresh_token, user }
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
    return null
  }
}
```

**변환 포인트**:
- 기존: 인증 확인 후 `{"result":"Y"}` → 앱에서 별도로 `set_join.php` 호출해야 로그인 완료
- 전환 후: `verifyOtp` 성공 → **즉시 JWT 세션 발급** → `onAuthStateChange`가 자동으로 상태 업데이트
- `mb_id` 파라미터 → `phone` 파라미터 (국제번호 형식)
- `auth_no` → `token` (파라미터 이름 변경)
- 반환값: `boolean` → `Session | null` (JWT 세션 객체)

**응답 매핑**:

| PHP 응답 필드 | Supabase 응답 필드 | 변환 필요 |
|---|---|---|
| `result` (`'Y'`/`'N'`) | `error` (`null`이면 성공) | 예 — `result === 'Y'` → `error === null` |
| `message` | `error.message` | 아니오 |
| — | `data.session` (JWT 세션) | 예 — 신규 필드. access_token, refresh_token 포함 |
| — | `data.session.user.id` (UUID) | 예 — 기존 `mb_id`(폰번호)를 대체하는 사용자 식별자 |
| — | `data.session.user.phone` (폰번호) | 예 — 기존 `mb_id`와 동일한 값 (국제번호 형식) |

---

### API #3. set_join.php → Supabase Auth + members UPSERT

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `utils/updateJoin.ts`, `hooks/useJoin.ts`, `app/authentication/selectMode.tsx`
**Supabase 대응**: `supabase.from('members').upsert({ ... })`

**Before**:
```typescript
// 파일: utils/updateJoin.ts
// 회원가입 또는 주소 업데이트 (FormData POST)
const updateJoin = async (params: {
  mb_id: string        // 폰번호 (필수)
  mb_name?: string     // 이름
  mb_nick?: string     // 닉네임
  mb_2?: string        // 주민번호 앞 6자리 → 생년월일
  mb_sex?: string      // 성별 ('남' | '여')
  mb_5?: string        // 모드 ('1'=보호자, '2'=유치원)
  mb_1?: string        // 통신사 코드
  mb_4?: string        // 아파트/단지명
  mb_addr1?: string    // 도로명주소
  dong?: string        // 동
  ho?: string          // 호
}) => {
  try {
    const formData = new FormData()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) formData.append(key, value)
    })

    const response = await apiClient.post('api/set_join.php', formData)
    if (response.result === 'Y') {
      // 가입/업데이트 성공 → userAtom 업데이트
      return response.data  // 회원 정보
    } else {
      Alert.alert('오류', response.message ?? '회원정보 저장 실패')
      return null
    }
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
    return null
  }
}
```

**After**:
```typescript
// 파일: utils/updateJoin.ts (수정)
import { supabase } from '@/lib/supabase'

// ── 변환 유틸리티 ──────────────────────────────────────────

/**
 * 주민번호 앞 6자리(mb_2)를 'YYYY-MM-DD' 형식의 date 문자열로 변환
 * DB 컬럼: members.birth_date (date 타입)
 *
 * @example convertBirthDate('960315')  → '1996-03-15'
 * @example convertBirthDate('040101')  → '2004-01-01'
 * @example convertBirthDate('1996-03-15') → '1996-03-15' (이미 변환된 경우 그대로)
 */
const convertBirthDate = (raw: string): string => {
  // 이미 'YYYY-MM-DD' 형식이면 그대로 반환
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  // 6자리 → YYMMDD 파싱
  const yy = parseInt(raw.slice(0, 2), 10)
  const mm = raw.slice(2, 4)
  const dd = raw.slice(4, 6)
  // 00~30 → 2000년대, 31~99 → 1900년대 (한국 주민번호 관례)
  const yyyy = yy <= 30 ? 2000 + yy : 1900 + yy
  return `${yyyy}-${mm}-${dd}`
}

/**
 * 기존 성별 값을 Supabase members.gender CHECK 제약에 맞는 값으로 변환
 * DB CHECK 제약: gender IN ('남성', '여성')
 *
 * @example convertGender('남')  → '남성'
 * @example convertGender('여')  → '여성'
 * @example convertGender('남성') → '남성' (이미 변환된 경우 그대로)
 */
const convertGender = (raw: string): string => {
  const map: Record<string, string> = { '남': '남성', '여': '여성' }
  return map[raw] ?? raw  // 매핑에 없으면 원본 반환
}

// ── 회원 프로필 UPSERT ─────────────────────────────────────

// ※ verifyOtp 성공 후 auth.users에 사용자가 이미 생성된 상태에서 호출
const updateMemberProfile = async (params: {
  name?: string
  nickname?: string
  birth_date?: string        // 'YYYY-MM-DD' 형식 (기존 mb_2에서 convertBirthDate로 변환)
  gender?: string            // '남성' | '여성' (기존 '남'/'여'에서 convertGender로 변환)
  current_mode?: string      // '보호자' | '유치원' (기존 '1'/'2'에서 변환)
  carrier?: string           // 통신사 코드
  address_complex?: string   // 아파트/단지명
  address_road?: string      // 도로명주소
  address_building_dong?: string  // 동
  address_building_ho?: string    // 호
}) => {
  try {
    // 현재 로그인된 사용자의 UUID 획득
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다')
      return null
    }

    // 기존 값을 Supabase 스키마에 맞게 변환
    const converted = { ...params }
    if (converted.birth_date) {
      converted.birth_date = convertBirthDate(converted.birth_date)
    }
    if (converted.gender) {
      converted.gender = convertGender(converted.gender)
    }

    const { data, error } = await supabase
      .from('members')
      .upsert({
        id: user.id,            // auth.uid() — PK 기준 UPSERT
        phone: user.phone ?? '',
        ...converted,
      })
      .select()
      .single()

    if (error) {
      Alert.alert('오류', error.message)
      return null
    }
    return data  // 저장된 회원 정보
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
    return null
  }
}
```

**변환 포인트**:
- `FormData` POST → `supabase.from('members').upsert()` (JSON)
- `mb_id` 파라미터 제거 → `user.id` (auth.uid()) 사용
- 컬럼명 전면 변경 (§0-1 용어 매핑표 참조):
  - `mb_name` → `name`, `mb_nick` → `nickname`
  - `mb_2` → `birth_date`: **`convertBirthDate()` 유틸리티 사용**. 주민번호 앞 6자리(`'960101'`)를 date 타입(`'1996-01-01'`)으로 변환. YY≤30 → 2000년대, YY≥31 → 1900년대 기준
  - `mb_sex` → `gender`: **`convertGender()` 유틸리티 사용**. `'남'`→`'남성'`, `'여'`→`'여성'`. DB에 `CHECK (gender IN ('남성', '여성'))` 제약이 있으므로 반드시 변환 필요
  - `mb_5` → `current_mode` (값 변환: `'1'` → `'보호자'`, `'2'` → `'유치원'`)
  - `mb_4` → `address_complex`, `mb_addr1` → `address_road`
  - `dong` → `address_building_dong`, `ho` → `address_building_ho`
- `.upsert()` + `.select().single()`: 결과를 단일 객체로 반환
- verifyOtp 성공 후 호출하는 순서 유지 (기존: alimtalk → auth_request → set_join → 전환 후: signInWithOtp → verifyOtp → members upsert)
- **주의**: `convertBirthDate`와 `convertGender`는 별도 유틸 파일(`utils/convertMemberFields.ts`)로 분리하거나, `updateJoin.ts` 내 로컬 함수로 둘 수 있음. 다른 화면에서도 재사용한다면 별도 파일 권장

**응답 매핑**:

| PHP 응답 필드 | Supabase 응답 필드 | 변환 필요 |
|---|---|---|
| `result` (`'Y'`/`'N'`) | `error` (`null`이면 성공) | 예 |
| `data.mb_id` | `data.phone` | 예 — 키 이름 변경 |
| `data.mb_no` | `data.id` (UUID) | 예 — 정수 → UUID |
| `data.mb_name` | `data.name` | 예 — 키 이름 변경 |
| `data.mb_nick` | `data.nickname` | 예 — 키 이름 변경 |
| `data.mb_2` | `data.birth_date` | 예 — `'960101'` → `'1996-01-01'` |
| `data.mb_sex` | `data.gender` | 예 — `'남'` → `'남성'` |
| `data.mb_5` | `data.current_mode` | 예 — `'1'` → `'보호자'` |
| `data.mb_1` | `data.carrier` | 예 — 키 이름 변경 |
| `data.mb_4` | `data.address_complex` | 예 — 키 이름 변경 |
| `data.mb_addr1` | `data.address_road` | 예 — 키 이름 변경 |
| `data.dong` | `data.address_building_dong` | 예 — 키 이름 변경 |
| `data.ho` | `data.address_building_ho` | 예 — 키 이름 변경 |
| `data.mb_profile1` | `data.profile_image` | 예 — 파일명 → Storage URL |
| — | `data.nickname_tag` | 예 — 신규 필드 (`'#1001'` 형식) |
| — | `data.created_at` | 예 — 신규 필드 |

---

### API #4. set_member_leave.php → RPC `app_withdraw_member`

**전환 방식**: RPC | **난이도**: 중
**관련 파일**: `app/user/withdraw/index.tsx`
**Supabase 대응**: `supabase.rpc('app_withdraw_member', { p_reason })`
**Supabase 테이블**: `members`, `pets`, `kindergartens`

**Before**:
```typescript
// 파일: app/user/withdraw/index.tsx
// 회원 탈퇴
const withdrawMember = async (reason: string) => {
  try {
    const formData = new FormData()
    formData.append('mb_id', user.mb_id)    // 폰번호
    formData.append('reason', reason)        // 탈퇴 사유

    const response = await apiClient.post('api/set_member_leave.php', formData)
    if (response.result === 'Y') {
      // 탈퇴 성공 → 로그아웃 처리
      resetUserAtom()
      router.replace('/authentication/login')
    } else {
      Alert.alert('오류', response.message ?? '탈퇴 처리 실패')
    }
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
  }
}
```

**After**:
```typescript
// 파일: app/user/withdraw/index.tsx (수정)
import { supabase } from '@/lib/supabase'

// 회원 탈퇴 (RPC: soft delete + Auth 삭제)
const withdrawMember = async (reason: string) => {
  try {
    // RPC: members.status→'탈퇴', pets.deleted=true,
    //       kindergartens.registration_status='withdrawn'
    const { error: rpcError } = await supabase.rpc('app_withdraw_member', {
      p_reason: reason,
    })

    if (rpcError) {
      Alert.alert('오류', rpcError.message)
      return
    }

    // Supabase Auth 로그아웃 (세션 삭제)
    await supabase.auth.signOut()

    // userAtom 초기화 → 로그인 화면으로 이동
    resetUserAtom()
    router.replace('/authentication/login')
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
  }
}
```

**변환 포인트**:
- FormData POST → `supabase.rpc()` (JSON)
- `mb_id` 파라미터 제거 → RPC 내부에서 `auth.uid()` 자동 사용
- `reason` → `p_reason` (RPC 파라미터 네이밍 규칙: `p_` 접두사)
- RPC가 수행하는 작업: `members.status='탈퇴'`, `members.withdrawn_at=NOW()`, `members.withdraw_reason=p_reason`, `pets.deleted=true`, `kindergartens.registration_status='withdrawn'`
- RPC 호출 후 반드시 `supabase.auth.signOut()` 호출하여 로컬 세션 정리
- Auth 사용자 삭제는 관리자 Edge Function에서 후속 처리 (앱에서 직접 삭제 불가)

**응답 매핑**:

| PHP 응답 필드 | Supabase 응답 필드 | 변환 필요 |
|---|---|---|
| `result` (`'Y'`/`'N'`) | `error` (`null`이면 성공) | 예 |
| `message` | `error.message` | 아니오 |

---

### API #5. set_mypage_mode_update.php → members UPDATE

**전환 방식**: 자동 API | **난이도**: 쉬움
**관련 파일**: `app/(tabs)/mypage.tsx`
**Supabase 대응**: `supabase.from('members').update({ current_mode }).eq('id', userId)`
**Supabase 테이블**: `members`

**Before**:
```typescript
// 파일: app/(tabs)/mypage.tsx
// 보호자 ↔ 유치원 모드 전환
const toggleMode = async (newMode: '1' | '2') => {
  try {
    const formData = new FormData()
    formData.append('mb_id', user.mb_id)
    formData.append('mb_5', newMode)  // '1'=보호자, '2'=유치원

    const response = await apiClient.post('api/set_mypage_mode_update.php', formData)
    if (response.result === 'Y') {
      // 모드 변경 성공 → userAtom 업데이트
      setUser(prev => ({ ...prev, mb_5: newMode }))
    } else {
      Alert.alert('오류', response.message ?? '모드 변경 실패')
    }
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
  }
}
```

**After**:
```typescript
// 파일: app/(tabs)/mypage.tsx (수정)
import { supabase } from '@/lib/supabase'

// 보호자 ↔ 유치원 모드 전환
const toggleMode = async (newMode: '보호자' | '유치원') => {
  try {
    const { data, error } = await supabase
      .from('members')
      .update({ current_mode: newMode })
      .eq('id', user.id)
      .select('current_mode')
      .single()

    if (error) {
      Alert.alert('오류', error.message)
      return
    }
    // 모드 변경 성공 → userAtom 업데이트
    setUser(prev => prev ? { ...prev, current_mode: data.current_mode } : prev)
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
  }
}
```

**변환 포인트**:
- `mb_id` 파라미터 제거 → `.eq('id', user.id)` (UUID)
- `mb_5` → `current_mode`: 값도 변경 (`'1'` → `'보호자'`, `'2'` → `'유치원'`)
- FormData → `.update()` 메서드
- `.select().single()`: UPDATE 후 변경된 값 확인

**응답 매핑**:

| PHP 응답 필드 | Supabase 응답 필드 | 변환 필요 |
|---|---|---|
| `result` (`'Y'`/`'N'`) | `error` (`null`이면 성공) | 예 |
| — | `data.current_mode` | 예 — 신규. UPDATE 후 변경된 값 반환 |

---

### API #6. set_profile_update.php → members UPDATE + Storage

**전환 방식**: 자동 API + Storage | **난이도**: 쉬움
**관련 파일**: `app/protector/[id]/updateProfile.tsx` (보호자 프로필 수정)
**Supabase 대응**: Storage `profile-images` 업로드 → `members` UPDATE
**Supabase 테이블**: `members`

**Before**:
```typescript
// 파일: app/protector/[id]/updateProfile.tsx (추정)
// 프로필 수정 (닉네임 + 이미지)
const updateProfile = async (nickname: string, imageFile?: any) => {
  try {
    const formData = new FormData()
    formData.append('mb_id', user.mb_id)
    formData.append('mb_nick', nickname)

    if (imageFile) {
      formData.append('mb_profile1', {
        uri: imageFile.uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any)
    }

    const response = await apiClient.post('api/set_profile_update.php', formData)
    if (response.result === 'Y') {
      // 프로필 업데이트 성공 → userAtom 업데이트
      setUser(prev => ({
        ...prev,
        mb_nick: nickname,
        mb_profile1: response.data?.mb_profile1 ?? prev.mb_profile1,
      }))
    } else {
      Alert.alert('오류', response.message ?? '프로필 수정 실패')
    }
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
  }
}
```

**After**:
```typescript
// 파일: app/protector/[id]/updateProfile.tsx (수정) 또는 해당 프로필 수정 화면
import { supabase } from '@/lib/supabase'

// 프로필 수정 (닉네임 + 이미지)
const updateProfile = async (nickname: string, imageFile?: { uri: string }) => {
  try {
    let profileImageUrl: string | undefined

    // Step 1: 이미지 업로드 (변경된 경우만)
    if (imageFile) {
      const fileExt = 'jpg'
      const filePath = `${user.id}/profile.${fileExt}`

      // 파일을 fetch → blob 변환 (React Native에서 Storage 업로드 방식)
      const response = await fetch(imageFile.uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,  // 기존 이미지 덮어쓰기
        })

      if (uploadError) {
        Alert.alert('오류', '이미지 업로드 실패: ' + uploadError.message)
        return
      }

      // 공개 URL 획득
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

      profileImageUrl = publicUrl
    }

    // Step 2: members 테이블 업데이트
    const updateData: Record<string, any> = { nickname }
    if (profileImageUrl) {
      updateData.profile_image = profileImageUrl
    }

    const { data, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', user.id)
      .select('nickname, profile_image')
      .single()

    if (error) {
      Alert.alert('오류', error.message)
      return
    }

    // 프로필 업데이트 성공 → userAtom 업데이트
    setUser(prev => prev ? {
      ...prev,
      nickname: data.nickname,
      profile_image: data.profile_image ?? prev.profile_image,
    } : prev)
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
  }
}
```

**변환 포인트**:
- FormData 이미지 → Storage `profile-images` 버킷 업로드 후 공개 URL 저장
- `mb_id` 제거 → `.eq('id', user.id)`
- `mb_nick` → `nickname`, `mb_profile1` (파일명) → `profile_image` (전체 URL)
- 이미지 업로드와 DB 업데이트가 2단계로 분리됨 (기존 PHP는 1회 요청으로 처리)
- Storage 경로: `profile-images/{user.id}/profile.jpg` (사용자별 고정 경로, upsert로 덮어쓰기)
- `fetch()` → `blob()` 변환: React Native에서 Supabase Storage 업로드 시 필요

**응답 매핑**:

| PHP 응답 필드 | Supabase 응답 필드 | 변환 필요 |
|---|---|---|
| `result` (`'Y'`/`'N'`) | `error` (`null`이면 성공) | 예 |
| `data.mb_nick` | `data.nickname` | 예 — 키 이름 변경 |
| `data.mb_profile1` (파일명) | `data.profile_image` (Storage URL) | 예 — 파일명 → 전체 URL |

---

## 2. 주소 인증

> **가이드 참조**: `APP_MIGRATION_GUIDE.md §9 주소 인증 / 프로필 / 회원 관리`

### API #7. set_address_verification.php → members UPDATE + Storage

**전환 방식**: 자동 API + Storage | **난이도**: 쉬움
**관련 파일**: `app/authentication/addressVerify.tsx`
**Supabase 대응**: Storage `address-docs` 업로드 → `members` UPDATE (`address_doc_urls`)
**Supabase 테이블**: `members`

**Before**:
```typescript
// 파일: app/authentication/addressVerify.tsx
// 위치 인증 서류 업로드
const submitAddressVerification = async (
  images: { uri: string }[],  // 인증 서류 이미지 (1~3장)
  addressInfo: {
    mb_addr1: string    // 도로명주소
    mb_4: string        // 단지명
    dong: string        // 동
    ho: string          // 호
  }
) => {
  try {
    const formData = new FormData()
    formData.append('mb_id', user.mb_id)
    formData.append('mb_addr1', addressInfo.mb_addr1)
    formData.append('mb_4', addressInfo.mb_4)
    formData.append('dong', addressInfo.dong)
    formData.append('ho', addressInfo.ho)

    // 이미지 파일 추가
    images.forEach((img, index) => {
      formData.append(`file${index + 1}`, {
        uri: img.uri,
        type: 'image/jpeg',
        name: `address_doc_${index + 1}.jpg`,
      } as any)
    })

    const response = await apiClient.post('api/set_address_verification.php', formData)
    if (response.result === 'Y') {
      Alert.alert('완료', '위치 인증이 요청되었습니다')
    } else {
      Alert.alert('오류', response.message ?? '위치 인증 요청 실패')
    }
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
  }
}
```

**After**:
```typescript
// 파일: app/authentication/addressVerify.tsx (수정)
import { supabase } from '@/lib/supabase'

// 위치 인증 서류 업로드
const submitAddressVerification = async (
  images: { uri: string }[],
  addressInfo: {
    address_road: string
    address_complex: string
    address_building_dong: string
    address_building_ho: string
  }
) => {
  try {
    // Step 1: 인증 서류 이미지 업로드 (Storage)
    const uploadedUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const filePath = `${user.id}/address_doc_${Date.now()}_${i}.jpg`
      const response = await fetch(images[i].uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('address-docs')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,  // 고유 파일명 사용
        })

      if (uploadError) {
        Alert.alert('오류', `이미지 ${i + 1} 업로드 실패: ${uploadError.message}`)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('address-docs')
        .getPublicUrl(filePath)

      uploadedUrls.push(publicUrl)
    }

    // Step 2: members 테이블 업데이트 (주소 + 서류 URL + 인증 상태)
    const { error } = await supabase
      .from('members')
      .update({
        address_road: addressInfo.address_road,
        address_complex: addressInfo.address_complex,
        address_building_dong: addressInfo.address_building_dong,
        address_building_ho: addressInfo.address_building_ho,
        address_doc_urls: uploadedUrls,          // text[] 배열
        address_auth_status: '인증요청',           // 관리자 승인 대기
        address_auth_date: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      Alert.alert('오류', error.message)
      return
    }

    Alert.alert('완료', '위치 인증이 요청되었습니다')
  } catch (error) {
    Alert.alert('오류', '서버와 통신할 수 없습니다')
  }
}
```

**변환 포인트**:
- FormData 파일 업로드 → Storage `address-docs` 버킷 + `members.address_doc_urls` (text[] 배열)
- `mb_id` 제거 → `.eq('id', user.id)`
- 주소 컬럼명 변경: `mb_addr1` → `address_road`, `mb_4` → `address_complex`, `dong` → `address_building_dong`, `ho` → `address_building_ho`
- `address_auth_status`: 인증 요청 상태를 DB에 직접 저장 (관리자가 승인/거절)
- Storage 경로: `address-docs/{user.id}/address_doc_{timestamp}_{index}.jpg`
- 여러 이미지를 순차 업로드 후 URL 배열을 `text[]` 타입 컬럼에 저장

**응답 매핑**:

| PHP 응답 필드 | Supabase 응답 필드 | 변환 필요 |
|---|---|---|
| `result` (`'Y'`/`'N'`) | `error` (`null`이면 성공) | 예 |
| `message` | `error.message` | 아니오 |

---

### API #8. kakao-address.php → 앱 직접 호출

**전환 방식**: 앱 직접 호출 | **난이도**: 쉬움
**관련 파일**: `app/authentication/address.tsx`, `app/authentication/addressDetail.tsx`, `app/authentication/location.tsx`
**Supabase 대응**: 없음 (서버 경유 불필요 — 앱에서 카카오 주소 API 직접 호출)

**Before**:
```typescript
// 파일: app/authentication/address.tsx 등
// 카카오 주소 검색 (PHP 프록시 경유)
const searchAddress = async (keyword: string) => {
  try {
    const response = await apiClient.get('api/kakao-address.php', {
      keyword: keyword,
    })
    if (response.results) {
      setAddressList(response.results)
    }
  } catch (error) {
    Alert.alert('오류', '주소 검색에 실패했습니다')
  }
}
```

**After**:
```typescript
// 파일: app/authentication/address.tsx (수정)
// 카카오 주소 검색 (앱에서 직접 호출 — PHP 프록시 제거)

const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY!

const searchAddress = async (keyword: string) => {
  try {
    // 카카오 주소 검색 REST API 직접 호출
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(keyword)}`,
      {
        headers: {
          Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
        },
      }
    )
    const json = await response.json()

    if (json.documents) {
      setAddressList(json.documents)
    }
  } catch (error) {
    Alert.alert('오류', '주소 검색에 실패했습니다')
  }
}
```

**변환 포인트**:
- **PHP 프록시 완전 제거** → 앱에서 카카오 REST API 직접 호출
- 기존: `apiClient.get('api/kakao-address.php')` → 전환 후: `fetch('https://dapi.kakao.com/v2/...')`
- 카카오 REST API 키를 `.env`에 추가 필요: `EXPO_PUBLIC_KAKAO_REST_API_KEY`
- 응답 형식이 약간 다를 수 있음 (PHP 프록시가 가공했을 가능성) → 카카오 API 원본 응답 사용

> **\u26a0\ufe0f 보안 경고 — 카카오 REST API 키 노출**
>
> 기존에는 PHP 서버가 API 키를 숨겨주었으나, 전환 후에는 `EXPO_PUBLIC_` 접두사 환경 변수가 **앱 번들에 포함**되어 디컴파일 시 노출됩니다.
>
> **필수 조치 사항**:
> 1. **카카오 개발자 콘솔 → 내 애플리케이션 → 플랫폼 등록**: Android 패키지명(`com.wooyoopet.app`) + iOS 번들 ID 등록
> 2. **허용 IP/도메인 제한**: 카카오 개발자 콘솔에서 API 호출 허용 범위를 앱 플랫폼으로 제한
> 3. **API 키 종류 확인**: `REST API 키`(서버용)가 아닌 `JavaScript 키` 또는 `Native 앱 키` 사용 검토
> 4. **사용량 모니터링**: 카카오 API 일일 호출 한도 확인 (무료 기본 300,000건/일)
>
> 이 조치를 하지 않으면 API 키가 악용되어 할당량이 소진되거나, 카카오 측에서 키를 정지시킬 수 있습니다.

**응답 매핑**:

| PHP 프록시 응답 필드 | 카카오 API 원본 응답 필드 | 변환 필요 |
|---|---|---|
| `results` (배열) | `documents` (배열) | 예 — 키 이름 변경 |
| `results[].address_name` | `documents[].address_name` | 아니오 |
| `results[].road_address_name` | `documents[].road_address.address_name` | 예 — 중첩 구조 |
| `results[].building_name` | `documents[].road_address.building_name` | 예 — 중첩 구조 |
| `results[].x` (경도) | `documents[].x` | 아니오 |
| `results[].y` (위도) | `documents[].y` | 아니오 |

> **주의**: PHP 프록시가 카카오 API 응답을 가공하여 평탄화(flatten)했을 수 있습니다. 전환 후 카카오 API 원본 응답의 중첩 구조(`road_address.address_name` 등)에 맞게 파싱 코드를 수정해야 합니다. 실제 `kakao-address.php` 소스를 확인하여 가공 여부를 판단하세요.

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
| 2026-04-17 | **R1 본문 작성** — §1 인증/회원 (#1~#6) Before/After 코드 + 응답 매핑 + §2 주소 인증 (#7~#8) Before/After 코드 + 응답 매핑. 총 8개 API 전환 코드 완성 |
| 2026-04-17 | **R1 리뷰 반영 (Issue 2~8)** — §1 #4~#6 선행 작성 사유 노트 추가(Issue 3), #3 `convertBirthDate` 유틸 추가+params 변환 반영(Issue 4), #3 `convertGender` 유틸+CHECK 제약 명시+upsert 변환 적용 반영(Issue 5), #8 카카오 REST API 키 보안 경고 강조 박스 추가(Issue 6) |
