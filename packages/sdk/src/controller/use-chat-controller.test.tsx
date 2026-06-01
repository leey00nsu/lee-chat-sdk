import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useChatController } from './use-chat-controller'
import type { ChatMessage } from '../model/chat-message'
import { MemoryChatPersistence } from '../persistence/memory-chat-persistence'
import type { ChatTransport } from '../transport/chat-transport'

interface TestRequest {
  content: string
  conversationId: string
}

interface TestResponse {
  content: string
  metadata: { source: string }
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

describe('useChatController', () => {
  it('사용자 메시지를 pending으로 추가한 뒤 응답 메시지를 sent 상태로 추가한다', async () => {
    const persistence =
      new MemoryChatPersistence<ChatMessage<{ source: string }>>()
    let messageIdSequence = 0

    const { result } = renderHook(() =>
      useChatController<TestRequest, TestResponse, { source: string }>({
        conversationId: 'conversation',
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
      }),
    )

    await act(async () => {
      result.current.setInputValue('안녕하세요')
      await result.current.submitMessage()
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'message-1',
        role: 'user',
        content: '안녕하세요',
        status: 'sent',
      }),
      expect.objectContaining({
        id: 'message-2',
        role: 'assistant',
        content: '응답: 안녕하세요',
        status: 'sent',
        metadata: { source: 'conversation' },
      }),
    ])
    expect(persistence.read()).toHaveLength(2)
    expect(result.current.inputValue).toBe('')
  })

  it('transport 실패 시 사용자 메시지를 failed 상태로 바꾼다', async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() =>
      useChatController<TestRequest, TestResponse>({
        conversationId: 'conversation',
        transport: { sendMessage },
        buildRequest: ({ content, conversationId }) => ({
          content,
          conversationId,
        }),
        buildAssistantMessage: ({ response }) => ({ content: response.content }),
        createMessageId: () => 'message',
        getCurrentDate: () => new Date('2026-06-01T00:00:00.000Z'),
      }),
    )

    await act(async () => {
      await result.current.submitMessage('실패 질문')
    })

    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'message',
        role: 'user',
        content: '실패 질문',
        status: 'failed',
      }),
    ])
  })
})
