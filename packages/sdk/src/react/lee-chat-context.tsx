'use client'

import { createContext } from 'react'
import type { ChatMessage } from '../model/chat-message'
import type { ResolvedLeeChatConfig } from '../config/lee-chat-config'
import type { UseChatControllerResult } from '../controller/use-chat-controller'

export interface LeeChatContextValue {
  config: ResolvedLeeChatConfig
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  unreadCount: number
  chat: UseChatControllerResult<Record<string, unknown>>
  messages: Array<ChatMessage<Record<string, unknown>>>
  submitMessage: (contentOverride?: string) => Promise<void>
}

export const LeeChatContext = createContext<LeeChatContextValue | null>(null)
