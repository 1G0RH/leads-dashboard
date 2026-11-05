import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fmtNum, type funnel, type sourceBreakdown, type weeklyBuckets } from "@/lib/leads"
import type { Source } from "@/data/mock-data"

const lineConfig = { leads: { label: "לידים חדשים", color: "var(--chart-3)" } } satisfies ChartConfig

export function WeeklyChart({ data }: { data: ReturnType<typeof weeklyBuckets> }) {
  const lastIndex = data.length - 1
  return (
    <Card className="@container/card lg:col-span-2">
      <CardHeader>
        <CardTitle>לידים חדשים לפי שבוע</CardTitle>
        <CardDescription>כל נקודה היא שבוע שמסתיים בתאריך שעל הציר. ריחוף מראה את מספר הלידים.</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={lineConfig} className="aspect-auto h-[250px] w-full">
          <LineChart accessibilityLayer data={data} margin={{ top: 24, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <ChartTooltip
              cursor={{ stroke: "var(--border)" }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, payload) => "שבוע " + (payload?.[0]?.payload?.range ?? "")}
                />
              }
            />
            <Line
              dataKey="leads"
              type="linear"
              stroke="var(--color-leads)"
              strokeWidth={2}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
              dot={(props) => {
                const { cx, cy, index } = props as { cx: number; cy: number; index: number }
                if (index !== lastIndex) return <g key={index} />
                return (
                  <g key={index}>
                    <circle cx={cx} cy={cy} r={4} fill="var(--color-leads)" stroke="var(--card)" strokeWidth={2} />
                    <text x={cx - 8} y={cy - 10} textAnchor="end" className="fill-foreground text-xs font-medium">
                      {fmtNum(data[index].leads)}
                    </text>
                  </g>
                )
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function RowsTooltip({ active, payload, rows }: { active?: boolean; payload?: { payload: Record<string, unknown> }[]; rows: (p: never) => [string, string][] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="grid min-w-32 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{String(p.label)}</div>
      {rows(p as never).map(([value, name]) => (
        <div key={name} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{name}</span>
          <span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
        </div>
      ))}
    </div>
  )
}

// The value label sits just past the end of the bar. With a reversed axis the
// bar has a negative width, so the end is the smaller of x and x + width.
function BarEndLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown }) {
  const x = Number(props.x ?? 0)
  const w = Number(props.width ?? 0)
  const y = Number(props.y ?? 0)
  const h = Number(props.height ?? 0)
  return (
    <text x={Math.min(x, x + w) - 8} y={y + h / 2} dy="0.35em" textAnchor="end" className="fill-foreground text-xs tabular-nums">
      {String(props.value ?? "")}
    </text>
  )
}

// Horizontal bars for RTL: the label sits on the right and the bar grows to the left.
const barConfig = { leads: { label: "לידים", color: "var(--chart-3)" } } satisfies ChartConfig

export function SourceChart({
  data,
  selected,
  onSelect,
}: {
  data: ReturnType<typeof sourceBreakdown>
  selected: Source | ""
  onSelect: (s: Source) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>לידים לפי מקור</CardTitle>
        <CardDescription>ליד כל עמודה: אחוז הסגירה של המקור, ואחריו מספר הלידים. לחיצה על עמודה מסננת לפי המקור.</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={barConfig} className="aspect-auto h-[270px] w-full">
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ top: 0, right: 4, left: 84, bottom: 0 }} barCategoryGap={8}>
            <XAxis type="number" dataKey="leads" reversed hide />
            <YAxis type="category" dataKey="label" orientation="right" tickLine={false} axisLine={false} width={92} />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={
                <RowsTooltip
                  rows={(p: ReturnType<typeof sourceBreakdown>[number]) => [
                    [fmtNum(p.leads), "לידים"],
                    [fmtNum(p.won), "נסגרו"],
                    [p.rate.toFixed(1) + "%", "אחוז סגירה"],
                  ]}
                />
              }
            />
            <Bar dataKey="leads" radius={4} className="cursor-pointer" onClick={(d) => onSelect((d as unknown as { key: Source }).key)}>
              {data.map((d) => (
                <Cell key={d.key} fill="var(--color-leads)" fillOpacity={selected && selected !== d.key ? 0.35 : 1} />
              ))}
              <LabelList dataKey="text" content={BarEndLabel} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const funnelConfig = {
  leads: { label: "לידים" },
  s1: { label: "כל הלידים", color: "var(--chart-1)" },
  s2: { label: "נוצר קשר", color: "var(--chart-2)" },
  s3: { label: "מתאים", color: "var(--chart-3)" },
  s4: { label: "הצעת מחיר", color: "var(--chart-4)" },
  s5: { label: "נסגר", color: "var(--chart-5)" },
} satisfies ChartConfig

export function FunnelChart({ data }: { data: ReturnType<typeof funnel> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>משפך מכירה</CardTitle>
        <CardDescription>ליד כל עמודה: האחוז מכל הלידים בתקופה, ואחריו כמה לידים הגיעו לשלב.</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={funnelConfig} className="aspect-auto h-[270px] w-full">
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ top: 0, right: 4, left: 84, bottom: 0 }} barCategoryGap={10}>
            <XAxis type="number" dataKey="leads" reversed hide />
            <YAxis type="category" dataKey="label" orientation="right" tickLine={false} axisLine={false} width={92} />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={
                <RowsTooltip
                  rows={(p: ReturnType<typeof funnel>[number]) => [
                    [fmtNum(p.leads), "לידים"],
                    [p.pct.toFixed(1) + "%", "מכל הלידים"],
                  ]}
                />
              }
            />
            <Bar dataKey="leads" radius={4}>
              {data.map((d) => (
                <Cell key={d.stage} fill={`var(--color-${d.stage})`} />
              ))}
              <LabelList dataKey="text" content={BarEndLabel} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
