import * as React from "react"
import { CircleAlertIcon, ExternalLinkIcon, KeyRoundIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AirtableConfig } from "@/lib/airtable"
import { ownSource } from "@/lib/data-source"

const TEMPLATE_URL = "https://github.com/1G0RH/leads-dashboard/blob/main/airtable/README.md"

// "Airtable משלך" (SPEC.md, connection panel): built like the one from class.
// Three fields, a "remember" box, connect / disconnect / forget, and a Hebrew
// error for every failure. The key is tested before the dashboard switches.
export function ConnectionDialog({
  open,
  onOpenChange,
  connected,
  saved,
  onConnect,
  onDisconnect,
  onForget,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  connected: AirtableConfig | null
  saved: AirtableConfig | null
  onConnect: (cfg: AirtableConfig, remember: boolean) => void
  onDisconnect: () => void
  onForget: () => void
}) {
  const [token, setToken] = React.useState("")
  const [baseId, setBaseId] = React.useState("")
  const [table, setTable] = React.useState("")
  const [remember, setRemember] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    const cfg = connected ?? saved
    setToken(cfg?.token ?? "")
    setBaseId(cfg?.baseId ?? "")
    setTable(cfg?.table ?? "")
    setRemember(!!saved)
    setError(null)
    setResult(null)
  }, [open, connected, saved])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cfg = { token: token.trim(), baseId: baseId.trim(), table: table.trim() }
    if (!cfg.token || !cfg.baseId || !cfg.table) {
      setError("צריך למלא את שלושת השדות.")
      return
    }
    if (!/^app[A-Za-z0-9]{14}$/.test(cfg.baseId)) {
      setError("Base ID מתחיל ב-app ויש בו 17 תווים. אפשר להעתיק אותו מהכתובת של הבסיס ב-Airtable.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await ownSource(cfg).load()
      if (!res.leads.length) {
        setError(
          res.skipped.length
            ? `נמצאו ${res.skipped.length} רשומות, אבל אף אחת לא תואמת לתבנית. הסיבה הראשונה: ${res.skipped[0].reason}.`
            : "הטבלה ריקה.",
        )
        return
      }
      setResult(`נמצאו ${res.leads.length} לידים${res.skipped.length ? `, ${res.skipped.length} רשומות דולגו` : ""}.`)
      onConnect(cfg, remember)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4" aria-hidden />
            חיבור ל-Airtable
          </DialogTitle>
          <DialogDescription>
            אפשר לחבר את הדשבורד לבסיס Airtable שלכם עם מפתח משלכם, ולראות בו את הנתונים שלכם. בלי חיבור, הדשבורד מציג את נתוני הפרויקט.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="at-token">מפתח API, כלומר Personal Access Token</Label>
            <Input
              id="at-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              placeholder="pat..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="at-base">Base ID</Label>
              <Input id="at-base" dir="ltr" spellCheck={false} placeholder="appXXXXXXXXXXXXXX" value={baseId} onChange={(e) => setBaseId(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="at-table">Table ID או שם הטבלה</Label>
              <Input id="at-table" dir="ltr" spellCheck={false} placeholder="tblXXXXXXXXXXXXXX" value={table} onChange={(e) => setTable(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="at-remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            <Label htmlFor="at-remember" className="font-normal">
              לזכור את המפתח בדפדפן הזה
            </Label>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            המפתח נשלח רק ל-Airtable ולא נשמר בשום קובץ. בלי הסימון הוא נשמר רק בזיכרון של הדף ונמחק ברענון. עם הסימון הוא נשמר בדפדפן הזה בלבד.
            המפתח צריך את ההרשאה data.records:read, ואת data.records:write כדי לשמור שינויים.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            הטבלה צריכה את אותם שדות כמו בתבנית.{" "}
            <a href={TEMPLATE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4">
              איך מכינים בסיס מהתבנית
              <ExternalLinkIcon className="size-3" aria-hidden />
            </a>
          </p>

          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>החיבור לא הצליח</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {result && <p className="text-sm text-status-good">{result}</p>}

          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={busy}>
              {busy ? "בודק את החיבור..." : "התחברות"}
            </Button>
            {connected && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onDisconnect()
                  onOpenChange(false)
                }}
              >
                ניתוק וחזרה לנתוני הפרויקט
              </Button>
            )}
            {saved && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onForget()
                  setRemember(false)
                }}
              >
                מחיקת המפתח השמור
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
