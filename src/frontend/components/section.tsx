"use client"

import React from "react"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { CameraIcon, ListPlusIcon, SparkleIcon, StarIcon, TextSearchIcon } from "lucide-react"

import { motion } from "framer-motion"

export const Section = ({
  title,
  children,
  animate = true,
  streaming = false,
  titleColor = "",
}: {
  title: "Sources" | "Answer" | "Related" | "Images"
  children: ReactNode
  animate?: boolean
  streaming?: boolean
  titleColor?: string
}) => {
  const iconMap = {
    Sources: TextSearchIcon,
    Answer: SparkleIcon,
    Related: ListPlusIcon,
    Images: CameraIcon,
  }

  const IconComponent = iconMap[title] || StarIcon

  return (
    <div className={cn(
      "flex flex-col mb-8 relative", 
      animate ? "animate-in fade-in duration-1000 ease-out" : "",
      streaming ? "activity-indicator" : ""
    )}>
      <div className={cn(
        "flex items-center space-x-2 py-2 px-3 -mx-3 rounded-md",
        streaming && "bg-indigo-50/50 dark:bg-indigo-900/10"
      )}>
        {title === "Answer" && streaming ? (
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "linear" },
              scale: { repeat: Number.POSITIVE_INFINITY, duration: 1, ease: "easeInOut" }
            }}
          >
            <IconComponent size={22} className="text-indigo-500 dark:text-indigo-400" />
          </motion.div>
        ) : (
          <IconComponent size={22} className="text-indigo-500 dark:text-indigo-400" />
        )}
        <div className={cn(
          "text-lg font-medium", 
          streaming ? "text-indigo-700 dark:text-indigo-300" : (titleColor || "text-indigo-600 dark:text-indigo-400")
        )}>
          {title}
          {streaming && (
            <span className="ml-2 text-xs inline-flex items-center text-indigo-500 dark:text-indigo-400">
              <span className="mr-1">Processing</span>
              <span className="flex space-x-1">
                <span className="animate-[bounce_0.75s_infinite_0s]">.</span>
                <span className="animate-[bounce_0.75s_infinite_0.2s]">.</span>
                <span className="animate-[bounce_0.75s_infinite_0.4s]">.</span>
              </span>
            </span>
          )}
        </div>
      </div>
      <div className="pt-2">
        {title === "Images"
          ? React.Children.map(children, (child, index) => {
              // Only render the first 4 images
              if (index < 4) return child
              return null
            })
          : children}
      </div>
    </div>
  )
}

