'use client'

import { createContext } from 'react'
import type { ChatMessage } from '../model/chat-message'
import type { ResolvedLeeChatConfig } from '../config/lee-chat-config'
import type { UseChatControllerResult } from '../controller/use-chat-controller'
import type {
  ConversationClientEvent,
  ConversationParticipantState,
} from '../client/conversation-client'

export interface LeeChatContextValue<
  TMessageMetadata = Record<string, unknown>,
> {
  config: ResolvedLeeChatConfig
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  unreadCount: number
  chat: UseChatControllerResult<TMessageMetadata>
  messages: Array<ChatMessage<TMessageMetadata>>
  participantState: ConversationParticipantState
  submitMessage: UseChatControllerResult<TMessageMetadata>['submitMessage']
  applyEvent: (event: ConversationClientEvent) => void
}

export const LeeChatContext =
  createContext<LeeChatContextValue<unknown> | null>(null)
