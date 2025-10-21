import type React from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "rounded-md relative overflow-hidden bg-slate-100 dark:bg-slate-800/50", 
        className
      )} 
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-indigo-100/20 dark:via-indigo-500/10 to-transparent" />
    </div>
  )
}

export { Skeleton }

