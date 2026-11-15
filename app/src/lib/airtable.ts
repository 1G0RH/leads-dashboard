import type { Budget, RawLead, Source, Status } from "@/data/mock-data"
import { BUDGET_LABEL, SOURCE_LABEL, STATUS_LABEL } from "@/lib/leads"

// Reading Airtable records into leads (SPEC.md, "קריאת נתונים לא תקינים").
// Data from someone else's base can be messy, so every field is read with care
// and a record that cannot be scored is skipped and counted, never guessed.

export interface AirtableRecord {
  id: string
  createdTime?: string
  fields: Record<string, unknown>
}

export interface SkippedRecord {
  recordId: string
  reason: string
}

const SOURCES = Object.keys(SOURCE_LABEL) as Source[]
const STATUSES = Object.keys(STATUS_LABEL) as Status[]
const BUDGETS = Object.keys(BUDGET_LABEL) as Budget[]

// "Google Ads", " google_ads ", "GOOGLE-ADS" and the Hebrew label all become "google_ads".
function key(v: string) {
  return v.trim().toLowerCase().replace(/[\s-]+/g, "_")
}

function select<T extends string>(raw: unknown, values: readonly T[], labels: Record<T, string>): T | null {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (typeof v !== "string" || !v.trim()) return null
  const k = key(v)
  const direct = values.find((x) => x === k)
  if (direct) return direct
  const byLabel = values.find((x) => key(labels[x]) === k)
  return byLabel ?? null
}

function num(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string") {
    const n = Number(raw.replace(/[₪,\s]/g, ""))
    return raw.trim() && Number.isFinite(n) ? n : null
  }
  return null
}

function date(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null
  const t = Date.parse(raw)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

function str(raw: unknown) {
  return typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw).trim()
}

export function parseRecord(rec: AirtableRecord): RawLead | SkippedRecord {
  const f = rec.fields ?? {}
  const id = str(f.id)
  if (!id) return { recordId: rec.id, reason: "חסר id" }
  const created = date(f.created)
  if (!created) return { recordId: rec.id, reason: "תאריך יצירה חסר או לא תקין" }
  const source = select(f.source, SOURCES, SOURCE_LABEL)
  if (!source) return { recordId: rec.id, reason: "מקור לא מוכר" }
  const status = select(f.status, STATUSES, STATUS_LABEL)
  if (!status) return { recordId: rec.id, reason: "סטטוס לא מוכר" }
  const budget = select(f.budget, BUDGETS, BUDGET_LABEL)
  if (!budget) return { recordId: rec.id, reason: "תקציב לא מוכר" }

  return {
    id,
    recordId: rec.id,
    name: str(f.name) || id,
    company: str(f.company),
    phone: str(f.phone),
    source,
    owner: str(Array.isArray(f.owner) ? f.owner[0] : f.owner) || "לא משויך",
    status,
    budget,
    value: Math.max(0, num(f.value) ?? 0),
    interest: str(f.interest),
    emailOpens: Math.max(0, num(f.emailOpens) ?? 0),
    siteVisits: Math.max(0, num(f.siteVisits) ?? 0),
    created,
    lastContact: date(f.lastContact),
    firstResponseHours: num(f.firstResponseHours),
  }
}

export function parseRecords(records: AirtableRecord[]) {
  const leads: RawLead[] = []
  const skipped: SkippedRecord[] = []
  for (const r of records) {
    const out = parseRecord(r)
    if ("reason" in out) skipped.push(out)
    else leads.push(out)
  }
  return { leads, skipped }
}

// ---------- direct Airtable access ("Airtable משלך") ----------

export interface AirtableConfig {
  token: string
  baseId: string
  table: string
}

export class DataError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

// Hebrew messages for each failure (SPEC.md, connection panel item 6).
export function airtableErrorMessage(status: number, detail: string) {
  switch (status) {
    case 401:
      return "המפתח לא תקין. בדקו שהעתקתם את כל המפתח מ-Airtable."
    case 403:
      return "למפתח אין הרשאה לבסיס הזה. בהגדרות המפתח צריך לבחור את הבסיס ואת ההרשאה data.records:read."
    case 404:
      return "הבסיס או הטבלה לא נמצאו. בדקו את ה-Base ID ואת ה-Table ID."
    case 422:
      return "Airtable דחה את הבקשה: " + detail
    case 429:
      return "עברנו את מגבלת הקריאות של Airtable. נסו שוב בעוד 30 שניות."
    default:
      return `שגיאה מ-Airtable (${status}): ${detail}`
  }
}

async function call(cfg: AirtableConfig, path: string, init: RequestInit = {}) {
  let res: Response
  try {
    res = await fetch(
      `https://api.airtable.com/v0/${encodeURIComponent(cfg.baseId.trim())}/${encodeURIComponent(cfg.table.trim())}${path}`,
      { ...init, headers: { Authorization: `Bearer ${cfg.token.trim()}`, "Content-Type": "application/json" } },
    )
  } catch {
    throw new DataError("network", "אין חיבור ל-Airtable. בדקו את החיבור לאינטרנט ונסו שוב.")
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = body?.error
    const detail = typeof err === "string" ? err : err?.message ?? err?.type ?? res.statusText
    throw new DataError(`airtable_${res.status}`, airtableErrorMessage(res.status, detail))
  }
  return body
}

export async function airtableList(cfg: AirtableConfig): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = []
  let offset: string | undefined
  do {
    const q = new URLSearchParams({ pageSize: "100" })
    if (offset) q.set("offset", offset)
    const page = await call(cfg, "?" + q.toString())
    records.push(...page.records)
    offset = page.offset
  } while (offset)
  return records
}

export async function airtableUpdate(cfg: AirtableConfig, recordId: string, fields: Record<string, unknown>) {
  const rec: AirtableRecord = await call(cfg, `/${recordId}`, { method: "PATCH", body: JSON.stringify({ fields, typecast: true }) })
  return rec
}

export async function airtableCreate(cfg: AirtableConfig, fields: Record<string, unknown>) {
  const res = await call(cfg, "", { method: "POST", body: JSON.stringify({ records: [{ fields }], typecast: true }) })
  return res.records[0] as AirtableRecord
}
