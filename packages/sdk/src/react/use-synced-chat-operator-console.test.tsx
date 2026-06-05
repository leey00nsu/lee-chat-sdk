import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChatConversation } from '../model/chat-conversation'
import { createTextMessageParts, type ChatMessage } from '../model/chat-message'
import type { ChatEventTransport } from '../transport/chat-event-transport'
import { useSyncedChatOperatorConsole } from './use-synced-chat-operator-console'

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
]

const MESSAGES: ChatMessage[] = [
  createMessage({
    id: 'message-pricing',
    conversationId: 'conversation-pricing',
    senderId: 'participant-yujin',
    role: 'user',
    content: '요금제를 알고 싶어요',
    createdAt: '2026-06-01T00:01:00.000Z',
  }),
]

describe('useSyncedChatOperatorConsole', () => {
  it('syncClient에서 대화와 선택 메시지를 로드하고 eventTransport 이벤트를 적용한다', async () => {
    const listConversations = vi.fn(async () => ({
      conversations: CONVERSATIONS,
    }))
    const listMessages = vi.fn(async () => ({
      messages: MESSAGES,
    }))
    let listener: Parameters<ChatEventTransport['subscribe']>[0] | undefined
    const eventTransport: ChatEventTransport = {
      subscribe: (nextListener) => {
        listener = nextListener

        return () => {}
      },
    }
    const { result } = renderHook(() =>
      useSyncedChatOperatorConsole({
        syncClient: {
          listConversations,
          listMessages,
        },
        eventTransport,
        listConversationsParams: {
          appId: 'support-app',
        },
        currentParticipantId: 'operator-mina',
        createEventId: () => 'event-assigned',
        getCurrentDate: () => new Date('2026-06-01T00:02:00.000Z'),
      }),
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.state.conversations).toHaveLength(1)
      expect(result.current.state.messages).toHaveLength(1)
    })
    expect(listConversations).toHaveBeenCalledWith({
      appId: 'support-app',
    })
    expect(listMessages).toHaveBeenCalledWith({
      conversationId: 'conversation-pricing',
    })

    act(() => {
      listener?.({
        type: 'participant.presence_changed',
        presence: {
          participantId: 'participant-yujin',
          status: 'online',
          updatedAt: '2026-06-01T00:03:00.000Z',
        },
      })
      result.current.assignConversation('conversation-pricing', 'Mina')
    })

    expect(result.current.state.events).toEqual([
      expect.objectContaining({
        id: 'participant.presence_changed:participant-yujin',
        conversationId: 'conversation-pricing',
        type: 'customer_event.recorded',
      }),
      expect.objectContaining({
        id: 'event-assigned',
        conversationId: 'conversation-pricing',
        type: 'conversation.assigned',
      }),
    ])
  })
})
