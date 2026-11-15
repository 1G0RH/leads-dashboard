import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App"
import { DirectionProvider } from "@/components/ui/direction"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/hooks/use-theme"
import { CurrencyProvider } from "@/lib/currency"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DirectionProvider dir="rtl">
      <ThemeProvider>
        <TooltipProvider>
          <CurrencyProvider>
            <App />
          </CurrencyProvider>
        </TooltipProvider>
      </ThemeProvider>
    </DirectionProvider>
  </StrictMode>,
)
