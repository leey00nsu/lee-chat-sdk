import type { ChatConversation } from './chat-conversation'
import type { ChatEvent } from './chat-event'
import { getChatMessageText, type ChatMessage } from './chat-message'

export type ChatConversationSummaryStatus =
  | 'unassigned'
  | 'assigned'
  | 'closed'

export interface ChatConversationSummary {
  id: string
  kind: ChatConversation['kind']
  status: ChatConversationSummaryStatus
  title: string
  participantIds: string[]
  unreadCount: number
  lastMessagePreview: string
  lastActivityAt: string
  assignedAgentName?: string
  customerEventIds: string[]
}

export interface BuildChatConversationSummariesParams {
  conversations: ChatConversation[]
  messages: ChatMessage[]
  events?: ChatEvent[]
  currentParticipantId?: string
}

const CHAT_CONVERSATION_SUMMARY = {
  EMPTY_PREVIEW: '',
  UNTITLED_CONVERSATION: 'Conversation',
} as const

export function buildChatConversationSummaries({
  conversations,
  messages,
  events = [],
  currentParticipantId,
}: BuildChatConversationSummariesParams): ChatConversationSummary[] {
  return conversations
    .map((conversation) => {
      const conversationMessages = messages
        .filter((message) => message.conversationId === conversation.id)
        .sort(sortByCreatedAt)
      const conversationEvents = events
        .filter((event) => event.conversationId === conversation.id)
        .sort(sortByCreatedAt)
      const lastMessage = conversationMessages.at(-1)
      const lastEvent = conversationEvents.at(-1)

      return {
        id: conversation.id,
        kind: conversation.kind,
        status: resolveConversationSummaryStatus({
          conversation,
          events: conversationEvents,
        }),
        title: resolveConversationSummaryTitle({
          conversation,
          currentParticipantId,
        }),
        participantIds: conversation.participants.map((participant) => {
          return participant.id
        }),
        unreadCount: resolveUnreadCount({
          messages: conversationMessages,
          currentParticipantId,
        }),
        lastMessagePreview: lastMessage
          ? getChatMessageText(lastMessage)
          : CHAT_CONVERSATION_SUMMARY.EMPTY_PREVIEW,
        lastActivityAt: resolveLastActivityAt({
          conversation,
          lastMessage,
          lastEvent,
        }),
        assignedAgentName: resolveAssignedAgentName(conversationEvents),
        customerEventIds: collectCustomerEventIds(conversationEvents),
      }
    })
    .sort((firstSummary, secondSummary) => {
      return secondSummary.lastActivityAt.localeCompare(firstSummary.lastActivityAt)
    })
}

function sortByCreatedAt(
  firstItem: { createdAt: string },
  secondItem: { createdAt: string },
): number {
  return firstItem.createdAt.localeCompare(secondItem.createdAt)
}

function resolveConversationSummaryStatus({
  conversation,
  events,
}: {
  conversation: ChatConversation
  events: ChatEvent[]
}): ChatConversationSummaryStatus {
  if (
    conversation.status === 'closed' ||
    events.some((event) => event.type === 'conversation.closed')
  ) {
    return 'closed'
  }

  if (events.some((event) => event.type === 'conversation.assigned')) {
    return 'assigned'
  }

  return 'unassigned'
}

function resolveConversationSummaryTitle({
  conversation,
  currentParticipantId,
}: {
  conversation: ChatConversation
  currentParticipantId?: string
}): string {
  const visibleParticipants = conversation.participants.filter((participant) => {
    return participant.id !== currentParticipantId
  })
  const participantNames = visibleParticipants
    .map((participant) => participant.displayName)
    .filter((displayName): displayName is string => {
      return Boolean(displayName)
    })

  if (participantNames.length > 0) {
    return participantNames.join(', ')
  }

  return conversation.metadata?.title
    ? String(conversation.metadata.title)
    : CHAT_CONVERSATION_SUMMARY.UNTITLED_CONVERSATION
}

function resolveUnreadCount({
  messages,
  currentParticipantId,
}: {
  messages: ChatMessage[]
  currentParticipantId?: string
}): number {
  return messages.filter((message) => {
    return (
      message.status === 'sent' &&
      (!currentParticipantId || message.senderId !== currentParticipantId)
    )
  }).length
}

function resolveLastActivityAt({
  conversation,
  lastMessage,
  lastEvent,
}: {
  conversation: ChatConversation
  lastMessage?: ChatMessage
  lastEvent?: ChatEvent
}): string {
  return [conversation.createdAt, lastMessage?.createdAt, lastEvent?.createdAt]
    .filter((createdAt): createdAt is string => {
      return Boolean(createdAt)
    })
    .sort()
    .at(-1) as string
}

function resolveAssignedAgentName(events: ChatEvent[]): string | undefined {
  const assignedEvent = events
    .filter((event) => event.type === 'conversation.assigned')
    .at(-1)
  const payload = assignedEvent?.payload

  if (isRecord(payload) && typeof payload.agentName === 'string') {
    return payload.agentName
  }

  return undefined
}

function collectCustomerEventIds(events: ChatEvent[]): string[] {
  return events.flatMap((event) => {
    if (event.type !== 'customer_event.recorded' || !isRecord(event.payload)) {
      return []
    }

    return typeof event.payload.customerEventId === 'string'
      ? [event.payload.customerEventId]
      : []
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
