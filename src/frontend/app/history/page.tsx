"use client"
import RecentChat from "@/components/recent-chat"
import { Separator } from "@/components/ui/separator"
import { useChatHistory } from "@/hooks/history"
import { HistoryIcon, AlertCircle, RefreshCw } from "lucide-react"
import React from "react"
import { env } from "@/env"
import { Button } from "@/components/ui/button"
import { useQueryClient } from "@tanstack/react-query"

export default function RecentsPage() {
  const queryClient = useQueryClient()
  const { data: chats, isLoading, error, refetch, isRefetching } = useChatHistory()

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-tint border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">Loading chat history...</p>
        </div>
      </div>
    )

  return (
    <div className="h-screen scrollbar-hide">
      <div className="mx-auto max-w-3xl pt-16 px-4 pb-16">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <HistoryIcon className="w-5 h-5" />
            <h1 className="text-xl font-semibold">Chat History</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <Separator className="mb-4" />

        {error && (
          <div className="bg-red-500/5 border border-red-500/15 p-5 rounded-lg mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 stroke-red-500 stroke-2 mt-0.5 mr-2 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-500 font-medium">Error Loading Chat History</h3>
                <p className="text-foreground mt-1">{error.message}</p>
                <div className="mt-4 p-3 bg-card rounded-md text-sm">
                  <p className="font-medium mb-2">Troubleshooting steps:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      Make sure the API server is running at{" "}
                      <code className="bg-muted px-1 py-0.5 rounded">{env.NEXT_PUBLIC_API_URL}</code>
                    </li>
                    <li>Check your network connection</li>
                    <li>Check browser console for detailed error messages</li>
                    <li>Try refreshing the page or clicking the refresh button above</li>
                  </ol>
                </div>
                <div className="mt-4">
                  <Button onClick={handleRefresh} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {chats && chats.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {chats.map((chat, index) => (
              <React.Fragment key={chat.id}>
                <RecentChat {...chat} />
                {index < chats.length - 1 && <Separator className="" />}
              </React.Fragment>
            ))}
          </ul>
        ) : chats && chats.length === 0 && !error ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No chat history found</p>
            <p className="text-sm text-muted-foreground mt-2">Start a new chat to see it here</p>
          </div>
        ) : null}
      </div>
    </div>
  )
} 