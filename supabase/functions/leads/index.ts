// Supabase Edge Function "leads": the server layer between the dashboard on
// GitHub Pages and the Airtable base (SPEC.md, "שכבת השרת ב-Supabase").
//
// Why it exists: the Airtable token cannot live inside a public website, so it
// is stored as the Supabase secret AIRTABLE_TOKEN and used only here.
//
//   GET    /leads              list leads (cached for 15 minutes)
//   GET    /leads?refresh=1    read from Airtable now (at most once a minute)
//   PATCH  /leads              { recordId, status, fromStatus }  change a status
//   POST   /leads              { id, name, company, phone, source, owner,
//                                budget, value, interest }       add a lead
//   POST   /leads?action=seed  fill an empty table from airtable/leads-seed.csv
//
// Deployed with verify_jwt = false because the public site has no user login;
// the function checks the request origin and validates every field instead.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const BASE_ID = Deno.env.get("AIRTABLE_BASE_ID") ?? "app1OI1LVdbGwYVkr"
const TABLE_ID = Deno.env.get("AIRTABLE_TABLE_ID") ?? "tblkaSZFXjydS0iue"
const SEED_URL = "https://raw.githubusercontent.com/1G0RH/leads-dashboard/main/airtable/leads-seed.csv"
const CACHE_SECONDS = 15 * 60
const REFRESH_MIN_SECONDS = 60

const ALLOWED_ORIGINS = [
  "https://1g0rh.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]

const STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"]
const SOURCES = ["website", "google_ads", "facebook", "referral", "linkedin", "event", "cold"]
const BUDGETS = ["small", "medium", "large", "enterprise"]
const NUMBER_FIELDS = new Set(["value", "emailOpens", "siteVisits", "firstResponseHours"])

type AirtableRecord = { id: string; createdTime?: string; fields: Record<string, unknown> }

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
})

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Vary": "Origin",
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  })
}

// ---------- Airtable ----------

async function airtable(path: string, init: RequestInit = {}) {
  const token = Deno.env.get("AIRTABLE_TOKEN")
  if (!token) throw new HttpError(503, "missing_token", "AIRTABLE_TOKEN is not set in the Supabase secrets")
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = body?.error
    const message = typeof err === "string" ? err : err?.message ?? err?.type ?? res.statusText
    throw new HttpError(res.status, `airtable_${res.status}`, message)
  }
  return body
}

