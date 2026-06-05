export type ChatParticipantKind = 'user' | 'operator' | 'bot' | 'system'

export interface ChatParticipant<TMetadata = Record<string, unknown>> {
  id: string
  kind: ChatParticipantKind
  displayName?: string
  email?: string
  metadata?: TMetadata
}
