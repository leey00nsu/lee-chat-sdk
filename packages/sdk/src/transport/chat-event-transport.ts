import type { ConversationClientEvent } from '../client/conversation-client'

export type ChatEventUnsubscribe = () => void
export type ChatEventListener = (event: ConversationClientEvent) => void

export interface ChatEventTransport {
  subscribe(listener: ChatEventListener): ChatEventUnsubscribe
}
