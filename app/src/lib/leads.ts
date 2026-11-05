import type { Budget, RawLead, Source, Status } from "@/data/mock-data"

export const DAY = 86400000
export const SLA_HOURS = 24
export const STALE_DAYS = 7
const OPEN: Status[] = ["contacted", "qualified", "proposal"]

export const SOURCE_LABEL: Record<Source, string> = {
  website: "טופס באתר", google_ads: "Google Ads", facebook: "Facebook", referral: "הפניה",
  linkedin: "LinkedIn", event: "כנס / אירוע", cold: "פנייה יזומה",
}
export const STATUS_LABEL: Record<Status, string> = {
  new: "חדש", contacted: "נוצר קשר", qualified: "מתאים", proposal: "הצעת מחיר",
  won: "נסגר", lost: "אבוד",
}
export const BUDGET_LABEL: Record<Budget, string> = {
  small: "עד 4,000 ₪", medium: "4,000 עד 12,000 ₪", large: "12,000 עד 30,000 ₪", enterprise: "מעל 30,000 ₪",
}
export type Temp = "hot" | "warm" | "cold" | "closed"
export const TEMP_LABEL: Record<Temp, string> = { hot: "חם", warm: "פושר", cold: "קר", closed: "סגור" }
export type Flag = "sla" | "stale"
export type Quick = "" | "sla" | "stale" | "hotnew"

const SOURCE_POINTS: Record<Source, number> = {
  referral: 30, event: 25, website: 25, linkedin: 20, google_ads: 20, facebook: 15, cold: 5,
}
const BUDGET_POINTS: Record<Budget, number> = { small: 5, medium: 15, large: 25, enterprise: 30 }

export interface ScoreParts {
  total: number
  source: number
  budget: number
  engagement: number
  recency: number
}

export interface Lead extends RawLead {
  score: number
  scoreParts: ScoreParts
  temp: Temp
  flags: Flag[]
  next: string
}

export const fmtNum = (n: number) => n.toLocaleString("he-IL")
export const fmtMoney = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL")
export const fmtDate = (iso: string | number) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })

export function makeAgeDays(now: number) {
  return (iso: string) => (now - new Date(iso).getTime()) / DAY
}

export function enrich(raw: RawLead, now: number, override?: Status): Lead {
  const ageDays = makeAgeDays(now)
  const lead = { ...raw, status: override ?? raw.status }

  const age = ageDays(lead.created)
  const parts: ScoreParts = {
    source: SOURCE_POINTS[lead.source],
    budget: BUDGET_POINTS[lead.budget],
    engagement: Math.min(25, Math.round(lead.emailOpens * 2 + lead.siteVisits * 1.5)),
    recency: age <= 3 ? 15 : age <= 7 ? 10 : age <= 14 ? 5 : 0,
    total: 0,
  }
  parts.total = parts.source + parts.budget + parts.engagement + parts.recency

  let temp: Temp = "cold"
  if (lead.status === "won" || lead.status === "lost") temp = "closed"
  else if (parts.total >= 70) temp = "hot"
  else if (parts.total >= 40) temp = "warm"

  const flags: Flag[] = []
  if (lead.status === "new" && age * 24 > SLA_HOURS) flags.push("sla")
  if (OPEN.includes(lead.status) && lead.lastContact && ageDays(lead.lastContact) > STALE_DAYS) flags.push("stale")

  return { ...lead, score: parts.total, scoreParts: parts, temp, flags, next: nextAction(lead.status, temp, flags) }
}

function nextAction(status: Status, temp: Temp, flags: Flag[]) {
  switch (status) {
    case "new":
      if (flags.includes("sla")) return "להתקשר עכשיו, עבר זמן התגובה"
      return temp === "hot" ? "להתקשר תוך שעה" : "להתקשר היום"
    case "contacted":
      if (flags.includes("stale")) return "לחזור אליו, אין קשר שבוע"
      return temp === "hot" ? "לקבוע פגישת אפיון" : "לשלוח מייל המשך"
    case "qualified":
      return "לשלוח הצעת מחיר"
    case "proposal":
      return flags.includes("stale") ? "פולואפ על ההצעה" : "תזכורת לבדוק תשובה בעוד 3 ימים"
    case "won":
      return "להעביר לקליטת לקוח"
    default:
      return "לבדוק שוב בעוד 3 חודשים"
  }
}

export interface Filters {
  days: number
  source: Source | ""
  owner: string
  status: Status | ""
  temp: Exclude<Temp, "closed"> | ""
  q: string
  quick: Quick
}

