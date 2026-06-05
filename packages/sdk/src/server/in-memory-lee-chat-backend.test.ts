import { describe, expect, it } from 'vitest'
import { createInMemoryLeeChatBackend } from './in-memory-lee-chat-backend'
import type { LeeChatRequest } from '../request/lee-chat-request'

function createMessageRequest(
  overrides: Partial<LeeChatRequest> = {},
): LeeChatRequest {
  return {
    appId: 'support',
    conversation: {
      id: 'conversation-1',
      kind: 'support',
    },
    participant: {
      id: 'visitor-1',
      kind: 'user',
    },
    visitor: {
      id: 'visitor-1',
    },
    message: {
      id: 'message-1',
      senderId: 'visitor-1',
      content: 'Hello backend',
      parts: [
        {
          type: 'text',
          text: 'Hello backend',
        },
      ],
      createdAt: '2026-06-01T00:00:00.000Z',
    },
    history: [],
    ...overrides,
  }
}

describe('createInMemoryLeeChatBackend', () => {
  it('POST message request를 저장하고 assistant response를 반환한다', async () => {
    const backend = createInMemoryLeeChatBackend({
      getResponse: ({ request }) => ({
        message: {
          id: 'assistant-message-1',
          content: `Received: ${request.message.content}`,
          createdAt: '2026-06-01T00:01:00.000Z',
        },
      }),
    })

    const response = await backend.handleRequest(
      new Request('https://example.com/api/chat', {
        method: 'POST',
        body: JSON.stringify(createMessageRequest()),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      message: {
        id: 'assistant-message-1',
        content: 'Received: Hello backend',
        createdAt: '2026-06-01T00:01:00.000Z',
      },
    })
    expect(backend.getConversations()).toHaveLength(1)
    expect(backend.getMessages()).toEqual([
      expect.objectContaining({
        id: 'message-1',
        role: 'user',
        content: 'Hello backend',
      }),
      expect.objectContaining({
        id: 'assistant-message-1',
        role: 'assistant',
        content: 'Received: Hello backend',
      }),
    ])
  })

  it('conversation sync endpoints를 처리한다', async () => {
    const backend = createInMemoryLeeChatBackend()

    await backend.handleRequest(
      new Request('https://example.com/api/chat', {
        method: 'POST',
        body: JSON.stringify(createMessageRequest()),
      }),
    )

    const conversationsResponse = await backend.handleRequest(
      new Request(
        'https://example.com/api/chat/conversations?visitorId=visitor-1',
      ),
    )
    const messagesResponse = await backend.handleRequest(
      new Request(
        'https://example.com/api/chat/conversations/conversation-1/messages',
      ),
    )
    const readResponse = await backend.handleRequest(
      new Request(
        'https://example.com/api/chat/conversations/conversation-1/read',
        {
          method: 'PUT',
          body: JSON.stringify({
            messageId: 'support-assistant-message-1',
            participantId: 'visitor-1',
            readAt: '2026-06-01T00:02:00.000Z',
          }),
        },
      ),
    )

    await expect(conversationsResponse.json()).resolves.toEqual({
      conversations: [
        expect.objectContaining({
          id: 'conversation-1',
          participants: [
            expect.objectContaining({
              id: 'visitor-1',
            }),
          ],
        }),
      ],
    })
    await expect(messagesResponse.json()).resolves.toEqual({
      messages: [
        expect.objectContaining({
          id: 'message-1',
        }),
        expect.objectContaining({
          id: 'support-assistant-message-1',
        }),
      ],
    })
    await expect(readResponse.json()).resolves.toEqual({
      readReceipt: {
        conversationId: 'conversation-1',
        messageId: 'support-assistant-message-1',
        participantId: 'visitor-1',
        readAt: '2026-06-01T00:02:00.000Z',
      },
    })
  })

  it('지원하지 않는 route는 404를 반환한다', async () => {
    const backend = createInMemoryLeeChatBackend()

    const response = await backend.handleRequest(
      new Request('https://example.com/api/chat/unknown'),
    )

    expect(response.status).toBe(404)
  })
})
