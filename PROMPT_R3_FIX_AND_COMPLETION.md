# R3 리뷰 Issue 수정 + MIGRATION_PLAN 작업완료 반영 요청

> **작업 브랜치**: `genspark_ai_developer`
> **선행 완료**: R3 리뷰 PASS (`R3_REVIEW_REPORT.md` 참조)
> **요청 범위**: RPC_PHP_MAPPING.md 수정 + MIGRATION_PLAN.md 수정 (GUIDE/CODE는 수정 불필요 — 이미 정확)

---

## 요청 1: Issue 1 — RPC #5 함수명 동기화 (`app_get_reservations` → `app_get_reservations_guardian`)

### 배경
- SQL 정본: `sql/44_05_app_rpc_get_reservations.sql` → 함수명 `app_get_reservations_guardian`
- APP_MIGRATION_GUIDE.md §12, APP_MIGRATION_CODE.md #37 모두 `app_get_reservations_guardian` 사용 (정확)
- 하지만 `RPC_PHP_MAPPING.md`와 `MIGRATION_PLAN.md`에는 아직 옛 이름 `app_get_reservations`가 남아 있음

### 수정 대상 1-A: `RPC_PHP_MAPPING.md`

**26행** — 매핑표 #5 항목:
```
현재: | 5 | sql/44_05 | `app_get_reservations` | get_payment_request.php | ...
수정: | 5 | sql/44_05 | `app_get_reservations_guardian` | get_payment_request.php | ...
```

**41행** — 비고 #5, #5b 설명:
```
현재: ...Supabase에서는 보호자/유치원 시점 차이가 커서 2개로 분리 (`app_get_reservations` + `app_get_reservations_kindergarten`).
수정: ...Supabase에서는 보호자/유치원 시점 차이가 커서 2개로 분리 (`app_get_reservations_guardian` + `app_get_reservations_kindergarten`).
```

**4행** — 최종 업데이트 날짜:
```
현재: > **최종 업데이트**: 2026-04-17 (외주개발자 확인 완료, 13/13 구현 완료)
수정: > **최종 업데이트**: 2026-04-18 (R3 리뷰 반영 — RPC #5 함수명 동기화, 태그 수 교정)
```

### 수정 대상 1-B: `MIGRATION_PLAN.md`

**155~156행** — Step 2.5 변경 이력:
```
현재:
> **변경 (2026-04-16)**: #5 `app_get_reservations`를 보호자/유치원 2개로 분리.
> → #5 `app_get_reservations` (보호자용), #5b `app_get_reservations_kindergarten` (유치원용)

수정:
> **변경 (2026-04-16)**: #5 `app_get_reservations_guardian`를 보호자/유치원 2개로 분리.
> → #5 `app_get_reservations_guardian` (보호자용), #5b `app_get_reservations_kindergarten` (유치원용)
```

**165행** — Step 2.5 RPC 함수 목록표 #5 행:
```
현재: | 5 | sql/44_05 | `app_get_reservations` | get_payment_request.php | 예약 목록 (보호자) | ...
수정: | 5 | sql/44_05 | `app_get_reservations_guardian` | get_payment_request.php | 예약 목록 (보호자) | ...
```

**185행** — 난이도·완료 상태표 #5 행:
```
현재: | 5 | 5 | `app_get_reservations` | ★★★ | ✅ | ✅ 완료 — 보호자용, ...
수정: | 5 | 5 | `app_get_reservations_guardian` | ★★★ | ✅ | ✅ 완료 — 보호자용, ...
```

**610행** — §5 API 전환 매핑표 #37 행:
```
현재: | 37 | get_payment_request.php | RPC | `app_get_reservations` — reservations + pets + kindergartens + members JOIN (목록) | 중 |
수정: | 37 | get_payment_request.php | RPC | `app_get_reservations_guardian` / `app_get_reservations_kindergarten` — reservations + pets + kindergartens + members JOIN (목록) | 중 |
```

**957행** — 변경 이력 2026-04-16 항목:
```
현재: ...#5 app_get_reservations(보호자 예약목록), #5b app_get_reservations_kindergarten...
수정: ...#5 app_get_reservations_guardian(보호자 예약목록), #5b app_get_reservations_kindergarten...
```

---

## 요청 2: Issue 2 — 리뷰 태그 수 교정 (`6개` → `7개`)

### 배경
- SQL 정본: `sql/44_09`, `sql/44_12` 모두 `base_tags` CTE에 7개 태그 (ord 1~7)
- APP_MIGRATION_GUIDE.md §13, APP_MIGRATION_CODE.md #44, MIGRATION_PLAN.md 모두 "7개" (정확)
- `RPC_PHP_MAPPING.md`만 "6개 기본 태그"로 남아 있음

