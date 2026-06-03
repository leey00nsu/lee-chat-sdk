import { describe, expect, it } from 'vitest'
import type { ChatConversation } from './chat-conversation'
import type { ChatEvent } from './chat-event'
import { createTextMessageParts, type ChatMessage } from './chat-message'
import {
  assignChatOperatorConversation,
  buildChatOperatorConsoleState,
  closeChatOperatorConversation,
  selectChatOperatorConversationSummary,
  selectChatOperatorConsoleConversation,
} from './chat-operator-console'

function createMessage(params: {
  id: string
  conversationId: string
  senderId: string
  role: ChatMessage['role']
  content: string
  createdAt: string
}): ChatMessage {
  return {
    id: params.id,
    conversationId: params.conversationId,
    senderId: params.senderId,
    role: params.role,
    content: params.content,
    parts: createTextMessageParts(params.content),
    status: 'sent',
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
    id: 'message-pricing',
    conversationId: 'conversation-pricing',
    senderId: 'participant-yujin',
    role: 'user',
    content: '요금제를 알고 싶어요',
    createdAt: '2026-06-01T00:02:00.000Z',
  }),
  createMessage({
    id: 'message-delivery',
    conversationId: 'conversation-delivery',
    senderId: 'participant-alex',
    role: 'user',
    content: '배송 상태를 확인하고 싶어요',
    createdAt: '2026-06-01T00:03:00.000Z',
  }),
]

describe('ChatOperatorConsole', () => {
  it('conversation, message, event에서 운영 콘솔 상태와 선택 대화를 만든다', () => {
    const state = buildChatOperatorConsoleState({
      conversations: CONVERSATIONS,
      messages: MESSAGES,
      selectedConversationId: 'conversation-pricing',
      currentParticipantId: 'operator-mina',
    })

    expect(state.selectedConversationId).toBe('conversation-pricing')
    expect(selectChatOperatorConsoleConversation(state)?.id).toBe(
      'conversation-pricing',
    )
    expect(selectChatOperatorConversationSummary(state)?.title).toBe('Yujin Kim')
    expect(state.conversationSummaries.map((summary) => summary.id)).toEqual([
      'conversation-delivery',
      'conversation-pricing',
    ])
  })

  it('assign과 close는 event를 append하고 summary 상태를 갱신한다', () => {
    const state = buildChatOperatorConsoleState({
      conversations: CONVERSATIONS,
      messages: MESSAGES,
      selectedConversationId: 'conversation-delivery',
      currentParticipantId: 'operator-mina',
    })
    const assignedState = assignChatOperatorConversation({
      state,
      conversationId: 'conversation-delivery',
      agentName: 'Mina',
      eventId: 'event-assigned',
      createdAt: '2026-06-01T00:04:00.000Z',
    })
    const closedState = closeChatOperatorConversation({
      state: assignedState,
      conversationId: 'conversation-delivery',
      eventId: 'event-closed',
      createdAt: '2026-06-01T00:05:00.000Z',
    })

    expect(
      assignedState.conversationSummaries.find((summary) => {
        return summary.id === 'conversation-delivery'
      }),
    ).toEqual(
      expect.objectContaining({
        status: 'assigned',
        assignedAgentName: 'Mina',
      }),
    )
    expect(selectChatOperatorConversationSummary(closedState)).toEqual(
      expect.objectContaining({
        id: 'conversation-delivery',
        status: 'closed',
      }),
    )
    expect(closedState.events.map((event: ChatEvent) => event.id)).toEqual([
      'event-assigned',
      'event-closed',
    ])
  })
})
