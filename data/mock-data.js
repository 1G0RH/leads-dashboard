// Mock data for the leads dashboard.
// Every name, company and phone number here is invented.
// The generator is seeded, so the same day always produces the same leads.
(function () {
  "use strict";

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(20261102);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

  // weight table: [value, weight]
  function weighted(table) {
    const total = table.reduce((s, r) => s + r[1], 0);
    let x = rand() * total;
    for (const [value, w] of table) {
      if ((x -= w) < 0) return value;
    }
    return table[table.length - 1][0];
  }

  const FIRST = ["נועה", "יונתן", "מאיה", "איתי", "שירה", "אורי", "תמר", "דניאל", "רוני", "עומר",
    "ליאור", "הדר", "אביגיל", "יואב", "מיכל", "נדב", "רותם", "עידו", "יעל", "אלון",
    "שני", "גיא", "טל", "אסף", "ענבל", "רועי", "לילך", "אמיר", "דנה", "בן"];
  const LAST = ["כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אברהם", "פרידמן", "שפירא", "אזולאי", "דהן",
    "גולן", "רוזן", "בן דוד", "קפלן", "שגיא", "ברק", "אלמוג", "נחום", "זילברמן", "חדד"];
  const COMPANY_A = ["סטודיו", "קליניקת", "מסעדת", "משרד", "חנות", "מרכז", "מכון", "בית קפה"];
  const COMPANY_B = ["הדקל", "אורנים", "הים", "צפון", "גפן", "אלה", "שקד", "רימון", "תאנה", "ברוש",
    "הכרמל", "נוף", "השרון", "מעיין", "אופק"];

  const SOURCES = [
    ["website", 26], ["google_ads", 22], ["facebook", 18], ["referral", 10],
    ["linkedin", 9], ["event", 7], ["cold", 8],
  ];
  const OWNERS = ["אלה", "נתן", "ספיר", "יוסי"];
  const BUDGETS = [["small", 40], ["medium", 35], ["large", 18], ["enterprise", 7]];
  const BUDGET_VALUE = { small: [1500, 4000], medium: [4000, 12000], large: [12000, 30000], enterprise: [30000, 80000] };
  const INTERESTS = ["אוטומציה למיילים", "בוט וואטסאפ", "דשבורד מכירות", "חיבור CRM", "סוכן AI לשירות", "ניהול לידים"];

  const DAY = 86400000;
  const now = new Date();
  now.setMinutes(0, 0, 0);

  // Funnel stages and how far a lead got, by age and source quality
  function pickStatus(ageDays, source) {
    const q = { referral: 1.5, event: 1.2, website: 1.1, linkedin: 1.0, google_ads: 0.9, facebook: 0.8, cold: 0.5 }[source];
    if (ageDays < 2) return weighted([["new", 70], ["contacted", 30]]);
    if (ageDays < 7) return weighted([["new", 18], ["contacted", 40], ["qualified", 26 * q], ["proposal", 8 * q], ["lost", 8]]);
    return weighted([
      ["new", 4], ["contacted", 16], ["qualified", 18 * q], ["proposal", 14 * q],
      ["won", 14 * q], ["lost", 30 / q],
    ]);
  }

  const leads = [];
  const COUNT = 260;
  for (let i = 0; i < COUNT; i++) {
    // more leads in recent weeks (growth), skewed with a square root
    const ageDays = Math.floor(90 * Math.pow(rand(), 1.25));
    const created = new Date(now.getTime() - ageDays * DAY - between(0, 23) * 3600000);
    const source = weighted(SOURCES);
    const status = pickStatus(ageDays, source);
    const budget = weighted(BUDGETS);
    const [vMin, vMax] = BUDGET_VALUE[budget];
    const value = Math.round(between(vMin, vMax) / 100) * 100;

    // first response time in hours, only for leads already contacted
    let firstResponseHours = null;
    let lastContact = null;
    if (status !== "new") {
      firstResponseHours = Math.round((weighted([[1, 30], [3, 25], [8, 20], [20, 15], [40, 10]]) * (0.5 + rand())) * 10) / 10;
      const contactAge = between(0, Math.max(0, ageDays));
      lastContact = new Date(now.getTime() - contactAge * DAY);
      if (lastContact < created) lastContact = new Date(created.getTime() + firstResponseHours * 3600000);
    }

    const first = pick(FIRST);
    const last = pick(LAST);
    leads.push({
      id: "L-" + String(1001 + i),
      name: first + " " + last,
      company: pick(COMPANY_A) + " " + pick(COMPANY_B),
      phone: "05" + between(0, 8) + "-" + String(between(1000000, 9999999)),
      source,
      owner: pick(OWNERS),
      status,
      budget,
      value,
      interest: pick(INTERESTS),
      emailOpens: between(0, 9),
      siteVisits: between(0, 12),
      created: created.toISOString(),
      lastContact: lastContact ? lastContact.toISOString() : null,
      firstResponseHours,
    });
  }

  leads.sort((a, b) => (a.created < b.created ? 1 : -1));

  window.MOCK = {
    generatedAt: now.toISOString(),
    leads,
    labels: {
      source: {
        website: "טופס באתר", google_ads: "Google Ads", facebook: "Facebook", referral: "הפניה",
        linkedin: "LinkedIn", event: "כנס / אירוע", cold: "פנייה יזומה",
      },
      status: {
        new: "חדש", contacted: "נוצר קשר", qualified: "מתאים", proposal: "הצעת מחיר",
        won: "נסגר", lost: "אבוד",
      },
      budget: { small: "עד 4K", medium: "4K עד 12K", large: "12K עד 30K", enterprise: "מעל 30K" },
    },
    owners: OWNERS,
  };
})();