### 수정 대상: `RPC_PHP_MAPPING.md`

**31행** — #9 `app_get_guardian_reviews` 설명:
```
현재: ...리뷰 목록 + 6개 기본 태그별 COUNT 집계(CTE) + 반려동물/유치원/회원 JOIN 반환...
수정: ...리뷰 목록 + 7개 긍정 태그별 COUNT 집계(CTE) + 반려동물/유치원/회원 JOIN 반환...
```

**34행** — #12 `app_get_kindergarten_reviews` 설명:
```
현재: ...리뷰 목록 + 6개 기본 태그별 COUNT 집계(CTE) + 반려동물/유치원/회원 JOIN 반환...
수정: ...리뷰 목록 + 7개 긍정 태그별 COUNT 집계(CTE) + 반려동물/유치원/회원 JOIN 반환...
```

---

## 요청 3: R3 작업완료를 MIGRATION_PLAN.md에 반영

### 3-A: 헤더 최종 업데이트 날짜 갱신 (3행)

```
현재: > 최종 업데이트: 2026-04-18 (Step 3 진행 중 — R3 본문 작성 완료, R4부터 다음 라운드 예정)
수정: > 최종 업데이트: 2026-04-18 (Step 3 진행 중 — R3 리뷰 완료·이슈 반영, R4부터 다음 라운드 예정)
```

### 3-B: 변경 이력 테이블에 R3 리뷰 반영 항목 추가 (963행 아래에 신규 행 추가)

기존 마지막 항목 (963행):
```
| 2026-04-18 | **Step 3 R3 본문 작성 완료** — GUIDE §11~13 (3개 장) + CODE §4,§6~8,§13 (10개 API) 완성. ...
```

그 아래에 다음 행 추가:
```
| 2026-04-18 | **Step 3 R3 리뷰 완료 + Issue 반영** — R3_REVIEW_REPORT.md 작성 (10개 API 전체 PASS). Issue 1: RPC #5 함수명 `app_get_reservations` → `app_get_reservations_guardian` 동기화 (RPC_PHP_MAPPING.md + MIGRATION_PLAN.md). Issue 2: 리뷰 태그 수 `6개 기본` → `7개 긍정` 교정 (RPC_PHP_MAPPING.md #9, #12). 대상 문서 4건 수정 완료 |
```

### 3-C: 현재 진행 상황 문구 갱신 (256행 부근)

```
현재: **현재 진행 상황**: R1 + R2 + R3 완료. GUIDE §1~13 + CODE §1~§13(R3 대상 10개 API) 확정. R4부터 다음 라운드 시작 예정.
수정: **현재 진행 상황**: R1 + R2 + R3 완료 (리뷰 PASS + Issue 2건 반영 완료). GUIDE §1~13 + CODE §1~§13(R3 대상 10개 API) 확정. R4부터 다음 라운드 시작 예정.
```

---

## 커밋 메시지

```
fix(docs): R3 리뷰 Issue 1~2 반영 — RPC #5 함수명 + 태그 수 동기화

- Issue 1: RPC #5 `app_get_reservations` → `app_get_reservations_guardian`
  - RPC_PHP_MAPPING.md: 매핑표 #5행, 비고 #5/#5b 설명
  - MIGRATION_PLAN.md: Step 2.5 변경이력, RPC 목록, 난이도표, API 매핑, 변경이력
- Issue 2: 리뷰 태그 수 6개 → 7개
  - RPC_PHP_MAPPING.md: #9 `app_get_guardian_reviews`, #12 `app_get_kindergarten_reviews`
- R3 작업완료: MIGRATION_PLAN.md 변경이력에 R3 리뷰 PASS + Issue 반영 기록 추가
```

---

## 검증 체크리스트

수정 완료 후 아래 명령으로 일관성을 확인해 주세요:

```bash
# 1. app_get_reservations가 _guardian 없이 단독 사용되는 곳이 없는지 확인
grep -rn "app_get_reservations[^_]" RPC_PHP_MAPPING.md MIGRATION_PLAN.md
# → 결과 없어야 정상 (app_get_reservations_guardian 또는 _kindergarten만 존재)

# 2. "6개 기본 태그" 표현이 남아있지 않은지 확인
grep -rn "6개 기본 태그" RPC_PHP_MAPPING.md MIGRATION_PLAN.md
# → 결과 없어야 정상

# 3. 변경 이력에 R3 리뷰 항목이 추가되었는지 확인
grep -n "R3 리뷰 완료" MIGRATION_PLAN.md
# → 1건 이상 존재해야 정상
```
