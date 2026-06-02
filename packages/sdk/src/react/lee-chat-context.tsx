'use client'

import { createContext } from 'react'
import type { ChatMessage } from '../model/chat-message'
import type { ResolvedLeeChatConfig } from '../config/lee-chat-config'
import type { UseChatControllerResult } from '../controller/use-chat-controller'
import type {
  ConversationClientEvent,
  ConversationParticipantState,
} from '../client/conversation-client'

export interface LeeChatContextValue {
  config: ResolvedLeeChatConfig
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  unreadCount: number
  chat: UseChatControllerResult<Record<string, unknown>>
  messages: Array<ChatMessage<Record<string, unknown>>>
  participantState: ConversationParticipantState
  submitMessage: (contentOverride?: string) => Promise<void>
  applyEvent: (event: ConversationClientEvent) => void
}

export const LeeChatContext = createContext<LeeChatContextValue | null>(null)