export const EMPTY_FILTERS: Filters = { days: 90, source: "", owner: "", status: "", temp: "", q: "", quick: "" }

export function applyFilters(all: Lead[], f: Filters, now: number) {
  const ageDays = makeAgeDays(now)
  const q = f.q.trim().toLowerCase()
  return all.filter((l) => {
    if (ageDays(l.created) > f.days) return false
    if (f.source && l.source !== f.source) return false
    if (f.owner && l.owner !== f.owner) return false
    if (f.status && l.status !== f.status) return false
    if (f.temp && l.temp !== f.temp) return false
    if (f.quick === "sla" && !l.flags.includes("sla")) return false
    if (f.quick === "stale" && !l.flags.includes("stale")) return false
    if (f.quick === "hotnew" && !(l.temp === "hot" && l.status === "new")) return false
    if (q && !(l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.id.toLowerCase().includes(q))) return false
    return true
  })
}

export function kpis(rows: Lead[]) {
  const won = rows.filter((l) => l.status === "won")
  const responded = rows.filter((l) => l.firstResponseHours != null)
  const avgResp = responded.length
    ? responded.reduce((s, l) => s + (l.firstResponseHours ?? 0), 0) / responded.length
    : 0
  return {
    total: rows.length,
    won: won.length,
    winRate: rows.length ? (won.length / rows.length) * 100 : 0,
    responded: responded.length,
    avgResp,
    pipeline: rows.filter((l) => l.status === "qualified" || l.status === "proposal").reduce((s, l) => s + l.value, 0),
    wonValue: won.reduce((s, l) => s + l.value, 0),
    hot: rows.filter((l) => l.temp === "hot").length,
  }
}

export function alertCounts(rows: Lead[]) {
  return {
    sla: rows.filter((l) => l.flags.includes("sla")).length,
    stale: rows.filter((l) => l.flags.includes("stale")).length,
    hotnew: rows.filter((l) => l.temp === "hot" && l.status === "new").length,
  }
}

export function weeklyBuckets(rows: Lead[], days: number, now: number) {
  const ageDays = makeAgeDays(now)
  const weeks = Math.max(1, Math.ceil(days / 7))
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const end = now - (weeks - 1 - i) * 7 * DAY
    return { week: fmtDate(end), range: fmtDate(end - 6 * DAY) + " עד " + fmtDate(end), leads: 0 }
  })
  for (const l of rows) {
    const idx = weeks - 1 - Math.floor(ageDays(l.created) / 7)
    if (idx >= 0 && idx < weeks) buckets[idx].leads++
  }
  return buckets
}

export function sourceBreakdown(rows: Lead[]) {
  return (Object.keys(SOURCE_LABEL) as Source[])
    .map((key) => {
      const all = rows.filter((l) => l.source === key)
      const won = all.filter((l) => l.status === "won").length
      const rate = all.length ? (won / all.length) * 100 : 0
      return { key, label: SOURCE_LABEL[key], leads: all.length, won, rate, text: rate.toFixed(0) + "% · " + fmtNum(all.length) }
    })
    .sort((a, b) => b.leads - a.leads)
}

export function funnel(rows: Lead[]) {
  const total = rows.length
  const reached = (st: Status[]) => rows.filter((l) => st.includes(l.status)).length
  const stages: [string, number][] = [
    ["כל הלידים", total],
    ["נוצר קשר", reached(["contacted", "qualified", "proposal", "won", "lost"])],
    ["מתאים", reached(["qualified", "proposal", "won"])],
    ["הצעת מחיר", reached(["proposal", "won"])],
    ["נסגר", reached(["won"])],
  ]
  return stages.map(([label, leads], i) => {
    const pct = total ? (leads / total) * 100 : 0
    return { stage: "s" + (i + 1), label, leads, pct, text: pct.toFixed(0) + "% · " + fmtNum(leads) }
  })
}

export function toCsv(rows: Lead[]) {
  const head = ["id", "name", "company", "phone", "source", "owner", "status", "score", "temperature", "value", "created", "next_action"]
  const esc = (v: unknown) => '"' + String(v).replace(/"/g, '""') + '"'
  const lines = [head.join(",")].concat(
    rows.map((l) =>
      [l.id, l.name, l.company, l.phone, SOURCE_LABEL[l.source], l.owner, STATUS_LABEL[l.status], l.score, l.temp, l.value, l.created.slice(0, 10), l.next]
        .map(esc)
        .join(","),
    ),
  )
  return "﻿" + lines.join("\n")
}
