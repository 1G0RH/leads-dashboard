import { CheckIcon, CircleAlertIcon, FlameIcon, ListFilterIcon, PhoneOffIcon, UsersIcon } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SLA_HOURS, STALE_DAYS, fmtNum, type Quick } from "@/lib/leads"
import { cn } from "@/lib/utils"

// Quick-filter row (SPEC.md, "התראות"): "all leads" plus the three alerts.
// One option is always selected. Counts come from the other filters only,
// so they stay the same when an alert is selected.
export function AlertsBar({
  counts,
  total,
  value,
  onChange,
}: {
  counts: { sla: number; stale: number; hotnew: number }
  total: number
  value: Quick
  onChange: (q: Quick) => void
}) {
  const items = [
    {
      key: "all",
      Icon: UsersIcon,
      icon: "text-muted-foreground",
      on: "data-[state=on]:border-foreground/60 data-[state=on]:bg-foreground/10",
      label: "כל הלידים",
      full: fmtNum(total) + " לידים לפי שאר הסינונים",
      count: total,
    },
    {
      key: "sla",
      Icon: CircleAlertIcon,
      icon: "text-status-critical",
      on: "data-[state=on]:border-status-critical data-[state=on]:bg-status-critical/15",
      label: "בלי מענה מעל " + SLA_HOURS + " שעות",
      full: fmtNum(counts.sla) + " לידים חדשים בלי מענה מעל " + SLA_HOURS + " שעות",
      count: counts.sla,
    },
    {
      key: "stale",
      Icon: PhoneOffIcon,
      icon: "text-status-warning",
      on: "data-[state=on]:border-status-warning data-[state=on]:bg-status-warning/15",
      label: "בלי קשר מעל " + STALE_DAYS + " ימים",
      full: fmtNum(counts.stale) + " לידים פתוחים בלי קשר מעל " + STALE_DAYS + " ימים",
      count: counts.stale,
    },
    {
      key: "hotnew",
      Icon: FlameIcon,
      icon: "text-status-good",
      on: "data-[state=on]:border-status-good data-[state=on]:bg-status-good/15",
      label: "חמים שעוד לא טופלו",
      full: fmtNum(counts.hotnew) + " לידים חמים שעוד לא טופלו",
      count: counts.hotnew,
    },
  ] as const
  const selected = value || "all"

  return (
    <section aria-labelledby="quick-filter-title" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span id="quick-filter-title" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <ListFilterIcon className="size-4" aria-hidden />
        סינון מהיר
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={2}
        value={selected}
        // Pressing the selected alert again (empty value) goes back to all leads.
        onValueChange={(v) => onChange((v === "all" || v === "" ? "" : v) as Quick)}
        aria-labelledby="quick-filter-title"
        className="flex flex-wrap justify-start"
      >
        {items.map(({ key, Icon, icon, on, label, full, count }) => {
          const isOn = selected === key
          return (
            <ToggleGroupItem
              key={key}
              value={key}
              title={full}
              aria-label={full}
              disabled={count === 0 && !isOn}
              className={cn(
                "h-9 cursor-pointer gap-2 rounded-full bg-background ps-3 pe-1.5 font-normal text-foreground shadow-none",
                "hover:bg-muted hover:text-foreground data-[state=on]:font-medium data-[state=on]:text-foreground",
                on,
              )}
            >
              {isOn ? <CheckIcon className="size-4" aria-hidden /> : <Icon className={cn("size-4", icon)} aria-hidden />}
              <span>{label}</span>
              <span
                className={cn(
                  "min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-medium tabular-nums",
                  isOn ? "bg-background/80" : "bg-muted",
                )}
              >
                {fmtNum(count)}
              </span>
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </section>
  )
}
