(function () {
  const E = window.FSE, S = window.FSD, won = E.won;
  const qs = new URLSearchParams(location.search);
  const KEY = "fsd_v1";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nw = (t) => `<span class="nw">${t}</span>`;

  // ───────── 상태 ─────────
  function fresh() { return { events: S.seedEvents(), extraHist: {}, nextId: 161100 }; }
  let st = (() => { if (qs.has("reset")) return fresh(); try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } })();
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));
  const ui = {
    view: qs.get("v") || "center",
    who: qs.get("who") || "new",
    center: qs.get("c") || "doksan",
    overlap: qs.get("ov") === "1",
    renew: qs.get("renew") === "1",
    noEnd: qs.get("end") === "0",
    noFs: qs.get("fs") === "0",
    sim: qs.get("sim") || "ok",
    af: { method: "all", target: qs.get("tf") || "all", status: "all", limit: "all" },
    form: null,
    done: null,
  };
  const persona = () => S.PERSONAS.find((p) => p.id === ui.who);
  function events() { return st.events.concat(ui.overlap ? [S.GENERAL_OVERLAP("doksan"), S.GENERAL_OVERLAP("dapsimni")] : []); }
  function history() {
    const p = persona();
    if (!p.hist) return null;
    const base = JSON.parse(JSON.stringify(p.hist[ui.center] || {}));
    const ex = (st.extraHist[p.id] || {})[ui.center];
    if (ex) for (const k of ["payments", "usages", "claims"]) base[k] = (base[k] || []).concat(ex[k] || []);
    return base;
  }
  // 조작판 «할인 종료일 없음»: 회원 화면에서 종료일 없는 할인(→ 이벤트 할인가 카드)으로 바꿔 봄
  function shopEvents() { return events().filter((e) => e.center === ui.center && !(ui.noFs && e.target === "first_sub")).map((e) => (ui.noEnd ? Object.assign({}, e, { end: null }) : e)); }
  function price() {
    return E.priceFor({ option: S.SUB_OPTION, events: shopEvents(), history: history(), now: S.NOW, generalRenews: ui.renew });
  }
  function toast(t) { document.querySelectorAll(".saved").forEach((x) => x.remove()); const d = document.createElement("div"); d.className = "saved"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }
  function modal(html) { document.getElementById("modal").innerHTML = html ? `<div class="dim c"><div class="mdl">${html}</div></div>` : ""; }

  // ───────── 회원: 센터 상세 (형 캡처 01·02 구조 그대로) ─────────
  const CHECKS = ["월 정기결제 멤버십", "한꺼번에 결제말고 월 구독!", "언제든 구독해지 가능!"];
  const ICO_CHK = `<svg viewBox="0 0 20 20" width="17" height="17"><circle cx="10" cy="10" r="10" fill="#16B364"/><path d="M5.6 10.3l2.9 2.8 5.9-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  /* 실서비스 상품 카드 3가지 모양(구독·일반 상품 공통)
     - 할인 없음: 검은 머리 정가 카드
     - 할인 + 종료일 없음: 빨간 머리 «이벤트 할인가» 카드
     - 할인 + 종료일 있음: 노란 머리 «TIME SALE» 카드 + 카드 밖 아래 남은 시간 */
  function card({ head, sub, lp, mid, big, nx, end, badge, buy }) {
    const disc = lp != null, ts = disc && end != null;
    const kind = !disc ? "" : ts ? "ts" : "ev";
    const bd = !disc ? "" : ts ? `<span class="tsbadge"><i>TIME<br>SALE</i></span>` : `<span class="ebadge ${badge === "first" ? "fsb" : ""}">${badge === "first" ? "첫구독<br>할인가" : "이벤트<br>할인가"}</span>`;
    const body = !disc ? `<span class="one">${big}</span>`
      : `<span class="lp">${won(lp)}원</span>${mid ? `<span class="p">${mid}</span>` : ""}<span class="big">${big}</span>${nx ? `<span class="nx">${nx}</span>` : ""}`;
    const left = ts ? E.remainLabel(end, S.NOW) : null;
    return `<div class="cw"><div class="card ${kind} ${nx ? "fs" : ""}" ${buy ? 'data-buy="1"' : ""}>${bd}<div class="c1">${head}</div><div class="c2">${sub}</div><div class="c3">${body}</div></div>${left ? `<div class="left">${left}</div>` : ""}</div>`;
  }
  function subCard(pr) {
    const o = S.SUB_OPTION, d = pr.display, end = d.event ? d.event.end : null;
    if (d.kind === "first") {
      return card({ head: o.label, sub: o.usage, lp: pr.list, mid: end != null ? "첫 구독 할인가" : null, big: `첫 달 ${won(d.amount)}원`, nx: `다음 달부터 월 ${won(d.recurring)}원`, end, badge: "first", buy: 1 });
    }
    if (d.kind === "general") return card({ head: o.label, sub: o.usage, lp: pr.list, big: `월 ${won(d.amount)}원`, end, buy: 1 });
    return card({ head: o.label, sub: o.usage, big: `월 ${won(pr.list)}원`, buy: 1 });
  }
  const NOT_REASON = { "이미 첫 구독 할인을 받음": "이미 첫 구독 할인을 받으셨어요", "다른 결제가 진행 중": "다른 결제가 진행 중이에요", "이 센터 결제 이력 있음": "이 센터 결제 이력이 있어요", "이 센터 이용 이력 있음": "이 센터 이용 이력이 있어요", "무료 체험권 이용 회원(대상 제외 설정)": "무료 체험권을 이용하셨어요" };
  // 로그인 후 비대상: 첫 구독 할인이 신규 손님에게 보였을 상품이면 안내 한 줄(카드는 이미 본인 가격으로 그려짐)
  function notTarget(pr) {
    const fe = pr.firstEvent, base = pr.general ? pr.general.amount : pr.list;
    if (!fe || !pr.judge || pr.judge.state !== "ineligible" || fe.amount >= base) return "";
    return `<p class="fs-not"><b>ⓘ</b>이 센터 첫 구독 할인 대상이 아니에요<span>${esc(NOT_REASON[pr.judge.reason] || pr.judge.reason)}</span></p>`;
  }
  function centerView() {
    const c = S.CENTERS[ui.center], pr = price();
    // 일반(비구독) 상품: 2개월에 일반 할인(11-30 종료) — 종료일 있으면 TIME SALE, 없으면 이벤트 할인가
    const hEnd = ui.noEnd ? null : "2026-11-30 23:59";
    const healthCards = [["1개월", "하루 1회 이용", 90000, 90000, 1], ["2개월", "하루 1회 이용", 170000, 140000, 2], ["3개월", "무제한 이용", 190000, 190000, 3]].map(([a, b, lp, p, m]) =>
      lp > p ? card({ head: a, sub: b, lp, mid: `${won(p)}원`, big: `월 ${won(p / m)}원`, end: hEnd }) : card({ head: a, sub: b, big: `${won(p)}원` })).join("");
    return `<div class="phone shop cd">
      <div class="cd-photo"><span class="cb l">‹</span><span class="cb r1">♥</span><span class="cb r2">⇪</span><span class="cnt">3/50</span><span class="all">전체보기</span></div>
      <div class="cd-info"><h2>${esc(c.name)}</h2>
        <div class="cd-meta"><span><b class="ht">♥</b> ${won(c.likes)}</span><span><b class="st">★</b> 이용후기 <i>›</i></span><span class="rp"><b>P</b>잘못된 정보 신고</span></div>
        <div class="cd-btns"><span><b class="bl">◎</b>위치보기</span><span class="gr"><b>✆</b>전화상담</span><span><b class="kk">Ch</b>카톡상담</span></div>
        <div class="cd-line"><span class="k ev">이벤트</span><span class="ar">▶</span><span class="v">🎁11월 막판 질주 이벤트💥헬스 3, 6개월 11월 특별상품 / 헬스 구독 멤버십 출시 기념 이벤트</span><span class="dn">⌄</span></div>
        <div class="cd-line"><span class="k nt">※공지</span><span class="ar">▶</span><span class="v">실내용 운동화 지참 필수, 미지참시 입장 불가합니다.</span></div>
      </div>
      <div class="cd-gap"></div>
      <div class="ins"><i></i>최대 <b>7개월</b> 무이자 할부</div>
      <h3>멤버십 구매</h3>
      <h4 class="subh">헬스 구독 멤버십 <span class="subchip">✱ 구독멤버십</span></h4>
      <div class="subrow">${subCard(pr)}<div class="checks">${CHECKS.map((t) => `<div>${ICO_CHK}${t}</div>`).join("")}</div></div>
      ${notTarget(pr)}
      <div class="notice">☕커피&얼음 무제한 무료🧊</div>
      <h4>헬스</h4><div class="cards">${healthCards}</div>
      <div style="height:40px"></div></div>`;
  }

  // ───────── 회원: 결제진행 (증정 시안에서 재현한 실결제 화면 구조 그대로) ─────────
  const ICON_TAG = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/></svg>`;
  const ICON_GIFT = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8S10.5 3 7.5 3.8C5.6 4.3 6.5 8 12 8zm0 0s1.5-5 4.5-4.2C18.4 4.3 17.5 8 12 8z"/></svg>`;
  const PERIOD = ["2026-11-20", "2026-12-19"], NEXT = "2026-12-20";
  function checkout(pr) {
    const disc = pr.list - pr.first;
    return { list: pr.list, sale: pr.first, disc, pct: Math.floor((disc / pr.list) * 100), point: Math.round(pr.first * 0.012) };
  }
  function rxHead(title, back) {
    return `${qs.has("clean") ? `<div class="sb"><b>11:31</b><span>▮▮▮▮ LTE ▭</span></div>` : ""}<div class="rx-hd"><span class="rx-bk" data-go="${back}"></span><h1>${title}</h1></div>`;
  }
  function payView() {
    const pr = price(), c = checkout(pr), first = pr.applied === "first";
    const dname = first ? "신규 첫 구독 할인" : "이벤트 할인";
    const plan = first ? `<div class="fs-plan"><div class="h">첫 달 <b>${won(pr.first)}원</b>, 다음 달부터 매월 <b>${won(pr.recurring)}원</b> 자동결제</div>
        <div class="tl"><div><span class="n">1회차 · 오늘</span><span class="d">${PERIOD[0]}</span><b class="pk">${won(pr.first)}원</b></div>
        <div><span class="n">2회차부터 · 매월</span><span class="d">${NEXT}~</span><b>${won(pr.recurring)}원</b></div></div>
        <p>신규 첫 구독 할인은 이 센터에서 한 번만 받을 수 있어요</p></div>` : "";
    return `<div class="phone rx pay">${rxHead("결제진행", "center")}<div class="rx-body">
      <div class="rx-row"><span class="k b">이용센터</span><span class="v b">${esc(S.CENTERS[ui.center].name)}</span></div>
      <div class="rx-row tk"><span class="k b">이용권</span><span class="v"><span class="b">${esc(S.SUB_OPTION.productName)}</span><span class="tu">${nw("구독멤버십 · 하루 2회 이용")}</span></span></div>
      <div class="rx-row"><span class="k b">이용기간</span><span class="v d">${PERIOD[0]} ~ ${PERIOD[1]}</span></div>
      ${plan}
      <div class="rx-hist"><div class="h">결제내역</div><div class="it"><div class="t">${esc(S.SUB_OPTION.productName)} 1개월${first ? " (첫 달)" : ""}</div><div class="r"><span>${PERIOD[0]} ~ ${PERIOD[1]}</span><b>${won(c.list)}원</b></div></div></div>
      <div class="rx-row sum"><span class="k g">상품 금액</span><b>${won(c.list)}원</b></div>
      <div class="rx-row"><span class="k b">쿠폰</span><span class="rt">적용가능 쿠폰 0장</span></div>
      <div class="rx-in"><div class="k b">쿠폰 코드</div><div class="f"><input placeholder="쿠폰 코드 입력" aria-label="쿠폰 코드"><button>코드확인</button></div></div>
      <div class="rx-in pt"><div class="hh"><span class="k b">포인트</span><span class="pv">90,372,373 P</span></div><div class="f"><input placeholder="0 원" aria-label="포인트"><button>전액사용</button></div></div>
      ${c.disc > 0 ? `<div class="rx-disc"><div class="h">할인 내역</div>
        <div class="l"><span class="ic t">${ICON_TAG}</span><span class="et">${dname}</span><b>-${won(c.disc)}원</b></div>
        <div class="tot"><b>총 <em>${won(c.disc)}원</em> 아꼈어요</b><span>${won(c.list)}원에서 ${c.pct}% 할인</span></div></div>` : ""}
      <div class="rx-ben">${ICON_GIFT}<p><span class="g">이번 결제 혜택</span> ${c.disc > 0 ? `<em class="pk">할인 ${won(c.disc)}원</em> + ` : ""}<em class="gr">적립 ${won(c.point)}P</em></p></div>
      <p class="rx-note">※ 포인트로 결제한 금액은 적립에서 제외돼요</p>
      <div class="rx-hr"></div>
      <div class="rx-pm"><b>결제수단 선택</b>${["신용카드", "카드 간편결제", "Npay"].map((t, i) => `<label><input type="radio" name="pm" ${i ? "" : "checked"}><i></i>${t}</label>`).join("")}</div>
      <p class="rx-agree">※ 주문 내용을 확인하였으며, <u>환불규정, 서비스 이용약관</u> 및 결제에 동의합니다.${first ? `<br>※ 다음 달(${NEXT})부터 매월 ${won(pr.recurring)}원이 자동결제되며, 언제든 구독해지할 수 있어요.` : ""}</p>
    </div>
    <div class="rx-bar">
      ${c.disc > 0 ? `<div class="b1"><s>${won(c.list)}원</s><span class="pill">${won(c.disc)}원 할인 · ${c.pct}%↓</span></div>` : ""}
      <div class="b2"><span>최종 결제금액</span><b>${won(c.sale)}<small>원</small></b></div>
      ${first ? `<div class="b4">첫 달만 할인 · 다음 달부터 매월 ${won(pr.recurring)}원</div>` : ""}
      <div class="b3"><i>P<sup>+</sup></i>결제하면 <b>${won(c.point)}P</b> 적립돼요</div>
      <button class="rx-btn" data-pay="1">결제하기</button></div></div>`;
  }

  // 결제 버튼: 서버 재검사 흉내(조작판 «결제 순간 상황»)
  function doPay(force) {
    const pr = price();
    const q = E.makeQuote(pr, { now: S.NOW, optionId: S.SUB_OPTION.id, memberId: ui.who });
    if (!force && pr.applied === "first") {
      if (ui.sim === "lost") {
        const reg = pr.general ? pr.general.amount : pr.list;
        return modal(`<h5>가격이 바뀌었어요</h5><p>결제하는 사이에 이 센터 이용 기록이 생겨서 <b>신규 첫 구독 할인 대상이 아니게</b> 됐어요.<br>결제는 아직 되지 않았어요.</p>
          <div class="cmpp"><span><s>첫 달 ${won(pr.first)}원</s></span><span>→ 첫 달 <b>${won(reg)}원</b></span></div>
          <div class="acts"><button class="btn" data-x="1">취소</button><button class="btn pri" data-payreg="1">${won(reg)}원으로 결제</button></div>`);
      }
      if (ui.sim === "fail") {
        ui.sim = "ok"; syncDemo();
        return modal(`<h5>카드 승인이 안 됐어요</h5><p>한도·잔액을 확인하고 다시 시도해 주세요.<br><b>첫 달 ${won(pr.first)}원 할인은 그대로 유지돼요.</b> (15분 안에 다시 결제하면 같은 가격)</p>
          <div class="acts"><button class="btn" data-x="1">닫기</button><button class="btn pri" data-retry="1">다시 결제하기</button></div>`);
      }
    }
    finish(pr, force === "reg" ? "reg" : null, q);
  }
  function finish(pr, mode, q) {
    const reg = mode === "reg";
    const first = !reg && pr.applied === "first";
    const amount = reg ? (pr.general ? pr.general.amount : pr.list) : pr.first;
    const recurring = reg ? (pr.general && ui.renew ? pr.general.amount : pr.list) : pr.recurring;
    const p = persona();
    st.extraHist[p.id] = st.extraHist[p.id] || {};
    const h = (st.extraHist[p.id][ui.center] = st.extraHist[p.id][ui.center] || {});
    (h.payments = h.payments || []).push({ kind: "sub", title: "헬스 구독 멤버십 1회차", status: "paid", at: S.NOW.slice(0, 10) });
    if (first) {
      (h.claims = h.claims || []).push({ status: "used", at: S.NOW.slice(0, 10), quoteId: q.id });
      const ev = st.events.find((e) => e.id === pr.firstEvent.event.id);
      if (ev) { ev.sold++; ev.stats = ev.stats || { pay: 0, rev: 0, second: 0, secondRev: 0 }; ev.stats.pay++; ev.stats.rev += amount; }
    }
    save(); modal("");
    ui.done = { first, amount, recurring, list: pr.list, sim: ui.sim };
    ui.view = "done"; render(); scrollTo(0, 0);
  }
  function doneView() {
    const d = ui.done;
    if (!d) return `<div class="phone"><div class="ph-top">결제 완료</div><div class="done"><p class="sub">센터 상세에서 결제를 먼저 해 주세요</p><button class="paybtn" data-go="center">센터 상세로</button></div></div>`;
    const edge = d.sim === "end" ? `<p class="fs-edge">이벤트 종료(23:59) 직전에 결제 화면에 들어왔다면, 15분 안에 결제하면 할인이 그대로 적용돼요.</p>`
      : d.sim === "soldout" ? `<p class="fs-edge">결제 화면에 들어올 때 선착순 자리를 15분간 잡아 둬서, 그사이 마감돼도 할인이 유지돼요.</p>` : "";
    return `<div class="phone"><div class="ph-top">결제 완료</div><div class="done">
      <div class="ok">✓</div><h5>결제가 완료됐어요</h5><p class="sub">헬스 구독 멤버십 · ${d.first ? "첫 달 " : ""}${won(d.amount)}원</p>
      <div class="fs-done">
        <div class="r"><span class="k">오늘 결제</span><span class="v"><b>${won(d.amount)}원</b>${d.first ? `<em>신규 첫 구독 할인</em>` : ""}</span></div>
        <div class="r"><span class="k">이용기간</span><span class="v">${PERIOD[0]} ~ ${PERIOD[1]}</span></div>
        ${d.first ? "" : `<div class="r"><span class="k">다음 결제</span><span class="v">${NEXT}부터 매월 <b>${won(d.recurring)}원</b> 자동결제</span></div>`}
      </div>
      ${d.first ? `<div class="fs-plan sm"><div class="h">첫 달 <b>${won(d.amount)}원</b>, 다음 달부터 매월 <b>${won(d.recurring)}원</b> 자동결제</div><p>다음 결제일 ${NEXT} · 구독은 언제든 해지할 수 있어요<br>해지 후 다시 가입하면 정상가로 결제돼요</p></div>` : ""}
      ${edge}
      <button class="paybtn" data-go="center">확인</button></div></div>`;
  }

  // ───────── 관리자: 목록 (형 캡처 03 구조) ─────────
  function stLabel(e) { if (e.status === "ended" || e.end < S.NOW) return ["종료", "end"]; if (e.start > S.NOW) return ["진행예정", "pre"]; return ["진행중", "on"]; }
  const CAL = `<svg class="cal" viewBox="0 0 24 24" fill="none" stroke="#7A8291" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`;
  const pill = (group, val, cur, label) => `<button class="pl ${cur === val ? "on" : ""}" data-f="${group}:${val}">${label}</button>`;
  const fmtD = (s) => s.slice(0, 10).replace(/-/g, ".");
  function listView() {
    const f = ui.af, c = S.CENTERS[ui.center];
    const all = events().filter((e) => e.center === ui.center);
    const rows = all.filter((e) => (f.method === "all" || e.method === f.method)
      && (f.target === "all" || (f.target === "first_sub" ? e.target === "first_sub" : e.method === "price" && e.target === "all"))
      && (f.status === "all" || stLabel(e)[1] === f.status)
      && (f.limit === "all" || (f.limit === "none" ? e.limit == null : e.limit != null))).sort((a, b) => b.created.localeCompare(a.created));
    const fs = rows.filter((e) => e.target === "first_sub");
    const sum = fs.reduce((a, e) => { const s = e.stats || {}; a.pay += s.pay || 0; a.rev += s.rev || 0; a.second += s.second || 0; a.secondRev += s.secondRev || 0; return a; }, { pay: 0, rev: 0, second: 0, secondRev: 0 });
    const summary = fs.length ? `<div class="fs-sum"><div class="h"><span class="tchip">신규 첫 구독</span> 할인으로 들어온 결제 <small>· 지금 목록 조건 기준 ${fs.length}개 이벤트</small></div>
      <div class="tl4"><div><span>첫 결제</span><b>${won(sum.pay)}건</b></div><div><span>첫 달 매출</span><b>${won(sum.rev)}원</b></div>
      <div><span>2회차 이어서 결제</span><b>${won(sum.second)}건 <small>${sum.pay ? Math.round((sum.second / sum.pay) * 100) : 0}%</small></b></div><div><span>2회차 매출(정상가)</span><b>${won(sum.secondRev)}원</b></div></div></div>` : "";
    const trs = rows.map((e) => {
      const [sl, sk] = stLabel(e), s = e.stats || {};
      const kind = e.method === "trial" ? "무료 체험권" : "가격 할인";
      return `<tr><td><b class="et">${esc(e.title)}</b><div class="sub">#${e.id} · ${kind}${e.target === "first_sub" ? ` · <span class="tchip">신규 첫 구독</span>` : ""}</div></td>
        <td class="pd">${e.start.replace(/-/g, ".")}<div class="sub2">~ ${e.end.replace(/-/g, ".")}</div></td>
        <td class="r">${won(s.pay || 0)}건<div class="sub">${e.limit == null ? "선착순 없음" : `선착순 ${won(e.sold)}/${won(e.limit)}명`}</div></td>
        <td class="r">${won(s.rev || 0)}원${e.target === "first_sub" ? `<div class="sub">2회차 ${won(s.second || 0)}건 · ${won(s.secondRev || 0)}원</div>` : ""}</td>
        <td>${fmtD(e.created)}<div class="sub">${e.created.slice(11)}</div></td>
        <td><span class="stc ${sk}">${sl}</span>${sk !== "end" ? `<u class="endl">종료</u>` : ""}</td></tr>`;
    }).join("");
    return `<div class="adw"><div class="adp">
      <div class="ah"><div><h1>할인이벤트&체험권 관리 · ${esc(c.name)}</h1><p class="tot">총 <b>${all.length}</b>개</p></div>
        <div class="abtn"><button class="ob">전체목록</button><button class="pb" data-go="form">이벤트 만들기</button></div></div>
      <div class="abox ment"><div class="mh"><b>이벤트 광고 멘트</b> <span>선택</span></div><div class="md"><span>진행 중인 이벤트를 짧게 소개하면 센터 소개 상단에 노출돼요.</span><span>60 / 500</span></div>
        <div class="ta">🎁11월 막판 질주 이벤트💥헬스 2, 5개월 11월 특별상품 / 전체 회원 커피&얼음 무제한 무료 제공!</div>
        <div class="mrow"><label class="ck on"><i></i>배너 노출</label><span class="dt">${CAL}노출 시작일</span><span class="tl">~</span><span class="dt">${CAL}노출 종료일</span><label class="ck"><i></i>종료일 없이 계속 노출</label><button class="ob sm">멘트 저장</button></div></div>
      <div class="abox flt">
        <div class="fr"><span class="fk">판매 방식</span>${pill("method", "all", f.method, "전체")}${pill("method", "price", f.method, "가격 할인")}${pill("method", "trial", f.method, "무료 체험권")}</div>
        <div class="fr new"><span class="fk">할인 대상</span>${pill("target", "all", f.target, "전체")}${pill("target", "everyone", f.target, "전체 회원")}${pill("target", "first_sub", f.target, "신규 첫 구독")}</div>
        <div class="fr"><span class="fk">상태</span>${pill("status", "all", f.status, "전체")}${pill("status", "pre", f.status, "진행예정")}${pill("status", "on", f.status, "진행중")}${pill("status", "end", f.status, "종료")}</div>
        <div class="fr"><span class="fk">선착순</span>${pill("limit", "all", f.limit, "전체")}${pill("limit", "none", f.limit, "무제한")}${pill("limit", "some", f.limit, "제한")}</div>
        <div class="fr"><span class="fk">등록일</span><button class="pl on">전체</button><button class="pl">오늘</button><button class="pl">어제</button><button class="pl">지난6일</button><button class="pl">저번달</button><span class="dt">${CAL}시작일</span><span class="tl">~</span><span class="dt">${CAL}종료일</span></div>
        <div class="fr"><span class="fk">종목</span><span class="sel">전체 종목</span><span class="sp"></span><span class="sel s2">최신순</span></div>
      </div>
      ${summary}
      <table class="atb"><thead><tr><th>이벤트</th><th>진행기간</th><th class="r">결제 · 선착순</th><th class="r">매출</th><th>등록일</th><th>상태</th></tr></thead>
      <tbody>${trs || `<tr><td colspan="6" class="empty">조건에 맞는 이벤트가 없어요</td></tr>`}</tbody></table>
    </div></div>`;
  }

  // ───────── 관리자: 등록 (형 캡처 04~06 구조) ─────────
  function newForm() { return { method: "price", cat: qs.get("cat") || "", opts: qs.get("cat") === "health_sub" ? ["sub_h2"] : [], target: qs.get("tg") || "all", trial: true, unit: qs.get("unit") || "won", value: qs.get("val") || "", unlimited: true, limit: "", start: "2026-11-20 11시", end: "", auto: false }; }
  function formView() {
    const F = (ui.form = ui.form || newForm()), c = S.CENTERS[ui.center];
    const cat = S.CATEGORIES.find((x) => x.id === F.cat);
    const isSub = !!(cat && cat.sub), anySel = F.opts.length > 0;
    const showTarget = isSub && anySel && F.method === "price";
    const fsMode = showTarget && F.target === "first_sub";
    const optRows = cat ? cat.options.map(([id, name]) => `<label class="cb ${F.opts.includes(id) ? "on" : ""}"><input type="checkbox" data-opt="${id}" ${F.opts.includes(id) ? "checked" : ""}><i></i>${esc(name)}</label>`).join("") : "";
    const overlap = fsMode && events().some((e) => e.center === ui.center && e.target === "all" && e.method === "price" && e.optionIds.some((x) => F.opts.includes(x)) && e.status !== "ended");
    const target = showTarget ? `<div class="fsec new"><h3>할인 대상 <span class="newtag">구독 상품</span></h3>
      <div class="seg"><button class="${F.target === "all" ? "on" : ""}" data-tg="all">${F.target === "all" ? "✓ " : ""}전체 회원</button><button class="${F.target === "first_sub" ? "on" : ""}" data-tg="first_sub">${F.target === "first_sub" ? "✓ " : ""}신규 첫 구독만</button></div>
      <p class="hint">${fsMode ? "이 센터에서 결제·이용 이력이 없는 회원에게 <b>구독 첫 결제(1회차)만</b> 할인해요. 2회차부터는 정상가로 자동결제돼요. 한 사람당 이 센터에서 한 번만 받을 수 있어요." : "구독 상품은 «신규 첫 구독만»을 고르면 이 센터를 처음 이용하는 회원의 첫 달만 할인할 수 있어요."}</p>
      ${fsMode ? `<label class="cb sm ${F.trial ? "on" : ""}"><input type="checkbox" data-trial="1" ${F.trial ? "checked" : ""}><i></i>무료 체험권만 이용한 회원도 대상에 포함</label>
        <p class="hint s">끄면 이 센터 무료 체험권을 받은 적 있는 회원은 대상에서 빠져요.</p>` : ""}
      ${overlap ? `<p class="ovl">ⓘ 같은 상품에 «전체 회원» 할인이벤트가 진행 중이에요. 회원에게는 <b>둘 중 첫 달 가격이 더 싼 쪽 하나만</b> 적용돼요(겹쳐서 할인되지 않아요).</p>` : ""}
    </div>` : "";
    const disc = anySel && cat ? F.opts.map((id) => {
      const [, name, lp] = cat.options.find((o) => o[0] === id);
      const err = F.value !== "" ? E.validateDiscount(lp, F.unit, F.value) : "";
      const after = F.value !== "" && !err ? lp - E.discountOf(lp, F.unit, F.value) : lp;
      return `<div class="dbox"><div class="dh"><b>${esc(name.split(" · ")[0])}</b> <span>현재가격 ${won(lp)}원${isSub ? " / 월" : ""}</span></div>
        <div class="dg"><div><div class="lb">${fsMode ? "첫 달 할인금액 · 할인율(필수)" : "할인금액 · 할인율(필수)"}</div>
          <div class="ir"><input class="inp" data-val="1" inputmode="numeric" placeholder="할인금액,할인율" value="${esc(F.value)}"><span class="ut"><button class="${F.unit === "won" ? "on" : ""}" data-unit="won">원</button><button class="${F.unit === "pct" ? "on" : ""}" data-unit="pct">%</button></span></div>
          ${err ? `<p class="err">${esc(err)}</p>` : fsMode ? `<p class="ap">첫 달 결제 금액 : <b>${won(after)}</b>원 <span class="nx">· 다음 달부터 매월 ${won(lp)}원(정상가)</span></p>` : `<p class="ap">할인된 가격 : <b>${won(after)}</b>원</p>`}</div>
        <div><div class="lb">선착순</div><div class="ir"><input class="inp lim ${F.unlimited ? "dis" : ""}" data-lim="1" ${F.unlimited ? "disabled" : ""} value="${esc(F.limit)}"><span class="mt">명 까지 구매가능</span></div>
          <label class="cb sm ${F.unlimited ? "on" : ""}"><input type="checkbox" data-unl="1" ${F.unlimited ? "checked" : ""}><i></i>구매가능 인원 제한없다면 체크</label></div></div></div>`;
    }).join("") : "";
    return `<div class="adw"><div class="adp fm">
      <div class="fh"><h1>할인이벤트&체험권 등록 - ${esc(c.name)}</h1><span class="q">?</span></div>
      <div class="fsec"><h3>판매 방식</h3><div class="seg"><button class="on">✓ 가격 할인</button><button>무료 체험권</button></div><p class="hint">선택한 상품을 정해진 기간 동안 할인해 판매합니다.</p></div>
      <div class="fsec"><h3>할인이벤트 개최할 종목 선택</h3><select class="sel2" data-cat="1"><option value="">선택</option>${S.CATEGORIES.map((x) => `<option value="${x.id}" ${x.id === F.cat ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
      <div class="fsec"><h3>이벤트 개최할 상품 선택</h3>${optRows ? `<div class="opts">${optRows}</div>` : ""}</div>
      ${target}
      <div class="fsec"><h3>상품 할인 설정</h3>${disc}</div>
      <div class="fsec"><h3>이벤트 진행 기간 설정</h3><div class="dg"><div><div class="lb">시작(필수)</div><div class="inp dt2">${CAL}${esc(F.start)}<span class="x">✕</span></div></div><div><div class="lb">종료(필수)</div><div class="inp dt2 ph">${CAL}${F.end ? esc(F.end) : "종료일시"}</div></div></div>
        <label class="cb sm"><input type="checkbox"><i></i>동일한 내용과 진행 기간으로 자동으로 연속해서 이벤트를 개최하려면 체크</label></div>
      <div class="fbtns"><button class="gb" data-go="list">목록</button><button class="pb" data-save="1">등록완료</button></div>
    </div></div>`;
  }
  function saveForm() {
    const F = ui.form, cat = S.CATEGORIES.find((x) => x.id === F.cat);
    if (!cat || !F.opts.length) return toast("종목과 상품을 선택해 주세요");
    const lp = cat.options.find((o) => o[0] === F.opts[0])[2];
    const err = E.validateDiscount(lp, F.unit, F.value); if (err) return toast(err);
    const fsMode = cat.sub && F.target === "first_sub";
    st.events.push({ id: st.nextId++, center: ui.center, category: cat.id, optionIds: F.opts.slice(), title: cat.options.find((o) => o[0] === F.opts[0])[1].split(" · ")[0] === "구독멤버십" ? cat.name : `${cat.name} ${cat.options.find((o) => o[0] === F.opts[0])[1]}`,
      method: "price", target: fsMode ? "first_sub" : "all", includeTrialUsers: fsMode ? F.trial : false, unit: F.unit, value: Number(F.value), limit: F.unlimited ? null : Number(F.limit) || null, sold: 0,
      status: "live", start: "2026-11-20 11:00", end: "2026-12-31 23:59", created: "2026-11-20 11:05", autoRepeat: false, stats: fsMode ? { pay: 0, rev: 0, second: 0, secondRev: 0 } : { pay: 0, rev: 0 } });
    save(); ui.form = null; ui.view = "list"; toast("등록했어요 (종료일은 시안에서 2026-12-31로 고정)"); render();
  }

  // ───────── 조작판 ─────────
  const VIEWS = [["center", "① 센터 상세"], ["pay", "② 결제진행"], ["done", "③ 결제 완료"], ["list", "④ 관리자 목록"], ["form", "⑤ 관리자 등록"]];
  function demoHtml() {
    const admin = ui.view === "list" || ui.view === "form";
    const pr = price();
    const jl = pr.judge ? ({ eligible: "✅ 대상", ineligible: "⛔ 비대상", unknown: "❔ 판정 전(로그인 필요)" }[pr.judge.state] + ` · ${pr.judge.reason}`) : "이 센터 신규 할인 없음";
    return `<div class="demo-h">신규 첫 구독 할인 시안 v1.1 <span>(실제 서비스 아님 · 더미 데이터 · 지금=${S.NOW})</span></div>
      <nav class="demo-nav">${VIEWS.map(([v, l]) => `<a data-v="${v}" class="${ui.view === v ? "on" : ""}">${l}</a>`).join("")}</nav>
      <div class="demo-opt">
        ${admin ? `<label>관리자 계정 <select id="o-admin">${Object.values(S.CENTERS).map((c) => `<option value="${c.id}" ${c.id === ui.center ? "selected" : ""}>${c.name} 관리자</option>`).join("")}</select></label>`
          : `<label>회원 <select id="o-who">${S.PERSONAS.map((p) => `<option value="${p.id}" ${p.id === ui.who ? "selected" : ""}>${p.label}</option>`).join("")}</select></label>
             <label>센터 <select id="o-center">${Object.values(S.CENTERS).map((c) => `<option value="${c.id}" ${c.id === ui.center ? "selected" : ""}>${c.name}</option>`).join("")}</select></label>
             <span class="jd">${esc(jl)}</span>`}
        <label><input type="checkbox" id="o-ov" ${ui.overlap ? "checked" : ""}> 일반 할인 같이 진행(월 43,800원)</label>
        ${admin ? "" : `<label><input type="checkbox" id="o-fs" ${ui.noFs ? "checked" : ""}> 첫 구독 할인 끔</label>`}
        ${admin ? "" : `<label><input type="checkbox" id="o-end" ${ui.noEnd ? "checked" : ""}> 할인 종료일 없음(이벤트 할인가 카드)</label>`}
        ${ui.view === "pay" ? `<label>결제 순간 <select id="o-sim">${[["ok", "정상"], ["lost", "도중에 자격 잃음"], ["end", "이벤트 종료 직전"], ["soldout", "선착순 마감 직전"], ["fail", "첫 결제 카드 실패"]].map(([v, l]) => `<option value="${v}" ${ui.sim === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>` : ""}
        <button id="o-reset">처음 상태로</button>
      </div>`;
  }
  function syncDemo() { document.getElementById("demo").innerHTML = demoHtml(); }
  function render() {
    syncDemo();
    const app = document.getElementById("app");
    app.className = ui.view === "list" || ui.view === "form" ? "admin" : "user";
    app.innerHTML = ui.view === "pay" ? payView() : ui.view === "done" ? doneView() : ui.view === "list" ? listView() : ui.view === "form" ? formView() : centerView();
  }
  function go(v) { ui.view = v; if (v === "form") ui.form = null; modal(""); render(); scrollTo(0, 0); }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-v],[data-go],[data-buy],[data-login],[data-pay],[data-x],[data-payreg],[data-retry],[data-f],[data-tg],[data-unit],[data-save],[data-as],#o-reset");
    if (!t) return;
    if (t.id === "o-reset") { localStorage.removeItem(KEY); st = fresh(); ui.done = null; ui.form = null; toast("처음 상태로 돌렸어요"); return render(); }
    if (t.dataset.v) return go(t.dataset.v);
    if (t.dataset.go) return go(t.dataset.go);
    if (t.dataset.buy || t.dataset.login) {
      if (persona().hist === null) return modal(`<h5>로그인이 필요해요</h5><p>로그인하면 이 센터 <b>신규 첫 구독 할인</b> 대상인지 바로 확인해 드려요.<br><span class="g">(시안: 어떤 회원으로 로그인할지 고르세요)</span></p>
        <div class="acts col"><button class="btn pri" data-as="new">신규 회원으로 로그인</button><button class="btn" data-as="paid">독산점 결제 이력 있는 회원으로 로그인</button><button class="btn" data-x="1">닫기</button></div>`);
      return go("pay");
    }
    if (t.dataset.as) {
      ui.who = t.dataset.as; modal(""); render();
      const pr = price();
      if (pr.applied === "first") toast(`첫 구독 할인 대상이에요 · 첫 달 ${won(pr.first)}원`);
      else if (notTarget(pr)) toast(`첫 구독 할인 대상이 아니에요 · 회원님 가격 월 ${won(pr.general ? pr.general.amount : pr.list)}원`);
      return;
    }
    if (t.dataset.pay) return doPay();
    if (t.dataset.x) return modal("");
    if (t.dataset.payreg) return doPay("reg");
    if (t.dataset.retry) { modal(""); return doPay(); }
    if (t.dataset.f) { const [g, v] = t.dataset.f.split(":"); ui.af[g] = v; return render(); }
    if (t.dataset.tg) { ui.form.target = t.dataset.tg; return render(); }
    if (t.dataset.unit) { ui.form.unit = t.dataset.unit; return render(); }
    if (t.dataset.save) return saveForm();
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "o-who") { ui.who = t.value; return render(); }
    if (t.id === "o-center" || t.id === "o-admin") { ui.center = t.value; ui.form = null; return render(); }
    if (t.id === "o-ov") { ui.overlap = t.checked; return render(); }
    if (t.id === "o-fs") { ui.noFs = t.checked; return render(); }
    if (t.id === "o-end") { ui.noEnd = t.checked; return render(); }
    if (t.id === "o-sim") { ui.sim = t.value; return; }
    if (!ui.form) return;
    if (t.dataset.cat !== undefined) { ui.form.cat = t.value; ui.form.opts = []; ui.form.target = "all"; return render(); }
    if (t.dataset.opt) { const id = t.dataset.opt; ui.form.opts = t.checked ? ui.form.opts.concat(id) : ui.form.opts.filter((x) => x !== id); return render(); }
    if (t.dataset.trial) { ui.form.trial = t.checked; return render(); }
    if (t.dataset.unl) { ui.form.unlimited = t.checked; return render(); }
  });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!ui.form) return;
    if (t.dataset.val) { ui.form.value = t.value.replace(/[^\d]/g, ""); const pos = t.selectionStart; render(); const n = document.querySelector("[data-val]"); n.focus(); n.setSelectionRange(pos, pos); }
    if (t.dataset.lim) ui.form.limit = t.value.replace(/[^\d]/g, "");
  });
  window.__fsd = { ui, get st() { return st; }, price, E };
  render();
})();
