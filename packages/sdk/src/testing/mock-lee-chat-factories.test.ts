import { describe, expect, it } from 'vitest'
import {
  createMockChatMessage,
  createMockLeeChatProviderConfig,
  createMockLeeChatRequest,
  createMockLeeChatResponse,
} from './mock-lee-chat-factories'

describe('lee chat testing factories', () => {
  it('결정적인 기본 LeeChatRequest와 nested override를 생성한다', () => {
    const request = createMockLeeChatRequest({
      metadata: {
        locale: 'ko',
      },
      conversation: {
        id: 'conversation-custom',
        metadata: {
          currentPostSlug: 'testing-sdk',
        },
      },
      message: {
        content: 'Custom question',
      },
    })

    expect(request).toEqual(
      expect.objectContaining({
        appId: 'test-app',
        conversation: {
          id: 'conversation-custom',
          kind: 'support',
          metadata: {
            currentPostSlug: 'testing-sdk',
          },
        },
        metadata: {
          locale: 'ko',
        },
        message: expect.objectContaining({
          id: 'message-user-1',
          content: 'Custom question',
          parts: [{ type: 'text', text: 'Custom question' }],
        }),
      }),
    )
  })

  it('typed metadata를 포함한 LeeChatResponse를 생성한다', () => {
    const response = createMockLeeChatResponse({
      message: {
        content: 'Custom answer',
        metadata: {
          grounded: true,
        },
      },
    })

    expect(response.message).toEqual({
      id: 'message-assistant-1',
      content: 'Custom answer',
      parts: [{ type: 'text', text: 'Custom answer' }],
      createdAt: '2026-01-01T00:00:01.000Z',
      metadata: {
        grounded: true,
      },
    })
  })

  it('typed ChatMessage와 provider config를 생성한다', () => {
    const message = createMockChatMessage<{ source: string }>({
      metadata: {
        source: 'blog',
      },
    })
    const config = createMockLeeChatProviderConfig({
      features: {
        attachments: false,
      },
      texts: {
        title: 'Test chat',
      },
    })

    expect(message.metadata?.source).toBe('blog')
    expect(config).toEqual(
      expect.objectContaining({
        appId: 'test-app',
        endpoint: '/api/chat',
        visitor: {
          id: 'visitor-test',
        },
        features: {
          attachments: false,
        },
        texts: {
          title: 'Test chat',
        },
      }),
    )
  })
})
