"use client"

import { useState } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Sidebar } from "@/components/sidebar"

export default function SimpleChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "system", content: "Welcome to SageMind! This is a simplified chat interface for testing." },
  ])
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return

    // Add user message
    setMessages([...messages, { role: "user", content: input }])

    // Simulate response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I received your message: "${input}". This is a test response.`,
        },
      ])
    }, 1000)

    setInput("")
  }

  const renderContent = () => (
    <div className="h-screen flex flex-col p-4">
      <div className="mb-4">
        <Link href="/" className="text-blue-500 hover:underline">
          ← Back to Home
        </Link>
        <h1 className="text-2xl font-bold mt-2">Simple Chat Test</h1>
      </div>

      <div className="flex-1 overflow-auto border rounded p-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === "user" ? "text-right" : ""}`}>
            <div
              className={`inline-block p-3 rounded-lg ${
                msg.role === "user" ? "bg-blue-500 text-white" : msg.role === "system" ? "bg-gray-200" : "bg-gray-300"
              }`}
            >
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 p-2 border rounded"
          placeholder="Type a message..."
        />
        <button onClick={handleSend} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Send
        </button>
      </div>
    </div>
  )

  return (
    <ProtectedRoute>
      <div className="flex h-full">
        <Sidebar />
        <main className="flex-1 relative">
          {renderContent()}
        </main>
      </div>
    </ProtectedRoute>
  )
}

