import { describe, expect, it } from 'vitest'
import { createTextMessageParts, type ChatMessage } from './chat-message'
import type { ChatConversation } from './chat-conversation'
import { buildChatEvent, type ChatEvent } from './chat-event'
import { buildChatConversationSummaries } from './chat-conversation-summary'

function createMessage(params: {
  id: string
  conversationId: string
  senderId: string
  role: ChatMessage['role']
  content: string
  createdAt: string
  status?: ChatMessage['status']
}): ChatMessage {
  return {
    id: params.id,
    conversationId: params.conversationId,
    senderId: params.senderId,
    role: params.role,
    content: params.content,
    parts: createTextMessageParts(params.content),
    status: params.status ?? 'sent',
    createdAt: params.createdAt,
  }
}

const CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conversation-pricing',
    kind: 'support',
    status: 'open',
    participants: [
      {
        id: 'participant-yujin',
        kind: 'user',
        displayName: 'Yujin Kim',
      },
      {
        id: 'participant-mina',
        kind: 'operator',
        displayName: 'Mina',
      },
    ],
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'conversation-delivery',
    kind: 'support',
    status: 'open',
    participants: [
      {
        id: 'participant-alex',
        kind: 'user',
        displayName: 'Alex Lee',
      },
    ],
    createdAt: '2026-06-01T00:01:00.000Z',
  },
]

const MESSAGES: ChatMessage[] = [
  createMessage({
    id: 'message-pricing-user',
    conversationId: 'conversation-pricing',
    senderId: 'participant-yujin',
    role: 'user',
    content: '요금제를 알고 싶어요',
    createdAt: '2026-06-01T00:02:00.000Z',
  }),
  createMessage({
    id: 'message-pricing-agent',
    conversationId: 'conversation-pricing',
    senderId: 'participant-mina',
    role: 'agent',
    content: 'Mina가 확인 중입니다.',
    createdAt: '2026-06-01T00:03:00.000Z',
  }),
  createMessage({
    id: 'message-delivery-user',
    conversationId: 'conversation-delivery',
    senderId: 'participant-alex',
    role: 'user',
    content: '배송 상태를 확인하고 싶어요',
    createdAt: '2026-06-01T00:04:00.000Z',
  }),
]

const EVENTS: ChatEvent[] = [
  buildChatEvent({
    id: 'event-pricing-assigned',
    conversationId: 'conversation-pricing',
    type: 'conversation.assigned',
    createdAt: '2026-06-01T00:00:00.000Z',
    payload: {
      agentName: 'Mina',
    },
  }),
  buildChatEvent({
    id: 'event-pricing-customer-event',
    conversationId: 'conversation-pricing',
    type: 'customer_event.recorded',
    createdAt: '2026-06-01T00:01:00.000Z',
    payload: {
      customerEventId: 'pricing-page-opened',
    },
  }),
  buildChatEvent({
    id: 'event-delivery-closed',
    conversationId: 'conversation-delivery',
    type: 'conversation.closed',
    createdAt: '2026-06-01T00:05:00.000Z',
    payload: {},
  }),
]

describe('ChatConversationSummary', () => {
  it('conversation, message, event stream에서 운영 목록용 summary를 만든다', () => {
    const summaries = buildChatConversationSummaries({
      conversations: CONVERSATIONS,
      messages: MESSAGES,
      events: EVENTS,
      currentParticipantId: 'participant-mina',
    })

    expect(summaries).toEqual([
      expect.objectContaining({
        id: 'conversation-delivery',
        status: 'closed',
        title: 'Alex Lee',
        unreadCount: 1,
        lastMessagePreview: '배송 상태를 확인하고 싶어요',
        lastActivityAt: '2026-06-01T00:05:00.000Z',
      }),
      expect.objectContaining({
        id: 'conversation-pricing',
        status: 'assigned',
        title: 'Yujin Kim',
        assignedAgentName: 'Mina',
        unreadCount: 1,
        lastMessagePreview: 'Mina가 확인 중입니다.',
        customerEventIds: ['pricing-page-opened'],
      }),
    ])
  })
})
