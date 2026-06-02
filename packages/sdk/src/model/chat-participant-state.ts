export type ChatParticipantPresenceStatus = 'online' | 'away' | 'offline'

export interface ChatParticipantPresence {
  participantId: string
  status: ChatParticipantPresenceStatus
  updatedAt: string
}

export interface ChatTypingIndicator {
  conversationId: string
  participantId: string
  isTyping: boolean
  updatedAt: string
}

export interface ChatReadReceipt {
  conversationId: string
  messageId: string
  participantId: string
  readAt: string
}

export function collectOnlineParticipantIds(
  presences: ChatParticipantPresence[],
): string[] {
  return presences
    .filter((presence) => {
      return presence.status === 'online'
    })
    .map((presence) => {
      return presence.participantId
    })
}

export function collectActiveTypingParticipantIds(
  indicators: ChatTypingIndicator[],
): string[] {
  return indicators
    .filter((indicator) => {
      return indicator.isTyping
    })
    .map((indicator) => {
      return indicator.participantId
    })
}

export function createChatReadReceipt(
  readReceipt: ChatReadReceipt,
): ChatReadReceipt {
  return readReceipt
}
