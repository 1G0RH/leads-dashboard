import * as React from "react"

import type { AirtableConfig } from "@/lib/airtable"
import { ownSource, projectSource, type DataSource } from "@/lib/data-source"

// Which data source the dashboard reads (SPEC.md, connection panel).
// A key the user types stays in memory only, unless they tick "remember",
// and then it is kept in this browser's localStorage and nowhere else.
const STORE_KEY = "leads-dashboard:airtable"

function readSaved(): AirtableConfig | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) || "null")
    return v && v.token && v.baseId && v.table ? v : null
  } catch {
    return null
  }
}

export function useConnection() {
  const [saved, setSaved] = React.useState<AirtableConfig | null>(readSaved)
  const [config, setConfig] = React.useState<AirtableConfig | null>(saved)

  const source: DataSource = React.useMemo(() => (config ? ownSource(config) : projectSource), [config])

  const connect = React.useCallback((cfg: AirtableConfig, remember: boolean) => {
    setConfig(cfg)
    try {
      if (remember) {
        localStorage.setItem(STORE_KEY, JSON.stringify(cfg))
        setSaved(cfg)
      } else {
        localStorage.removeItem(STORE_KEY)
        setSaved(null)
      }
    } catch {
      // storage blocked: the key stays in memory for this visit only
    }
  }, [])

  const disconnect = React.useCallback(() => setConfig(null), [])

  const forget = React.useCallback(() => {
    try {
      localStorage.removeItem(STORE_KEY)
    } catch {
      // nothing saved to remove
    }
    setSaved(null)
  }, [])

  return { source, config, saved, connect, disconnect, forget }
}
