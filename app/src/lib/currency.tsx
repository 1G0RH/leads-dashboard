import * as React from "react"

// Bonus: an outside public API (SPEC.md, "בונוס: מקור מידע חיצוני").
// Frankfurter publishes daily reference rates from central banks, led by the
// European Central Bank. No key is needed. Values stay in shekels in Airtable;
// conversion is for display only.
export const RATES_URL = "https://api.frankfurter.dev/v1/latest?base=ILS&symbols=USD,EUR"

export type Currency = "ILS" | "USD" | "EUR"
export const CURRENCY_LABEL: Record<Currency, string> = { ILS: "₪ שקל", USD: "$ דולר", EUR: "€ אירו" }
const SYMBOL: Record<Currency, string> = { ILS: "₪", USD: "$", EUR: "€" }

export interface Rates {
  date: string
  USD: number
  EUR: number
}

export async function fetchRates(signal?: AbortSignal): Promise<Rates> {
  const res = await fetch(RATES_URL, { signal })
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`)
  const body = await res.json()
  const usd = Number(body?.rates?.USD)
  const eur = Number(body?.rates?.EUR)
  if (body?.base !== "ILS" || !(usd > 0) || !(eur > 0) || typeof body?.date !== "string") throw new Error("unexpected rates format")
  return { date: body.date, USD: usd, EUR: eur }
}

export function convert(shekels: number, currency: Currency, rates: Rates | null) {
  if (currency === "ILS" || !rates) return shekels
  return shekels * rates[currency]
}

export function formatMoney(shekels: number, currency: Currency, rates: Rates | null) {
  const c = rates ? currency : "ILS"
  return SYMBOL[c] + Math.round(convert(shekels, c, rates)).toLocaleString("he-IL")
}

interface CurrencyState {
  currency: Currency
  setCurrency: (c: Currency) => void
  rates: Rates | null
  state: "loading" | "ready" | "error"
  money: (shekels: number) => string
}

const CurrencyContext = React.createContext<CurrencyState>({
  currency: "ILS",
  setCurrency: () => {},
  rates: null,
  state: "loading",
  money: (n) => formatMoney(n, "ILS", null),
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = React.useState<Currency>("ILS")
  const [rates, setRates] = React.useState<Rates | null>(null)
  const [state, setState] = React.useState<CurrencyState["state"]>("loading")

  // Read the rates once per page load (SPEC.md, bonus item 1).
  React.useEffect(() => {
    const ctrl = new AbortController()
    fetchRates(ctrl.signal)
      .then((r) => {
        setRates(r)
        setState("ready")
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setState("error")
      })
    return () => ctrl.abort()
  }, [])

  const value = React.useMemo<CurrencyState>(
    () => ({ currency, setCurrency, rates, state, money: (n) => formatMoney(n, currency, rates) }),
    [currency, rates, state],
  )
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export const useCurrency = () => React.useContext(CurrencyContext)

export function Money({ value }: { value: number }) {
  const { money } = useCurrency()
  return <span className="tabular-nums">{money(value)}</span>
}
