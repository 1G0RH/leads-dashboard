import type { Budget, RawLead, Source, Status } from "@/data/mock-data"
import {
  DataError,
  airtableCreate,
  airtableList,
  airtableUpdate,
  parseRecord,
  parseRecords,
  type AirtableConfig,
  type AirtableRecord,
  type SkippedRecord,
} from "@/lib/airtable"

// The two connection modes (SPEC.md, "שני מצבי חיבור").
//   project: the browser asks the Supabase function, which holds the token.
//   own:     the browser asks Airtable directly with the key the user typed.

export const PROXY_URL = "https://iszhsnbnmpgtoruqiggc.supabase.co/functions/v1/leads"

export interface LoadResult {
  leads: RawLead[]
  skipped: SkippedRecord[]
  fetchedAt: string
  origin: "cache" | "airtable"
}

export interface NewLeadInput {
  id: string
  name: string
  company: string
  phone: string
  source: Source
  owner: string
  budget: Budget
  value: number
  interest: string
}

export interface DataSource {
  kind: "project" | "own"
  load(refresh?: boolean): Promise<LoadResult>
  setStatus(lead: RawLead, status: Status): Promise<RawLead>
  create(input: NewLeadInput): Promise<RawLead>
}

function toLead(rec: AirtableRecord): RawLead {
  const out = parseRecord(rec)
  if ("reason" in out) throw new DataError("bad_record", "Airtable החזיר רשומה לא תקינה: " + out.reason)
  return out
}

// ---------- project data, through Supabase ----------

const PROXY_MESSAGES: Record<string, string> = {
  missing_token: "החיבור של הפרויקט ל-Airtable עוד לא הוגדר: חסר המפתח בסודות של Supabase.",
  forbidden_origin: "השרת מקבל שמירות רק מהאתר של הדשבורד.",
  airtable_401: "המפתח של הפרויקט ב-Supabase לא תקין או בוטל.",
  airtable_403: "למפתח של הפרויקט אין הרשאה לבסיס.",
  airtable_429: "עברנו את מגבלת הקריאות של Airtable. נסו שוב בעוד 30 שניות.",
}

async function proxy(path: string, init: RequestInit = {}) {
  let res: Response
  try {
    res = await fetch(PROXY_URL + path, { ...init, headers: { "Content-Type": "application/json" } })
  } catch {
    throw new DataError("network", "אין חיבור לשרת של הדשבורד. בדקו את החיבור לאינטרנט ונסו שוב.")
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const code = String(body?.error ?? `http_${res.status}`)
    throw new DataError(code, PROXY_MESSAGES[code] ?? `שגיאה מהשרת (${res.status}): ${body?.message ?? res.statusText}`)
  }
  return body
}

export const projectSource: DataSource = {
  kind: "project",
  async load(refresh = false) {
    const body = await proxy(refresh ? "?refresh=1" : "")
    return { ...parseRecords(body.records), fetchedAt: body.fetchedAt, origin: body.origin }
  },
  async setStatus(lead, status) {
    const body = await proxy("", {
      method: "PATCH",
      body: JSON.stringify({ recordId: lead.recordId, status, fromStatus: lead.status }),
    })
    return toLead(body.record)
  },
  async create(input) {
    const body = await proxy("", { method: "POST", body: JSON.stringify(input) })
    return toLead(body.record)
  },
}

// ---------- the user's own Airtable ----------

export function ownSource(cfg: AirtableConfig): DataSource {
  return {
    kind: "own",
    async load() {
      const records = await airtableList(cfg)
      return { ...parseRecords(records), fetchedAt: new Date().toISOString(), origin: "airtable" }
    },
    async setStatus(lead, status) {
      if (!lead.recordId) throw new DataError("no_record_id", "לליד הזה אין מזהה רשומה של Airtable.")
      const fields: Record<string, unknown> = { status }
      if (lead.status === "new" && status !== "new") fields.lastContact = new Date().toISOString()
      return toLead(await airtableUpdate(cfg, lead.recordId, fields))
    },
    async create(input) {
      const fields = { ...input, status: "new", emailOpens: 0, siteVisits: 0, created: new Date().toISOString() }
      return toLead(await airtableCreate(cfg, fields))
    },
  }
}

// Next free id in the L-1234 pattern.
export function nextLeadId(leads: RawLead[]) {
  const max = leads.reduce((m, l) => {
    const n = /^L-(\d+)$/.exec(l.id)
    return n ? Math.max(m, Number(n[1])) : m
  }, 1000)
  return "L-" + (max + 1)
}
