"use client"

import { useMutation } from "@tanstack/react-query"
import {
  type AgentQueryPlanStream,
  type AgentReadResultsStream,
  type AgentSearchQueriesStream,
  AgentSearchStepStatus,
  type ChatMessage,
  type ChatRequest,
  type ChatResponseEvent,
  type ErrorStream,
  type Message,
  MessageRole,
  type RelatedQueriesStream,
  type SearchResultStream,
  type StreamEndStream,
  StreamEvent,
  type TextChunkStream,
  ChatModel,
} from "../../generated/types.gen"
import { useState, useRef, useCallback, useEffect } from "react"
import { useConfigStore, useChatStore } from "@/stores"
import { env } from "@/env"

const BASE_URL = env.NEXT_PUBLIC_API_URL

// Increased timeout duration (2 minutes)
const REQUEST_TIMEOUT = 120000

const convertToChatRequest = (query: string, history: ChatMessage[]): ChatRequest => {
  const newHistory: Message[] = history.map((message) => ({
    role: message.role === MessageRole.USER ? MessageRole.USER : MessageRole.ASSISTANT,
    content: message.content,
  }))
  return { query, history: newHistory }
}

// Add a function to sanitize the model content to remove <think> tags
const sanitizeModelThinkingContent = (content: string, modelName?: string): string => {
  // For all models except DeepSeek, remove thinking content
  if (!content) return "";
  
  try {
    // For DeepSeek, we want to preserve the <think> tags so they can be displayed in the UI
    // Other models may also use thinking-like tags but in different ways that might break rendering
    
    // Only do minimal sanitization for DeepSeek to fix malformed tags
    if (content.includes("<think") && modelName && modelName.includes("deepseek")) {
      // Just fix any unclosed or malformed tags
      let fixedContent = content
        // Fix malformed tags with missing closing brackets
        .replace(/think>[\s\S]*?<\/think(?![>])/g, "think>")
        // Ensure all opening tags have proper closing brackets
        .replace(/<think(?![>])/g, "<think>")
        // Ensure all closing tags have proper format
        .replace(/(?<!<)\/think>/g, "</think>");
        
      // Add additional safety - encode any remaining think tags to prevent rendering as HTML tags
      // This ensures React doesn't try to render them as components
      return fixedContent
        .replace(/<think/g, "&lt;think")
        .replace(/<\/think/g, "&lt;/think");
    }
    
    // For non-DeepSeek models, completely remove thinking tags with more aggressive patterns
    return content
      // Replace <think> tags and their content with any attributes
      .replace(/<think\b[^>]*>[\s\S]*?<\/think\b[^>]*>/g, "")
      // Handle self-closing think tags
      .replace(/<think\b[^>]*\/>/g, "")
      // Handle any remaining opening think tags
      .replace(/<think\b[^>]*>/g, "")
      // Handle any remaining closing think tags
      .replace(/<\/think\b[^>]*>/g, "")
      // Handle any remaining think tags with attributes
      .replace(/<\/?think[^>]*>/gi, "")
      // Handle potential malformed tags
      .replace(/think>[\s\S]*?<\/think/g, "")
      // Handle with capital T as well
      .replace(/<Think\b[^>]*>[\s\S]*?<\/Think\b[^>]*>/g, "")
      .replace(/<Think\b[^>]*\/>/g, "")
      .replace(/<Think\b[^>]*>/g, "")
      .replace(/<\/Think\b[^>]*>/g, "")
      .replace(/<\/?Think[^>]*>/gi, "")
      // Final safety - HTML encode any potentially remaining tags
      .replace(/<think/gi, "&lt;think")
      .replace(/<\/think/gi, "&lt;/think")
      .replace(/<Think/gi, "&lt;Think")
      .replace(/<\/Think/gi, "&lt;/Think");
  } catch (e) {
    console.error("Error sanitizing model content:", e);
    // As a last resort, do a basic HTML encoding of any think tags
    return content
      .replace(/<think/gi, "&lt;think")
      .replace(/<\/think/gi, "&lt;/think")
      .replace(/<Think/gi, "&lt;Think")
      .replace(/<\/Think/gi, "&lt;/Think");
  }
};

