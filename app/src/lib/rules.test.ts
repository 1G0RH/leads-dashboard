// Automated checks of the business rules in SPEC.md (acceptance item 11 and the
// logic sections). Each test names the spec section it checks.
import { describe, expect, it } from "vitest"

import type { RawLead, Status } from "@/data/mock-data"
import { parseRecord, parseRecords } from "@/lib/airtable"
import { convert, formatMoney } from "@/lib/currency"
import { nextLeadId } from "@/lib/data-source"
import {
  CLOSED_STATUSES,
  DAY,
  IN_PROGRESS_STATUSES,
  OPEN_STATUSES,
  alertCounts,
  enrich,
  funnel,
  kpis,
  sourceBreakdown,
} from "@/lib/leads"

const NOW = Date.parse("2026-11-15T12:00:00Z")
const ago = (days: number) => new Date(NOW - days * DAY).toISOString()

let n = 0
function lead(p: Partial<RawLead> = {}): RawLead {
  n++
  return {
    id: "L-" + (2000 + n),
    name: "בדיקה",
    company: "",
    phone: "",
    source: "website",
    owner: "אלה",
    status: "new",
    budget: "small",
    value: 1000,
    interest: "",
    emailOpens: 0,
    siteVisits: 0,
    created: ago(1),
    lastContact: null,
    firstResponseHours: null,
    ...p,
  }
}
const all = (rs: RawLead[]) => rs.map((r) => enrich(r, NOW))

describe("glossary (מילון מונחים)", () => {
  it("open = new, contacted, qualified, proposal; in progress excludes new; closed = won, lost", () => {
    expect([...OPEN_STATUSES]).toEqual(["new", "contacted", "qualified", "proposal"])
    expect([...IN_PROGRESS_STATUSES]).toEqual(["contacted", "qualified", "proposal"])
    expect([...CLOSED_STATUSES]).toEqual(["won", "lost"])
  })

  it("pipeline value sums every open lead and no closed lead", () => {
    const statuses: Status[] = ["new", "contacted", "qualified", "proposal", "won", "lost"]
    const rows = all(statuses.map((status, i) => lead({ status, value: 10 ** i })))
    // 1 + 10 + 100 + 1000 (open) ; 10,000 and 100,000 are closed
    expect(kpis(rows).pipeline).toBe(1111)
    expect(kpis(rows).wonValue).toBe(10000)
  })

  it("hot open leads = open and score >= 70; a closed lead with a high score is not counted", () => {
    const strong = { source: "referral" as const, budget: "enterprise" as const, emailOpens: 9, siteVisits: 12, created: ago(1) }
    const rows = all([lead({ ...strong, status: "new" }), lead({ ...strong, status: "proposal" }), lead({ ...strong, status: "won" })])
    expect(rows.every((r) => r.score >= 70)).toBe(true)
    expect(kpis(rows).hot).toBe(2)
  })
})

describe("alerts (התראות)", () => {
  it("SLA: a new lead older than 24 hours", () => {
    const rows = all([lead({ created: ago(0.5) }), lead({ created: ago(2) })])
    expect(rows.map((r) => r.flags.includes("sla"))).toEqual([false, true])
    expect(alertCounts(rows).sla).toBe(1)
  })

  it("no contact: only leads in progress with no contact for more than 7 days, never new leads", () => {
    const rows = all([
      lead({ status: "contacted", created: ago(20), lastContact: ago(8) }),
      lead({ status: "proposal", created: ago(20), lastContact: ago(3) }),
      lead({ status: "won", created: ago(20), lastContact: ago(30) }),
      lead({ status: "new", created: ago(20), lastContact: ago(30) }),
    ])
    expect(rows.map((r) => r.flags.includes("stale"))).toEqual([true, false, false, false])
  })
})

