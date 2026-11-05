import * as React from "react"
import type { SortingState } from "@tanstack/react-table"

import { AlertsBar } from "@/components/dashboard/alerts-bar"
import { FunnelChart, SourceChart, WeeklyChart } from "@/components/dashboard/charts"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { LeadSheet } from "@/components/dashboard/lead-sheet"
import { LeadsTable } from "@/components/dashboard/leads-table"
import { SectionCards } from "@/components/dashboard/section-cards"
import { SiteHeader } from "@/components/dashboard/site-header"
import { generateLeads } from "@/data/mock-data"
import { useOverrides } from "@/hooks/use-overrides"
import {
  EMPTY_FILTERS,
  SOURCE_LABEL,
  STATUS_LABEL,
  alertCounts,
  applyFilters,
  enrich,
  funnel,
  kpis,
  sourceBreakdown,
  toCsv,
  weeklyBuckets,
  type Filters,
  type Lead,
} from "@/lib/leads"

const DATA = generateLeads()
const NOW = new Date(DATA.generatedAt).getTime()

// Same order as the table: by the visible column value, then by creation date.
function sortRows(rows: Lead[], sorting: SortingState) {
  const s = sorting[0]
  if (!s) return rows
  const value = (l: Lead): string | number =>
    s.id === "source" ? SOURCE_LABEL[l.source] : s.id === "status" ? STATUS_LABEL[l.status] : (l[s.id as keyof Lead] as string | number)
  const dir = s.desc ? -1 : 1
  return rows.slice().sort((a, b) => {
    const va = value(a)
    const vb = value(b)
    return va < vb ? -dir : va > vb ? dir : 0
  })
}

export default function App() {
  const { overrides, setStatus } = useOverrides()
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS)
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "created", desc: true }])
  const [openId, setOpenId] = React.useState<string | null>(null)

  const all = React.useMemo(() => DATA.leads.map((l) => enrich(l, NOW, overrides[l.id])), [overrides])
  const rows = React.useMemo(() => applyFilters(all, filters, NOW), [all, filters])

  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }))

  function exportCsv() {
    const blob = new Blob([toCsv(sortRows(rows, sorting))], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "leads-export.csv"
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <SiteHeader generatedAt={DATA.generatedAt} />
      <main className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
        <FilterBar filters={filters} onChange={patch} onReset={() => setFilters(EMPTY_FILTERS)} onExport={exportCsv} />
        <SectionCards k={kpis(rows)} days={filters.days} />
        <AlertsBar counts={alertCounts(rows)} value={filters.quick} onChange={(quick) => patch({ quick })} />
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
          <WeeklyChart data={weeklyBuckets(rows, filters.days, NOW)} />
          <SourceChart
            data={sourceBreakdown(rows)}
            selected={filters.source}
            onSelect={(s) => patch({ source: filters.source === s ? "" : s })}
          />
          <FunnelChart data={funnel(rows)} />
        </div>
        <LeadsTable rows={rows} sorting={sorting} onSortingChange={setSorting} onOpen={setOpenId} />
      </main>
      <LeadSheet lead={all.find((l) => l.id === openId) ?? null} onClose={() => setOpenId(null)} onStatus={setStatus} />
    </div>
  )
}
