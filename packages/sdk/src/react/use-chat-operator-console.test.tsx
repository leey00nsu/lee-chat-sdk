import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChatConversation } from '../model/chat-conversation'
import { createTextMessageParts, type ChatMessage } from '../model/chat-message'
import { useChatOperatorConsole } from './use-chat-operator-console'

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

describe('useChatOperatorConsole', () => {
  it('초기 입력에서 선택 대화와 summary 목록을 제공한다', () => {
    const { result } = renderHook(() =>
      useChatOperatorConsole({
        conversations: CONVERSATIONS,
        messages: MESSAGES,
        initialSelectedConversationId: 'conversation-pricing',
        currentParticipantId: 'operator-mina',
      }),
    )

    expect(result.current.selectedConversation?.id).toBe('conversation-pricing')
    expect(result.current.selectedConversationSummary?.title).toBe('Yujin Kim')
    expect(
      result.current.state.conversationSummaries.map((summary) => summary.id),
    ).toEqual(['conversation-delivery', 'conversation-pricing'])
  })

  it('대화 선택, 배정, 종료 액션으로 event 기반 콘솔 상태를 갱신한다', () => {
    const createEventId = vi
      .fn()
      .mockReturnValueOnce('event-assigned')
      .mockReturnValueOnce('event-closed')
    const getCurrentDate = vi
      .fn()
      .mockReturnValueOnce(new Date('2026-06-01T00:04:00.000Z'))
      .mockReturnValueOnce(new Date('2026-06-01T00:05:00.000Z'))
    const { result } = renderHook(() =>
      useChatOperatorConsole({
        conversations: CONVERSATIONS,
        messages: MESSAGES,
        initialSelectedConversationId: 'conversation-pricing',
        currentParticipantId: 'operator-mina',
        createEventId,
        getCurrentDate,
      }),
    )

    act(() => {
      result.current.selectConversation('conversation-delivery')
    })
    act(() => {
      result.current.assignConversation('conversation-delivery', 'Mina')
      result.current.closeConversation('conversation-delivery')
    })

    expect(result.current.state.selectedConversationId).toBe(
      'conversation-delivery',
    )
    expect(result.current.selectedConversationSummary).toEqual(
      expect.objectContaining({
        id: 'conversation-delivery',
        status: 'closed',
        assignedAgentName: 'Mina',
      }),
    )
    expect(result.current.state.events.map((event) => event.id)).toEqual([
      'event-assigned',
      'event-closed',
    ])
    expect(createEventId).toHaveBeenCalledWith('conversation.assigned')
    expect(createEventId).toHaveBeenCalledWith('conversation.closed')
  })
})
