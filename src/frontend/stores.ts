import { create } from "zustand"
import { persist } from "zustand/middleware"
import { ChatModel, type ChatMessage } from "./generated/types.gen"
import { env } from "./env"
import { useMemo } from "react"

// Define store types
type ChatState = {
  threadId: number | null
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  setThreadId: (threadId: number | null) => void
  setMessages: (messages: ChatMessage[]) => void
}

type ConfigState = {
  model: ChatModel
  localMode: boolean
  proMode: boolean
  setModel: (model: ChatModel) => void
  toggleLocalMode: () => void
  toggleProMode: () => void
}

// Create a single store with all state
type StoreState = ChatState & ConfigState

// Create the store
const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Chat state
      threadId: null,
      messages: [],
      addMessage: (message: ChatMessage) => set((state) => ({ messages: [...state.messages, message] })),
      setThreadId: (threadId: number | null) => set({ threadId }),
      setMessages: (messages: ChatMessage[]) => set({ messages }),

      // Config state
      model: ChatModel.GPT_4O_MINI,
      localMode: false,
      proMode: false,
      setModel: (model: ChatModel) => set({ model }),
      toggleLocalMode: () =>
        set((state) => {
          const localModeEnabled = env.NEXT_PUBLIC_LOCAL_MODE_ENABLED
          if (!localModeEnabled) {
            return { ...state, localMode: false }
          }

          const newLocalMode = !state.localMode
          const newModel = newLocalMode ? ChatModel.LLAMA3 : ChatModel.GPT_4O_MINI
          return { ...state, localMode: newLocalMode, model: newModel }
        }),
      toggleProMode: () => set((state) => ({ proMode: !state.proMode })),
    }),
    {
      name: "chat-store",
    },
  ),
)

// Fixed hooks for React 19 compatibility
export function useChatStore() {
  const store = useStore()
  return useMemo(() => ({
    threadId: store.threadId,
    messages: store.messages,
    addMessage: store.addMessage,
    setThreadId: store.setThreadId,
    setMessages: store.setMessages,
  }), [
    store.threadId,
    store.messages,
    store.addMessage,
    store.setThreadId,
    store.setMessages
  ])
}

export function useConfigStore() {
  const store = useStore()
  return useMemo(() => ({
    model: store.model,
    localMode: store.localMode,
    proMode: store.proMode,
    setModel: store.setModel,
    toggleLocalMode: store.toggleLocalMode,
    toggleProMode: store.toggleProMode,
  }), [
    store.model,
    store.localMode,
    store.proMode,
    store.setModel,
    store.toggleLocalMode,
    store.toggleProMode
  ])
}

