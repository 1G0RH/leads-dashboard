import { DownloadIcon, RotateCcwIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { OWNERS } from "@/data/mock-data"
import { SOURCE_LABEL, STATUS_LABEL, TEMP_LABEL, type Filters } from "@/lib/leads"

const ALL = "all"

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: [string, string][]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger id={id} size="sm" className="w-full min-w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>הכל</SelectItem>
          {options.map(([v, text]) => (
            <SelectItem key={v} value={v}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function FilterBar({
  filters,
  onChange,
  onReset,
  onExport,
}: {
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
  onExport: () => void
}) {
  return (
    <section aria-label="סינון" className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground" id="period-label">
          תקופה
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-labelledby="period-label"
          value={String(filters.days)}
          onValueChange={(v) => v && onChange({ days: Number(v) })}
        >
          <ToggleGroupItem value="7" className="px-3">7 ימים</ToggleGroupItem>
          <ToggleGroupItem value="30" className="px-3">30 ימים</ToggleGroupItem>
          <ToggleGroupItem value="90" className="px-3">90 ימים</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <FilterSelect
        id="f-source"
        label="מקור"
        value={filters.source}
        options={Object.entries(SOURCE_LABEL)}
        onChange={(v) => onChange({ source: v as Filters["source"] })}
      />
      <FilterSelect
        id="f-owner"
        label="נציג"
        value={filters.owner}
        options={OWNERS.map((o) => [o, o])}
        onChange={(v) => onChange({ owner: v })}
      />
      <FilterSelect
        id="f-status"
        label="סטטוס"
        value={filters.status}
        options={Object.entries(STATUS_LABEL)}
        onChange={(v) => onChange({ status: v as Filters["status"] })}
      />
      <FilterSelect
        id="f-temp"
        label="חום ליד"
        value={filters.temp}
        options={(["hot", "warm", "cold"] as const).map((t) => [t, TEMP_LABEL[t]])}
        onChange={(v) => onChange({ temp: v as Filters["temp"] })}
      />
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor="f-search" className="text-xs text-muted-foreground">
          חיפוש
        </Label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="f-search"
            type="search"
            className="h-8 ps-8"
            placeholder="שם, עסק או מספר ליד"
            value={filters.q}
            onChange={(e) => onChange({ q: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcwIcon />
          איפוס
        </Button>
        <Button size="sm" onClick={onExport}>
          <DownloadIcon />
          ייצוא CSV
        </Button>
      </div>
    </section>
  )
}
