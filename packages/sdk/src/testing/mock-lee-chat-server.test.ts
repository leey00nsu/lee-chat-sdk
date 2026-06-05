import { describe, expect, it, vi } from 'vitest'
import type { LeeChatRequest } from '../request/lee-chat-request'
import { createMockLeeChatServer } from './mock-lee-chat-server'

function createRequestBody(content: string): LeeChatRequest {
  return {
    appId: 'mock-app',
    conversation: {
      id: 'conversation-1',
      kind: 'support',
    },
    participant: {
      id: 'visitor-1',
      kind: 'user',
      displayName: 'Visitor',
    },
    visitor: {
      id: 'visitor-1',
    },
    message: {
      id: 'message-user-1',
      senderId: 'visitor-1',
      content,
      parts: [
        {
          type: 'text',
          text: content,
        },
      ],
      createdAt: '2026-06-01T00:00:00.000Z',
    },
    history: [],
  }
}

describe('createMockLeeChatServer', () => {
  it('HTTP fetch 요청을 처리하고 conversation sync 데이터를 저장한다', async () => {
    const server = createMockLeeChatServer({
      getResponse: ({ request }) => ({
        message: {
          id: 'message-assistant-1',
          content: `Mock response: ${request.message.content}`,
          createdAt: '2026-06-01T00:01:00.000Z',
        },
      }),
    })
    const response = await server.fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify(createRequestBody('Hello mock')),
    })

    expect(response.ok).toBe(true)
    expect(await response.json()).toEqual({
      message: {
        id: 'message-assistant-1',
        content: 'Mock response: Hello mock',
        createdAt: '2026-06-01T00:01:00.000Z',
      },
    })

    const conversations = await server.syncClient.listConversations({
      appId: 'mock-app',
      visitorId: 'visitor-1',
    })
    const messages = await server.syncClient.listMessages({
      conversationId: 'conversation-1',
    })

    expect(conversations.conversations).toEqual([
      expect.objectContaining({
        id: 'conversation-1',
        kind: 'support',
        participants: [
          expect.objectContaining({
            id: 'visitor-1',
          }),
        ],
      }),
    ])
    expect(messages.messages).toEqual([
      expect.objectContaining({
        id: 'message-user-1',
        role: 'user',
        content: 'Hello mock',
      }),
      expect.objectContaining({
        id: 'message-assistant-1',
        role: 'assistant',
        content: 'Mock response: Hello mock',
      }),
    ])
  })

  it('read receipt sync와 realtime event emit을 제공한다', async () => {
    const server = createMockLeeChatServer()
    const listener = vi.fn()
    const unsubscribe = server.eventTransport.subscribe(listener)
    const readReceipt = await server.syncClient.markMessageRead({
      conversationId: 'conversation-1',
      messageId: 'message-assistant-1',
      participantId: 'visitor-1',
      readAt: '2026-06-01T00:02:00.000Z',
    })

    server.emitEvent({
      type: 'message.read',
      readReceipt: readReceipt.readReceipt,
    })
    unsubscribe()
    server.emitEvent({
      type: 'participant.presence_changed',
      presence: {
        participantId: 'operator-1',
        status: 'online',
        updatedAt: '2026-06-01T00:03:00.000Z',
      },
    })

    expect(readReceipt).toEqual({
      readReceipt: {
        conversationId: 'conversation-1',
        messageId: 'message-assistant-1',
        participantId: 'visitor-1',
        readAt: '2026-06-01T00:02:00.000Z',
      },
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({
      type: 'message.read',
      readReceipt: readReceipt.readReceipt,
    })
  })
})
