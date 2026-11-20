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
     - 이미 이 센터에서 첫 구독 할인을 받은 적(claim used) 있으면 → 비대상
     - «결제 완료(승인 성공)»만 이력이다. 승인 실패·승인 전 이탈(failed/aborted)은 이력이 아니다 → 몇 번 실패해도, 시간이 지나도 계속 신규
       (승인 뒤 환불·해지는 결제 완료가 있었으므로 이력) */
  const NOT_COMPLETED = ["failed", "aborted"];
  const completed = (p) => !NOT_COMPLETED.includes(p.status);
  function judge(history, opts) {
    if (!history) return { state: "unknown", reason: "로그인 전" };
    const h = history;
    if ((h.claims || []).some((c) => c.status === "used")) return { state: "ineligible", reason: "이미 첫 구독 할인을 받음" };
    const paid = (h.payments || []).filter((p) => p.kind !== "trial" && completed(p));
    if (paid.length) return { state: "ineligible", reason: "이 센터 결제 이력 있음" };
    const used = (h.usages || []).filter((u) => !u.viaTrial);
    if (used.length) return { state: "ineligible", reason: "이 센터 이용 이력 있음" };
    const trial = (h.payments || []).some((p) => p.kind === "trial" && completed(p)) || (h.usages || []).some((u) => u.viaTrial);
    if (trial && !(opts && opts.includeTrialUsers)) return { state: "ineligible", reason: "무료 체험권 이용 회원(대상 제외 설정)" };
    return { state: "eligible", reason: trial ? "무료 체험권만 이용(대상 포함 설정)" : "이 센터 이력 없음" };
  }

  function activeAt(ev, now) { return ev.status !== "ended" && ev.start <= now && (ev.end == null || now <= ev.end) && (ev.limit == null || (ev.sold || 0) < ev.limit); }

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

  /* 결제 승인 시점 재판정 — 화면에 보여 준 가격(shown)과 «지금» 다시 계산한 가격을 비교한다.
     결제창에 들어온 시각·머문 시간은 보지 않는다(결제창 가격 묶기·자리 잡아두기 없음). 이벤트 종료·선착순·관리자 할인액 수정·자격은 전부 승인 시점 값.
     ctx = priceFor 인자 + inFlight(같은 이벤트로 지금 PG 응답을 기다리는 다른 승인 건수 — 초 단위, 마지막 자리 동시 승인 방지)
     결과: ok(보여 준 가격으로 청구) | changed(새 가격으로 다시 확인받기 — 몰래 비싸게 청구 금지, PG 호출 전 반환) */
  function approveCheck(shown, ctx) {
    const evs = (ctx.events || []).map((e) => e.id === shown.eventId && e.limit != null ? Object.assign({}, e, { sold: (e.sold || 0) + (ctx.inFlight || 0) }) : e);
    const p = priceFor(Object.assign({}, ctx, { events: evs }));
    if (p.applied === shown.applied && p.first === shown.firstAmount) return { result: "ok", price: p };
    let why = "amount_changed";
    if (shown.applied === "first" && p.applied !== "first") {
      const ev = (ctx.events || []).find((e) => e.id === shown.eventId);
      const j = judge(ctx.history, { includeTrialUsers: ev && ev.includeTrialUsers });
      why = !ev || ev.status === "ended" ? "ended" : ev.end != null && ctx.now > ev.end ? "ended"
        : ev.limit != null && (ev.sold || 0) + (ctx.inFlight || 0) >= ev.limit ? "soldout" : j.state !== "eligible" ? "ineligible" : "amount_changed";
    }
    return { result: "changed", why, price: p };
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
  /* 선착순 «N장 남음» 표시(v1.3). 남은 장수 = 선착순 수량 − 결제 완료 건수(sold). 결제창 진입·승인 실패는 빼지 않는다.
     선착순 미설정(limit=null) → 표시 안 함. 1~10장 → 표시(카드 위 «⏰ N장 남음» + 딱지 «마감 임박»). 11장 이상 → 표시 안 함.
     0장 = 매진 → activeAt()이 이벤트를 빼서 카드가 정가/일반가로 돌아감(기존 규칙, 새 화면 없음). */
  const REMAIN_SHOW_MAX = 10;
  function remainOf(ev) { if (!ev || ev.limit == null) return null; return Math.max(0, ev.limit - (ev.sold || 0)); }
  function showRemain(ev) { const r = remainOf(ev); return r != null && r >= 1 && r <= REMAIN_SHOW_MAX ? r : null; }
  const won = (n) => Math.round(n).toLocaleString("ko-KR");
  const api = { MIN_FIRST_AMOUNT, discountOf, validateDiscount, judge, priceFor, approveCheck, chargeFor, won, activeAt, remainLabel, REMAIN_SHOW_MAX, remainOf, showRemain };
  if (typeof module !== "undefined") module.exports = api; else root.FSE = api;
})(typeof window !== "undefined" ? window : globalThis);
