export type ChatMessageRole = 'user' | 'assistant' | 'agent' | 'system'

export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ChatTextMessagePart {
  type: 'text'
  text: string
}

export interface ChatImageMessagePart {
  type: 'image'
  url: string
  alt?: string
  width?: number
  height?: number
  mediaType?: string
}

export interface ChatFileMessagePart {
  type: 'file'
  url: string
  name: string
  size?: number
  mediaType?: string
}

export type ChatMessagePart =
  | ChatTextMessagePart
  | ChatImageMessagePart
  | ChatFileMessagePart

export interface ChatMessage<TMetadata = unknown> {
  id: string
  conversationId: string
  senderId: string
  role: ChatMessageRole
  content: string
  parts: ChatMessagePart[]
  status: ChatMessageStatus
  createdAt: string
  metadata?: TMetadata
}

export function createTextMessageParts(text: string): ChatMessagePart[] {
  return [
    {
      type: 'text',
      text,
    },
  ]
}

export function createImageMessagePart(
  params: Omit<ChatImageMessagePart, 'type'>,
): ChatImageMessagePart {
  return {
    type: 'image',
    ...params,
  }
}

export function createFileMessagePart(
  params: Omit<ChatFileMessagePart, 'type'>,
): ChatFileMessagePart {
  return {
    type: 'file',
    ...params,
  }
}

export function collectTextFromMessageParts(parts: ChatMessagePart[]): string {
  return parts
    .map((part) => {
      return part.type === 'text' ? part.text : ''
    })
    .join('')
}

export function getChatMessageText(message: ChatMessage): string {
  if (message.parts.length > 0) {
    return collectTextFromMessageParts(message.parts)
  }

  return message.content
}
