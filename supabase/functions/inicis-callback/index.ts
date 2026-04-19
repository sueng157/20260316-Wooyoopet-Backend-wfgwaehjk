// ============================================================
// Edge Function: inicis-callback (이니시스 결제 콜백)
// ============================================================
// 용도: 이니시스 PG사가 결제 완료 후 POST로 직접 호출하는 서버 콜백
// 호출 주체: 이니시스 PG사 (POST 직접 호출 — 앱에서 호출하지 않음)
//
// 입력 스펙 (GUIDE.md §15-2, CODE.md #34):
//   PG사 POST 파라미터:
//     P_STATUS  (string) — 결과코드 ('00'=성공)
//     P_OID     (string) — 주문번호
//     P_TID     (string) — 거래번호
//     P_AMT     (string) — 결제금액
//     P_RMESG1  (string) — 결과메시지
//     P_TYPE    (string) — 결제수단
//     P_AUTH_DT (string) — 승인일시
//     P_AUTH_NO (string) — 승인번호
//     P_CARD_NUM (string) — 카드번호
//     FN_NM     (string) — 카드사명
//     P_UNAME   (string) — 구매자명
//     P_MID     (string) — 상점ID
//     P_NOTI    (string) — JSON (memberId, kindergartenId, petId, mode, roomId)
//
// 출력 스펙 (STEP4_WORK_PLAN.md §4-1):
//   HTML 페이지 — ReactNativeWebView.postMessage() 포함
//   postMessage JSON:
//     { result: 'Y'|'N', payment_id: UUID, pg_transaction_id: string, amount: number, message: string }
//
// 처리 흐름 (MIGRATION_PLAN.md §7-2-1):
//   1. PG POST 파라미터 수신 (application/x-www-form-urlencoded)
//   2. P_NOTI JSON 파싱 → memberId, kindergartenId, petId 추출
//   3. INICIS_MID 검증 (PG사 인증 대체)
//   4. payments 테이블 UPSERT (pg_transaction_id 기준)
//   5. HTML 페이지 반환 (ReactNativeWebView.postMessage)
//
// 보안: JWT 없음 (PG사 직접 호출). INICIS_MID 검증으로 인증 대체
// Secrets: INICIS_MID
//
// 참조:
//   - legacy_php_api_all.txt L3950 (inicis_payment.php)
//   - legacy_php_api_all.txt L3825 (set_inicis_approval.php) — 내부 흡수
//   - APP_MIGRATION_CODE.md #34, #35
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createAdminClient } from '../_shared/supabase.ts'

