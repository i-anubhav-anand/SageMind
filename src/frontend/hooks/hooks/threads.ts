import { useQuery } from "@tanstack/react-query"
import { env } from "@/env"
import type { ThreadResponse, ChatMessage } from "../../generated/types.gen"

const BASE_URL = env.NEXT_PUBLIC_API_URL

// Add better error classification
const classifyError = (error: unknown): { type: string; message: string } => {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      type: "network",
      message: "Network error - please check your connection and try again.",
    }
  }

  if (error instanceof Error && error.message.includes("CORS")) {
    return {
      type: "cors",
      message: "CORS error - the server is not configured to accept requests from this domain.",
    }
  }

  if (error instanceof Error) {
    return { type: "general", message: error.message }
  }

  return {
    type: "unknown",
    message: "An unknown error occurred. Please try again.",
  }
}

// Implement a more robust fetch function with XMLHttpRequest fallback
const fetchChatThread = async (threadId: number): Promise<ThreadResponse> => {
  // First try with fetch API
  const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 10000): Promise<Response> => {
    const controller = new AbortController()
    const { signal } = controller

    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, { ...options, signal })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  // Try with fetch first
  try {
    console.log(`Fetching thread ${threadId} from ${BASE_URL}/thread/${threadId}`)
    const response = await fetchWithTimeout(`${BASE_URL}/thread/${threadId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "include",
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`HTTP error! Status: ${response.status}, Response:`, errorText)
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const data = await response.json()

    // Validate the response data
    if (!data || !data.thread_id) {
      console.error("Invalid thread data received:", data)
      throw new Error("Invalid thread data received from server")
    }

    return data
  } catch (fetchError) {
    console.warn("Fetch API failed, falling back to XMLHttpRequest:", fetchError)

    // Fall back to XMLHttpRequest if fetch fails
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)

              // Validate the response data
              if (!data || !data.thread_id) {
                console.error("Invalid thread data received:", data)
                reject(new Error("Invalid thread data received from server"))
                return
              }

              resolve(data)
            } catch (parseError) {
              console.error("Error parsing JSON response:", parseError)
              reject(new Error("Failed to parse server response"))
            }
          } else if (xhr.status === 0) {
            reject(new Error("Network error - server might be unreachable or CORS issue"))
          } else {
            reject(new Error(`HTTP error! Status: ${xhr.status}`))
          }
        }
      }

      xhr.onerror = () => {
        console.error("XHR error occurred")
        reject(new Error("Network error occurred"))
      }

      xhr.ontimeout = () => {
        console.error("XHR request timed out")
        reject(new Error("Request timed out"))
      }

      // Open and send request
      xhr.open("GET", `${BASE_URL}/thread/${threadId}`, true)
      xhr.timeout = 15000 // 15 seconds timeout

      // Set headers
      xhr.setRequestHeader("Content-Type", "application/json")
      xhr.setRequestHeader("Accept", "application/json")
      xhr.setRequestHeader("Cache-Control", "no-cache")
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")

      // Send request
      xhr.send()
    })
  }
}

export const useChatThread = (threadId: number) => {
  return useQuery<ThreadResponse, Error>({
    queryKey: ["thread", threadId],
    enabled: Boolean(threadId),
    queryFn: async () => {
      try {
        const response = await fetch(`${BASE_URL}/threads/${threadId}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.detail || `Failed to load thread: ${response.statusText}`
          throw new Error(errorMessage)
        }
        
        const data = await response.json()
        
        // Ensure agent_response is properly preserved in all messages
        if (data.messages && Array.isArray(data.messages)) {
          data.messages = data.messages.map((message: ChatMessage) => {
            // Log when we find an agent_response for debugging
            if (message.agent_response) {
              console.log('Found agent_response in thread data')
            }
            return message
          })
        }
        
        return data
      } catch (error) {
        console.error("Error fetching thread", error)
        throw error
      }
    },
    retry: 1,
    staleTime: 60000, // 1 minute
  })
}

