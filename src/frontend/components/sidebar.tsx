"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Home, PlusCircle, Search, Sparkles, MessageSquare, LayoutGrid, Library, RefreshCw } from "lucide-react"

import { useChatHistory } from "@/hooks/history"
import { useChatStore } from "../stores"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle"
import { Skeleton } from "@/components/ui/skeleton"

// Add this after the imports
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: chats, isLoading, error, refetch, isRefetching } = useChatHistory()
  const { messages, setMessages, setThreadId } = useChatStore()

  const handleNewChat = () => {
    setMessages([])
    setThreadId(null)
    router.push("/")
  }

  // Extract thread ID from pathname if it exists
  const currentThreadId = pathname.startsWith("/search/") ? Number.parseInt(pathname.replace("/search/", ""), 10) : null

  useEffect(() => {
    // Function to handle the refresh event
    const handleRefreshHistory = () => {
      refetch()
    }

    // Add event listener
    window.addEventListener("refreshChatHistory", handleRefreshHistory)

    // Clean up
    return () => {
      window.removeEventListener("refreshChatHistory", handleRefreshHistory)
    }
  }, [refetch])

  return (
    <>
      {/* Add this at the beginning of the return statement, before the main div */}
      <style jsx global>
        {scrollbarHideStyles}
      </style>
      <div className="w-64 h-screen bg-card border-r border-border flex flex-col overflow-hidden">
        {/* New Thread Button */}
        <div className="p-3 flex-shrink-0">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-sm font-medium border-indigo-100 dark:border-indigo-800/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200" 
            onClick={handleNewChat}
          >
            <PlusCircle size={16} className="text-indigo-500 dark:text-indigo-400" />
            New Thread
            <div className="ml-auto flex items-center text-xs text-muted-foreground">
              <span>⌘</span>
              <span>K</span>
            </div>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-2 flex-shrink-0">
          <div className="space-y-1">
            <Link href="/" passHref>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200", 
                  pathname === "/" && "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                )}
              >
                <Home size={16} className="text-indigo-500 dark:text-indigo-400" />
                Home
              </Button>
            </Link>
          </div>
        </nav>

        <Separator className="my-2 bg-indigo-100 dark:bg-indigo-800/30" />

        {/* Chat History - Make this section scrollable */}
        <div className="flex-1 overflow-y-auto px-3 scrollbar-hide custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
          <div className="flex items-center justify-between mb-2 px-2 sticky top-0 bg-card z-10 py-1">
            <div className="text-xs font-medium text-indigo-500 dark:text-indigo-400">RECENT CHATS</div>
            {(error || (chats && chats.length > 0)) && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400" 
                onClick={() => refetch()} 
                disabled={isRefetching}
              >
                <RefreshCw size={12} className={cn("text-indigo-500 dark:text-indigo-400", isRefetching && "animate-spin")} />
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-xs text-muted-foreground p-2 rounded-md bg-red-500/5">
              Failed to load chat history
              <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {chats && chats.length > 0 ? (
                chats.map((chat) => (
                  <Link key={chat.id} href={`/search/${chat.id}`} passHref>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-sm font-normal h-auto py-2 px-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200",
                        currentThreadId === chat.id && "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium",
                      )}
                      onClick={(e) => {
                        // After clicking, wait for route change then scroll to bottom of chat
                        setTimeout(() => {
                          const chatContainer = document.querySelector('.overflow-y-auto');
                          if (chatContainer) {
                            chatContainer.scrollTo({
                              top: chatContainer.scrollHeight,
                              behavior: 'smooth'
                            });
                          }
                        }, 300);
                      }}
                    >
                      <div className="truncate text-left">
                        <MessageSquare size={14} className="inline mr-2 opacity-70" />
                        {chat.title}
                      </div>
                    </Button>
                  </Link>
                ))
              ) : (
                <div className="text-xs text-muted-foreground p-2">No chat history yet</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-indigo-100 dark:border-indigo-800/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500 dark:text-indigo-400" />
              <span className="text-indigo-600 dark:text-indigo-400">SageMind</span>
            </div>
            <ModeToggle />
          </div>
        </div>
      </div>
    </>
  )
}

