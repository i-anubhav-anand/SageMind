import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ChatModel } from "../../generated/types.gen"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isLocalModel(model: ChatModel) {
  return !isCloudModel(model)
}

export function isCloudModel(model: ChatModel) {
  return [ChatModel.LLAMA_3_70B, ChatModel.GPT_4O, ChatModel.GPT_4O_MINI].includes(model)
}

// Add utility functions for error handling
export function classifyError(error: unknown): { type: string; message: string } {
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

  if (error instanceof Error && 
      (error.message.includes("CompletionResponse") || 
       error.message.includes("LLMCompletionEndEvent") || 
       error.message.includes("validation error"))) {
    return {
      type: "ollama",
      message: "Error with local LLM model. Make sure Ollama is running and the selected model is installed.",
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

// Function to ensure proper formatting for Ollama responses
export function formatOllamaResponse(rawResponse: any): any {
  // If the response is already in the correct format, return it
  if (rawResponse && 
      typeof rawResponse === 'object' && 
      rawResponse.hasOwnProperty('response')) {
    return rawResponse;
  }
  
  // If we get a text string or other format, create a properly formatted response
  const formattedResponse = {
    response: typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse),
    done: true,
    context: [],
    total_duration: 0,
    load_duration: 0,
    prompt_eval_count: 0,
    prompt_eval_duration: 0,
    eval_count: 0,
    eval_duration: 0
  };
  
  return formattedResponse;
}

// Format date for display
export function formatRelativeTime(date: string | undefined): string {
  if (!date) return "Unknown date"

  try {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return "Invalid date"

    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return "just now"
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`
    if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`

    return dateObj.toLocaleDateString()
  } catch (error) {
    console.error("Error formatting date:", error)
    return "Unknown date"
  }
}

