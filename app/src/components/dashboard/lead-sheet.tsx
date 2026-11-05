import { ArrowLeftIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Status } from "@/data/mock-data"
import { BUDGET_LABEL, SOURCE_LABEL, STATUS_LABEL, fmtMoney, type Lead } from "@/lib/leads"
import { TempBadge } from "./leads-table"

export function LeadSheet({
  lead,
  onClose,
  onStatus,
}: {
  lead: Lead | null
  onClose: () => void
  onStatus: (id: string, s: Status) => void
}) {
  return (
    <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {lead && (
          <>
            <SheetHeader className="pe-12">
              <SheetTitle className="flex items-center gap-2 text-lg">
                {lead.name}
                <TempBadge temp={lead.temp} />
              </SheetTitle>
              <SheetDescription>
                {lead.company} · {lead.id}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4 pb-6">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {(
                  [
                    ["טלפון", <span dir="ltr">{lead.phone}</span>],
                    ["מקור", SOURCE_LABEL[lead.source]],
                    ["נציג", lead.owner],
                    ["מתעניין ב", lead.interest],
                    ["תקציב", BUDGET_LABEL[lead.budget]],
                    ["שווי משוער", fmtMoney(lead.value)],
                    ["נוצר", new Date(lead.created).toLocaleString("he-IL")],
                    ["קשר אחרון", lead.lastContact ? new Date(lead.lastContact).toLocaleDateString("he-IL") : "עוד לא"],
                    ["זמן תגובה ראשונה", lead.firstResponseHours != null ? lead.firstResponseHours + " שעות" : "עוד לא נענה"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>

              <Separator />

              <section aria-label="פירוק הציון" className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium">ציון ליד</h3>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    <span className="text-base font-semibold text-foreground">{lead.score}</span> מתוך 100
                  </span>
                </div>
                {(
                  [
                    ["מקור הליד", lead.scoreParts.source, 30],
                    ["תקציב", lead.scoreParts.budget, 30],
                    ["מעורבות, מיילים וביקורים", lead.scoreParts.engagement, 25],
                    ["טריות", lead.scoreParts.recency, 15],
                  ] as const
                ).map(([label, value, max]) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm">
                      <span>{label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {value} מתוך {max}
                      </span>
                    </div>
                    <Progress value={(value / max) * 100} aria-label={label} className="[&>[data-slot=progress-indicator]]:bg-chart-3" />
                  </div>
                ))}
              </section>

              <Alert>
                <ArrowLeftIcon />
                <AlertTitle>פעולה הבאה</AlertTitle>
                <AlertDescription>{lead.next}</AlertDescription>
              </Alert>

              {lead.flags.length > 0 && (
                <div className="flex gap-2">
                  {lead.flags.includes("sla") && (
                    <Badge variant="outline" className="border-status-critical/50 text-status-critical">חריגת SLA</Badge>
                  )}
                  {lead.flags.includes("stale") && (
                    <Badge variant="outline" className="border-status-warning/60 text-status-warning">בלי קשר מעל שבוע</Badge>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="lead-status">שינוי סטטוס</Label>
                <Select value={lead.status} onValueChange={(v) => onStatus(lead.id, v as Status)}>
                  <SelectTrigger id="lead-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">השינוי נשמר רק בדפדפן הזה, כי אלה נתוני דמה.</p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
