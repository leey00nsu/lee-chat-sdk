import {
  collectTextFromMessageParts,
  createTextMessageParts,
  type ChatMessagePart,
  type ChatMessageRole,
} from '../model/chat-message'
import type {
  LeeChatHistoryItem,
  LeeChatRequest,
  LeeChatResponse,
} from '../request/lee-chat-request'

export interface LeeChatTextHistoryItem {
  role: ChatMessageRole
  senderId: string
  content: string
  createdAt: string
}

export interface LeeChatTurnHistoryItem {
  user: LeeChatTextHistoryItem
  assistant?: LeeChatTextHistoryItem
}

export interface CreateLeeChatTextResponseParams<
  TMetadata = Record<string, unknown>,
> {
  request: LeeChatRequest
  content: string
  metadata?: TMetadata
  id?: string
  idSuffix?: string
  createdAt?: string
}

const LEE_CHAT_REQUEST_ADAPTER = {
  DEFAULT_RESPONSE_ID_SUFFIX: 'assistant',
} as const

export function isLeeChatRequest(value: unknown): value is LeeChatRequest {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.appId === 'string' &&
    isConversation(value.conversation) &&
    isParticipant(value.participant) &&
    isVisitor(value.visitor) &&
    isRequestMessage(value.message) &&
    (value.metadata === undefined || isRecord(value.metadata)) &&
    Array.isArray(value.history) &&
    value.history.every(isHistoryItem)
  )
}

export function getLeeChatRequestText(request: LeeChatRequest): string {
  const partsText = collectTextFromMessageParts(request.message.parts)

  return partsText || request.message.content
}

export function getLeeChatRequestMetadata<TMetadata>(
  request: LeeChatRequest,
): TMetadata | undefined {
  return request.metadata as TMetadata | undefined
}

export function collectLeeChatTextHistory(
  request: LeeChatRequest,
): LeeChatTextHistoryItem[] {
  return request.history.map((item) => ({
    role: item.role,
    senderId: item.senderId,
    content: collectHistoryItemText(item),
    createdAt: item.createdAt,
  }))
}

export function collectLeeChatTurnHistory(
  request: LeeChatRequest,
): LeeChatTurnHistoryItem[] {
  const turns: LeeChatTurnHistoryItem[] = []

  for (const item of collectLeeChatTextHistory(request)) {
    if (item.role === 'user') {
      turns.push({
        user: item,
      })
      continue
    }

    if (item.role !== 'assistant' && item.role !== 'agent') {
      continue
    }

    const currentTurn = turns.at(-1)

    if (currentTurn && !currentTurn.assistant) {
      currentTurn.assistant = item
    }
  }

  return turns
}

export function createLeeChatTextResponse<TMetadata = Record<string, unknown>>({
  request,
  content,
  metadata,
  id,
  idSuffix = LEE_CHAT_REQUEST_ADAPTER.DEFAULT_RESPONSE_ID_SUFFIX,
  createdAt = new Date().toISOString(),
}: CreateLeeChatTextResponseParams<TMetadata>): LeeChatResponse<TMetadata> {
  return {
    message: {
      id: id ?? `${request.message.id}:${idSuffix}`,
      content,
      parts: createTextMessageParts(content),
      createdAt,
      metadata,
    },
  }
}

function collectHistoryItemText(item: LeeChatHistoryItem): string {
  const partsText = collectTextFromMessageParts(item.parts)

  return partsText || item.content
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isConversation(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    (value.kind === 'support' ||
      value.kind === 'direct' ||
      value.kind === 'assistant' ||
      value.kind === 'group') &&
    (value.metadata === undefined || isRecord(value.metadata))
  )
}

function isParticipant(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    (value.kind === undefined || typeof value.kind === 'string')
  )
}

function isVisitor(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.metadata === undefined || isRecord(value.metadata))
  )
}

function isRequestMessage(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.senderId === 'string' &&
    typeof value.content === 'string' &&
    Array.isArray(value.parts) &&
    value.parts.every(isMessagePart) &&
    typeof value.createdAt === 'string'
  )
}

function isHistoryItem(value: unknown): value is LeeChatHistoryItem {
  if (!isRecord(value)) {
    return false
  }

  return (
    isMessageRole(value.role) &&
    typeof value.senderId === 'string' &&
    typeof value.content === 'string' &&
    Array.isArray(value.parts) &&
    value.parts.every(isMessagePart) &&
    typeof value.createdAt === 'string'
  )
}

function isMessageRole(value: unknown): value is ChatMessageRole {
  return (
    value === 'user' ||
    value === 'assistant' ||
    value === 'agent' ||
    value === 'system'
  )
}

function isMessagePart(value: unknown): value is ChatMessagePart {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false
  }

  if (value.type === 'text') {
    return typeof value.text === 'string'
  }

  if (value.type === 'image') {
    return typeof value.url === 'string'
  }

  if (value.type === 'file') {
    return typeof value.url === 'string' && typeof value.name === 'string'
  }

  return false
}
