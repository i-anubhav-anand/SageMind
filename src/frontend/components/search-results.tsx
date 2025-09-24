/* eslint-disable @next/next/no-img-element */
"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "./ui/skeleton"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { SearchResult } from "../generated/types.gen" // Update the import path
import Link from "next/link"

export const SearchResultsSkeleton = () => {
  return (
    <>
      <div className="flex flex-wrap w-full">
        {[...Array(4)].map((_, index) => (
          <div className="w-1/2 md:w-1/4 p-1" key={`skeleton-${index}`}>
            <div className="rounded-md overflow-hidden h-[70px] animate-pulse-indigo border border-indigo-100/50 dark:border-indigo-800/20">
              <Skeleton className="h-full border-none shadow-none bg-gradient-to-r from-indigo-50/50 to-slate-50/50 dark:from-indigo-900/10 dark:to-slate-800/10" />
            </div>
          </div>
        ))}
      </div>
      {/* Loading indicator line */}
      <div className="mt-2 h-0.5 w-full bg-indigo-100/30 dark:bg-indigo-900/20 rounded overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-300 to-indigo-500 dark:from-indigo-600 dark:to-indigo-400 animate-[progress-line_2s_ease-in-out_infinite]" />
      </div>
    </>
  )
}

export const Logo = ({ url }: { url: string }) => {
  const [hasError, setHasError] = useState(false)

  if (!url) return null

  try {
    // Make sure the URL is valid
    new URL(url)

    if (hasError) {
      return (
        <div className="rounded-full overflow-hidden relative flex items-center justify-center bg-muted w-4 h-4">
          <span className="text-[8px] text-muted-foreground">URL</span>
        </div>
      )
    }

    return (
      <div className="rounded-full overflow-hidden relative">
        <img
          className="block relative w-4 h-4"
          src={`https://www.google.com/s2/favicons?sz=128&domain=${url}`}
          alt="favicon"
          width={16}
          height={16}
          onError={(e) => {
            setHasError(true)
          }}
        />
      </div>
    )
  } catch (error) {
    console.error("Invalid URL in Logo component:", url)
    return (
      <div className="rounded-full overflow-hidden relative flex items-center justify-center bg-muted w-4 h-4">
        <span className="text-[8px] text-muted-foreground">URL</span>
      </div>
    )
  }
}

export function SearchResults({ results }: { results: SearchResult[] }) {
  const [showAll, setShowAll] = useState(false)

  if (!results || results.length === 0) {
    return <SearchResultsSkeleton />
  }

  const displayedResults = showAll ? results : results.slice(0, 3)
  const additionalCount = results.length > 3 ? results.length - 3 : 0
  const additionalResults = results.slice(3, 3 + additionalCount)

  return (
    <div className="flex flex-wrap w-full ">
      {displayedResults.map(({ title, url, content }, index) => {
        if (!url) return null

        let formattedUrl = "website"
        try {
          const urlObj = new URL(url)
          formattedUrl = urlObj.hostname.split(".").slice(-2, -1)[0] || urlObj.hostname
        } catch (error) {
          console.error("Error parsing URL:", url, error)
        }

        return (
          <HoverCard key={`source-${index}`}>
            <HoverCardTrigger asChild>
              <div className="w-1/2 md:w-1/4 p-1">
                <Link
                  href={url}
                  className="block group hover:scale-[1.01] transition-all"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View source: ${title}`}
                >
                  <Card className="rounded-md overflow-hidden transition-all h-full border border-transparent dark:border-indigo-900/20 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800/30">
                    <CardContent className="p-3 h-full">
                      <div className="font-medium text-sm mb-1 truncate text-indigo-700 dark:text-indigo-300">
                        {title || formattedUrl}
                      </div>
                      <div className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mb-2 truncate">
                        {formattedUrl}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                        {content}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 py-2">
              <div className="flex justify-between space-x-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="rounded-full overflow-hidden relative">
                      <Logo url={url} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-medium">{formattedUrl}</div>
                  </div>
                  <p className="text-sm font-medium">{title}</p>
                  <span className="text-sm line-clamp-3 font-light text-foreground/90">{content}</span>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )
      })}
      {!showAll && additionalCount > 0 && (
        <div
          className="cursor-pointer w-1/2 md:w-1/4 p-1"
          onClick={() => setShowAll(true)}
        >
          <Card className="rounded-md overflow-hidden transition-all h-full border border-transparent dark:border-indigo-900/20 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800/30 bg-indigo-50/50 dark:bg-indigo-900/10">
            <CardContent className="p-3 flex flex-col justify-between h-full">
              <div className="flex items-center space-x-1 mb-2">
                {additionalResults.slice(0, 3).map(({ url }, index) => {
                  if (!url) return null
                  return <Logo url={url} key={`logo-${index}`} />
                })}
                {additionalResults.length > 3 && (
                  <div className="rounded-full w-4 h-4 flex items-center justify-center bg-indigo-100 dark:bg-indigo-800/40">
                    <span className="text-[8px] text-indigo-600 dark:text-indigo-300">+{additionalResults.length - 3}</span>
                  </div>
                )}
              </div>
              <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                View {additionalCount} more results
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

