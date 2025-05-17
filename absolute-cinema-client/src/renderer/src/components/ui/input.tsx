import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">): React.ReactElement {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-black text-white border border-white/15 rounded-xl px-4 py-2 shadow focus:border-white/30 focus:ring-2 focus:ring-white/20 placeholder:text-white/40 transition-all duration-200 ring-1 ring-white/10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
