import { describe, expect, it, vi } from 'vitest'
import { createLeeChatRouteHandler } from './lee-chat-route-handler'
import type { LeeChatRequest } from '../request/lee-chat-request'
import type { ChatConversation } from '../model/chat-conversation'
import type { ChatMessage } from '../model/chat-message'
import type { ChatReadReceipt } from '../model/chat-participant-state'

interface TestStorageContext {
  tenantId: string
}

function createMessageRequest(
  overrides: Partial<LeeChatRequest> = {},
): LeeChatRequest {
  return {
    appId: 'support',
    conversation: {
      id: 'conversation/with slash',
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
      content: 'Hello adapter',
      parts: [
        {
          type: 'text',
          text: 'Hello adapter',
        },
      ],
      createdAt: '2026-06-01T00:00:00.000Z',
    },
    history: [],
    ...overrides,
  }
}

describe('createLeeChatRouteHandler', () => {
  it('POST message request를 storage adapter에 저장하고 response를 반환한다', async () => {
    const conversations: ChatConversation[] = []
    const messages: ChatMessage[] = []
    const handler = createLeeChatRouteHandler<TestStorageContext>({
      storage: {
        createContext: (request) => ({
          tenantId: new URL(request.url).searchParams.get('tenant') ?? 'default',
        }),
        upsertConversation: (conversation, context) => {
          conversations.push({
            ...conversation,
            metadata: {
              ...conversation.metadata,
              tenantId: context.tenantId,
            },
          })
        },
        appendMessages: (nextMessages) => {
          messages.push(...nextMessages)
        },
        listConversations: () => ({ conversations }),
        listMessages: () => ({ messages }),
        upsertReadReceipt: vi.fn(),
      },
      assistantSenderId: ({ appId }) => `${appId}-bot`,
      getResponse: async ({ request, storageContext }) => ({
        message: {
          id: 'assistant-message-1',
          content: `Received by ${storageContext.tenantId}: ${request.message.content}`,
          createdAt: '2026-06-01T00:01:00.000Z',
        },
      }),
    })

    const response = await handler.handleRequest(
      new Request('https://example.com/api/chat?tenant=acme', {
        method: 'POST',
        body: JSON.stringify(createMessageRequest()),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      message: {
        id: 'assistant-message-1',
        content: 'Received by acme: Hello adapter',
        createdAt: '2026-06-01T00:01:00.000Z',
      },
    })
    expect(conversations).toEqual([
      expect.objectContaining({
        id: 'conversation/with slash',
        metadata: {
          tenantId: 'acme',
        },
      }),
    ])
    expect(messages).toEqual([
      expect.objectContaining({
        id: 'message-1',
        senderId: 'visitor-1',
        role: 'user',
      }),
      expect.objectContaining({
        id: 'assistant-message-1',
        senderId: 'support-bot',
        role: 'assistant',
      }),
    ])
  })

  it('conversation sync/read route를 storage adapter로 위임한다', async () => {
    const readReceipts: ChatReadReceipt[] = []
    const listConversations = vi.fn(() => ({
      conversations: [],
      nextCursor: 'next-conversations',
    }))
    const listMessages = vi.fn(() => ({
      messages: [],
      nextCursor: 'next-messages',
    }))
    const handler = createLeeChatRouteHandler({
      storage: {
        upsertConversation: vi.fn(),
        appendMessages: vi.fn(),
        listConversations,
        listMessages,
        upsertReadReceipt: (readReceipt) => {
          readReceipts.push(readReceipt)
        },
      },
      getResponse: ({ request }) => ({
        message: {
          content: request.message.content,
        },
      }),
    })

    const conversationsResponse = await handler.handleRequest(
      new Request(
        'https://example.com/api/chat/conversations?appId=support&visitorId=visitor-1&participantId=operator-1&cursor=cursor-1&limit=20',
      ),
    )
    const messagesResponse = await handler.handleRequest(
      new Request(
        'https://example.com/api/chat/conversations/conversation%2Fwith%20slash/messages?cursor=cursor-2&limit=10',
      ),
    )
    const readResponse = await handler.handleRequest(
      new Request(
        'https://example.com/api/chat/conversations/conversation%2Fwith%20slash/read',
        {
          method: 'PUT',
          body: JSON.stringify({
            messageId: 'assistant-message-1',
            participantId: 'visitor-1',
            readAt: '2026-06-01T00:02:00.000Z',
          }),
        },
      ),
    )

    expect(await conversationsResponse.json()).toEqual({
      conversations: [],
      nextCursor: 'next-conversations',
    })
    expect(await messagesResponse.json()).toEqual({
      messages: [],
      nextCursor: 'next-messages',
    })
    expect(await readResponse.json()).toEqual({
      readReceipt: {
        conversationId: 'conversation/with slash',
        messageId: 'assistant-message-1',
        participantId: 'visitor-1',
        readAt: '2026-06-01T00:02:00.000Z',
      },
    })
    expect(listConversations).toHaveBeenCalledWith(
      {
        appId: 'support',
        visitorId: 'visitor-1',
        participantId: 'operator-1',
        cursor: 'cursor-1',
        limit: 20,
      },
      undefined,
    )
    expect(listMessages).toHaveBeenCalledWith(
      {
        conversationId: 'conversation/with slash',
        cursor: 'cursor-2',
        limit: 10,
      },
      undefined,
    )
    expect(readReceipts).toEqual([
      {
        conversationId: 'conversation/with slash',
        messageId: 'assistant-message-1',
        participantId: 'visitor-1',
        readAt: '2026-06-01T00:02:00.000Z',
      },
    ])
  })

  it('basePath와 unknown route를 처리한다', async () => {
    const handler = createLeeChatRouteHandler({
      basePath: '/custom/chat/',
      storage: {
        upsertConversation: vi.fn(),
        appendMessages: vi.fn(),
        listConversations: () => ({ conversations: [] }),
        listMessages: () => ({ messages: [] }),
        upsertReadReceipt: vi.fn(),
      },
      getResponse: ({ request }) => ({
        message: {
          content: request.message.content,
        },
      }),
    })

    const conversationsResponse = await handler.handleRequest(
      new Request('https://example.com/custom/chat/conversations'),
    )
    const unknownResponse = await handler.handleRequest(
      new Request('https://example.com/api/chat/conversations'),
    )

    expect(conversationsResponse.status).toBe(200)
    expect(unknownResponse.status).toBe(404)
  })
})
