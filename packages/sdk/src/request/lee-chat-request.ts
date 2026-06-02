import { createChatMessageId } from '../lib/create-chat-message-id'
import type { ChatMessage, ChatMessageRole } from '../model/chat-message'
import type { LeeChatUser } from '../config/lee-chat-config'

export interface LeeChatHistoryItem {
  role: ChatMessageRole
  content: string
  createdAt: string
}

export interface LeeChatRequest {
  appId: string
  conversationId: string
  message: {
    id: string
    content: string
    createdAt: string
  }
  user?: LeeChatUser
  metadata?: Record<string, unknown>
  history: LeeChatHistoryItem[]
}

export interface LeeChatResponse {
  message: {
    id?: string
    content: string
    createdAt?: string
    metadata?: Record<string, unknown>
  }
}

export interface ResolvedLeeChatResponse {
  message: {
    id: string
    content: string
    createdAt: string
    metadata?: Record<string, unknown>
  }
}

interface BuildLeeChatRequestParams {
  appId: string
  message: ChatMessage
  history: ChatMessage[]
  user?: LeeChatUser
  metadata?: Record<string, unknown>
}

export function buildLeeChatRequest({
  appId,
  message,
  history,
  user,
  metadata,
}: BuildLeeChatRequestParams): LeeChatRequest {
  return {
    appId,
    conversationId: message.conversationId,
    message: {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
    },
    user,
    metadata,
    history: history.map((historyMessage) => ({
      role: historyMessage.role,
      content: historyMessage.content,
      createdAt: historyMessage.createdAt,
    })),
  }
}

export function parseLeeChatResponse(
  response: LeeChatResponse,
): ResolvedLeeChatResponse {
  return {
    message: {
      id: response.message.id ?? createChatMessageId(),
      content: response.message.content,
      createdAt: response.message.createdAt ?? new Date().toISOString(),
      metadata: response.message.metadata,
    },
  }
}
