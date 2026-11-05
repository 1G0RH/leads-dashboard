"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Direction, Progress as ProgressPrimitive } from "radix-ui"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  // RTL: the bar fills from the right, so the indicator slides the other way.
  const sign = Direction.useDirection() === "rtl" ? 1 : -1
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(${sign * (100 - (value || 0))}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
