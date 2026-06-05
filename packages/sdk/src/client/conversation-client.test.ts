import { describe, expect, it, vi } from 'vitest'
import { ConversationClient } from './conversation-client'
import type { ChatTransport } from '../transport/chat-transport'
import { MemoryChatPersistence } from '../persistence/memory-chat-persistence'
import type { ChatMessage } from '../model/chat-message'
import type {
  ChatParticipantPresence,
  ChatReadReceipt,
  ChatTypingIndicator,
} from '../model/chat-participant-state'

interface TestRequest {
  content: string
  conversationId: string
}

interface TestResponse {
  content: string
  metadata?: { source: string }
}

function createSuccessfulTransport(): ChatTransport<TestRequest, TestResponse> {
  return {
    sendMessage: async (request) => {
      return {
        content: `응답: ${request.content}`,
        metadata: { source: request.conversationId },
      }
    },
  }
}

describe('ConversationClient', () => {
  it('사용자 메시지를 보내고 assistant 응답을 같은 conversation에 추가한다', async () => {
    const persistence =
      new MemoryChatPersistence<ChatMessage<{ source: string }>>()
    let messageIdSequence = 0
    const client = new ConversationClient<
      TestRequest,
      TestResponse,
      { source: string }
    >({
      conversationId: 'conversation',
      senderId: 'participant-user',
      assistantSenderId: 'participant-assistant',
      transport: createSuccessfulTransport(),
      persistence,
      buildRequest: ({ content, conversationId }) => ({
        content,
        conversationId,
      }),
      buildAssistantMessage: ({ response }) => ({
        content: response.content,
        metadata: response.metadata,
      }),
      createMessageId: () => {
        messageIdSequence += 1
        return `message-${messageIdSequence}`
      },
      getCurrentDate: () => new Date('2026-06-01T00:00:00.000Z'),
    })

    const result = await client.submitMessage('안녕하세요')

    expect(result.messages).toEqual([
      expect.objectContaining({
        id: 'message-1',
        conversationId: 'conversation',
        senderId: 'participant-user',
        role: 'user',
        content: '안녕하세요',
        parts: [{ type: 'text', text: '안녕하세요' }],
        status: 'sent',
      }),
      expect.objectContaining({
        id: 'message-2',
        conversationId: 'conversation',
        senderId: 'participant-assistant',
        role: 'assistant',
        content: '응답: 안녕하세요',
        parts: [{ type: 'text', text: '응답: 안녕하세요' }],
        status: 'sent',
        metadata: { source: 'conversation' },
      }),
    ])
    expect(client.getMessages()).toHaveLength(2)
    expect(persistence.read()).toHaveLength(2)
  })

  it('전송 실패 시 사용자 메시지를 failed 상태로 저장한다', async () => {
    const client = new ConversationClient<TestRequest, TestResponse>({
      conversationId: 'conversation',
      senderId: 'participant-user',
      assistantSenderId: 'participant-assistant',
      transport: {
        sendMessage: vi.fn().mockRejectedValue(new Error('network error')),
      },
      buildRequest: ({ content, conversationId }) => ({
        content,
        conversationId,
      }),
      buildAssistantMessage: ({ response }) => ({
        content: response.content,
      }),
      createMessageId: () => 'message',
      getCurrentDate: () => new Date('2026-06-01T00:00:00.000Z'),
    })

    const result = await client.submitMessage('실패 질문')

    expect(result.messages).toEqual([
      expect.objectContaining({
        id: 'message',
        senderId: 'participant-user',
        content: '실패 질문',
        parts: [{ type: 'text', text: '실패 질문' }],
        status: 'failed',
      }),
    ])
  })

  it('failed 메시지를 retry하면 같은 메시지를 sent로 바꾸고 응답을 추가한다', async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        content: '재시도 응답',
        metadata: { source: 'retry' },
      })
    let messageIdSequence = 0
    const client = new ConversationClient<
      TestRequest,
      TestResponse,
      { source: string }
    >({
      conversationId: 'conversation',
      senderId: 'participant-user',
      assistantSenderId: 'participant-assistant',
      transport: { sendMessage },
      buildRequest: ({ content, conversationId }) => ({
        content,
        conversationId,
      }),
      buildAssistantMessage: ({ response }) => ({
        content: response.content,
        metadata: response.metadata,
      }),
      createMessageId: () => {
        messageIdSequence += 1
        return `message-${messageIdSequence}`
      },
      getCurrentDate: () => new Date('2026-06-01T00:00:00.000Z'),
    })

    await client.submitMessage('재시도 질문')
    const result = await client.retryMessage('message-1')

    expect(sendMessage).toHaveBeenCalledTimes(2)
    expect(result.messages).toEqual([
      expect.objectContaining({
        id: 'message-1',
        content: '재시도 질문',
        status: 'sent',
      }),
      expect.objectContaining({
        id: 'message-2',
        content: '재시도 응답',
        status: 'sent',
      }),
    ])
  })

  it('participant state event를 적용하고 변경 콜백에 알린다', () => {
    const stateChanges: Array<{
      presences: ChatParticipantPresence[]
      typingIndicators: ChatTypingIndicator[]
      readReceipts: ChatReadReceipt[]
    }> = []
    const client = new ConversationClient<TestRequest, TestResponse>({
      conversationId: 'conversation',
      senderId: 'participant-user',
      assistantSenderId: 'participant-assistant',
      transport: createSuccessfulTransport(),
      buildRequest: ({ content, conversationId }) => ({
        content,
        conversationId,
      }),
      buildAssistantMessage: ({ response }) => ({
        content: response.content,
      }),
      onParticipantStateChange: (state) => {
        stateChanges.push(state)
      },
    })

    client.applyEvent({
      type: 'participant.presence_changed',
      presence: {
        participantId: 'participant-assistant',
        status: 'online',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })
    client.applyEvent({
      type: 'participant.typing_changed',
      typingIndicator: {
        conversationId: 'conversation',
        participantId: 'participant-assistant',
        isTyping: true,
        updatedAt: '2026-06-01T00:01:00.000Z',
      },
    })
    client.applyEvent({
      type: 'message.read',
      readReceipt: {
        conversationId: 'conversation',
        messageId: 'message',
        participantId: 'participant-assistant',
        readAt: '2026-06-01T00:02:00.000Z',
      },
    })

    expect(client.getParticipantState()).toEqual({
      presences: [
        {
          participantId: 'participant-assistant',
          status: 'online',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      typingIndicators: [
        {
          conversationId: 'conversation',
          participantId: 'participant-assistant',
          isTyping: true,
          updatedAt: '2026-06-01T00:01:00.000Z',
        },
      ],
      readReceipts: [
        {
          conversationId: 'conversation',
          messageId: 'message',
          participantId: 'participant-assistant',
          readAt: '2026-06-01T00:02:00.000Z',
        },
      ],
    })
    expect(stateChanges).toHaveLength(3)
  })

  it('message.created event를 같은 conversation 메시지 목록에 반영한다', () => {
    const messageChanges: Array<ChatMessage[]> = []
    const client = new ConversationClient<TestRequest, TestResponse>({
      conversationId: 'conversation',
      senderId: 'participant-user',
      assistantSenderId: 'participant-assistant',
      transport: createSuccessfulTransport(),
      buildRequest: ({ content, conversationId }) => ({
        content,
        conversationId,
      }),
      buildAssistantMessage: ({ response }) => ({
        content: response.content,
      }),
      onMessagesChange: (messages) => {
        messageChanges.push(messages)
      },
    })

    client.applyEvent({
      type: 'message.created',
      message: {
        id: 'message-realtime',
        conversationId: 'conversation',
        senderId: 'participant-assistant',
        role: 'assistant',
        content: 'Realtime response',
        parts: [{ type: 'text', text: 'Realtime response' }],
        status: 'sent',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    })
    client.applyEvent({
      type: 'message.created',
      message: {
        id: 'message-other',
        conversationId: 'conversation-other',
        senderId: 'participant-assistant',
        role: 'assistant',
        content: 'Other response',
        parts: [{ type: 'text', text: 'Other response' }],
        status: 'sent',
        createdAt: '2026-06-01T00:01:00.000Z',
      },
    })

    expect(client.getMessages()).toEqual([
      expect.objectContaining({
        id: 'message-realtime',
        content: 'Realtime response',
      }),
    ])
    expect(messageChanges).toHaveLength(1)
  })
})
