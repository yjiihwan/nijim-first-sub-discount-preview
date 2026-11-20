/* 신규 첫 구독 할인 — 판정·가격 계산 (순수 JS, 브라우저·node 공용). 외부개발자 참조 구현. */
(function (root) {
  const MIN_FIRST_AMOUNT = 100; // 할인 후 첫 달 최소 결제금액(원). PG 최소금액에 맞춰 조정

  // 할인액: 원 할인은 그대로, % 할인은 원 단위 내림(기존 가격 할인과 같은 함수를 써야 함 — 명세 §4)
  function discountOf(listPrice, unit, value) {
    const v = Number(value) || 0;
    if (unit === "pct") return Math.floor((listPrice * v) / 100);
    return Math.floor(v);
  }

  function validateDiscount(listPrice, unit, value) {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return "할인금액·할인율을 입력해 주세요";
    if (unit === "pct" && (v >= 100 || !Number.isInteger(v))) return "할인율은 1~99 사이 정수로 입력해 주세요";
    const amount = listPrice - discountOf(listPrice, unit, v);
    if (amount < MIN_FIRST_AMOUNT) return `할인 후 금액이 ${MIN_FIRST_AMOUNT}원 이상이어야 해요 (0원 첫 달은 «무료 체험권»을 써 주세요)`;
    return "";
  }

  /* 대상 판정(센터별). history = 그 회원(본인 식별 키 기준)의 이 센터 기록만.
     - 결제 이력: 모든 상품, 환불·해지·취소 포함 → 비대상
     - 이용 이력: 출입·수업·증정·센터 직접등록 포함 → 비대상
     - 무료 체험권 발급·이용 기록만 있으면: includeTrialUsers 옵션이 켜져 있을 때만 대상
     - 이미 이 센터에서 첫 구독 할인을 받은 적(claim used) 있거나 진행 중(held, 다른 결제) → 비대상 */
  function judge(history, opts) {
    if (!history) return { state: "unknown", reason: "로그인 전" };
    const h = history;
    if ((h.claims || []).some((c) => c.status === "used")) return { state: "ineligible", reason: "이미 첫 구독 할인을 받음" };
    if ((h.claims || []).some((c) => c.status === "held" && c.quoteId !== (opts && opts.quoteId))) return { state: "ineligible", reason: "다른 결제가 진행 중" };
    const paid = (h.payments || []).filter((p) => p.kind !== "trial");
    if (paid.length) return { state: "ineligible", reason: "이 센터 결제 이력 있음" };
    const used = (h.usages || []).filter((u) => !u.viaTrial);
    if (used.length) return { state: "ineligible", reason: "이 센터 이용 이력 있음" };
    const trial = (h.payments || []).some((p) => p.kind === "trial") || (h.usages || []).some((u) => u.viaTrial);
    if (trial && !(opts && opts.includeTrialUsers)) return { state: "ineligible", reason: "무료 체험권 이용 회원(대상 제외 설정)" };
    return { state: "eligible", reason: trial ? "무료 체험권만 이용(대상 포함 설정)" : "이 센터 이력 없음" };
  }

  function activeAt(ev, now) { return ev.status !== "ended" && ev.start <= now && (ev.end == null || now <= ev.end) && (ev.limit == null || (ev.sold || 0) + (ev.held || 0) < ev.limit); }

  /* 한 구독 상품 옵션의 회원별 가격.
     - 일반 할인(target=all)과 신규 첫 구독(target=first_sub)은 더하지 않는다. 1회차 결제금액이 더 싼 쪽 하나. 같으면 일반 할인(1회 한정 자격을 아껴 둠).
     - 2회차부터: 신규 첫 구독이 없었다면 냈을 금액 = 일반 할인이 갱신에도 유지되는 구조면 그 값, 아니면 정가.
     - 카드 모양은 로그인 여부가 아니라 «할인 설정 여부»로 정한다(display).
       비로그인(history=null): 첫 구독 할인이 설정돼 있으면 신규 손님 기준(첫 구독·일반 중 더 싼 쪽)으로 할인가 카드를 그린다.
       청구액(applied·first)은 로그인 판정 뒤에만 정해진다 → 비로그인의 applied는 none/general 그대로. */
  function priceFor({ option, events, history, now, generalRenews }) {
    const list = option.listPrice;
    const evs = events.filter((e) => e.optionIds.includes(option.id) && e.method === "price" && activeAt(e, now));
    const best = (target) => evs.filter((e) => e.target === target)
      .map((e) => ({ event: e, amount: list - discountOf(list, e.unit, e.value) }))
      .sort((a, b) => a.amount - b.amount)[0] || null;
    const general = best("all");
    const firstEv = best("first_sub");
    const base = general ? general.amount : list;
    const recurring = general && generalRenews ? general.amount : list;
    const out = { list, general, firstEvent: firstEv, judge: null, applied: general ? "general" : "none", first: base, recurring, display: null };
    const show = (kind) => {
      out.display = kind === "first" ? { kind, amount: firstEv.amount, recurring, event: firstEv.event }
        : kind === "general" ? { kind, amount: general.amount, recurring, event: general.event } : { kind: "none", amount: list, recurring: list, event: null };
      return out;
    };
    if (!firstEv) return show(out.applied);
    const j = judge(history, { includeTrialUsers: firstEv.event.includeTrialUsers });
    out.judge = j;
    if (j.state === "unknown") return show(firstEv.amount < base ? "first" : out.applied);
    if (j.state === "eligible" && firstEv.amount < base) {
      out.applied = "first";
      out.first = firstEv.amount;
    }
    return show(out.applied);
  }

  // 견적(결제진행 화면에서 발급, 서버 저장) — 결제 승인 때 이 값으로만 청구한다
  const QUOTE_TTL_MIN = 15;
  function makeQuote(p, { now, optionId, memberId }) {
    return { id: "q_" + Math.random().toString(36).slice(2, 9), memberId, optionId, applied: p.applied,
      eventId: p.applied === "first" ? p.firstEvent.event.id : p.applied === "general" ? p.general.event.id : null,
      listPrice: p.list, firstAmount: p.first, recurringAmount: p.recurring, issuedAt: now, expiresAt: addMin(now, QUOTE_TTL_MIN) };
  }
  function addMin(iso, m) { const d = new Date(iso.replace(" ", "T") + ":00+09:00"); d.setMinutes(d.getMinutes() + m); return fmt(d); }
  function fmt(d) { const k = new Date(d.getTime() + 9 * 3600e3).toISOString(); return k.slice(0, 10) + " " + k.slice(11, 16); }

  /* 결제 승인 직전 재검사. 결과: ok(견적대로 청구) | changed(새 가격 다시 확인받기 — 몰래 비싸게 청구 금지) */
  function revalidate(quote, ctx) {
    if (ctx.now > quote.expiresAt) return { result: "changed", why: "견적 유효시간(15분) 지남" };
    if (quote.applied !== "first") return { result: "ok" };
    const ev = ctx.events.find((e) => e.id === quote.eventId);
    if (!ev) return { result: "changed", why: "이벤트 삭제" };
    // 이벤트 종료 경계: 종료 전에 받은 견적은 유효시간 안이면 인정(선착순 자리도 견적 때 잡아 둠)
    if (ev.end != null && quote.issuedAt > ev.end) return { result: "changed", why: "이벤트 종료 후 견적" };
    const j = judge(ctx.history, { includeTrialUsers: ev.includeTrialUsers, quoteId: quote.id });
    if (j.state !== "eligible") return { result: "changed", why: j.reason };
    return { result: "ok" };
  }

  // 구독 회차별 청구 금액
  function chargeFor(sub, n) { return n === 1 ? sub.firstAmount : sub.recurringAmount; }

  // 타임세일 카드 아래 «10일 11:45:55 남음». 종료일 없는 이벤트는 null
  function remainLabel(end, now) {
    if (end == null) return null;
    const t = (x) => new Date(x.replace(" ", "T") + (x.length <= 16 ? ":00" : "") + "+09:00").getTime();
    let s = Math.max(0, Math.floor((t(end) - t(now)) / 1000) + 59);
    const d = Math.floor(s / 86400); s %= 86400;
    const p = (n) => String(n).padStart(2, "0");
    return `${d ? d + "일 " : ""}${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)} 남음`;
  }
  /* 선착순 «N장 남음» 표시(v1.3). 남은 장수 = 선착순 수량 − 판매 − 잡아 둔 자리(held).
     선착순 미설정(limit=null) → 표시 안 함. 1~10장 → 표시(카드 위 «⏰ N장 남음» + 딱지 «마감 임박»). 11장 이상 → 표시 안 함.
     0장 = 매진 → activeAt()이 이벤트를 빼서 카드가 정가/일반가로 돌아감(기존 규칙, 새 화면 없음). */
  const REMAIN_SHOW_MAX = 10;
  function remainOf(ev) { if (!ev || ev.limit == null) return null; return Math.max(0, ev.limit - (ev.sold || 0) - (ev.held || 0)); }
  function showRemain(ev) { const r = remainOf(ev); return r != null && r >= 1 && r <= REMAIN_SHOW_MAX ? r : null; }
  const won = (n) => Math.round(n).toLocaleString("ko-KR");
  const api = { MIN_FIRST_AMOUNT, QUOTE_TTL_MIN, discountOf, validateDiscount, judge, priceFor, makeQuote, revalidate, chargeFor, addMin, won, activeAt, remainLabel, REMAIN_SHOW_MAX, remainOf, showRemain };
  if (typeof module !== "undefined") module.exports = api; else root.FSE = api;
})(typeof window !== "undefined" ? window : globalThis);
