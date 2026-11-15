import { ClockIcon, FlameIcon, HandshakeIcon, PercentIcon, UsersIcon, WalletIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { useCurrency } from "@/lib/currency"
import { fmtNum, type kpis } from "@/lib/leads"

type Kpis = ReturnType<typeof kpis>

export function SectionCards({ k, days }: { k: Kpis; days: number }) {
  const { money } = useCurrency()
  const items: [string, string, string, LucideIcon][] = [
    ["לידים בתקופה", fmtNum(k.total), days + " ימים אחרונים", UsersIcon],
    ["אחוז סגירה", k.winRate.toFixed(1) + "%", fmtNum(k.won) + " נסגרו מתוך " + fmtNum(k.total), PercentIcon],
    ["זמן תגובה ראשונה", k.avgResp.toFixed(1) + " שעות", "ממוצע על " + fmtNum(k.responded) + " לידים שקיבלו מענה", ClockIcon],
    ["שווי בצנרת פתוחה", money(k.pipeline), "כל הלידים הפתוחים: חדש, נוצר קשר, מתאים והצעת מחיר", WalletIcon],
    ["שווי עסקאות שנסגרו", money(k.wonValue), fmtNum(k.won) + " עסקאות", HandshakeIcon],
    ["לידים חמים פתוחים", fmtNum(k.hot), "לידים פתוחים עם ציון 70 ומעלה", FlameIcon],
  ]
  return (
    <section
      aria-label="מדדים"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border shadow-xs md:grid-cols-3 xl:grid-cols-6"
    >
      {items.map(([label, value, note, Icon]) => (
        <div key={label} data-slot="card" className="flex min-w-0 flex-col gap-0.5 bg-card px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span data-slot="card-description" className="truncate">{label}</span>
            <Icon className="size-3.5 shrink-0" aria-hidden />
          </div>
          <div data-slot="card-title" className="text-lg leading-tight font-semibold tabular-nums">{value}</div>
          <div className="truncate text-[11px] text-muted-foreground" title={note}>{note}</div>
        </div>
      ))}
    </section>
  )
}
