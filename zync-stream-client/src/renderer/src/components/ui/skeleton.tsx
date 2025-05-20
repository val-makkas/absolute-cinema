import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-white/10 animate-pulse rounded-xl shadow ring-1 ring-white/10", className)}
      {...props}
    />
  )
}

export { Skeleton }
