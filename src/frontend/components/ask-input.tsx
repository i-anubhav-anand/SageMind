"use client"

import type React from "react"

import TextareaAutosize from "react-textarea-autosize"
import { useState } from "react"
import { Button } from "./ui/button"
import { ArrowUp, Paperclip } from "lucide-react"
import ProToggle from "./pro-toggle"
import { ModelSelection } from "./model-selection"
import { cn } from "@/lib/utils"

const InputBar = ({
  input,
  setInput,
  inputRef,
  isSubmitting,
}: {
  input: string
  setInput: (input: string) => void
  inputRef?: React.RefObject<HTMLTextAreaElement> | React.MutableRefObject<HTMLTextAreaElement | null>
  isSubmitting: boolean
}) => {
  return (
    <div className={cn(
      "w-full flex flex-col rounded-lg focus:outline-none px-4 py-3 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-800/30 shadow-md hover:border-indigo-200 dark:hover:border-indigo-700/40 transition-all",
      isSubmitting && "border-indigo-300 dark:border-indigo-600/50"
    )}>
      <div className="w-full">
        <TextareaAutosize
          ref={inputRef}
          className="w-full bg-transparent text-md resize-none focus:outline-none p-0 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          placeholder="Ask anything..."
          onChange={(e) => setInput(e.target.value)}
          value={input}
          aria-label="Ask a question"
          disabled={isSubmitting}
        />
      </div>
      <div className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400">
            <Paperclip size={16} />
          </Button>
          <ModelSelection />
        </div>
        <div className="flex items-center gap-2">
          <ProToggle />
          <Button
            type="submit"
            variant="default"
            size="icon"
            className={cn(
              "rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 aspect-square h-8 w-8 disabled:opacity-20 overflow-hidden shadow-sm",
              isSubmitting && "animate-pulse"
            )}
            disabled={input.trim().length < 5 || isSubmitting}
          >
            {isSubmitting ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowUp size={18} className="text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

const FollowingUpInput = ({
  input,
  setInput,
  inputRef,
  isSubmitting,
}: {
  input: string
  setInput: (input: string) => void
  inputRef?: React.RefObject<HTMLTextAreaElement> | React.MutableRefObject<HTMLTextAreaElement | null>
  isSubmitting: boolean
}) => {
  return (
    <div className={cn(
      "w-full flex flex-row rounded-full focus:outline-none px-4 py-3 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-800/30 items-center shadow-md hover:border-indigo-200 dark:hover:border-indigo-700/40 transition-all",
      isSubmitting && "border-indigo-300 dark:border-indigo-600/50"
    )}>
      <div className="w-full">
        <TextareaAutosize
          ref={inputRef}
          className="w-full bg-transparent text-md resize-none focus:outline-none p-0 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          placeholder="Ask anything..."
          onChange={(e) => setInput(e.target.value)}
          value={input}
          aria-label="Ask a question"
          disabled={isSubmitting}
        />
      </div>
      <div className="flex items-center gap-2">
        <ProToggle />
        <Button
          type="submit"
          variant="default"
          size="icon"
          className={cn(
            "rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 aspect-square h-8 w-8 disabled:opacity-20 overflow-hidden shadow-sm",
            isSubmitting && "animate-pulse"
          )}
          disabled={input.trim().length < 5 || isSubmitting}
        >
          {isSubmitting ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowUp size={18} className="text-white" />
          )}
        </Button>
      </div>
    </div>
  )
}

export const AskInput = ({
  sendMessage,
  isFollowingUp = false,
  inputRef,
}: {
  sendMessage: (message: string) => void
  isFollowingUp?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement> | React.MutableRefObject<HTMLTextAreaElement | null>
}) => {
  const [input, setInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (input.trim().length < 5) return

    setIsSubmitting(true)
    sendMessage(input)
    
    // Clear input after a slight delay for better UX
    setTimeout(() => {
      setInput("")
      setIsSubmitting(false)
    }, 300)
  }

  return (
    <>
      <form
        className="w-full overflow-hidden"
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
      >
        {isFollowingUp ? (
          <FollowingUpInput 
            input={input} 
            setInput={setInput} 
            inputRef={inputRef} 
            isSubmitting={isSubmitting}
          />
        ) : (
          <InputBar 
            input={input} 
            setInput={setInput} 
            inputRef={inputRef} 
            isSubmitting={isSubmitting}
          />
        )}
      </form>
    </>
  )
}

