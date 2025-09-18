"use client"

import { MessageComponent, MessageComponentSkeleton } from "./message"
import RelatedQuestions from "./related-questions"
import { SearchResultsSkeleton, SearchResults } from "./search-results"
import { Section } from "./section"
import { AlertCircle, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ImageSection, ImageSectionSkeleton } from "./image-section"
import type { ChatMessage } from "../generated/types.gen"
import { env } from "@/env"

export function ErrorMessage({ content }: { content: string }) {
  const isCORSError = content.includes("CORS") || content.includes("cross-origin")
  const isNetworkError = content.includes("network") || content.includes("connection")

  return (
    <Alert className="bg-red-500/5 border-red-500/15 p-5 shadow-sm">
      <AlertCircle className="h-4 w-4 stroke-red-500 stroke-2" />
      <div className="ml-2">
        <AlertTitle className="text-red-500 mb-2">
          {isCORSError ? "Connection Error" : isNetworkError ? "Network Error" : "Error"}
        </AlertTitle>
        <AlertDescription className="text-base text-foreground">
          {content.split(" ").map((word, index) => {
            const urlPattern = /(https?:\/\/[^\s]+)/g
            if (urlPattern.test(word)) {
              return (
                <a
                  key={index}
                  href={word}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  {word} <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )
            }
            return word + " "
          })}

          {isCORSError && (
            <div className="mt-4 p-3 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800/30 rounded-md text-sm shadow-sm">
              <p className="font-medium mb-2 text-indigo-600 dark:text-indigo-400">Troubleshooting steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Make sure the API server is running at{" "}
                  <code className="bg-indigo-50 dark:bg-indigo-900/20 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">{env.NEXT_PUBLIC_API_URL}</code>
                </li>
                <li>Check that CORS is properly configured on the server</li>
                <li>Try refreshing the page</li>
              </ol>
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  )
}

export const AssistantMessageContent = ({
  message,
  isStreaming = false,
  onRelatedQuestionSelect,
}: {
  message: ChatMessage
  isStreaming?: boolean
  onRelatedQuestionSelect: (question: string) => void
}) => {
  const { sources, content, related_queries, images, is_error_message = false, agent_response } = message

  if (is_error_message) {
    return <ErrorMessage content={message.content} />
  }

  return (
    <div className="flex flex-col">
      <Section title="Answer" animate={isStreaming} streaming={isStreaming}>
        {content ? <MessageComponent message={message} isStreaming={isStreaming} /> : <MessageComponentSkeleton />}
      </Section>
      {(!isStreaming || (sources && sources.length > 0)) && (
        <Section title="Sources" animate={isStreaming}>
          {!sources || sources.length === 0 ? <SearchResultsSkeleton /> : <SearchResults results={sources} />}
        </Section>
      )}
      {(!isStreaming || (images && images.length > 0)) && (
        <Section title="Images" animate={isStreaming}>
          {images && images.length > 0 ? <ImageSection images={images} /> : <ImageSectionSkeleton />}
        </Section>
      )}
      {related_queries && related_queries.length > 0 && (
        <Section title="Related" animate={isStreaming}>
          <RelatedQuestions questions={related_queries} onSelect={onRelatedQuestionSelect} />
        </Section>
      )}
    </div>
  )
}

