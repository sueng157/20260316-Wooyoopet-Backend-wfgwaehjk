/**
 * 우유펫 관리자 대시보드 — 유치원관리 (kindergartens.js)
 *
 * 목록 (kindergartens.html) + 상세 (kindergarten-detail.html) 공통 모듈
 * 의존: api.js, auth.js, common.js
 */
(function () {
  'use strict';

  var api = window.__api;
  var auth = window.__auth;
  if (!api || !auth) return;

  var PERM_KEY = 'perm_kindergartens';
  var PER_PAGE = 20;

  // ══════════════════════════════════════════
  // A. 목록 페이지 (kindergartens.html)
  // ══════════════════════════════════════════

  function isListPage() {
    return !!document.getElementById('kgListBody');
  }

  var filterDateFrom, filterDateTo, filterBizStatus, filterInicis, filterEdu;
  var filterSearchField, filterSearchInput, btnSearch, btnExcel;
  var resultCount, listBody, pagination;
  var currentPage = 1;

  function cacheListDom() {
    var dates = document.querySelectorAll('.filter-input--date');
    filterDateFrom = dates[0];
    filterDateTo   = dates[1];

    var selects = document.querySelectorAll('.filter-select');
    filterBizStatus  = selects[0]; // 영업상태
    filterInicis     = selects[1]; // 이니시스
    filterEdu        = selects[2]; // 교육이수
    filterSearchField = selects[3];
    filterSearchInput = document.querySelector('.filter-input--search');
    btnSearch = document.querySelector('.btn-search');
    btnExcel  = document.querySelector('.btn-excel');

    resultCount = document.querySelector('.result-header__count strong');
    listBody    = document.getElementById('kgListBody');
    pagination  = document.querySelector('.pagination');
  }

  function buildFilters() {
    var filters = [];

    if (filterDateFrom && filterDateFrom.value) {
      filters.push({ column: 'created_at', op: 'gte', value: filterDateFrom.value + 'T00:00:00' });
    }
    if (filterDateTo && filterDateTo.value) {
      filters.push({ column: 'created_at', op: 'lte', value: filterDateTo.value + 'T23:59:59' });
    }

    if (filterBizStatus) {
      var v = filterBizStatus.value;
      if (v && v !== '영업상태: 전체') filters.push({ column: 'status', op: 'eq', value: v });
    }
    if (filterInicis) {
      var v2 = filterInicis.value;
      if (v2 && v2 !== '이니시스: 전체') filters.push({ column: 'inicis_status', op: 'eq', value: v2 });
    }

    return filters;
  }

  function buildSearchOr() {
    if (!filterSearchInput || !filterSearchInput.value.trim()) return [];
    var keyword = '%' + filterSearchInput.value.trim() + '%';
    var fieldMap = {
      '유치원명':   'name.ilike.' + keyword,
      '운영자 성명': 'operator_name.ilike.' + keyword
    };
    var label = filterSearchField ? filterSearchField.value : '유치원명';
    return [fieldMap[label] || fieldMap['유치원명']];
  }

  /** 신선도 CSS 클래스 */
  function freshnessClass(val) {
    var n = parseFloat(val);
    if (isNaN(n)) return '';
    return n >= 100 ? 'freshness--good' : 'freshness--bad';
  }

  /** 교육이수 상태 뱃지 텍스트 */
  function eduBadge(completed, total) {
    if (!total) return api.renderBadge('미시작', 'gray');
    if (completed >= total) return api.renderBadge('완료', 'green');
    return api.renderBadge('진행중(' + completed + '/' + total + ')', 'orange');
  }

  /** 이미지 썸네일 */
  function thumbHtml(url) {
    if (url) {
      return '<div class="thumb"><img src="' + api.escapeHtml(url) + '" alt="" style="width:100%;height:100%;object-fit:cover;"></div>';
    }
    return '<div class="thumb thumb--placeholder"><svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>';
  }

  async function loadKgList(page) {
    currentPage = page || 1;
    api.showTableLoading(listBody, 16);

    var result = await api.fetchList('kindergartens', {
      select: '*, education_completions(completed_count, total_count)',
      filters: buildFilters(),
      orFilters: buildSearchOr(),
      orderBy: 'created_at',
      ascending: false,
      page: currentPage,
      perPage: PER_PAGE
    });

    if (result.error) {
      api.showTableEmpty(listBody, 16, '데이터를 불러오지 못했습니다.');
      return;
    }

    if (resultCount) resultCount.textContent = result.count;

    if (!result.data || result.data.length === 0) {
      api.showTableEmpty(listBody, 16);
      renderListPagination(0);
      return;
    }

    var startIdx = (currentPage - 1) * PER_PAGE;
    var html = '';

    for (var i = 0; i < result.data.length; i++) {
      var kg = result.data[i];
      var idx = startIdx + i + 1;
      var loc = ((kg.complex_name || '') + ' ' + (kg.building || '')).trim() || '-';
      var freshVal = kg.freshness != null ? kg.freshness + '%' : '-';
      var freshCls = freshnessClass(kg.freshness);

      // 교육이수
      var eduComp = kg.education_completions;
      var compCount = 0, totalCount = 0;
      if (Array.isArray(eduComp) && eduComp.length > 0) {
        compCount = eduComp[0].completed_count || 0;
        totalCount = eduComp[0].total_count || 0;
      }

      html += '<tr>' +
        '<td>' + idx + '</td>' +
        '<td style="font-weight:700;color:var(--text-primary);">' + api.escapeHtml(kg.name) + '</td>' +
        '<td>' + api.escapeHtml(kg.operator_name || '-') + '</td>' +
        '<td class="masked">' + api.maskPhone(kg.operator_phone) + '</td>' +
        '<td>' + thumbHtml(kg.main_image_url) + '</td>' +
        '<td>' + api.escapeHtml(loc) + '</td>' +
        '<td>' + api.autoBadge(kg.status || '-') + '</td>' +
        '<td class="' + freshCls + '">' + freshVal + '</td>' +
        '<td class="text-right">' + api.formatNumber(kg.review_count || 0) + '</td>' +
        '<td class="text-right">' + api.formatNumber(kg.resident_pet_count || 0) + '</td>' +
        '<td>' + eduBadge(compCount, totalCount) + '</td>' +
        '<td>' + api.autoBadge(kg.address_verified || '미인증') + '</td>' +
        '<td>' + api.autoBadge(kg.settlement_status || '작성중') + '</td>' +
        '<td>' + api.autoBadge(kg.inicis_status || '미등록') + '</td>' +
        '<td style="color:var(--text-weak);">' + api.formatDate(kg.created_at, true) + '</td>' +
        '<td>' + api.renderDetailLink('kindergarten-detail.html', kg.id) + '</td>' +
        '</tr>';
    }

    listBody.innerHTML = html;
    renderListPagination(result.count);
  }

  function renderListPagination(total) {
    api.renderPagination(pagination, currentPage, total, PER_PAGE, function (p) { loadKgList(p); });
  }

  async function exportKgExcel() {
    var result = await api.fetchAll('kindergartens', {
      filters: buildFilters(),
      orFilters: buildSearchOr(),
      orderBy: 'created_at',
      ascending: false
    });
    if (!result.data || result.data.length === 0) { alert('다운로드할 데이터가 없습니다.'); return; }

    var headers = [
      { key: 'name', label: '유치원명' },
      { key: 'operator_name', label: '운영자' },
      { key: 'phone_masked', label: '운영자 연락처' },
      { key: 'location', label: '위치' },
      { key: 'status', label: '영업' },
      { key: 'freshness', label: '신선도' },
      { key: 'review_count', label: '후기' },
      { key: 'resident_pet_count', label: '상주동물' },
      { key: 'address_verified', label: '주소인증' },
      { key: 'settlement_status', label: '정산정보' },
      { key: 'inicis_status', label: '이니시스' },
      { key: 'created_date', label: '등록일' }
    ];
    var rows = result.data.map(function (kg) {
      return {
        name: kg.name,
        operator_name: kg.operator_name || '',
        phone_masked: api.maskPhone(kg.operator_phone),
        location: ((kg.complex_name || '') + ' ' + (kg.building || '')).trim() || '-',
        status: kg.status || '',
        freshness: kg.freshness != null ? kg.freshness + '%' : '-',
        review_count: kg.review_count || 0,
        resident_pet_count: kg.resident_pet_count || 0,
        address_verified: kg.address_verified || '미인증',
        settlement_status: kg.settlement_status || '작성중',
        inicis_status: kg.inicis_status || '미등록',
        created_date: api.formatDate(kg.created_at, true)
      };
    });
    api.exportExcel(rows, headers, '유치원관리');
  }

  function initListPage() {
    cacheListDom();
    if (filterDateFrom) filterDateFrom.value = api.getMonthStart().slice(0, 4) + '-01-01';
    if (filterDateTo) filterDateTo.value = api.getToday();

    if (btnSearch) btnSearch.addEventListener('click', function () { loadKgList(1); });
    if (filterSearchInput) filterSearchInput.addEventListener('keypress', function (e) { if (e.key === 'Enter') loadKgList(1); });
    if (btnExcel) btnExcel.addEventListener('click', exportKgExcel);

    api.hideIfReadOnly(PERM_KEY, ['.btn-action']);
    loadKgList(1);
  }

  // ══════════════════════════════════════════
  // B. 상세 페이지 (kindergarten-detail.html)
  // ══════════════════════════════════════════

  function isDetailPage() {
    return !!document.getElementById('detailKgInfo');
  }

  async function initDetailPage() {
    var kgId = api.getParam('id');
    if (!kgId) { alert('유치원 ID가 없습니다.'); return; }

    var res = await api.fetchDetail('kindergartens', kgId);
    if (res.error || !res.data) { alert('유치원 정보를 불러올 수 없습니다.'); return; }
    var kg = res.data;

    // ① 기본정보
    api.setTextById('kgIdText', kg.id ? kg.id.slice(0, 8).toUpperCase() : '-');
    api.setTextById('kgName', kg.name || '-');
    api.setHtmlById('kgBizStatus', api.autoBadge(kg.status || '-'));
    api.setTextById('kgCreated', api.formatDate(kg.created_at));

    // 소개글
    var introEl = document.getElementById('introText');
    if (introEl && kg.description) introEl.textContent = kg.description;

    // 사진
    var gallery = document.getElementById('kgPhotoGallery');
    if (gallery && kg.image_urls) {
      var imgs = [];
      try { imgs = typeof kg.image_urls === 'string' ? JSON.parse(kg.image_urls) : kg.image_urls; } catch (e) {}
      if (Array.isArray(imgs) && imgs.length > 0) {
        var gHtml = '';
        imgs.forEach(function (url, idx) {
          gHtml += '<div class="photo-gallery__item"><img src="' + api.escapeHtml(url) + '" style="width:100%;height:100%;object-fit:cover;">' +
            (idx === 0 ? '<span class="photo-gallery__badge">대표</span>' : '') + '</div>';
        });
        gallery.innerHTML = gHtml;
      }
    }

    // ② 운영자 정보
    api.setTextById('opName', kg.operator_name || '-');
    api.setHtmlById('opPhone', api.renderMaskedField(
      api.maskPhone(kg.operator_phone), api.formatPhone(kg.operator_phone), 'kindergartens', kgId, 'operator_phone'
    ));
    if (kg.member_id) {
      api.setHtmlById('opMemberId', api.renderDetailLink('member-detail.html', kg.member_id, kg.member_id.slice(0, 8).toUpperCase()));
    }

    // ③ 주소 정보
    api.setTextById('kgAddrRoad', kg.road_address || '-');
    api.setTextById('kgAddrJibun', kg.jibun_address || '-');
    api.setTextById('kgAddrComplex', kg.complex_name || '-');
    api.setTextById('kgAddrBuilding', kg.building || '-');
    api.setHtmlById('kgAddrHo', api.renderMaskedField(
      api.maskHo(kg.unit_number), (kg.unit_number || '-') + '호', 'kindergartens', kgId, 'unit_number'
    ));
    api.setHtmlById('kgAddrVerified', api.autoBadge(kg.address_verified || '미인증'));
    api.setTextById('kgAddrVerifiedDate', kg.address_verified_at ? api.formatDate(kg.address_verified_at) : '\u2014');

    // ④ 신선도 정보
    var freshVal = kg.freshness != null ? kg.freshness : 100;
    var freshColor = freshVal >= 100 ? '#2ECC71' : '#E05A3A';
    api.setHtmlById('freshCurrent', '<span style="font-size:28px;font-weight:700;color:' + freshColor + ';">' + freshVal + '%</span>');
    api.setTextById('freshInitial', '100%');
    api.setTextById('freshCareCount', (kg.care_count || 0) + '건');
    api.setTextById('freshReviewCount', (kg.review_count || 0) + '건');
    api.setTextById('freshPositiveRate', (kg.positive_rate || 0) + '%');
    api.setTextById('freshKgNoshow', (kg.kg_noshow_count || 0) + '회');
    api.setTextById('freshKgCancel', (kg.kg_cancel_count || 0) + '회');

    // ⑤ 상주 반려동물
    loadResidentPets(kgId);

    // ⑥ 돌봄비 가격표
    loadPriceTable(kg);

    // ⑦ 교육이수 정보
    loadEducationInfo(kgId);

    // ⑧ 정산정보 및 서브몰
    loadSettlementInfo(kgId, kg);

    // ⑨ 정산 이력 요약
    loadSettlementSummary(kgId);

    // ⑩ 노쇼 이력
    loadKgNoshows(kgId);

    // ⑪ 상태 변경 이력
    loadKgStatusLogs(kgId);

    // 액션 버튼 바인딩
    bindKgActions(kgId, kg);
    api.hideIfReadOnly(PERM_KEY, ['.detail-actions', '.btn-action']);
    api.insertAuditLog('유치원조회', 'kindergartens', kgId, { name: kg.name });
  }

  async function loadResidentPets(kgId) {
    var tbody = document.getElementById('residentPetsBody');
    if (!tbody) return;

    var res = await api.fetchList('kindergarten_resident_pets', {
      select: '*, pets(name, breed, gender, birth_date, weight, is_neutered, id)',
      filters: [{ column: 'kindergarten_id', op: 'eq', value: kgId }],
      perPage: 50
    });

    if (!res.data || res.data.length === 0) {
      api.showTableEmpty(tbody, 7, '상주 반려동물이 없습니다.');
      return;
    }

    var html = '';
    res.data.forEach(function (rp) {
      var p = rp.pets || {};
      html += '<tr>' +
        '<td>' + api.escapeHtml(p.name || '-') + '</td>' +
        '<td>' + api.escapeHtml(p.breed || '-') + '</td>' +
        '<td>' + api.escapeHtml(p.gender || '-') + '</td>' +
        '<td>' + api.calcPetAge(p.birth_date) + '</td>' +
        '<td>' + (p.weight ? p.weight + 'kg' : '-') + '</td>' +
        '<td>' + api.autoBadge(p.is_neutered ? '했어요' : '안 했어요') + '</td>' +
        '<td>' + (p.id ? api.renderDetailLink('pet-detail.html', p.id, p.id.slice(0, 8).toUpperCase()) : '-') + '</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  function loadPriceTable(kg) {
    // 가격 정보가 JSON으로 저장되어 있는 경우
    var tbody = document.getElementById('priceTableBody');
    if (!tbody) return;

    var prices = kg.prices;
    if (!prices) return; // 더미 HTML 유지

    try {
      var p = typeof prices === 'string' ? JSON.parse(prices) : prices;
      var html = '';
      var sizes = ['소형', '중형', '대형'];
      sizes.forEach(function (size) {
        var row = p[size] || {};
        html += '<tr>' +
          '<td>' + size + '</td>' +
          '<td>' + (row.hour_1 ? api.formatMoney(row.hour_1) : '<span class="na">\u2014</span>') + '</td>' +
          '<td>' + (row.hour_24 ? api.formatMoney(row.hour_24) : '<span class="na">\u2014</span>') + '</td>' +
          '<td>' + (row.walk ? api.formatMoney(row.walk) : '<span class="na">\u2014</span>') + '</td>' +
          '<td>' + (row.pickup ? api.formatMoney(row.pickup) : '<span class="na">\u2014</span>') + '</td>' +
          '</tr>';
      });
      tbody.innerHTML = html;
    } catch (e) { /* keep static */ }
  }

  async function loadEducationInfo(kgId) {
    var sb = window.__supabase;
    var res = await sb.from('education_completions')
      .select('*')
      .eq('kindergarten_id', kgId)
      .limit(1)
      .maybeSingle();

    var edu = res.data;
    if (edu) {
      var isComplete = edu.completed_count >= edu.total_count;
      api.setHtmlById('eduStatus', isComplete ? api.renderBadge('이수완료', 'green') : api.renderBadge('진행중', 'orange'));

      var pct = edu.total_count ? Math.round((edu.completed_count / edu.total_count) * 100) : 0;
      api.setHtmlById('eduProgress',
        '<div class="progress-bar"><div class="progress-bar__track"><div class="progress-bar__fill" style="width:' + pct + '%;"></div></div>' +
        '<span class="progress-bar__text">' + edu.completed_count + ' / ' + edu.total_count + '</span></div>');

      api.setTextById('eduCompletedDate', edu.completed_at ? api.formatDate(edu.completed_at) : '\u2014');
    } else {
      api.setHtmlById('eduStatus', api.renderBadge('미시작', 'gray'));
      api.setHtmlById('eduProgress', '<div class="progress-bar"><div class="progress-bar__track"><div class="progress-bar__fill" style="width:0%;"></div></div><span class="progress-bar__text">0 / 0</span></div>');
      api.setTextById('eduCompletedDate', '\u2014');
    }

    // 서약서 동의
    var pledgeRes = await sb.from('pledges')
      .select('id')
      .eq('is_current', true)
      .limit(1)
      .maybeSingle();

    // TODO: 서약서 동의 여부 체크 (pledge_agreements 테이블)
    api.setHtmlById('pledgeStatus', api.renderBadge('미확인', 'gray'));
    api.setTextById('pledgeDate', '\u2014');
  }

  async function loadSettlementInfo(kgId, kg) {
    api.setHtmlById('settlementReview', api.autoBadge(kg.settlement_status || '작성중'));
    api.setHtmlById('settlementInicis', api.autoBadge(kg.inicis_status || '미등록'));
    api.setTextById('settlementInicisCode', kg.inicis_code || '-');
    api.setTextById('settlementSellerId', kg.seller_id || '-');
  }

  async function loadSettlementSummary(kgId) {
    var sb = window.__supabase;

    // 누적 돌봄 결제금액
    var careRes = await sb.from('payments')
      .select('amount')
      .eq('kindergarten_id', kgId)
      .eq('status', '결제완료')
      .eq('payment_type', '돌봄');
    var careTotal = 0;
    if (careRes.data) careRes.data.forEach(function (r) { careTotal += (r.amount || 0); });

    // 누적 위약금
    var penRes = await sb.from('payments')
      .select('amount')
      .eq('kindergarten_id', kgId)
      .eq('payment_type', '위약금');
    var penTotal = 0;
    if (penRes.data) penRes.data.forEach(function (r) { penTotal += (r.amount || 0); });

    var totalValid = careTotal + penTotal;
    var platformFee = Math.round(totalValid * 0.2);
    var kgSettlement = totalValid - platformFee;

    // 정산 완료 금액
    var settledRes = await sb.from('settlements')
      .select('settlement_amount')
      .eq('kindergarten_id', kgId)
      .eq('status', '정산완료');
    var settledTotal = 0;
    if (settledRes.data) settledRes.data.forEach(function (r) { settledTotal += (r.settlement_amount || 0); });

    var pending = kgSettlement - settledTotal;

    api.setTextById('sumCarePay', api.formatNumber(careTotal));
    api.setTextById('sumPenaltyPay', api.formatNumber(penTotal));
    api.setTextById('sumTotalValid', api.formatNumber(totalValid));
    api.setTextById('sumPlatformFee', api.formatNumber(platformFee));
    api.setTextById('sumKgSettlement', api.formatNumber(kgSettlement));
    api.setTextById('sumPending', api.formatNumber(pending > 0 ? pending : 0));
  }

  async function loadKgNoshows(kgId) {
    var sb = window.__supabase;
    var res = await sb.from('noshow_records')
      .select('*', { count: 'exact' })
      .eq('kindergarten_id', kgId);

    var count = res.count || 0;
    api.setHtmlById('kgNoshowCount', '<span style="color:#E05A3A;font-weight:700;">' + count + '회</span>');

    var tbody = document.getElementById('kgNoshowBody');
    if (!tbody) return;

    if (!res.data || res.data.length === 0) {
      api.showTableEmpty(tbody, 5, '노쇼 기록이 없습니다.');
      return;
    }

    var html = '';
    res.data.forEach(function (n) {
      html += '<tr>' +
        '<td>' + api.formatDate(n.created_at, true) + '</td>' +
        '<td>' + (n.reservation_id ? api.renderDetailLink('reservation-detail.html', n.reservation_id, n.reservation_id.slice(0, 8).toUpperCase()) : '-') + '</td>' +
        '<td>' + api.escapeHtml(n.counterpart_name || '-') + '</td>' +
        '<td>' + api.autoBadge(n.appeal_status || '미소명') + '</td>' +
        '<td>' + (n.appeal_status === '소명접수' ?
          '<button class="btn-action btn-action--success" style="padding:4px 10px;font-size:12px;">소명 인정</button> ' +
          '<button class="btn-action btn-action--danger" style="padding:4px 10px;font-size:12px;">소명 거부</button>' :
          '<span style="color:var(--text-weak);font-size:12px;">처리 완료</span>') + '</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  async function loadKgStatusLogs(kgId) {
    var tbody = document.getElementById('kgStatusLogBody');
    if (!tbody) return;

    var res = await api.fetchList('kindergarten_status_logs', {
      filters: [{ column: 'kindergarten_id', op: 'eq', value: kgId }],
      orderBy: 'created_at',
      ascending: false,
      perPage: 20
    });

    if (!res.data || res.data.length === 0) {
      api.showTableEmpty(tbody, 6, '상태 변경 이력이 없습니다.');
      return;
    }

    var html = '';
    res.data.forEach(function (log) {
      html += '<tr>' +
        '<td>' + api.formatDate(log.created_at) + '</td>' +
        '<td>' + api.escapeHtml(log.changed_field || '-') + '</td>' +
        '<td>' + api.autoBadge(log.prev_value) + '</td>' +
        '<td>' + api.autoBadge(log.new_value) + '</td>' +
        '<td>' + api.escapeHtml(log.changed_by || '-') + '</td>' +
        '<td>' + api.escapeHtml(log.note || '-') + '</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  function bindKgActions(kgId, kg) {
    // 영업상태 변경
    var btnBizStatus = document.getElementById('btnBizStatus');
    if (btnBizStatus) {
      btnBizStatus.addEventListener('click', async function () {
        var newStatus = kg.status === '영업중' ? '방학중' : '영업중';
        if (!confirm('영업 상태를 "' + newStatus + '"로 변경하시겠습니까?')) return;
        await api.updateRecord('kindergartens', kgId, { status: newStatus });
        var admin = auth.getAdmin();
        await api.insertRecord('kindergarten_status_logs', {
          kindergarten_id: kgId,
          changed_field: '영업상태',
          prev_value: kg.status,
          new_value: newStatus,
          changed_by: admin ? '관리자 (' + admin.name + ')' : '관리자',
          note: '관리자 수동 변경'
        });
        api.insertAuditLog('상태변경', 'kindergartens', kgId, { field: '영업상태', from: kg.status, to: newStatus });
        alert('영업 상태가 변경되었습니다.');
        location.reload();
      });
    }

    // 주소 인증 승인/거절
    var btnAddrApprove = document.getElementById('btnKgAddrApprove');
    var btnAddrReject = document.getElementById('btnKgAddrReject');
    if (btnAddrApprove) {
      btnAddrApprove.addEventListener('click', async function () {
        if (!confirm('주소 인증을 승인하시겠습니까?')) return;
        await api.updateRecord('kindergartens', kgId, { address_verified: '인증완료', address_verified_at: new Date().toISOString() });
        api.insertAuditLog('주소인증승인', 'kindergartens', kgId, {});
        alert('승인되었습니다.');
        location.reload();
      });
    }
    if (btnAddrReject) {
      btnAddrReject.addEventListener('click', async function () {
        if (!confirm('주소 인증을 거절하시겠습니까?')) return;
        await api.updateRecord('kindergartens', kgId, { address_verified: '미인증' });
        api.insertAuditLog('주소인증거절', 'kindergartens', kgId, {});
        alert('거절되었습니다.');
        location.reload();
      });
    }
  }

  // ══════════════════════════════════════════
  // C. 초기화
  // ══════════════════════════════════════════

  function init() {
    if (isListPage()) initListPage();
    else if (isDetailPage()) initDetailPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
