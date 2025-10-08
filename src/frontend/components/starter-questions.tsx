"use client"

import { ArrowUpRight } from "lucide-react"

const starterQuestions = [
  "How does artificial intelligence work?",
  "What are the latest developments in technology?",
  "Explain quantum computing in simple terms",
  "What are the best productivity tools in 2024?",
  "How can machine learning help businesses?",
]

export const StarterQuestionsList = ({
  handleSend,
}: {
  handleSend: (question: string) => void
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
      {starterQuestions.map((question) => (
        <button
          key={question}
          onClick={() => handleSend(question)}
          className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-card/50 transition-colors text-left"
        >
          <ArrowUpRight size={18} className="text-tint flex-shrink-0" />
          <span className="font-medium break-words">{question}</span>
        </button>
      ))}
    </div>
  )
}

