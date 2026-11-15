// Writes airtable/leads-seed.csv: the 260 mock leads that fill the Airtable
// base once. The same file is the import template for anyone who wants to
// connect their own base (SPEC.md, "נתוני ההתחלה").
//
// Run from app/:  npx tsx scripts/export-seed.ts [YYYY-MM-DD]
// The optional date fixes "today" so the file can be reproduced exactly.
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { generateLeads } from "../src/data/mock-data"

const day = process.argv[2]
const clock = day ? new Date(day + "T12:00:00+02:00") : new Date()
const { leads, generatedAt } = generateLeads(clock)

const fields = [
  "id", "name", "company", "phone", "source", "owner", "status", "budget", "value",
  "interest", "emailOpens", "siteVisits", "created", "lastContact", "firstResponseHours",
] as const

const esc = (v: unknown) => {
  if (v === null || v === undefined) return ""
  const s = String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

const lines = [fields.join(",")].concat(leads.map((l) => fields.map((f) => esc(l[f])).join(",")))
const out = resolve(import.meta.dirname, "../../airtable/leads-seed.csv")
writeFileSync(out, lines.join("\n") + "\n", "utf8")
console.log(`wrote ${leads.length} leads to ${out} (clock ${generatedAt})`)
