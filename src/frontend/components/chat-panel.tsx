"use client"
import { useChat } from "@/hooks/chat"
import { useChatStore } from "../stores"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, memo } from "react"
import { LoaderIcon, AlertCircle } from "lucide-react"

import { AskInput } from "./ask-input"
import { useChatThread } from "@/hooks/threads"
import MessagesList from "./messages-list"
import { StarterQuestionsList } from "./starter-questions"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Button } from "./ui/button"

// Memoize the component to prevent unnecessary re-renders
const ChatPanel = memo(({ threadId }: { threadId?: number }) => {
  const searchParams = useSearchParams()
  const queryMessage = searchParams.get("q")
  const hasRun = useRef(false)

  const { handleSend, streamingMessage, isStreamingMessage, isStreamingProSearch } = useChat()
  const { messages, setMessages, setThreadId } = useChatStore()
  const { data: thread, isLoading, error } = useChatThread(threadId)

  const containerRef = useRef<HTMLDivElement>(null)
  // Explicitly type the input ref to make TypeScript happy
  const inputRef = useRef<HTMLTextAreaElement>(null) as React.MutableRefObject<HTMLTextAreaElement | null>
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  // Handle initial query from URL if present
  useEffect(() => {
    if (queryMessage && !hasRun.current) {
      setThreadId(null)
      hasRun.current = true
      handleSend(queryMessage)
      window.dispatchEvent(new CustomEvent("refreshChatHistory"))
    }
  }, [queryMessage, handleSend, setThreadId])

  // Load thread data if threadId is provided
  useEffect(() => {
    if (!thread) return
    setThreadId(thread.thread_id)
    if (thread.messages && thread.messages.length > 0) {
      setMessages(thread.messages)
    }
  }, [threadId, thread, setMessages, setThreadId])

  // Reset threadId if no messages and no threadId
  useEffect(() => {
    if (messages.length === 0 && !threadId) {
      setThreadId(null)
    }
  }, [messages, threadId, setThreadId])

  // Detect user scroll to disable auto-scrolling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // If user scrolls up more than 100px from bottom, disable auto-scroll
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShouldAutoScroll(isNearBottom)
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  // Auto-scroll to bottom when new messages arrive (if shouldAutoScroll is true)
  useEffect(() => {
    if (shouldAutoScroll && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, streamingMessage, shouldAutoScroll])

  // Special handling for thread loading - scroll to bottom when loading a chat history
  useEffect(() => {
    // When thread is loaded, scroll to bottom with a short delay to ensure content is rendered
    if (thread && thread.messages && thread.messages.length > 0) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [thread])

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Show loading state while fetching thread data
  if (threadId && isLoading) {
    return (
      <div className="w-full flex justify-center items-center h-40">
        <LoaderIcon className="animate-spin w-8 h-8 text-tint" />
      </div>
    )
  }

  // Show error state if thread loading fails
  if (threadId && error) {
    return (
      <Alert className="bg-red-500/5 border-red-500/15 p-5">
        <AlertCircle className="h-4 w-4 stroke-red-500 stroke-2" />
        <div className="ml-2">
          <AlertTitle className="text-red-500 mb-2">Error Loading Conversation</AlertTitle>
          <AlertDescription className="text-base text-foreground">
            {error.message || "Failed to load this conversation. Please try again."}
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  return (
    <>
      {messages.length > 0 || threadId ? (
        // Chat view with messages
        <div className="flex flex-col h-full">
          {/* Activity indicator when streaming */}
          {isStreamingMessage && (
            <div className="fixed top-0 left-0 right-0 z-50">
              <div className="h-1 bg-indigo-50 dark:bg-indigo-900/20">
                <div className="h-full animate-[progress-line_2s_ease-in-out_infinite] bg-gradient-to-r from-indigo-400 to-indigo-600 dark:from-indigo-600 dark:to-indigo-400"></div>
              </div>
            </div>
          )}
          
          {/* Scrollable messages container */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto pt-16 pb-24 scroll-smooth custom-scrollbar"
            style={{ 
              height: "calc(100vh - 4rem)",
              scrollBehavior: 'smooth' 
            }}
          >
            <div className="max-w-3xl mx-auto px-4">
              <MessagesList
                messages={messages}
                streamingMessage={streamingMessage}
                isStreamingMessage={isStreamingMessage}
                isStreamingProSearch={isStreamingProSearch}
                onRelatedQuestionSelect={(query) => {
                  handleSend(query);
                  setShouldAutoScroll(true); // Ensure auto-scroll when selecting a related question
                }}
              />
            </div>
          </div>

          {/* Floating input at bottom */}
          <div className="fixed bottom-4 left-0 right-0 z-10">
            <div className="max-w-3xl mx-auto px-4">
              <AskInput
                isFollowingUp
                sendMessage={(message) => {
                  handleSend(message)
                  setShouldAutoScroll(true) // Re-enable auto-scroll when sending a message
                }}
                inputRef={inputRef}
              />
            </div>
          </div>
        </div>
      ) : (
        // Empty state
        <div className="flex flex-col justify-center items-center min-h-screen py-8 px-4">
          <div className="flex flex-col items-center justify-center mb-8">
            <h1 className="text-4xl font-bold mb-6">What do you want to know?</h1>
            <div className="w-full max-w-xl">
              <AskInput sendMessage={handleSend} inputRef={inputRef} />
            </div>
          </div>
          <div className="w-full max-w-xl">
            <StarterQuestionsList handleSend={handleSend} />
          </div>
        </div>
      )}
    </>
  )
})

ChatPanel.displayName = "ChatPanel"

export { ChatPanel }

