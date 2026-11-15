import * as React from "react"
import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Budget, Source } from "@/data/mock-data"
import type { NewLeadInput } from "@/lib/data-source"
import { BUDGET_LABEL, SOURCE_LABEL } from "@/lib/leads"

// New lead form (SPEC.md, "המסך", item 7). Name and source are required.
// The same limits are checked again by the Supabase function.
const EMPTY = { name: "", company: "", phone: "", source: "" as Source | "", owner: "", budget: "small" as Budget, value: "", interest: "" }

export function NewLeadDialog({
  open,
  onOpenChange,
  owners,
  nextId,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  owners: string[]
  nextId: string
  onCreate: (input: NewLeadInput) => Promise<void>
}) {
  const [form, setForm] = React.useState(EMPTY)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, owner: owners[0] ?? "" })
      setError(null)
    }
  }, [open, owners])

  const set = (p: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...p }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = form.value.trim() ? Number(form.value.replace(/,/g, "")) : 0
    if (!form.name.trim()) return setError("צריך למלא שם.")
    if (!form.source) return setError("צריך לבחור מקור.")
    if (!form.owner) return setError("צריך לבחור נציג.")
    if (form.phone && !/^[0-9+\- ]+$/.test(form.phone)) return setError("בטלפון אפשר לכתוב רק ספרות, רווחים, פלוס ומקף.")
    if (!Number.isFinite(value) || value < 0 || value > 10_000_000) return setError("השווי צריך להיות מספר בין 0 ל-10,000,000.")
    setBusy(true)
    setError(null)
    try {
      await onCreate({
        id: nextId,
        name: form.name.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        source: form.source,
        owner: form.owner,
        budget: form.budget,
        value: Math.round(value),
        interest: form.interest.trim(),
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ליד חדש</DialogTitle>
          <DialogDescription>
            הליד נשמר ב-Airtable עם סטטוס חדש ומספר {nextId}. שדות עם כוכבית הם חובה.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-name">שם *</Label>
            <Input id="nl-name" maxLength={80} value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-company">עסק</Label>
            <Input id="nl-company" maxLength={80} value={form.company} onChange={(e) => set({ company: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-phone">טלפון</Label>
            <Input id="nl-phone" dir="ltr" inputMode="tel" maxLength={20} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-source">מקור *</Label>
            <Select value={form.source} onValueChange={(v) => set({ source: v as Source })}>
              <SelectTrigger id="nl-source" className="w-full">
                <SelectValue placeholder="בחירת מקור" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-owner">נציג *</Label>
            <Select value={form.owner} onValueChange={(v) => set({ owner: v })}>
              <SelectTrigger id="nl-owner" className="w-full">
                <SelectValue placeholder="בחירת נציג" />
              </SelectTrigger>
              <SelectContent>
                {owners.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-budget">תקציב</Label>
            <Select value={form.budget} onValueChange={(v) => set({ budget: v as Budget })}>
              <SelectTrigger id="nl-budget" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BUDGET_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-value">שווי משוער בשקלים</Label>
            <Input id="nl-value" dir="ltr" inputMode="numeric" value={form.value} onChange={(e) => set({ value: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-interest">מתעניין ב</Label>
            <Input id="nl-interest" maxLength={80} value={form.interest} onChange={(e) => set({ interest: e.target.value })} />
          </div>
          {error && (
            <Alert variant="destructive" className="sm:col-span-2">
              <CircleAlertIcon />
              <AlertTitle>הליד לא נשמר</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2 sm:col-span-2 sm:justify-start">
            <Button type="submit" disabled={busy}>
              {busy ? "שומר..." : "שמירה"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
