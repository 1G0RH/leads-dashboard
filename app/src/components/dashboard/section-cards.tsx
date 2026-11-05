import { ClockIcon, FlameIcon, HandshakeIcon, PercentIcon, UsersIcon, WalletIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { fmtMoney, fmtNum, type kpis } from "@/lib/leads"

type Kpis = ReturnType<typeof kpis>

export function SectionCards({ k, days }: { k: Kpis; days: number }) {
  const items: [string, string, string, LucideIcon][] = [
    ["לידים בתקופה", fmtNum(k.total), days + " ימים אחרונים", UsersIcon],
    ["אחוז סגירה", k.winRate.toFixed(1) + "%", fmtNum(k.won) + " נסגרו מתוך " + fmtNum(k.total), PercentIcon],
    ["זמן תגובה ראשונה", k.avgResp.toFixed(1) + " שעות", "ממוצע על " + fmtNum(k.responded) + " לידים שקיבלו מענה", ClockIcon],
    ["שווי בצנרת פתוחה", fmtMoney(k.pipeline), "לידים בשלב מתאים ובשלב הצעת מחיר", WalletIcon],
    ["שווי עסקאות שנסגרו", fmtMoney(k.wonValue), fmtNum(k.won) + " עסקאות", HandshakeIcon],
    ["לידים חמים פתוחים", fmtNum(k.hot), "ציון 70 ומעלה", FlameIcon],
  ]
  return (
    <section
      aria-label="מדדים"
      className="grid grid-cols-2 gap-3 md:gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 dark:*:data-[slot=card]:bg-card"
    >
      {items.map(([label, value, note, Icon]) => (
        <Card key={label} className="@container/card gap-3 py-4 sm:gap-4 sm:py-5">
          <CardHeader className="px-4 sm:px-5">
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</CardTitle>
            <CardAction>
              <Icon className="size-4 text-muted-foreground" aria-hidden />
            </CardAction>
          </CardHeader>
          <CardFooter className="px-4 text-xs text-muted-foreground sm:px-5 sm:text-sm">{note}</CardFooter>
        </Card>
      ))}
    </section>
  )
}