// ─── C3: P_AUTH_DT 파싱 헬퍼 ─────────────────────────────────
// 이니시스 P_AUTH_DT 형식: 'yyyyMMddHHmmss' (예: '20260419153045')
// → ISO-8601 with KST offset: '2026-04-19T15:30:45+09:00'
function parseAuthDt(raw: string | null): string | null {
  if (!raw || raw.length < 14) return null
  try {
    const yyyy = raw.substring(0, 4)
    const MM = raw.substring(4, 6)
    const dd = raw.substring(6, 8)
    const HH = raw.substring(8, 10)
    const mm = raw.substring(10, 12)
    const ss = raw.substring(12, 14)
    return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}+09:00`
  } catch {
    console.error('[inicis-callback] P_AUTH_DT 파싱 실패:', raw)
    return null
  }
}

serve(async (req: Request) => {
  // PG사는 POST만 사용. OPTIONS(CORS preflight)는 필요하지 않으나 방어적으로 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type',
      },
    })
  }

  // ── 1. PG POST 파라미터 수신 ──────────────────────────────
  let formData: URLSearchParams

  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const body = await req.text()
      formData = new URLSearchParams(body)
    } else if (contentType.includes('multipart/form-data')) {
      // 일부 PG사 설정에서 multipart/form-data 사용 가능
      const fd = await req.formData()
      formData = new URLSearchParams()
      for (const [key, value] of fd.entries()) {
        formData.set(key, String(value))
      }
    } else {
      // fallback: body를 텍스트로 읽어 파싱 시도
      const body = await req.text()
      formData = new URLSearchParams(body)
    }
  } catch (error) {
    console.error('[inicis-callback] 요청 파싱 실패:', error)
    return buildHtmlResponse({
      result: 'N',
      payment_id: null,
      pg_transaction_id: '',
      amount: 0,
      message: '요청 파싱에 실패했습니다',
    })
  }

  // ── 2. PG 파라미터 추출 ────────────────────────────────────
  const pStatus = formData.get('P_STATUS') ?? ''
  let pOid = formData.get('P_OID') ?? ''
  const pTid = formData.get('P_TID') ?? ''
  const pAmt = parseInt(formData.get('P_AMT') ?? '0', 10)
  const pMsg = formData.get('P_RMESG1') ?? ''
  const pType = formData.get('P_TYPE') ?? null
  const pAuthDt = formData.get('P_AUTH_DT') ?? null
  const pAuthNo = formData.get('P_AUTH_NO') ?? null
  const pCardNum = formData.get('P_CARD_NUM') ?? null
  const pCardName = formData.get('FN_NM') ?? null
  const pUname = formData.get('P_UNAME') ?? null
  const pMid = formData.get('P_MID') ?? null
  const pNoti = formData.get('P_NOTI') ?? null

  console.log(`[inicis-callback] 수신: P_STATUS=${pStatus}, P_OID=${pOid}, P_TID=${pTid}, P_AMT=${pAmt}`)

  // P_OID가 비어올 수 있음 (카카오페이 등) → P_TID로 대체
  if (pOid === '' && pTid !== '') {
    pOid = pTid
  }

  // ── 3. INICIS_MID 검증 ─────────────────────────────────────
  const expectedMid = Deno.env.get('INICIS_MID')
  if (expectedMid && pMid && pMid !== expectedMid) {
    console.error(`[inicis-callback] MID 불일치: expected=${expectedMid}, received=${pMid}`)
    return buildHtmlResponse({
      result: 'N',
      payment_id: null,
      pg_transaction_id: pOid,
      amount: pAmt,
      message: '상점ID 검증에 실패했습니다',
    })
  }

  // ── 4. P_NOTI JSON 파싱 ─────────────────────────────────────
  let memberId: string | null = null
  let kindergartenId: string | null = null
  let petId: string | null = null
  let mode: string | null = null
  let roomId: string | null = null

  if (pNoti) {
    try {
      const decoded = JSON.parse(pNoti)
      memberId = decoded.memberId ?? null
      kindergartenId = decoded.kindergartenId ?? null
      petId = decoded.petId ?? null
      mode = decoded.mode ?? null
      roomId = decoded.roomId ?? null
    } catch {
      console.error('[inicis-callback] P_NOTI 파싱 실패:', pNoti)
    }
  }

  // ── 5. payments 테이블 UPSERT ───────────────────────────────
  const isSuccess = pStatus === '00'
  const paymentStatus = isSuccess ? 'APPROVED' : 'FAILED'
  let paymentId: string | null = null

  try {
    const supabaseAdmin = createAdminClient()

    // raw_response: 전체 POST 파라미터를 JSON으로 저장
    const rawResponse: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      rawResponse[key] = value
    }

    // pg_transaction_id (oid) 기준으로 기존 레코드 조회
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('pg_transaction_id', pOid)
      .maybeSingle()

    const paymentData: Record<string, unknown> = {
      pg_transaction_id: pOid,
      amount: pAmt,
      status: paymentStatus,
      payment_method: pType,
      paid_at: parseAuthDt(pAuthDt),
      approval_number: pAuthNo,
      card_number: pCardNum,
      card_company: pCardName,
      raw_response: rawResponse,
    }

    // member_id, kindergarten_id, pet_id가 있으면 추가
    if (memberId) paymentData.member_id = memberId
    if (kindergartenId) paymentData.kindergarten_id = kindergartenId
    if (petId) paymentData.pet_id = petId

    if (existingPayment) {
      // UPDATE
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('payments')
        .update(paymentData)
        .eq('id', existingPayment.id)
        .select('id')
        .single()

      if (updateError) {
        console.error('[inicis-callback] payments UPDATE 실패:', updateError)
      } else {
        paymentId = updated.id
      }
    } else {
      // INSERT
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('payments')
        .insert(paymentData)
        .select('id')
        .single()

      if (insertError) {
        console.error('[inicis-callback] payments INSERT 실패:', insertError)
      } else {
        paymentId = inserted.id
      }
    }

    console.log(`[inicis-callback] payments UPSERT 완료: id=${paymentId}, status=${paymentStatus}`)
  } catch (error) {
    console.error('[inicis-callback] DB 처리 중 오류:', error)
    // DB 오류가 발생해도 HTML은 반환해야 함 (WebView가 결과를 받아야 하므로)
  }

  // ── 6. HTML 반환 (ReactNativeWebView.postMessage) ────────────
  const resultForApp = {
    result: isSuccess && paymentId ? 'Y' : 'N',
    payment_id: paymentId,
    pg_transaction_id: pOid,
    amount: pAmt,
    message: isSuccess ? '결제가 완료되었습니다' : (pMsg || '결제에 실패했습니다'),
  }

  return buildHtmlResponse(resultForApp)
})

// ─── HTML 응답 생성 헬퍼 ─────────────────────────────────────

interface PaymentResult {
  result: string
  payment_id: string | null
  pg_transaction_id: string
  amount: number
  message: string
}

function buildHtmlResponse(result: PaymentResult): Response {
  const jsonStr = JSON.stringify(result)
  // HTML 내에서 XSS 방지를 위한 이스케이프
  const escapedJson = jsonStr
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Result</title>
</head>
<body>
<pre id="payment-result">${escapedJson}</pre>
<script>
  (function() {
    try {
      var el = document.getElementById('payment-result');
      if (window.ReactNativeWebView && el) {
        window.ReactNativeWebView.postMessage(el.textContent || el.innerText);
      }
    } catch (e) {}
  })();
</script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
