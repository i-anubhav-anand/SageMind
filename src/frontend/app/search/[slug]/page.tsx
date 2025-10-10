"use client"

import { Suspense } from "react"
import { useParams } from "next/navigation"
import { ChatPanel } from "@/components/chat-panel"
import { LoaderIcon, AlertCircle } from "lucide-react"
import { useChatThread } from "@/hooks/threads"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function ChatPage() {
  const { slug } = useParams()
  const router = useRouter()
  const threadId = Number.parseInt(slug as string, 10)
  const { data: thread, isLoading, error } = useChatThread(threadId)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 md:px-8">
        <div className="flex flex-col items-center gap-4">
          <LoaderIcon className="animate-spin w-8 h-8 text-tint" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 md:px-8">
        <Alert className="bg-red-500/5 border-red-500/15 p-5 max-w-2xl">
          <AlertCircle className="h-4 w-4 stroke-red-500 stroke-2" />
          <div className="ml-2">
            <AlertTitle className="text-red-500 mb-2">Error Loading Conversation</AlertTitle>
            <AlertDescription className="text-base text-foreground">
              {error.message ||
                "Failed to load this conversation. It may have been deleted or there was a network error."}
              <div className="mt-4">
                <Button onClick={() => router.push("/")} className="mr-2">
                  Go Home
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </div>
        </Alert>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 md:px-8">
        <Alert className="bg-amber-500/5 border-amber-500/15 p-5 max-w-2xl">
          <AlertCircle className="h-4 w-4 stroke-amber-500 stroke-2" />
          <div className="ml-2">
            <AlertTitle className="text-amber-500 mb-2">Conversation Not Found</AlertTitle>
            <AlertDescription className="text-base text-foreground">
              This conversation could not be found. It may have been deleted.
              <div className="mt-4">
                <Button onClick={() => router.push("/")}>Start New Conversation</Button>
              </div>
            </AlertDescription>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<LoaderIcon className="animate-spin w-8 h-8 mx-auto" />}>
        <ChatPanel threadId={threadId} />
      </Suspense>
    </div>
  )
} 