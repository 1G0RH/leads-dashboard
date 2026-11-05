import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App"
import { DirectionProvider } from "@/components/ui/direction"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/hooks/use-theme"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DirectionProvider dir="rtl">
      <ThemeProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </DirectionProvider>
  </StrictMode>,
)
