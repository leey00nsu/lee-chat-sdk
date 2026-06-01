export type ChatMessageRole = 'user' | 'assistant' | 'agent' | 'system'

export type ChatMessageStatus = 'sending' | 'sent' | 'failed'

export interface ChatMessage<TMetadata = unknown> {
  id: string
  conversationId: string
  role: ChatMessageRole
  content: string
  status: ChatMessageStatus
  createdAt: string
  metadata?: TMetadata
}
