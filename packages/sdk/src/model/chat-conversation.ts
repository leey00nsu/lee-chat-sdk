import type { ChatParticipant } from './chat-participant'

export type ChatConversationKind = 'direct' | 'support' | 'assistant' | 'group'
export type ChatConversationStatus = 'open' | 'closed'

export interface ChatConversation<TMetadata = Record<string, unknown>> {
  id: string
  kind: ChatConversationKind
  status: ChatConversationStatus
  participants: ChatParticipant[]
  createdAt: string
  metadata?: TMetadata
}

const DIRECT_CHAT_PARTICIPANT_COUNT = 2

export function isDirectChatConversation(
  conversation: ChatConversation,
): boolean {
  return (
    conversation.kind === 'direct' &&
    conversation.participants.length === DIRECT_CHAT_PARTICIPANT_COUNT
  )
}

export function collectChatConversationParticipantIds(
  conversation: ChatConversation,
): string[] {
  return conversation.participants.map((participant) => {
    return participant.id
  })
}
