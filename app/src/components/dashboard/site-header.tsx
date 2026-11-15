import { DatabaseIcon, MoonIcon, PlugIcon, RefreshCwIcon, SunIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"
import { fmtNum } from "@/lib/leads"
import { cn } from "@/lib/utils"

export interface ConnectionStatus {
  kind: "project" | "own"
  state: "loading" | "ready" | "error"
  count: number
  fetchedAt: string | null
}

// Connection badge (SPEC.md, connection panel item 5): which source, how many
// records, and when they were loaded.
function StatusBadge({ s }: { s: ConnectionStatus }) {
  const label = s.state === "error" ? "לא מחובר" : s.kind === "own" ? "מחובר ל-Airtable שלך" : "נתוני הפרויקט"
  const time = s.fetchedAt ? new Date(s.fetchedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : ""
  return (
    <Badge variant="outline" className="h-7 gap-1.5 font-normal">
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          s.state === "ready" ? "bg-status-good" : s.state === "error" ? "bg-status-critical" : "animate-pulse bg-muted-foreground",
        )}
      />
      <span className="font-medium">{s.state === "loading" ? "טוען..." : label}</span>
      {s.state === "ready" && (
        <span className="hidden text-muted-foreground md:inline">
          · {fmtNum(s.count)} רשומות · נטען ב-{time}
        </span>
      )}
    </Badge>
  )
}

export function SiteHeader({
  status,
  onRefresh,
  onConnect,
  children,
}: {
  status: ConnectionStatus
  onRefresh: () => void
  onConnect: () => void
  children?: React.ReactNode
}) {
  const { resolved, setTheme } = useTheme()
  const dark = resolved === "dark"
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex min-h-14 max-w-screen-2xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 lg:px-6">
        <h1 className="flex items-center gap-2 text-base font-semibold whitespace-nowrap">
          <DatabaseIcon className="size-4 text-muted-foreground" aria-hidden />
          ניהול לידים חכם
        </h1>
        <StatusBadge s={status} />
        <div className="ms-auto flex items-center gap-1">
          {children}
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={status.state === "loading"} aria-label="רענון הנתונים">
            <RefreshCwIcon className={cn(status.state === "loading" && "animate-spin")} />
            <span className="hidden sm:inline">רענון</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onConnect}>
            <PlugIcon />
            <span className="hidden sm:inline">חיבור ל-Airtable</span>
            <span className="sm:hidden">Airtable</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(dark ? "light" : "dark")}
            aria-label={dark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </Button>
        </div>
      </div>
    </header>
  )
}
