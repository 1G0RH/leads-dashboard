import * as React from "react"
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SOURCE_LABEL, STATUS_LABEL, TEMP_LABEL, fmtDate, fmtMoney, fmtNum, type Lead, type Temp } from "@/lib/leads"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 15

const features = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
})

const col = createColumnHelper<typeof features, Lead>()

const TEMP_STYLE: Record<Temp, string> = {
  hot: "border-transparent bg-chart-4 text-white dark:bg-chart-4 dark:text-neutral-950",
  warm: "border-transparent bg-chart-1 text-neutral-950 dark:text-white",
  cold: "text-muted-foreground",
  closed: "border-dashed text-muted-foreground",
}

export function TempBadge({ temp }: { temp: Temp }) {
  return (
    <Badge variant="outline" className={TEMP_STYLE[temp]}>
      {TEMP_LABEL[temp]}
    </Badge>
  )
}

const columns = col.columns([
  col.accessor("score", {
    header: "ציון",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 tabular-nums">
        <span className="w-6 font-medium">{row.original.score}</span>
        <TempBadge temp={row.original.temp} />
      </span>
    ),
  }),
  col.accessor("name", { header: "שם", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> }),
  col.accessor("company", { header: "עסק" }),
  col.accessor((l) => SOURCE_LABEL[l.source], { id: "source", header: "מקור" }),
  col.accessor("owner", { header: "נציג" }),
  col.accessor((l) => STATUS_LABEL[l.status], {
    id: "status",
    header: "סטטוס",
    cell: ({ row }) => (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {STATUS_LABEL[row.original.status]}
        {row.original.flags.includes("sla") && (
          <Badge variant="outline" className="border-status-critical/50 text-status-critical">SLA</Badge>
        )}
        {row.original.flags.includes("stale") && (
          <Badge variant="outline" className="border-status-warning/60 text-status-warning">בלי קשר</Badge>
        )}
      </span>
    ),
  }),
  col.accessor("created", { header: "נוצר", cell: ({ row }) => <span className="tabular-nums">{fmtDate(row.original.created)}</span> }),
  col.accessor("value", { header: "שווי", cell: ({ row }) => <span className="tabular-nums">{fmtMoney(row.original.value)}</span> }),
  col.accessor("next", { header: "פעולה הבאה", enableSorting: false }),
])

export function LeadsTable({
  rows,
  sorting,
  onSortingChange,
  onOpen,
}: {
  rows: Lead[]
  sorting: SortingState
  onSortingChange: React.Dispatch<React.SetStateAction<SortingState>>
  onOpen: (id: string) => void
}) {
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: PAGE_SIZE })

  // Any change to the filtered rows starts again from the first page.
  React.useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [rows])

  const table = useTable({
    features,
    data: rows,
    columns,
    state: { sorting, pagination },
    getRowId: (row) => row.id,
    onSortingChange,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
  })

  const pageCount = Math.max(1, table.getPageCount())

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          לידים <span className="font-normal text-muted-foreground">({fmtNum(rows.length)})</span>
        </CardTitle>
        <CardDescription>לחיצה על שורה פותחת את כרטיס הליד. לחיצה על כותרת עמודה ממיינת.</CardDescription>
        <CardAction className="text-sm text-muted-foreground tabular-nums">
          עמוד {pagination.pageIndex + 1} מתוך {pageCount}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted()
                    const canSort = header.column.getCanSort()
                    return (
                      <TableHead
                        key={header.id}
                        aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      >
                        {canSort ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ms-2 h-8 px-2 font-medium"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <FlexRender header={header} />
                            {sorted === "asc" ? (
                              <ArrowUpIcon className="size-3.5" />
                            ) : sorted === "desc" ? (
                              <ArrowDownIcon className="size-3.5" />
                            ) : (
                              <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />
                            )}
                          </Button>
                        ) : (
                          <FlexRender header={header} />
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    tabIndex={0}
                    className="cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none"
                    onClick={() => onOpen(row.original.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onOpen(row.original.id)
                    }}
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id} className={cn(cell.column.id === "next" && "min-w-48 whitespace-normal")}>
                        <FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    אין לידים שמתאימים לסינון.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronRightIcon />
            הקודם
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            הבא
            <ChevronLeftIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
