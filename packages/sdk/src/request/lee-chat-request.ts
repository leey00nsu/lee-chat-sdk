import { createChatMessageId } from '../lib/create-chat-message-id'
import {
  collectTextFromMessageParts,
  createTextMessageParts,
  type ChatMessage,
  type ChatMessagePart,
  type ChatMessageRole,
} from '../model/chat-message'
import type { ChatConversationKind } from '../model/chat-conversation'
import type { ChatParticipant } from '../model/chat-participant'
import type { LeeChatVisitor } from '../config/lee-chat-config'

export interface LeeChatHistoryItem {
  role: ChatMessageRole
  senderId: string
  content: string
  parts: ChatMessagePart[]
  createdAt: string
}

export interface LeeChatRequest {
  appId: string
  conversation: {
    id: string
    kind: ChatConversationKind
    metadata?: Record<string, unknown>
  }
  participant: ChatParticipant
  visitor: Required<Pick<LeeChatVisitor, 'id'>> & Pick<LeeChatVisitor, 'metadata'>
  message: {
    id: string
    senderId: string
    content: string
    parts: ChatMessagePart[]
    createdAt: string
  }
  metadata?: Record<string, unknown>
  history: LeeChatHistoryItem[]
}

export interface LeeChatResponse {
  message: {
    id?: string
    content: string
    parts?: ChatMessagePart[]
    createdAt?: string
    metadata?: Record<string, unknown>
  }
}

export interface ResolvedLeeChatResponse {
  message: {
    id: string
    content: string
    parts: ChatMessagePart[]
    createdAt: string
    metadata?: Record<string, unknown>
  }
}

interface BuildLeeChatRequestParams {
  appId: string
  conversation: {
    id: string
    kind: ChatConversationKind
    metadata?: Record<string, unknown>
  }
  participant: ChatParticipant
  visitor: Required<Pick<LeeChatVisitor, 'id'>> & Pick<LeeChatVisitor, 'metadata'>
  message: ChatMessage
  history: ChatMessage[]
  metadata?: Record<string, unknown>
}

export function buildLeeChatRequest({
  appId,
  conversation,
  participant,
  visitor,
  message,
  history,
  metadata,
}: BuildLeeChatRequestParams): LeeChatRequest {
  return {
    appId,
    conversation,
    participant,
    visitor,
    message: {
      id: message.id,
      senderId: message.senderId,
      content: getMessageContent(message),
      parts: message.parts,
      createdAt: message.createdAt,
    },
    metadata,
    history: history.map((historyMessage) => ({
      role: historyMessage.role,
      senderId: historyMessage.senderId,
      content: getMessageContent(historyMessage),
      parts: historyMessage.parts,
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
      parts: response.message.parts ?? createTextMessageParts(response.message.content),
      createdAt: response.message.createdAt ?? new Date().toISOString(),
      metadata: response.message.metadata,
    },
  }
}

function getMessageContent(message: ChatMessage): string {
  if (message.parts.length > 0) {
    return collectTextFromMessageParts(message.parts)
  }

  return message.content
}