async function fetchAll(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = []
  let offset: string | undefined
  do {
    const q = new URLSearchParams({ pageSize: "100" })
    if (offset) q.set("offset", offset)
    const page = await airtable("?" + q.toString())
    records.push(...page.records)
    offset = page.offset
  } while (offset)
  return records
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------- cache ----------

async function readCache(): Promise<{ records: AirtableRecord[]; fetched_at: string } | null> {
  const { data, error } = await db.from("leads_cache").select("records, fetched_at").eq("id", 1).maybeSingle()
  if (error) throw new HttpError(500, "cache_error", error.message)
  return data
}

async function writeCache(records: AirtableRecord[]) {
  const { error } = await db.from("leads_cache").upsert({ id: 1, records, fetched_at: new Date().toISOString() })
  if (error) throw new HttpError(500, "cache_error", error.message)
}

// After a write, update the cached copy in place instead of spending
// Airtable calls on a full re-read. fetched_at stays as it was.
async function patchCache(change: (records: AirtableRecord[]) => AirtableRecord[]) {
  const cache = await readCache()
  if (!cache) return
  const { error } = await db.from("leads_cache").update({ records: change(cache.records) }).eq("id", 1)
  if (error) throw new HttpError(500, "cache_error", error.message)
}

// ---------- actions ----------

async function list(refresh: boolean) {
  const cache = await readCache()
  const age = cache ? (Date.now() - new Date(cache.fetched_at).getTime()) / 1000 : Infinity
  const fresh = age < CACHE_SECONDS && !refresh
  const refreshTooSoon = refresh && age < REFRESH_MIN_SECONDS
  if (cache && cache.records.length && (fresh || refreshTooSoon)) {
    return { origin: "cache", fetchedAt: cache.fetched_at, records: cache.records }
  }
  const records = await fetchAll()
  await writeCache(records)
  return { origin: "airtable", fetchedAt: new Date().toISOString(), records }
}

function text(v: unknown, max: number, field: string, required = false) {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim()
  if (required && !s) throw new HttpError(400, "invalid_field", `${field} is required`)
  if (s.length > max) throw new HttpError(400, "invalid_field", `${field} is longer than ${max} characters`)
  return s
}

function oneOf(v: unknown, values: string[], field: string) {
  if (typeof v !== "string" || !values.includes(v)) throw new HttpError(400, "invalid_field", `${field} must be one of ${values.join(", ")}`)
  return v
}

async function updateStatus(body: Record<string, unknown>) {
  const recordId = text(body.recordId, 17, "recordId", true)
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) throw new HttpError(400, "invalid_field", "recordId is not an Airtable record id")
  const status = oneOf(body.status, STATUSES, "status")
  const fields: Record<string, unknown> = { status }
  // Leaving "new" means someone talked to the lead: record the contact time.
  if (body.fromStatus === "new" && status !== "new") fields.lastContact = new Date().toISOString()
  const record: AirtableRecord = await airtable(`/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields, typecast: true }),
  })
  await patchCache((rs) => rs.map((r) => (r.id === record.id ? record : r)))
  return { record }
}

async function createLead(body: Record<string, unknown>) {
  const id = text(body.id, 12, "id", true)
  if (!/^L-\d{3,7}$/.test(id)) throw new HttpError(400, "invalid_field", "id must look like L-1261")
  const phone = text(body.phone, 20, "phone")
  if (phone && !/^[0-9+\- ]+$/.test(phone)) throw new HttpError(400, "invalid_field", "phone may contain digits, spaces, + and - only")
  const value = Number(body.value ?? 0)
  if (!Number.isFinite(value) || value < 0 || value > 10_000_000) throw new HttpError(400, "invalid_field", "value must be between 0 and 10,000,000")
  const fields = {
    id,
    name: text(body.name, 80, "name", true),
    company: text(body.company, 80, "company"),
    phone,
    source: oneOf(body.source, SOURCES, "source"),
    owner: text(body.owner, 40, "owner", true),
    budget: oneOf(body.budget, BUDGETS, "budget"),
    value: Math.round(value),
    interest: text(body.interest, 80, "interest"),
    status: "new",
    emailOpens: 0,
    siteVisits: 0,
    created: new Date().toISOString(),
  }
  const res = await airtable("", { method: "POST", body: JSON.stringify({ records: [{ fields }], typecast: true }) })
  const record: AirtableRecord = res.records[0]
  await patchCache((rs) => [record, ...rs])
  return { record }
}

// Minimal CSV reader for the seed file: comma separated, double quotes
// around values that contain commas or quotes.
function parseCsv(textIn: string) {
  const rows: string[][] = []
  let row: string[] = [], cell = "", quoted = false
  for (let i = 0; i < textIn.length; i++) {
    const c = textIn[i]
    if (quoted) {
      if (c === '"' && textIn[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(cell); cell = "" }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = "" }
    else if (c !== "\r") cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

async function seed() {
  const first = await airtable("?pageSize=1&maxRecords=1")
  if (first.records.length) return { seeded: 0, reason: "table is not empty" }
  const res = await fetch(SEED_URL)
  if (!res.ok) throw new HttpError(502, "seed_download", `could not download the seed file (${res.status})`)
  const [head, ...lines] = parseCsv(await res.text()).filter((r) => r.length > 1)
  const records = lines.map((cells) => {
    const fields: Record<string, unknown> = {}
    head.forEach((name, i) => {
      const v = cells[i] ?? ""
      if (v === "") return
      fields[name] = NUMBER_FIELDS.has(name) ? Number(v) : v
    })
    return { fields }
  })
  // Airtable takes up to 10 records per request and 5 requests a second per base.
  for (let i = 0; i < records.length; i += 10) {
    await airtable("", { method: "POST", body: JSON.stringify({ records: records.slice(i, i + 10), typecast: true }) })
    await sleep(250)
  }
  await writeCache(await fetchAll())
  return { seeded: records.length }
}

// ---------- server ----------

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin")
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) })

  try {
    const url = new URL(req.url)
    if (req.method === "GET") return json(await list(url.searchParams.get("refresh") === "1"), 200, origin)

    // Writes are accepted only from the dashboard itself.
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) throw new HttpError(403, "forbidden_origin", "writes are accepted only from the dashboard")
    const body = await req.json().catch(() => ({}))

    if (req.method === "POST" && url.searchParams.get("action") === "seed") return json(await seed(), 200, origin)
    if (req.method === "POST") return json(await createLead(body), 201, origin)
    if (req.method === "PATCH") return json(await updateStatus(body), 200, origin)
    throw new HttpError(405, "method_not_allowed", `${req.method} is not supported`)
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(500, "server_error", e instanceof Error ? e.message : String(e))
    return json({ error: err.code, message: err.message }, err.status, origin)
  }
})
