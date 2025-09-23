"use client"

import { Separator } from "./ui/separator"
import { useState, useEffect } from "react"
import { type AgentSearchFullResponse, AgentSearchStepStatus, type SearchResult, type AgentSearchStep } from "../generated/types.gen"
import { ChevronDown, SearchIcon, WandSparklesIcon } from "lucide-react"
import { Logo } from "./search-results"
import { cn } from "@/lib/utils"

const SearchQueryItem = ({ query }: { query: string }) => {
  return (
    <div className="flex items-center space-x-2 py-1.5 px-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-sm animate-in fade-in-25 duration-300">
      <SearchIcon className="h-3.5 w-3.5 text-indigo-500/70 dark:text-indigo-400/70" />
      <span className="text-slate-700 dark:text-slate-300">{query}</span>
    </div>
  )
}

const StepSection = ({
  step,
  queries,
  results,
  status,
  isExpanded,
  onToggle,
  stepNumber,
}: {
  step: string
  queries: string[] | undefined
  results: SearchResult[] | undefined
  status: AgentSearchStepStatus
  isExpanded: boolean
  onToggle: () => void
  stepNumber: number
}) => {
  const isActive = status === AgentSearchStepStatus.CURRENT
  const isDone = status === AgentSearchStepStatus.DONE

  return (
    <div className="flex flex-col space-y-3 w-full">
      <div className="flex items-center justify-between w-full cursor-pointer" onClick={onToggle}>
        <div className="flex items-center">
          <div
            className={cn(
              "flex items-center justify-center rounded-full w-6 h-6 mr-3 flex-shrink-0 transition-colors duration-300",
              isActive
                ? "bg-indigo-600 text-white"
                : isDone
                  ? "bg-indigo-500/80 text-white"
                  : "bg-indigo-100 dark:bg-indigo-800/40 text-indigo-600 dark:text-indigo-300",
            )}
          >
            {isDone ? "✓" : stepNumber + 1}
          </div>
          <div
            className={cn(
              "text-sm font-medium transition-colors duration-300",
              isActive ? "text-indigo-600 dark:text-indigo-400" : isDone ? "text-indigo-500 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400",
            )}
          >
            {step}
          </div>
        </div>

        <div className="flex items-center">
          {isActive && (
            <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center mr-2">
              <span className="mr-2">Searching</span>
              <div className="animate-spin h-3 w-3 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full"></div>
            </div>
          )}

          {isDone && (
            <ChevronDown
              className={cn(
                "h-5 w-5 text-indigo-500 dark:text-indigo-400 transition-transform duration-200",
                isExpanded && "transform rotate-180",
              )}
            />
          )}
        </div>
      </div>

      {/* Always show queries for active steps */}
      {isActive && queries && queries.length > 0 && (
        <div className="flex flex-col space-y-2 pl-9">
          {queries.map((query, index) => (
            <SearchQueryItem key={`query-${index}`} query={query} />
          ))}
        </div>
      )}

      {/* Show queries and results for expanded done steps */}
      {isDone && isExpanded && (
        <div className="flex flex-col space-y-2 pl-9 animate-in fade-in duration-300">
          {queries && queries.length > 0 && (
            <div className="flex flex-col space-y-2">
              {queries.map((query, index) => (
                <SearchQueryItem key={`query-${index}`} query={query} />
              ))}
            </div>
          )}

          {results && results.length > 0 && (
            <div className="pt-2">
              <div className="text-xs text-indigo-600/70 dark:text-indigo-300/70 mb-2">Results</div>
              <div className="flex flex-wrap gap-2">
                {results.map((result, idx) => {
                  if (!result || !result.url) return null

                  try {
                    const url = new URL(result.url)
                    const formattedUrl = url.hostname.split(".").slice(-2, -1)[0] || url.hostname

                    return (
                      <a
                        className="bg-indigo-100 dark:bg-indigo-800/40 rounded-full text-indigo-700 dark:text-indigo-200 pl-2 pr-2 py-1 font-medium flex items-center space-x-1 hover:bg-indigo-200 dark:hover:bg-indigo-700/60 transition-colors duration-200 animate-in fade-in"
                        href={result.url}
                        target="_blank"
                        key={`result-${idx}`}
                        rel="noreferrer"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <Logo url={result.url} />
                        <div className="">{formattedUrl}</div>
                      </a>
                    )
                  } catch (error) {
                    console.error("Error parsing URL:", result.url, error)
                    return null
                  }
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const ProSearchSkeleton = () => {
  return (
    <div className="w-full border border-indigo-500/20 rounded-lg p-4 mb-4 bg-indigo-50/50 dark:bg-indigo-900/10 animate-pulse">
      <div className="flex items-center mb-2">
        <div className="h-5 w-5 mr-2 bg-indigo-200 dark:bg-indigo-700 rounded-full"></div>
        <div className="h-6 w-40 bg-indigo-200 dark:bg-indigo-700 rounded-md"></div>
      </div>
      <div className="h-1 w-full bg-indigo-200 dark:bg-indigo-800 mb-4"></div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-indigo-200 dark:bg-indigo-700 mr-3"></div>
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-indigo-200 dark:bg-indigo-700 rounded-md mb-2"></div>
              <div className="h-3 w-1/2 bg-indigo-200/70 dark:bg-indigo-700/70 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const ProSearchRender = ({
  streamingProResponse,
  isStreamingProSearch = false,
}: {
  streamingProResponse: AgentSearchFullResponse | null
  isStreamingProSearch?: boolean
}) => {
  const [expandedSteps, setExpandedSteps] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  // Safety check for null or undefined response
  if (!streamingProResponse) {
    return isStreamingProSearch ? <ProSearchSkeleton /> : null
  }

  // Safety check for missing steps_details
  let stepDetails = streamingProResponse.steps_details || []
  
  // Handle the case where we're loading from history and steps may be there but details empty
  if (stepDetails.length === 0 && streamingProResponse.steps && streamingProResponse.steps.length > 0) {
    console.log("Reconstructing step details from steps")
    try {
      // Reconstruct step details from steps
      stepDetails = streamingProResponse.steps.map((step: string, index: number) => ({
        step: step,
        queries: [],
        results: [],
        status: AgentSearchStepStatus.DONE, // Mark all as done since we're in history
        step_number: index,
      }))
    } catch (err) {
      console.error("Error reconstructing step details:", err)
      setError("Error displaying search results. Please try again.")
    }
  }
  
  if (stepDetails.length === 0 && !error) {
    return isStreamingProSearch ? <ProSearchSkeleton /> : null
  }

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }
  
  // Auto-expand all steps if we're viewing history (not streaming)
  useEffect(() => {
    if ((!isStreamingProSearch && stepDetails.length > 0) || error) {
      // Expand all done steps
      const doneStepIndexes = stepDetails
        .map((step: AgentSearchStep, index: number) => (step.status === AgentSearchStepStatus.DONE ? index : -1))
        .filter((i: number) => i !== -1)
        
      if (doneStepIndexes.length > 0) {
        setExpandedSteps(doneStepIndexes)
      }
    }
  }, [stepDetails, isStreamingProSearch, error])

  return (
    <div className="w-full border border-indigo-500/30 rounded-lg p-4 mb-4 bg-indigo-500/5 shadow-md shadow-indigo-500/10">
      <div className="flex items-center mb-3">
        <WandSparklesIcon className="h-5 w-5 mr-2 text-indigo-500" />
        <h1 className="text-lg font-medium text-indigo-600 dark:text-indigo-400">Expert Search</h1>
      </div>
      <Separator className="mb-4 bg-indigo-200/30 dark:bg-indigo-700/30" />

      {error ? (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
          <p>{error}</p>
          <p className="text-sm mt-2">Try refreshing the page or using a different query.</p>
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          {stepDetails.map(({ step, queries, results, status, step_number }: AgentSearchStep, index: number) => {
            if (!step) return null // Skip steps with no content

            // Ensure status is set - default to DONE for history views
            const resolvedStatus = status || AgentSearchStepStatus.DONE
            const isActive = resolvedStatus === AgentSearchStepStatus.CURRENT
            const isDone = resolvedStatus === AgentSearchStepStatus.DONE
            const isExpanded = expandedSteps.includes(index)

            return (
              <div
                key={`step-${index}`}
                className={cn(
                  "flex flex-col space-y-2 rounded-lg transition-all duration-300",
                  isActive ? "bg-indigo-100/30 dark:bg-indigo-900/20 p-3" : "p-1",
                )}
              >
                <StepSection
                  step={step}
                  queries={queries}
                  results={results}
                  status={resolvedStatus}
                  isExpanded={isExpanded}
                  onToggle={() => isDone && toggleStep(index)}
                  stepNumber={step_number !== undefined ? step_number : index}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

