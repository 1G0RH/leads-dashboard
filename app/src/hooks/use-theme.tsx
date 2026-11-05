import * as React from "react"

// Follows the shadcn dark-mode pattern for Vite: a "dark" class on <html>,
// the system setting by default, and a saved choice when the user picks one.
type Theme = "light" | "dark" | "system"
const STORAGE_KEY = "leads-dashboard:theme"

const ThemeContext = React.createContext<{ theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void }>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
})

function readSaved(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === "light" || v === "dark" ? v : "system"
  } catch {
    return "system"
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(readSaved)
  const [systemDark, setSystemDark] = React.useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark")
  }, [resolved])

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t)
    try {
      if (t === "system") localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, t)
    } catch {
      // storage blocked: keep the choice for this visit only
    }
  }, [])

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => React.useContext(ThemeContext)
