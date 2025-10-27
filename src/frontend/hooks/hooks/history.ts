import { useQuery } from "@tanstack/react-query"
import { env } from "@/env"
import type { ChatSnapshot } from "../../generated/types.gen"

const BASE_URL = env.NEXT_PUBLIC_API_URL

// Implement a more robust fetch function with XMLHttpRequest fallback
export const fetchChatHistory = async (): Promise<ChatSnapshot[]> => {
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
    console.log(`Fetching chat history from ${BASE_URL}/history`)
    const response = await fetchWithTimeout(`${BASE_URL}/history`, {
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
    return data.snapshots || []
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
              resolve(data.snapshots || [])
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
      xhr.open("GET", `${BASE_URL}/history`, true)
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

// Update the useChatHistory hook with better error handling and retry logic
export const useChatHistory = () => {
  return useQuery<ChatSnapshot[], Error>({
    queryKey: ["chatHistory"],
    queryFn: async () => {
      try {
        return await fetchChatHistory()
      } catch (error) {
        console.error("Error in useChatHistory:", error)
        // Rethrow with a more user-friendly message
        throw new Error(
          error instanceof Error
            ? `Failed to load chat history: ${error.message}`
            : "Failed to load chat history due to an unknown error",
        )
      }
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
    staleTime: 30 * 1000, // Reduced to 30 seconds from 5 minutes
    refetchOnWindowFocus: true, // Refresh when window regains focus
  })
}

