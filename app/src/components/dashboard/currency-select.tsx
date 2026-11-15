import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CURRENCY_LABEL, useCurrency, type Currency } from "@/lib/currency"

// Currency picker with the rate date next to it (SPEC.md, bonus items 2 and 4).
export function CurrencySelect() {
  const { currency, setCurrency, rates, state } = useCurrency()
  const date = rates ? new Date(rates.date + "T12:00:00").toLocaleDateString("he-IL") : ""
  const note =
    state === "ready" ? `שער ייחוס מ-${date}` : state === "loading" ? "טוען שערים..." : "השערים לא זמינים, הסכומים בשקלים"
  return (
    <div className="flex items-center gap-2">
      <Select value={state === "ready" ? currency : "ILS"} onValueChange={(v) => setCurrency(v as Currency)} disabled={state !== "ready"}>
        <SelectTrigger size="sm" className="w-28" aria-label="מטבע">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => (
            <SelectItem key={c} value={c}>
              {CURRENCY_LABEL[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="hidden text-xs text-muted-foreground lg:inline" title="מקור: Frankfurter, לפי הבנק המרכזי האירופי">
        {note}
      </span>
    </div>
  )
}
