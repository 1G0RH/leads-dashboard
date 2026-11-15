import * as React from "react"
import type { SortingState } from "@tanstack/react-table"
import { CircleAlertIcon, TriangleAlertIcon } from "lucide-react"

import { AlertsBar } from "@/components/dashboard/alerts-bar"
import { FunnelChart, SourceChart, WeeklyChart } from "@/components/dashboard/charts"
import { ConnectionDialog } from "@/components/dashboard/connection-dialog"
import { CurrencySelect } from "@/components/dashboard/currency-select"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { LeadSheet } from "@/components/dashboard/lead-sheet"
import { LeadsTable } from "@/components/dashboard/leads-table"
import { NewLeadDialog } from "@/components/dashboard/new-lead-dialog"
import { SectionCards } from "@/components/dashboard/section-cards"
import { SiteHeader } from "@/components/dashboard/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { RawLead, Status } from "@/data/mock-data"
import { useConnection } from "@/hooks/use-connection"
import type { SkippedRecord } from "@/lib/airtable"
import { nextLeadId, type NewLeadInput } from "@/lib/data-source"
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

interface DataState {
  state: "loading" | "ready" | "error"
  leads: RawLead[]
  skipped: SkippedRecord[]
  fetchedAt: string | null
  error: string | null
}

const EMPTY_DATA: DataState = { state: "loading", leads: [], skipped: [], fetchedAt: null, error: null }

function LoadingView() {
  return (
    <div className="flex flex-col gap-4" aria-label="טוען נתונים">
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

export default function App() {
  const conn = useConnection()
  const [data, setData] = React.useState<DataState>(EMPTY_DATA)
  const [now, setNow] = React.useState(() => Date.now())
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS)
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "created", desc: true }])
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [connectOpen, setConnectOpen] = React.useState(false)
  const [newOpen, setNewOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  const load = React.useCallback(
    async (refresh = false) => {
      setData((d) => ({ ...d, state: "loading", error: null }))
      try {
        const res = await conn.source.load(refresh)
        setNow(Date.now())
        setData({ state: "ready", leads: res.leads, skipped: res.skipped, fetchedAt: res.fetchedAt, error: null })
      } catch (e) {
        setData((d) => ({ ...d, state: "error", error: e instanceof Error ? e.message : String(e) }))
      }
    },
    [conn.source],
  )

  React.useEffect(() => {
    load()
  }, [load])

  const all = React.useMemo(() => data.leads.map((l) => enrich(l, now)), [data.leads, now])
  const rows = React.useMemo(() => applyFilters(all, filters, now), [all, filters, now])
  // The quick-filter counts ignore the quick filter itself, so they stay put when an alert is chosen.
  const quickBase = React.useMemo(() => applyFilters(all, { ...filters, quick: "" }, now), [all, filters, now])
  const owners = React.useMemo(() => [...new Set(data.leads.map((l) => l.owner))].sort((a, b) => a.localeCompare(b, "he")), [data.leads])

  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }))

  // Status change is written to the data source. The table updates at once,
  // and goes back to the old value if the save fails (SPEC.md, "המסך").
  async function changeStatus(id: string, status: Status) {
    const before = data.leads.find((l) => l.id === id)
    if (!before || before.status === status) return
    setSaving(true)
    setSaveError(null)
    setData((d) => ({ ...d, leads: d.leads.map((l) => (l.id === id ? { ...l, status } : l)) }))
    try {
      const saved = await conn.source.setStatus(before, status)
      setData((d) => ({ ...d, leads: d.leads.map((l) => (l.id === id ? saved : l)) }))
    } catch (e) {
      setData((d) => ({ ...d, leads: d.leads.map((l) => (l.id === id ? before : l)) }))
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  // New lead: saved to the data source first, then shown, with its card open.
  async function createLead(input: NewLeadInput) {
    const saved = await conn.source.create(input)
    setData((d) => ({ ...d, leads: [saved, ...d.leads] }))
    setNow(Date.now())
    setOpenId(saved.id)
  }

  function exportCsv() {
    const blob = new Blob([toCsv(sortRows(rows, sorting))], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "leads-export.csv"
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const skippedReasons = [...new Set(data.skipped.map((s) => s.reason))].join(", ")

  return (
    <div className="min-h-svh bg-muted/40">
      <SiteHeader
        status={{ kind: conn.source.kind, state: data.state, count: data.leads.length, fetchedAt: data.fetchedAt }}
        onRefresh={() => load(true)}
        onConnect={() => setConnectOpen(true)}
      >
        <CurrencySelect />
      </SiteHeader>
      <main className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
        {data.state === "error" && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>לא הצלחנו לטעון את הלידים</AlertTitle>
            <AlertDescription>
              <p>{data.error}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => load()}>
                  נסו שוב
                </Button>
                {conn.source.kind === "own" && (
                  <Button size="sm" variant="ghost" onClick={conn.disconnect}>
                    חזרה לנתוני הפרויקט
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        {data.skipped.length > 0 && data.state === "ready" && (
          <Alert>
            <TriangleAlertIcon className="text-status-warning" />
            <AlertTitle>{data.skipped.length} רשומות דולגו</AlertTitle>
            <AlertDescription>אי אפשר לחשב להן ציון. הסיבות: {skippedReasons}.</AlertDescription>
          </Alert>
        )}

        {data.state === "loading" && !data.leads.length ? (
          <LoadingView />
        ) : data.leads.length ? (
          <>
            <FilterBar
              filters={filters}
              owners={owners}
              onChange={patch}
              onReset={() => setFilters(EMPTY_FILTERS)}
              onExport={exportCsv}
              onNew={() => setNewOpen(true)}
            />
            <SectionCards k={kpis(rows)} days={filters.days} />
            <AlertsBar counts={alertCounts(quickBase)} total={quickBase.length} value={filters.quick} onChange={(quick) => patch({ quick })} />
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
              <WeeklyChart data={weeklyBuckets(rows, filters.days, now)} />
              <SourceChart
                data={sourceBreakdown(rows)}
                selected={filters.source}
                onSelect={(s) => patch({ source: filters.source === s ? "" : s })}
              />
              <FunnelChart data={funnel(rows)} />
            </div>
            <LeadsTable rows={rows} sorting={sorting} onSortingChange={setSorting} onOpen={setOpenId} />
          </>
        ) : null}
      </main>
      <LeadSheet
        lead={all.find((l) => l.id === openId) ?? null}
        onClose={() => {
          setOpenId(null)
          setSaveError(null)
        }}
        onStatus={changeStatus}
        saving={saving}
        error={saveError}
      />
      <NewLeadDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        owners={owners}
        nextId={nextLeadId(data.leads)}
        onCreate={createLead}
      />
      <ConnectionDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        connected={conn.config}
        saved={conn.saved}
        onConnect={conn.connect}
        onDisconnect={conn.disconnect}
        onForget={conn.forget}
      />
    </div>
  )
}
