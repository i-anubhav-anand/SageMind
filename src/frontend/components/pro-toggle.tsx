"use client"

import { cn } from "@/lib/utils"
import { useConfigStore } from "../stores"
import { Switch } from "./ui/switch"

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Separator } from "./ui/separator"
import { env } from "@/env"
import { WandSparklesIcon } from "lucide-react"

const ProToggle = () => {
  const { proMode, toggleProMode } = useConfigStore()

  return (
    <HoverCard>
      <HoverCardTrigger
        asChild
        className={cn("hover:cursor-pointer", !env.NEXT_PUBLIC_PRO_MODE_ENABLED && "hover:cursor-not-allowed")}
      >
        <div className={cn(
          "group flex space-x-2 items-center justify-end px-3 py-1 rounded-full transition-all",
          proMode 
            ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300" 
            : "hover:bg-slate-100 dark:hover:bg-slate-800"
        )}>
          <WandSparklesIcon className={cn(
            "h-4 w-4 mr-1", 
            proMode ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
          )} />
          <span
            className={cn(
              "font-medium text-sm transition-all",
              proMode ? "text-indigo-600 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300",
            )}
          >
            Expert
          </span>
          <Switch 
            disabled={!env.NEXT_PUBLIC_PRO_MODE_ENABLED} 
            checked={proMode} 
            onCheckedChange={toggleProMode}
            className={proMode ? "bg-indigo-600 data-[state=checked]:bg-indigo-600" : ""}
          />
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-3 border-indigo-200 dark:border-indigo-800/50 shadow-md">
        <div className="flex flex-col items-start rounded-md">
          <div className="text-lg font-medium flex items-center">
            <WandSparklesIcon className="h-5 w-5 mr-2 text-indigo-500" />
            <span className="text-indigo-600 dark:text-indigo-400">Expert </span>
            <span>Mode</span>
          </div>
          <div className="text-sm gap-y-1 flex flex-col mt-2">
            <div>Expert mode will create a plan to answer your question to make the answer more accurate.</div>
          </div>
          <Separator className="mt-2 mb-2 bg-indigo-200/30 dark:bg-indigo-700/30" />
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Requires self-hosted setup. </span>
            <span className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">Learn more</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export default ProToggle