describe("score and temperature (ציון ליד, חום ליד)", () => {
  it("adds source, budget, engagement (capped at 25) and recency", () => {
    const [l] = all([lead({ source: "referral", budget: "large", emailOpens: 9, siteVisits: 12, created: ago(5) })])
    expect(l.scoreParts).toEqual({ source: 30, budget: 25, engagement: 25, recency: 10, total: 90 })
  })

  it("70+ hot, 40-69 warm, under 40 cold, closed leads have no temperature", () => {
    const [cold] = all([lead({ source: "cold", budget: "small", created: ago(30) })])
    const [warm] = all([lead({ source: "website", budget: "medium", created: ago(30) })])
    const [closed] = all([lead({ source: "referral", budget: "enterprise", status: "lost" })])
    expect([cold.score, cold.temp]).toEqual([10, "cold"])
    expect([warm.score, warm.temp]).toEqual([40, "warm"])
    expect(closed.temp).toBe("closed")
  })
})

describe("charts agree with the KPIs (acceptance item 3)", () => {
  it("source totals add up to the number of leads, funnel starts at the total", () => {
    const sources = ["website", "google_ads", "facebook", "referral", "linkedin", "event", "cold"] as const
    const rows = all(Array.from({ length: 40 }, (_, i) => lead({ source: sources[i % 7], status: i % 5 === 0 ? "won" : "contacted" })))
    expect(sourceBreakdown(rows).reduce((s, x) => s + x.leads, 0)).toBe(kpis(rows).total)
    expect(funnel(rows)[0].leads).toBe(40)
    expect(funnel(rows)[4].leads).toBe(8)
  })
})

describe("reading Airtable records (קריאת נתונים לא תקינים)", () => {
  const base = { id: "L-1", created: "2026-11-01T10:00:00.000Z", source: "website", status: "new", budget: "small" }

  it("reads numbers stored as text, select values in any case or in Hebrew", () => {
    const out = parseRecord({
      id: "recAAAAAAAAAAAAAA",
      fields: { ...base, source: "Google Ads", status: "נוצר קשר", budget: " LARGE ", value: "₪12,500", emailOpens: "3" },
    })
    expect("reason" in out).toBe(false)
    if (!("reason" in out)) {
      expect([out.source, out.status, out.budget, out.value, out.emailOpens]).toEqual(["google_ads", "contacted", "large", 12500, 3])
      expect(out.recordId).toBe("recAAAAAAAAAAAAAA")
    }
  })

  it("skips a record without id, without a valid created date, or with an unknown select value", () => {
    const { leads, skipped } = parseRecords([
      { id: "rec1", fields: { ...base } },
      { id: "rec2", fields: { ...base, id: "" } },
      { id: "rec3", fields: { ...base, created: "yesterday" } },
      { id: "rec4", fields: { ...base, source: "tiktok" } },
      { id: "rec5", fields: { ...base, status: "maybe" } },
    ])
    expect(leads).toHaveLength(1)
    expect(skipped.map((s) => s.reason)).toEqual(["חסר id", "תאריך יצירה חסר או לא תקין", "מקור לא מוכר", "סטטוס לא מוכר"])
  })
})

describe("new lead id and currency", () => {
  it("next id follows the highest L-number", () => {
    expect(nextLeadId([lead({ id: "L-1013" }), lead({ id: "L-1260" }), lead({ id: "X-9" })])).toBe("L-1261")
    expect(nextLeadId([])).toBe("L-1001")
  })

  it("converts shekels for display only, and falls back to shekels without rates", () => {
    const rates = { date: "2026-11-13", USD: 0.31146, EUR: 0.28181 }
    expect(formatMoney(1595400, "USD", rates)).toBe("$" + (496903).toLocaleString("he-IL"))
    expect(formatMoney(1595400, "EUR", rates)).toBe("€" + (449600).toLocaleString("he-IL"))
    expect(formatMoney(1595400, "USD", null)).toBe("₪" + (1595400).toLocaleString("he-IL"))
    expect(convert(100, "ILS", rates)).toBe(100)
  })
})
