/* 시안용 더미 데이터 — 형 캡처(엔짐 독산점 센터 상세, 답십리점 할인이벤트 관리) 값을 옮김. 오늘=2026-11-20 */
(function (root) {
  const NOW = "2026-11-20 11:00";
  const CENTERS = {
    doksan: { id: "doksan", name: "엔짐 독산점", likes: 988 },
    dapsimni: { id: "dapsimni", name: "엔짐 답십리점", likes: 1204 },
  };
  // 헬스 구독 멤버십(형 캡처 01: 구독멤버십 · 하루 2회 이용 · 정가 90,000원/월)
  const SUB_OPTION = { id: "sub_h2", productName: "헬스 구독 멤버십", category: "헬스 구독 멤버십", label: "구독멤버십", usage: "하루 2회 이용", listPrice: 90000, payType: "sub" };
  const CATEGORIES = [
    { id: "health", name: "헬스", sub: false, options: [["h1d", "1일", 20000], ["h1", "1개월", 90000], ["h2", "2개월", 170000], ["h3", "3개월", 190000], ["h4", "4개월", 260000]] },
    { id: "health_sub", name: "헬스 구독 멤버십", sub: true, options: [["sub_h2", "구독멤버십 · 하루 2회 이용", 90000]] },
    { id: "pt_event", name: "1:1 PT(막판 질주 이벤트)", sub: false, options: [["e6", "6회", 510000], ["e12", "12회", 1020000]] },
    { id: "pt21", name: "2:1 PT(연말 D-100 챌린지 이벤트)", sub: false, options: [["d10", "10회", 700000]] },
    { id: "pt", name: "1:1 PT", sub: false, options: [["t10", "10회", 650000]] },
    { id: "pt2", name: "2:1 PT", sub: false, options: [["t2", "10회", 500000]] },
  ];

  // 회원(조작판에서 바꿔 봄). 이력은 센터별
  const PERSONAS = [
    { id: "new", label: "신규 회원 (이력 없음)", name: "김새봄", phone: "010-****-2048", hist: {} },
    { id: "paid", label: "독산점 결제 이력(환불)", name: "이환불", phone: "010-****-7781",
      hist: { doksan: { payments: [{ kind: "normal", title: "1:1 PT 6회", status: "refunded", at: "2026-06-02" }] } } },
    { id: "trial", label: "독산점 무료 체험권만 이용", name: "박체험", phone: "010-****-3390",
      hist: { doksan: { payments: [{ kind: "trial", title: "헬스 1일 무료 체험권", status: "paid", at: "2026-11-02" }], usages: [{ viaTrial: true, at: "2026-11-03" }] } } },
    { id: "claimed", label: "독산점 첫 구독 할인 받고 해지", name: "최해지", phone: "010-****-5512",
      hist: { doksan: { payments: [{ kind: "sub", title: "헬스 구독 멤버십 1회차(첫 달 할인)", status: "paid", at: "2026-09-01" }], claims: [{ status: "used", at: "2026-09-01" }] } } },
    { id: "guest", label: "비로그인", name: null, hist: null },
  ];

  function seedEvents() {
    const E = (o) => Object.assign({ method: "price", target: "all", includeTrialUsers: false, unit: "won", value: 0, limit: null, sold: 0, status: "live", autoRepeat: false, created: "2026-11-01 00:44", stats: null }, o);
    return [
      E({ id: 161032, center: "doksan", category: "health_sub", optionIds: ["sub_h2"], title: "헬스 구독 멤버십", target: "first_sub", includeTrialUsers: true, unit: "pct", value: 50, limit: 100, sold: 37,
        start: "2026-11-15 00:00", end: "2026-12-31 23:59", created: "2026-11-14 18:20",
        stats: { pay: 37, rev: 1665000, second: 21, secondRev: 1890000 } }),
      E({ id: 160959, center: "doksan", category: "health", optionIds: ["h1"], title: "헬스 1년", value: 590000, start: "2026-11-01 00:00", end: "2026-11-30 23:59", stats: { pay: 1, rev: 490000 } }),
      E({ id: 160958, center: "doksan", category: "health", optionIds: ["h4"], title: "헬스 6개월", value: 60000, start: "2026-11-01 00:00", end: "2026-11-30 23:59", stats: { pay: 4, rev: 1200000 } }),
      E({ id: 160940, center: "doksan", category: "health", optionIds: ["h1d"], method: "trial", title: "헬스 1일 무료 체험권", limit: 50, sold: 12, start: "2026-10-01 00:00", end: "2026-12-31 23:59", created: "2026-09-28 10:02", stats: { pay: 12, rev: 0 } }),
      E({ id: 160811, center: "doksan", category: "pt_event", optionIds: ["e12"], title: "1:1 PT 12회", value: 260000, limit: 30, sold: 9, start: "2026-10-15 00:00", end: "2026-11-15 23:59", status: "ended", created: "2026-10-14 09:10", stats: { pay: 9, rev: 6840000 } }),
      E({ id: 161040, center: "dapsimni", category: "health_sub", optionIds: ["sub_h2"], title: "헬스 구독 멤버십", target: "first_sub", includeTrialUsers: false, unit: "won", value: 80100, limit: null,
        start: "2026-11-18 00:00", end: "2026-12-31 23:59", created: "2026-11-17 15:02", stats: { pay: 8, rev: 79200, second: 0, secondRev: 0 } }),
      E({ id: 160960, center: "dapsimni", category: "health", optionIds: ["h2"], title: "헬스 2개월", value: 30000, start: "2026-11-01 00:00", end: "2026-11-30 23:59", stats: { pay: 3, rev: 420000 } }),
    ];
  }
  // 조작판 «일반 할인이벤트 같이 진행»: 형 캡처 01의 이벤트 할인가(90,000 → 월 43,800원)
  const GENERAL_OVERLAP = (center) => ({ id: center === "doksan" ? 161001 : 161002, center, category: "health_sub", optionIds: ["sub_h2"], title: "헬스 구독 멤버십 출시 기념", method: "price", target: "all",
    unit: "won", value: 46200, limit: null, sold: 0, status: "live", start: "2026-11-01 00:00", end: "2026-11-30 23:59", created: "2026-10-31 21:00", includeTrialUsers: false, autoRepeat: false, stats: { pay: 52, rev: 2277600 }, overlapDemo: true });

  root.FSD = { NOW, CENTERS, SUB_OPTION, CATEGORIES, PERSONAS, seedEvents, GENERAL_OVERLAP };
})(typeof window !== "undefined" ? window : globalThis);
