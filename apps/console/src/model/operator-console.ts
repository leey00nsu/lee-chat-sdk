import {
  buildChatEvent,
  collectChatEventsByConversationId,
  createTextMessageParts,
  type ChatEvent,
  type ChatMessage,
  type ChatMessageRole,
} from 'lee-chat-sdk'

export type OperatorConversationStatus = 'unassigned' | 'assigned' | 'closed'

export interface OperatorMessageMetadata {
  agentName?: string
  internalNote?: boolean
  customerEventIds?: string[]
}

export interface OperatorConversation {
  id: string
  customerName: string
  status: OperatorConversationStatus
  unreadCount: number
  assignedAgentName?: string
  lastMessagePreview: string
  messages: Array<ChatMessage<OperatorMessageMetadata>>
  customerEvents: string[]
}

export interface OperatorConsoleState {
  conversations: OperatorConversation[]
  selectedConversationId: string
}

export type OperatorEventPayload =
  | { messageId: string; role: string }
  | { agentName: string }
  | { content: string }
  | { customerEventId: string }

function createOperatorMessage(params: {
  id: string
  conversationId: string
  senderId: string
  role: ChatMessageRole
  content: string
  createdAt: string
  metadata?: OperatorMessageMetadata
}): ChatMessage<OperatorMessageMetadata> {
  return {
    id: params.id,
    conversationId: params.conversationId,
    senderId: params.senderId,
    role: params.role,
    content: params.content,
    parts: createTextMessageParts(params.content),
    status: 'sent',
    createdAt: params.createdAt,
    metadata: params.metadata,
  }
}

export const OPERATOR_CONSOLE_SEED: OperatorConsoleState = {
  selectedConversationId: 'conversation-pricing',
  conversations: [
    {
      id: 'conversation-pricing',
      customerName: 'Yujin Kim',
      status: 'assigned',
      unreadCount: 2,
      assignedAgentName: 'Mina',
      lastMessagePreview: '요금제를 알고 싶어요',
      customerEvents: ['pricing-page-opened', 'checkout-started'],
      messages: [
        createOperatorMessage({
          id: 'message-user-pricing',
          conversationId: 'conversation-pricing',
          senderId: 'participant-yujin',
          role: 'user',
          content: '요금제를 알고 싶어요',
          createdAt: '2026-06-01T00:00:00.000Z',
        }),
        createOperatorMessage({
          id: 'message-agent-pricing',
          conversationId: 'conversation-pricing',
          senderId: 'participant-mina',
          role: 'agent',
          content: 'Mina가 확인 중입니다.',
          createdAt: '2026-06-01T00:01:00.000Z',
          metadata: {
            agentName: 'Mina',
            customerEventIds: ['pricing-page-opened'],
          },
        }),
        createOperatorMessage({
          id: 'note-pricing',
          conversationId: 'conversation-pricing',
          senderId: 'participant-system',
          role: 'system',
          content: '결제 직전 이탈 가능성이 높음',
          createdAt: '2026-06-01T00:02:00.000Z',
          metadata: {
            internalNote: true,
          },
        }),
      ],
    },
    {
      id: 'conversation-delivery',
      customerName: 'Alex Lee',
      status: 'unassigned',
      unreadCount: 1,
      lastMessagePreview: '배송 상태를 확인하고 싶어요',
      customerEvents: ['order-detail-opened'],
      messages: [
        createOperatorMessage({
          id: 'message-user-delivery',
          conversationId: 'conversation-delivery',
          senderId: 'participant-alex',
          role: 'user',
          content: '배송 상태를 확인하고 싶어요',
          createdAt: '2026-06-01T00:03:00.000Z',
        }),
      ],
    },
  ],
}

export function selectOperatorConversation(
  state: OperatorConsoleState,
): OperatorConversation {
  const selectedConversation = state.conversations.find((conversation) => {
    return conversation.id === state.selectedConversationId
  })

  if (!selectedConversation) {
    throw new Error('Selected conversation not found')
  }

  return selectedConversation
}

export function assignOperatorConversation(params: {
  state: OperatorConsoleState
  conversationId: string
  agentName: string
}): OperatorConsoleState {
  return {
    ...params.state,
    conversations: params.state.conversations.map((conversation) => {
      if (conversation.id !== params.conversationId) {
        return conversation
      }

      return {
        ...conversation,
        status: 'assigned',
        assignedAgentName: params.agentName,
      }
    }),
  }
}

export function collectOperatorConversationEvents(
  conversation: OperatorConversation,
): Array<ChatEvent<OperatorEventPayload>> {
  const messageEvents = conversation.messages.map((message) => {
    if (message.metadata?.internalNote) {
      return buildChatEvent<OperatorEventPayload>({
        id: `${message.id}:internal-note-created`,
        conversationId: conversation.id,
        type: 'internal_note.created',
        createdAt: message.createdAt,
        payload: { content: message.content },
      })
    }

    return buildChatEvent<OperatorEventPayload>({
      id: `${message.id}:message-created`,
      conversationId: conversation.id,
      type: 'message.created',
      createdAt: message.createdAt,
      payload: { messageId: message.id, role: message.role },
    })
  })
  const customerEvents = conversation.customerEvents.map(
    (customerEventId, customerEventIndex) => {
      return buildChatEvent<OperatorEventPayload>({
        id: `${conversation.id}:customer-event-${customerEventIndex}`,
        conversationId: conversation.id,
        type: 'customer_event.recorded',
        createdAt: '2026-06-01T00:00:00.000Z',
        payload: { customerEventId },
      })
    },
  )
  const assignmentEvents = conversation.assignedAgentName
    ? [
        buildChatEvent<OperatorEventPayload>({
          id: `${conversation.id}:conversation-assigned`,
          conversationId: conversation.id,
          type: 'conversation.assigned',
          createdAt: '2026-06-01T00:00:00.000Z',
          payload: { agentName: conversation.assignedAgentName },
        }),
      ]
    : []

  return collectChatEventsByConversationId({
    events: [...customerEvents, ...assignmentEvents, ...messageEvents],
    conversationId: conversation.id,
  })
}
