import { CircleAlertIcon, FlameIcon, PhoneOffIcon } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SLA_HOURS, STALE_DAYS, fmtNum, type Quick } from "@/lib/leads"

// Each alert is also a quick filter: pressing it shows only those leads,
// pressing it again clears the filter.
export function AlertsBar({
  counts,
  value,
  onChange,
}: {
  counts: { sla: number; stale: number; hotnew: number }
  value: Quick
  onChange: (q: Quick) => void
}) {
  const items = [
    { key: "sla", Icon: CircleAlertIcon, color: "text-status-critical", text: fmtNum(counts.sla) + " לידים חדשים בלי מענה מעל " + SLA_HOURS + " שעות" },
    { key: "stale", Icon: PhoneOffIcon, color: "text-status-warning", text: fmtNum(counts.stale) + " לידים פתוחים בלי קשר מעל " + STALE_DAYS + " ימים" },
    { key: "hotnew", Icon: FlameIcon, color: "text-status-good", text: fmtNum(counts.hotnew) + " לידים חמים שעוד לא טופלו" },
  ] as const
  return (
    <section aria-label="התראות">
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={2}
        value={value}
        onValueChange={(v) => onChange((v || "") as Quick)}
        className="flex w-full flex-wrap justify-start"
      >
        {items.map(({ key, Icon, color, text }) => (
          <ToggleGroupItem
            key={key}
            value={key}
            className="h-auto min-h-10 flex-none gap-2 px-3 py-2 text-sm font-normal whitespace-normal data-[state=on]:border-foreground/40 data-[state=on]:font-medium"
          >
            <Icon className={"size-4 " + color} aria-hidden />
            <span>{text}</span>
            {value === key && <span className="text-xs text-muted-foreground">(מסונן, לחיצה מבטלת)</span>}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </section>
  )
}
