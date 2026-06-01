export type ChatEventType =
  | 'message.created'
  | 'message.failed'
  | 'conversation.assigned'
  | 'conversation.closed'
  | 'internal_note.created'
  | 'customer_event.recorded'

export interface ChatEvent<TPayload = Record<string, unknown>> {
  id: string
  conversationId: string
  type: ChatEventType
  createdAt: string
  payload: TPayload
}

export function buildChatEvent<TPayload>(
  event: ChatEvent<TPayload>,
): ChatEvent<TPayload> {
  return event
}

export function collectChatEventsByConversationId<TPayload>(params: {
  events: Array<ChatEvent<TPayload>>
  conversationId: string
}): Array<ChatEvent<TPayload>> {
  return params.events
    .filter((event) => event.conversationId === params.conversationId)
    .sort((firstEvent, secondEvent) => {
      return firstEvent.createdAt.localeCompare(secondEvent.createdAt)
    })
}
