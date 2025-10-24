import type { ChatMessage } from "../generated/types.gen" // Fix the import path

export const UserMessageContent = ({ message }: { message: ChatMessage }) => {
  return (
    <div className="my-6 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
      <span className="text-xl font-medium text-indigo-800 dark:text-indigo-200">{message.content}</span>
    </div>
  )
}

