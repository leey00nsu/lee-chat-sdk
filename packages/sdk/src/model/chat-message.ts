export type ChatMessageRole = 'user' | 'assistant' | 'agent' | 'system'

export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ChatTextMessagePart {
  type: 'text'
  text: string
}

export type ChatMessagePart = ChatTextMessagePart

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

export function collectTextFromMessageParts(parts: ChatMessagePart[]): string {
  return parts
    .map((part) => {
      return part.text
    })
    .join('')
}

export function getChatMessageText(message: ChatMessage): string {
  if (message.parts.length > 0) {
    return collectTextFromMessageParts(message.parts)
  }

  return message.content
}
