(function () {
  "use strict";

  const { leads: RAW, labels: L, owners: OWNERS, generatedAt } = window.MOCK;
  const DAY = 86400000;
  const NOW = new Date(generatedAt).getTime();
  const SLA_HOURS = 24;
  const STALE_DAYS = 7;
  const PAGE_SIZE = 15;
  const STORE_KEY = "leads-dashboard:status-overrides";
  const OPEN = ["contacted", "qualified", "proposal"];

  // ---------- small helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const fmtNum = (n) => n.toLocaleString("he-IL");
  const fmtMoney = (n) => "₪" + Math.round(n).toLocaleString("he-IL");
  const fmtDate = (iso) => new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
  const ageDays = (iso) => (NOW - new Date(iso).getTime()) / DAY;
  const svgNS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, text) {
    const n = document.createElementNS(svgNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function h(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function readOverrides() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { return {}; }
  }
  function writeOverrides(obj) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) { /* storage blocked: keep in memory */ }
  }
  let overrides = readOverrides();

  // ---------- lead scoring ----------
  const SOURCE_POINTS = { referral: 30, event: 25, website: 25, linkedin: 20, google_ads: 20, facebook: 15, cold: 5 };
  const BUDGET_POINTS = { small: 5, medium: 15, large: 25, enterprise: 30 };

  function scoreLead(lead) {
    const source = SOURCE_POINTS[lead.source];
    const budget = BUDGET_POINTS[lead.budget];
    const engagement = Math.min(25, Math.round(lead.emailOpens * 2 + lead.siteVisits * 1.5));
    const age = ageDays(lead.created);
    const recency = age <= 3 ? 15 : age <= 7 ? 10 : age <= 14 ? 5 : 0;
    return { total: source + budget + engagement + recency, source, budget, engagement, recency };
  }

  function temperature(lead) {
    if (lead.status === "won" || lead.status === "lost") return "closed";
    if (lead.score >= 70) return "hot";
    if (lead.score >= 40) return "warm";
    return "cold";
  }

  function flags(lead) {
    const out = [];
    if (lead.status === "new" && ageDays(lead.created) * 24 > SLA_HOURS) out.push("sla");
    if (OPEN.includes(lead.status) && lead.lastContact && ageDays(lead.lastContact) > STALE_DAYS) out.push("stale");
    return out;
  }

  function nextAction(lead) {
    const t = lead.temp;
    switch (lead.status) {
      case "new":
        if (lead.flags.includes("sla")) return "להתקשר עכשיו, עבר זמן התגובה";
        return t === "hot" ? "להתקשר תוך שעה" : "להתקשר היום";
      case "contacted":
        if (lead.flags.includes("stale")) return "לחזור אליו, אין קשר שבוע";
        return t === "hot" ? "לקבוע פגישת אפיון" : "לשלוח מייל המשך";
      case "qualified":
        return "לשלוח הצעת מחיר";
      case "proposal":
        return lead.flags.includes("stale") ? "פולואפ על ההצעה" : "תזכורת לבדוק תשובה בעוד 3 ימים";
      case "won":
        return "להעביר לקליטת לקוח";
      default:
        return "לבדוק שוב בעוד 3 חודשים";
    }
  }

  function enrich(raw) {
    const lead = Object.assign({}, raw);
    if (overrides[lead.id]) lead.status = overrides[lead.id];
    const s = scoreLead(lead);
    lead.score = s.total;
    lead.scoreParts = s;
    lead.temp = temperature(lead);
    lead.flags = flags(lead);
    lead.next = nextAction(lead);
    return lead;
  }

  let ALL = RAW.map(enrich);

  // ---------- state ----------
  const state = { days: 90, source: "", owner: "", status: "", temp: "", q: "", sort: { key: "created", dir: -1 }, page: 0, quick: "" };

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return ALL.filter((l) => {
      if (ageDays(l.created) > state.days) return false;
      if (state.source && l.source !== state.source) return false;
      if (state.owner && l.owner !== state.owner) return false;
      if (state.status && l.status !== state.status) return false;
      if (state.temp && l.temp !== state.temp) return false;
      if (state.quick === "sla" && !l.flags.includes("sla")) return false;
      if (state.quick === "stale" && !l.flags.includes("stale")) return false;
      if (state.quick === "hotnew" && !(l.temp === "hot" && l.status === "new")) return false;
      if (q && !(l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.id.toLowerCase().includes(q))) return false;
      return true;
    });
  }

  // ---------- KPIs ----------
  function renderKpis(rows) {
    const box = $("#kpis");
    box.replaceChildren();
    const won = rows.filter((l) => l.status === "won");
    const responded = rows.filter((l) => l.firstResponseHours != null);
    const avgResp = responded.length ? responded.reduce((s, l) => s + l.firstResponseHours, 0) / responded.length : 0;
    const pipeline = rows.filter((l) => l.status === "qualified" || l.status === "proposal").reduce((s, l) => s + l.value, 0);
    const wonValue = won.reduce((s, l) => s + l.value, 0);
    const hot = rows.filter((l) => l.temp === "hot").length;
    const items = [
      ["לידים בתקופה", fmtNum(rows.length), state.days + " ימים אחרונים"],
      ["אחוז סגירה", rows.length ? (won.length / rows.length * 100).toFixed(1) + "%" : "0%", fmtNum(won.length) + " נסגרו מתוך " + fmtNum(rows.length)],
      ["זמן תגובה ראשונה", avgResp.toFixed(1) + " שעות", "ממוצע על " + fmtNum(responded.length) + " לידים שקיבלו מענה"],
      ["שווי בצנרת פתוחה", fmtMoney(pipeline), "לידים בשלב 'מתאים' ו'הצעת מחיר'"],
      ["שווי עסקאות שנסגרו", fmtMoney(wonValue), fmtNum(won.length) + " עסקאות"],
      ["לידים חמים פתוחים", fmtNum(hot), "ציון 70 ומעלה"],
    ];
    for (const [label, value, note] of items) {
      const k = h("div", "kpi");
      k.append(h("div", "label", label), h("div", "value", value), h("div", "note", note));
      box.append(k);
    }
  }

  // ---------- alerts ----------
  function renderAlerts(rows) {
    const box = $("#alerts");
    box.replaceChildren();
    const sla = rows.filter((l) => l.flags.includes("sla")).length;
    const stale = rows.filter((l) => l.flags.includes("stale")).length;
    const hotNew = rows.filter((l) => l.temp === "hot" && l.status === "new").length;
    const defs = [
      ["sla", "critical", "●", sla + " לידים חדשים בלי מענה מעל " + SLA_HOURS + " שעות"],
      ["stale", "warning", "⚠", stale + " לידים פתוחים בלי קשר מעל " + STALE_DAYS + " ימים"],
      ["hotnew", "good", "▲", hotNew + " לידים חמים שעוד לא טופלו"],
    ];
    for (const [key, cls, icon, text] of defs) {
      const b = h("button", "alert " + cls);
      b.type = "button";
      b.setAttribute("aria-pressed", state.quick === key ? "true" : "false");
      b.append(h("span", "icon", icon), h("span", null, text));
      if (state.quick === key) b.append(h("span", "muted", " (מסונן, לחיצה מבטלת)"));
      b.addEventListener("click", () => { state.quick = state.quick === key ? "" : key; state.page = 0; render(); });
      box.append(b);
    }
  }

  // ---------- tooltip ----------
  const tip = $("#tooltip");
  function showTip(evt, title, rows) {
    tip.replaceChildren();
    tip.append(h("div", "tt-title", title));
    for (const [value, label] of rows) {
      const r = h("div", "tt-row");
      r.append(h("span", "tt-key"), h("strong", null, value), h("span", "muted", label));
      tip.append(r);
    }
    tip.hidden = false;
    const x = evt.clientX, y = evt.clientY;
    const w = tip.offsetWidth, hgt = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2)) + "px";
    tip.style.top = Math.max(8, y - hgt - 14) + "px";
  }
  function hideTip() { tip.hidden = true; }

  // ---------- weekly line chart ----------
  function renderWeekly(rows) {
    const box = $("#chartWeekly");
    box.replaceChildren();
    const weeks = Math.max(1, Math.ceil(state.days / 7));
    const buckets = Array.from({ length: weeks }, (_, i) => ({ i, count: 0, end: NOW - (weeks - 1 - i) * 7 * DAY }));
    for (const l of rows) {
      const back = Math.floor(ageDays(l.created) / 7);
      const idx = weeks - 1 - back;
      if (idx >= 0 && idx < weeks) buckets[idx].count++;
    }
    const W = Math.max(320, box.clientWidth || 900), H = 250, m = { t: 30, r: 16, b: 30, l: 40 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const max = Math.max(4, ...buckets.map((b) => b.count));
    const step = Math.ceil(max / 4);
    const top = step * 4;
    const x = (i) => m.l + (weeks === 1 ? iw / 2 : (i / (weeks - 1)) * iw);
    const y = (v) => m.t + ih - (v / top) * ih;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "לידים חדשים לפי שבוע", style: "direction:ltr" });
    for (let v = 0; v <= top; v += step) {
      svg.append(el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: v === 0 ? "baseline" : "gridline" }));
      svg.append(el("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", class: "tick" }, fmtNum(v)));
    }
    const labelEvery = W < 600 ? 3 : weeks > 8 ? 2 : 1;
    buckets.forEach((b, i) => {
      if (i % labelEvery === 0 || i === weeks - 1) {
        svg.append(el("text", { x: x(i), y: H - 8, "text-anchor": "middle", class: "tick" }, fmtDate(new Date(b.end).toISOString())));
      }
    });
    const d = buckets.map((b, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(b.count).toFixed(1)).join(" ");
    svg.append(el("path", { d, fill: "none", stroke: "var(--series-1)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    const last = buckets[weeks - 1];
    svg.append(el("circle", { cx: x(weeks - 1), cy: y(last.count), r: 4, fill: "var(--series-1)", stroke: "var(--surface-1)", "stroke-width": 2 }));
    svg.append(el("text", { x: x(weeks - 1) - 8, y: y(last.count) - 10, "text-anchor": "end", class: "value-label" }, fmtNum(last.count)));

    const cross = el("line", { y1: m.t, y2: m.t + ih, stroke: "var(--baseline)", "stroke-width": 1, visibility: "hidden" });
    const dot = el("circle", { r: 5, fill: "var(--series-1)", stroke: "var(--surface-1)", "stroke-width": 2, visibility: "hidden" });
    svg.append(cross, dot);
    const hit = el("rect", { x: m.l, y: m.t, width: iw, height: ih, class: "hit", tabindex: 0 });
    svg.append(hit);
    function at(i, evt) {
      const b = buckets[i];
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
      dot.setAttribute("cx", x(i)); dot.setAttribute("cy", y(b.count)); dot.setAttribute("visibility", "visible");
      const start = new Date(b.end - 6 * DAY).toISOString();
      showTip(evt, "שבוע " + fmtDate(start) + " עד " + fmtDate(new Date(b.end).toISOString()), [[fmtNum(b.count), "לידים חדשים"]]);
    }
    hit.addEventListener("pointermove", (evt) => {
      const r = svg.getBoundingClientRect();
      const px = ((evt.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(weeks - 1, Math.round(((px - m.l) / iw) * (weeks - 1))));
      at(i, evt);
    });
    hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); hideTip(); });
    hit.addEventListener("focus", () => {
      const r = hit.getBoundingClientRect();
      at(weeks - 1, { clientX: r.right, clientY: r.top + 20 });
    });
    hit.addEventListener("blur", hideTip);
    box.append(svg);
  }

  // ---------- horizontal bars (RTL: label on the right, bar grows to the left) ----------
  function hbars(box, items, opts) {
    box.replaceChildren();
    const W = Math.max(300, box.clientWidth || 440), rowH = 34, labelW = 110, valueW = 92;
    const H = items.length * rowH + 8;
    const max = Math.max(1, ...items.map((d) => d.value));
    const barMax = W - labelW - valueW - 8;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.title, style: "direction:ltr" });
    const right = W - labelW;
    svg.append(el("line", { x1: right, x2: right, y1: 0, y2: H - 4, class: "baseline" }));
    items.forEach((d, i) => {
      const yTop = i * rowH + 6;
      const len = Math.max(2, (d.value / max) * barMax);
      svg.append(el("text", { x: W - 4, y: yTop + 15, "text-anchor": "end" }, d.label));
      const bar = el("rect", { x: right - len, y: yTop + 2, width: len, height: rowH - 14, rx: 4, fill: d.color || "var(--series-1)", class: "bar" });
      svg.append(bar);
      svg.append(el("text", { x: right - len - 6, y: yTop + 15, "text-anchor": "end", class: "value-label" }, d.text));
      const hit = el("rect", { x: 0, y: i * rowH + 2, width: W, height: rowH, class: "hit", tabindex: 0 });
      const show = (evt) => { bar.classList.add("lift"); showTip(evt, d.label, d.tip); };
      hit.addEventListener("pointermove", show);
      hit.addEventListener("pointerleave", () => { bar.classList.remove("lift"); hideTip(); });
      hit.addEventListener("focus", () => { const r = hit.getBoundingClientRect(); show({ clientX: r.left + r.width / 2, clientY: r.top }); });
      hit.addEventListener("blur", () => { bar.classList.remove("lift"); hideTip(); });
      if (opts.onClick) hit.addEventListener("click", () => opts.onClick(d));
      svg.append(hit);
    });
    box.append(svg);
  }

  function renderSource(rows) {
    const items = Object.keys(L.source).map((key) => {
      const all = rows.filter((l) => l.source === key);
      const won = all.filter((l) => l.status === "won").length;
      const rate = all.length ? (won / all.length) * 100 : 0;
      return {
        key, label: L.source[key], value: all.length,
        text: rate.toFixed(0) + "% · " + fmtNum(all.length),
        tip: [[fmtNum(all.length), "לידים"], [fmtNum(won), "נסגרו"], [rate.toFixed(1) + "%", "אחוז סגירה"]],
      };
    }).sort((a, b) => b.value - a.value);
    hbars($("#chartSource"), items, {
      title: "לידים לפי מקור",
      onClick: (d) => { state.source = state.source === d.key ? "" : d.key; $("#fSource").value = state.source; state.page = 0; render(); },
    });
  }

  function renderFunnel(rows) {
    const total = rows.length;
    const reached = (st) => rows.filter((l) => st.includes(l.status)).length;
    const stages = [
      ["כל הלידים", total, "var(--ramp-1)"],
      ["נוצר קשר", reached(["contacted", "qualified", "proposal", "won", "lost"]), "var(--ramp-2)"],
      ["מתאים", reached(["qualified", "proposal", "won"]), "var(--ramp-3)"],
      ["הצעת מחיר", reached(["proposal", "won"]), "var(--ramp-4)"],
      ["נסגר", reached(["won"]), "var(--ramp-5)"],
    ];
    const items = stages.map(([label, value, color]) => {
      const pct = total ? (value / total) * 100 : 0;
      return { label, value, color, text: pct.toFixed(0) + "% · " + fmtNum(value), tip: [[fmtNum(value), "לידים"], [pct.toFixed(1) + "%", "מכל הלידים"]] };
    });
    hbars($("#chartFunnel"), items, { title: "משפך מכירה" });
  }

  // ---------- table ----------
  function sortRows(rows) {
    const { key, dir } = state.sort;
    return rows.slice().sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === "source") { va = L.source[va]; vb = L.source[vb]; }
      if (key === "status") { va = L.status[va]; vb = L.status[vb]; }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }

  function tempPill(lead) {
    const names = { hot: "חם", warm: "פושר", cold: "קר", closed: "סגור" };
    return h("span", "pill " + lead.temp, names[lead.temp]);
  }

  function renderTable(rows) {
    const sorted = sortRows(rows);
    const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages - 1);
    const slice = sorted.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
    const tbody = $("#leadTable tbody");
    tbody.replaceChildren();
    for (const l of slice) {
      const tr = document.createElement("tr");
      tr.tabIndex = 0;
      const tdScore = h("td");
      const sc = h("span", "score", String(l.score));
      sc.append(tempPill(l));
      tdScore.append(sc);
      const tdName = h("td", null, l.name);
      const tdStatus = h("td", null, L.status[l.status]);
      if (l.flags.includes("sla")) tdStatus.append(h("span", "flag critical", "SLA"));
      if (l.flags.includes("stale")) tdStatus.append(h("span", "flag warning", "בלי קשר"));
      tr.append(
        tdScore, tdName, h("td", null, l.company), h("td", null, L.source[l.source]), h("td", null, l.owner),
        tdStatus, h("td", "num", fmtDate(l.created)), h("td", "num", fmtMoney(l.value)), h("td", null, l.next)
      );
      tr.addEventListener("click", () => openDrawer(l.id));
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter") openDrawer(l.id); });
      tbody.append(tr);
    }
    $("#rowCount").textContent = "(" + fmtNum(rows.length) + ")";
    $("#pageInfo").textContent = "עמוד " + (state.page + 1) + " מתוך " + pages;
    $("#prevPage").disabled = state.page === 0;
    $("#nextPage").disabled = state.page >= pages - 1;
    document.querySelectorAll("#leadTable th").forEach((th) => {
      th.removeAttribute("aria-sort");
      if (th.dataset.key === state.sort.key) th.setAttribute("aria-sort", state.sort.dir === 1 ? "ascending" : "descending");
    });
  }

  // ---------- drawer ----------
  function openDrawer(id) {
    const l = ALL.find((x) => x.id === id);
    if (!l) return;
    const body = $("#drawerBody");
    body.replaceChildren();
    const title = h("h3", null, l.name);
    const sub = h("div", "muted", l.company + " · " + l.id);
    const dl = document.createElement("dl");
    const add = (k, v) => { dl.append(h("dt", null, k), h("dd", null, v)); };
    add("טלפון", l.phone);
    add("מקור", L.source[l.source]);
    add("נציג", l.owner);
    add("מתעניין ב", l.interest);
    add("תקציב", L.budget[l.budget]);
    add("שווי משוער", fmtMoney(l.value));
    add("נוצר", new Date(l.created).toLocaleString("he-IL"));
    add("קשר אחרון", l.lastContact ? new Date(l.lastContact).toLocaleDateString("he-IL") : "עוד לא");
    add("זמן תגובה ראשונה", l.firstResponseHours != null ? l.firstResponseHours + " שעות" : "עוד לא נענה");

    const bd = h("div", "breakdown");
    const p = l.scoreParts;
    const line = (k, v, max) => { const r = h("div"); r.append(h("span", null, k), h("span", null, v + " מתוך " + max)); bd.append(r); };
    bd.append(h("strong", null, "ציון " + l.score + " מתוך 100"));
    line("מקור הליד", p.source, 30);
    line("תקציב", p.budget, 30);
    line("מעורבות (מיילים וביקורים)", p.engagement, 25);
    line("טריות", p.recency, 15);

    const next = h("div", "next");
    next.append(h("strong", null, "פעולה הבאה: "), document.createTextNode(l.next));

    const lab = h("label", null, "שינוי סטטוס");
    const sel = document.createElement("select");
    for (const k of Object.keys(L.status)) {
      const o = document.createElement("option");
      o.value = k; o.textContent = L.status[k];
      if (k === l.status) o.selected = true;
      sel.append(o);
    }
    sel.addEventListener("change", () => {
      overrides[l.id] = sel.value;
      writeOverrides(overrides);
      ALL = RAW.map(enrich);
      render();
      openDrawer(l.id);
    });
    lab.append(sel);
    const note = h("p", "muted", "השינוי נשמר רק בדפדפן הזה (נתוני דמה).");
    body.append(title, sub, dl, bd, next, lab, note);
    const drawer = $("#drawer");
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    $("#closeDrawer").focus();
  }
  function closeDrawer() {
    const drawer = $("#drawer");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  // ---------- CSV export ----------
  function exportCsv() {
    const rows = sortRows(filtered());
    const head = ["id", "name", "company", "phone", "source", "owner", "status", "score", "temperature", "value", "created", "next_action"];
    const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [head.join(",")].concat(rows.map((l) => [
      l.id, l.name, l.company, l.phone, L.source[l.source], l.owner, L.status[l.status], l.score, l.temp, l.value, l.created.slice(0, 10), l.next,
    ].map(esc).join(",")));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leads-export.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- wiring ----------
  function fillSelect(sel, entries) {
    for (const [value, text] of entries) {
      const o = document.createElement("option");
      o.value = value; o.textContent = text;
      sel.append(o);
    }
  }
  fillSelect($("#fSource"), Object.entries(L.source));
  fillSelect($("#fOwner"), OWNERS.map((o) => [o, o]));
  fillSelect($("#fStatus"), Object.entries(L.status));

  document.querySelectorAll("#periodGroup button").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#periodGroup button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      state.days = Number(b.dataset.days);
      state.page = 0;
      render();
    });
  });
  const bind = (sel, key) => $(sel).addEventListener("input", (e) => { state[key] = e.target.value; state.page = 0; render(); });
  bind("#fSource", "source"); bind("#fOwner", "owner"); bind("#fStatus", "status"); bind("#fTemp", "temp"); bind("#fSearch", "q");
  $("#resetBtn").addEventListener("click", () => {
    Object.assign(state, { days: 90, source: "", owner: "", status: "", temp: "", q: "", page: 0, quick: "" });
    ["#fSource", "#fOwner", "#fStatus", "#fTemp", "#fSearch"].forEach((s) => { $(s).value = ""; });
    document.querySelectorAll("#periodGroup button").forEach((x) => x.classList.toggle("active", x.dataset.days === "90"));
    render();
  });
  $("#exportBtn").addEventListener("click", exportCsv);
  $("#prevPage").addEventListener("click", () => { state.page--; render(); });
  $("#nextPage").addEventListener("click", () => { state.page++; render(); });
  $("#closeDrawer").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  document.querySelectorAll("#leadTable th").forEach((th) => {
    th.tabIndex = 0;
    const go = () => {
      const key = th.dataset.key;
      state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : -1 };
      render();
    };
    th.addEventListener("click", go);
    th.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  });

  // theme toggle: OS setting by default, the button overrides it
  const root = document.documentElement;
  function currentTheme() {
    return root.dataset.theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function syncThemeButton() { $("#themeToggle").textContent = currentTheme() === "dark" ? "מצב בהיר" : "מצב כהה"; }
  try { const saved = localStorage.getItem("leads-dashboard:theme"); if (saved) root.dataset.theme = saved; } catch (e) { /* ignore */ }
  $("#themeToggle").addEventListener("click", () => {
    root.dataset.theme = currentTheme() === "dark" ? "light" : "dark";
    try { localStorage.setItem("leads-dashboard:theme", root.dataset.theme); } catch (e) { /* ignore */ }
    syncThemeButton();
  });
  syncThemeButton();

  $("#generated").textContent = "הנתונים נוצרו ב-" + new Date(generatedAt).toLocaleDateString("he-IL") + ".";

  function render() {
    const rows = filtered();
    renderKpis(rows);
    renderAlerts(rows);
    renderWeekly(rows);
    renderSource(rows);
    renderFunnel(rows);
    renderTable(rows);
  }
  render();
  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 150); });
})();