export const useChat = () => {
  const { addMessage, messages, threadId, setThreadId } = useChatStore()
  const { model, proMode } = useConfigStore()

  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null)
  const [isStreamingProSearch, setIsStreamingProSearch] = useState(false)
  const [isStreamingMessage, setIsStreamingMessage] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  // Use a cleanup function to ensure resources are properly released
  useEffect(() => {
    return () => {
      // Clean up resources when component unmounts
      if (xhrRef.current) {
        xhrRef.current.abort()
        xhrRef.current = null
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  // Use a ref to store the current state between events
  const stateRef = useRef<ChatMessage>({
    role: MessageRole.ASSISTANT,
    content: "",
    sources: [],
    related_queries: [],
    images: [],
    agent_response: null,
  })

  const handleEvent = useCallback(
    (eventData: string) => {
      try {
        const eventItem: ChatResponseEvent = JSON.parse(eventData)
        const state = stateRef.current

        switch (eventItem.event) {
          case StreamEvent.BEGIN_STREAM:
            // Reset state for new message
            state.content = ""
            state.sources = []
            state.related_queries = []
            state.images = []
            state.agent_response = null

            setIsStreamingMessage(true)
            setStreamingMessage({
              role: MessageRole.ASSISTANT,
              content: "",
              related_queries: [],
              sources: [],
              images: [],
              agent_response: null,
            })
            break

          case StreamEvent.SEARCH_RESULTS:
            const data = eventItem.data as SearchResultStream
            state.sources = data.results ?? []
            state.images = data.images ?? []
            break

          case StreamEvent.TEXT_CHUNK:
            // Get the text chunk
            let chunkText = (eventItem.data as TextChunkStream).text;
            
            // Always sanitize, regardless of model type, to avoid any React rendering issues
            chunkText = sanitizeModelThinkingContent(chunkText, model);
            
            // Apply the processed text chunk
            state.content += chunkText;
            
            // Update streaming message
            setStreamingMessage({ ...state });
            break

          case StreamEvent.RELATED_QUERIES:
            state.related_queries = (eventItem.data as RelatedQueriesStream).related_queries ?? []
            break

          case StreamEvent.STREAM_END:
            const endData = eventItem.data as StreamEndStream

            // Add the final message - ensure agent_response is included
            addMessage({
              role: MessageRole.ASSISTANT,
              content: state.content,
              related_queries: state.related_queries,
              sources: state.sources,
              images: state.images,
              agent_response: state.agent_response, // Make sure this is preserved
            })

            // Reset streaming state
            setStreamingMessage(null)
            setIsStreamingMessage(false)
            setIsStreamingProSearch(false)

            // Only if the backend is using the DB
            if (endData.thread_id) {
              setThreadId(endData.thread_id)
              
              // Update URL with thread ID but don't lose the agent_response
              window.history.pushState({}, "", `/search/${endData.thread_id}`)

              // Refresh chat history after a new thread is created
              // Use a small delay to ensure the backend has completed processing
              setTimeout(() => {
                // Use a custom event to trigger history refresh
                window.dispatchEvent(new CustomEvent("refreshChatHistory"))
              }, 500)
            }
            return

          case StreamEvent.AGENT_QUERY_PLAN:
            const { steps } = eventItem.data as AgentQueryPlanStream

            if (!steps || steps.length === 0) {
              console.warn("No steps in AGENT_QUERY_PLAN")
              return
            }

            const newStepsDetails = steps.map((step, index) => ({
              step: step,
              queries: [],
              results: [],
              status: index === 0 ? AgentSearchStepStatus.CURRENT : AgentSearchStepStatus.DEFAULT,
              step_number: index,
            }))

            state.agent_response = {
              steps: steps,
              steps_details: newStepsDetails,
            }

            setIsStreamingProSearch(true)
            break

          case StreamEvent.AGENT_SEARCH_QUERIES:
            const { queries, step_number: queryStepNumber } = eventItem.data as AgentSearchQueriesStream

            if (state.agent_response && state.agent_response.steps_details) {
              const updatedSteps = [...state.agent_response.steps_details]

              // Update the current step with queries
              if (updatedSteps[queryStepNumber]) {
                updatedSteps[queryStepNumber].queries = queries || []
                updatedSteps[queryStepNumber].status = AgentSearchStepStatus.CURRENT

                // Mark previous step as done if this isn't the first step
                if (queryStepNumber > 0) {
                  updatedSteps[queryStepNumber - 1].status = AgentSearchStepStatus.DONE
                }
              }

              state.agent_response = {
                steps: updatedSteps.map((step) => step.step),
                steps_details: updatedSteps,
              }
            }
            break

          case StreamEvent.AGENT_READ_RESULTS:
            const { results, step_number: resultsStepNumber } = eventItem.data as AgentReadResultsStream

            if (state.agent_response && state.agent_response.steps_details) {
              const updatedSteps = [...state.agent_response.steps_details]

              if (updatedSteps[resultsStepNumber]) {
                updatedSteps[resultsStepNumber].results = results || []
              }

              state.agent_response = {
                steps: updatedSteps.map((step) => step.step),
                steps_details: updatedSteps,
              }
            }
            break

          case StreamEvent.AGENT_FINISH:
            if (state.agent_response && state.agent_response.steps_details) {
              // Mark all steps as done when finished
              const updatedSteps = state.agent_response.steps_details.map((step) => ({
                ...step,
                status: AgentSearchStepStatus.DONE,
              }))

              state.agent_response = {
                steps: updatedSteps.map((step) => step.step),
                steps_details: updatedSteps,
              }
            }
            break

          case StreamEvent.ERROR:
            const errorData = eventItem.data as ErrorStream
            
            // Special handling for Ollama-related errors
            let errorMessage = errorData.detail;
            if (model && (
              model === ChatModel.LLAMA3 || 
              model === ChatModel.GEMMA || 
              model === ChatModel.MISTRAL || 
              model === ChatModel.PHI3_14B || 
              model === ChatModel.DEEPSEEK_R1) && 
              (errorMessage.includes("CompletionResponse") || 
               errorMessage.includes("LLMCompletionEndEvent") || 
               errorMessage.includes("validation error"))
            ) {
              errorMessage = "Error with local Ollama model. Make sure Ollama is running and the model is installed with 'ollama pull " + model + "'";
            }
            
            // Keep the agent_response when there's an error to maintain the UI state
            addMessage({
              role: MessageRole.ASSISTANT,
              content: errorMessage,
              related_queries: [],
              sources: [],
              images: [],
              agent_response: state.agent_response,
              is_error_message: true,
            })

            setStreamingMessage(null)
            setIsStreamingMessage(false)
            // Don't reset isStreamingProSearch if we have agent_response data
            if (!state.agent_response) {
              setIsStreamingProSearch(false)
            }
            return
        }

        // Update the streaming message with the latest state
        setStreamingMessage({
          role: MessageRole.ASSISTANT,
          content: state.content,
          related_queries: state.related_queries,
          sources: state.sources,
          images: state.images,
          agent_response: state.agent_response,
        })
      } catch (error) {
        console.error("Error parsing event data:", error, eventData)
      }
    },
    [addMessage, setThreadId],
  )

  // Function to process SSE data
  const processSSE = useCallback(
    (data: string) => {
      const lines = data.split("\n")
      for (const line of lines) {
        if (line.trim() === "") continue
        if (line.startsWith("data: ")) {
          const jsonData = line.slice(6) // Remove "data: " prefix
          if (jsonData.trim()) {
            try {
              handleEvent(jsonData)
            } catch (error) {
              // Handle malformed JSON from Ollama
              console.error("Error processing event data:", error)
              
              // For Ollama models, create a properly formatted event manually
              if (model && (model.includes("ollama/") || 
                          model === ChatModel.LLAMA3 || 
                          model === ChatModel.GEMMA || 
                          model === ChatModel.MISTRAL || 
                          model === ChatModel.PHI3_14B || 
                          model === ChatModel.DEEPSEEK_R1)) {
                
                // Extract text content and create a properly formatted chunk event
                try {
                  const cleanedData = jsonData.replace(/[^\x20-\x7E]/g, '').trim()
                  const textContent = extractTextContent(cleanedData)
                  
                  // Create a properly formatted text chunk event
                  const formattedEvent = JSON.stringify({
                    event: "text-chunk",
                    data: {
                      text: textContent || jsonData
                    }
                  })
                  
                  // Process the formatted event
                  handleEvent(formattedEvent)
                } catch (innerError) {
                  console.error("Failed to recover from Ollama parsing error:", innerError)
                }
              }
            }
          }
        }
      }
    },
    [handleEvent, model],
  )
  
  // Helper function to extract text content from Ollama responses
  const extractTextContent = (data: string): string => {
    // Try to extract response field from Ollama format
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(data)
      if (parsed.response) {
        // Sanitize response for DeepSeek model (and any others that may use <think> tags)
        if (model.includes("deepseek")) {
          return sanitizeModelThinkingContent(parsed.response, model);
        }
        return parsed.response
      }
    } catch {
      // If not JSON, look for response: pattern
      const match = data.match(/"response"\s*:\s*"([^"]+)"/)
      if (match && match[1]) {
        // Sanitize response for DeepSeek model
        if (model.includes("deepseek")) {
          return sanitizeModelThinkingContent(match[1], model);
        }
        return match[1]
      }
    }
    
    // Sanitize the original data if it's DeepSeek
    if (model.includes("deepseek")) {
      return sanitizeModelThinkingContent(data, model);
    }
    // Default to returning the original data
    return data
  }

  // Function to clean up resources
  const cleanupRequest = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.onreadystatechange = null
      xhrRef.current.onerror = null
      xhrRef.current.ontimeout = null
      xhrRef.current = null
    }

    if (abortControllerRef.current) {
      abortControllerRef.current = null
    }
  }, [])

  const { mutateAsync: chat } = useMutation<void, Error, ChatRequest>({
    retry: false,
    mutationFn: async (request) => {
      // Cancel any ongoing request
      if (xhrRef.current) {
        xhrRef.current.abort()
        xhrRef.current = null
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create a new abort controller
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      // Reset state for new request
      stateRef.current = {
        role: MessageRole.ASSISTANT,
        content: "",
        sources: [],
        related_queries: [],
        images: [],
        agent_response: null,
      }

      // Add user message to chat
      addMessage({ role: MessageRole.USER, content: request.query })

      // Set streaming state for pro search if enabled
      if (proMode) {
        setIsStreamingProSearch(true)
      }

      const req = {
        ...request,
        thread_id: threadId,
        model,
        pro_search: proMode,
        // Add a flag to indicate this is a local model request if using Ollama
        is_local_model: model.startsWith("llama") || model.startsWith("gemma") || 
                        model.startsWith("mistral") || model.startsWith("phi") || 
                        model.startsWith("deepseek") || 
                        model.includes("ollama/"),
      }

      console.log("Sending request to:", `${BASE_URL}/chat`)
      console.log("Request data:", JSON.stringify(req))

      try {
        // Create a custom EventSource implementation using XMLHttpRequest
        let buffer = ""
        let connected = false
        let receivedData = false
        let retryCount = 0
        const MAX_RETRIES = 3

        const makeRequest = () => {
          return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhrRef.current = xhr

            // Set up a heartbeat mechanism to keep the connection alive
            let heartbeatInterval: NodeJS.Timeout | null = null

            const startHeartbeat = () => {
              if (heartbeatInterval) clearInterval(heartbeatInterval)
              heartbeatInterval = setInterval(() => {
                if (xhr.readyState === 3 || xhr.readyState === 4) {
                  // Connection is still active, do nothing
                } else {
                  console.log("Heartbeat check: connection may be stalled")
                }
              }, 10000) // Check every 10 seconds
            }

            const stopHeartbeat = () => {
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval)
                heartbeatInterval = null
              }
            }

            xhr.onreadystatechange = () => {
              if (xhr.readyState >= 3) {
                // Get only the new data
                const newData = xhr.responseText.substring(buffer.length)
                if (newData) {
                  buffer += newData
                  processSSE(newData)
                  connected = true
                  receivedData = true

                  // Reset the timeout since we're receiving data
                  if (xhr.timeout > 0) {
                    xhr.timeout = REQUEST_TIMEOUT
                  }
                }
              }

              if (xhr.readyState === 4) {
                stopHeartbeat()

                if ((xhr.status >= 200 && xhr.status < 300) || receivedData) {
                  console.log("Request completed successfully or received partial data")
                  resolve()
                } else if (xhr.status === 0) {
                  // Status 0 usually means CORS error or network issue
                  console.error("Network error or CORS issue detected (status 0)")

                  if (connected || receivedData) {
                    // If we were connected before, this might be a normal connection close
                    console.log("Connection was established before closing, treating as success")
                    resolve()
                  } else if (retryCount < MAX_RETRIES) {
                    // Retry the request
                    retryCount++
                    console.log(`Retrying request (${retryCount}/${MAX_RETRIES})...`)
                    setTimeout(() => {
                      makeRequest().then(resolve).catch(reject)
                    }, 1000 * retryCount) // Exponential backoff
                  } else {
                    reject(
                      new Error(
                        "Failed to connect to the server after multiple attempts. This might be due to a CORS issue or network problem.",
                      ),
                    )
                  }
                } else {
                  reject(new Error(`HTTP error! Status: ${xhr.status}`))
                }
              }
            }

            xhr.onerror = (e) => {
              stopHeartbeat()
              console.error("XHR error:", e)

              if (receivedData) {
                // If we received some data, consider it a partial success
                console.log("Received partial data before error, treating as partial success")
                resolve()
              } else if (retryCount < MAX_RETRIES) {
                retryCount++
                console.log(`Retrying request after error (${retryCount}/${MAX_RETRIES})...`)
                setTimeout(() => {
                  makeRequest().then(resolve).catch(reject)
                }, 1000 * retryCount)
              } else {
                reject(new Error("Network error after multiple retry attempts"))
              }
            }

            xhr.ontimeout = () => {
              stopHeartbeat()
              console.error("Request timed out")

              if (receivedData) {
                // If we received some data, consider it a partial success
                console.log("Received partial data before timeout, treating as partial success")
                resolve()
              } else if (retryCount < MAX_RETRIES) {
                retryCount++
                console.log(`Retrying request after timeout (${retryCount}/${MAX_RETRIES})...`)
                setTimeout(() => {
                  makeRequest().then(resolve).catch(reject)
                }, 1000 * retryCount)
              } else {
                reject(new Error("Request timed out after multiple retry attempts"))
              }
            }

            // Open connection
            xhr.open("POST", `${BASE_URL}/chat`, true)

            // Set headers
            xhr.setRequestHeader("Content-Type", "application/json")
            xhr.setRequestHeader("Accept", "text/event-stream")
            xhr.setRequestHeader("Cache-Control", "no-cache")
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")

            // Set timeout (2 minutes)
            xhr.timeout = REQUEST_TIMEOUT

            // Send request
            xhr.send(JSON.stringify(req))

            // Start heartbeat
            startHeartbeat()

            // Set up abort handling
            signal.addEventListener("abort", () => {
              stopHeartbeat()
              xhr.abort()
              reject(new Error("Request aborted"))
            })
          })
        }

        await makeRequest()
      } catch (error) {
        console.error("Error in chat request:", error)

        // Determine if this is likely a CORS issue or timeout
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        const isCORSError =
          errorMessage.includes("CORS") || (error instanceof Error && error.message.includes("status 0"))
        const isTimeoutError = errorMessage.includes("timeout")
        const isOllamaError = errorMessage.includes("CompletionResponse") || 
                              errorMessage.includes("LLMCompletionEndEvent") ||
                              errorMessage.includes("validation error")

        let userFacingMessage = `Sorry, there was an error connecting to the server: ${errorMessage}. Please check your connection and try again.`

        if (isCORSError) {
          userFacingMessage =
            "Unable to connect to the server due to a cross-origin (CORS) issue. This typically happens when the API server is not running or is not configured to accept requests from this domain."
        } else if (isTimeoutError) {
          userFacingMessage =
            "The server took too long to respond. This might be because the server is busy or your query is complex. Please try again or try a simpler query."
        } else if (isOllamaError) {
          userFacingMessage = 
            "Error using local LLM (Ollama). Make sure Ollama is running and the selected model is installed. Try: 'ollama pull MODEL_NAME'"
        }

        // Add an error message to the chat
        addMessage({
          role: MessageRole.ASSISTANT,
          content: userFacingMessage,
          related_queries: [],
          sources: [],
          images: [],
          is_error_message: true,
        })

        // Reset streaming states
        setIsStreamingMessage(false)
        setIsStreamingProSearch(false)
        setStreamingMessage(null)

        throw error
      } finally {
        // Clean up resources
        cleanupRequest()
      }
    },
  })

  const handleSend = async (query: string) => {
    try {
      await chat(convertToChatRequest(query, messages))
    } catch (error) {
      console.error("Error in handleSend:", error)

      // Add an error message to the chat if not already added in the mutation
      if (!messages.some((m) => m.is_error_message && m.role === MessageRole.ASSISTANT)) {
        addMessage({
          role: MessageRole.ASSISTANT,
          content: `Sorry, there was an error sending your message: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
          related_queries: [],
          sources: [],
          images: [],
          is_error_message: true,
        })
      }

      // Reset streaming states
      setIsStreamingMessage(false)
      setIsStreamingProSearch(false)
      setStreamingMessage(null)
    }
  }

  return {
    handleSend,
    streamingMessage,
    isStreamingMessage,
    isStreamingProSearch,
  }
}

