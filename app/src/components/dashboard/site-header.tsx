import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/hooks/use-theme"

export function SiteHeader({ generatedAt }: { generatedAt: string }) {
  const { resolved, setTheme } = useTheme()
  const dark = resolved === "dark"
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4 lg:px-6">
        <h1 className="text-base font-semibold whitespace-nowrap">ניהול לידים חכם</h1>
        <Separator orientation="vertical" className="hidden h-4! sm:block" />
        <p className="hidden truncate text-sm text-muted-foreground sm:block">
          נתוני דמה, נוצרו ב-{new Date(generatedAt).toLocaleDateString("he-IL")}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="ms-auto"
          onClick={() => setTheme(dark ? "light" : "dark")}
          aria-label={dark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
          <span className="hidden sm:inline">{dark ? "מצב בהיר" : "מצב כהה"}</span>
        </Button>
      </div>
    </header>
  )
}
