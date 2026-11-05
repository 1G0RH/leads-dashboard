import * as React from "react"
import type { Status } from "@/data/mock-data"

// Status changes made in the lead card. Saved in this browser only.
const STORE_KEY = "leads-dashboard:status-overrides"

function read(): Record<string, Status> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}")
  } catch {
    return {}
  }
}

export function useOverrides() {
  const [overrides, setOverrides] = React.useState<Record<string, Status>>(read)
  const setStatus = React.useCallback((id: string, status: Status) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: status }
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next))
      } catch {
        // storage blocked: keep the change in memory
      }
      return next
    })
  }, [])
  return { overrides, setStatus }
}
