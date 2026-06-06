import { describe, expect, it } from 'vitest'
import type { LeeChatRequest } from '../request/lee-chat-request'
import {
  collectLeeChatTextHistory,
  collectLeeChatTurnHistory,
  createLeeChatTextResponse,
  getLeeChatRequestMetadata,
  getLeeChatRequestText,
  isLeeChatRequest,
} from './lee-chat-request-adapter'

function createRequest(): LeeChatRequest {
  return {
    appId: 'blog',
    conversation: {
      id: 'conversation-1',
      kind: 'support',
      metadata: {
        currentPostSlug: 'hello-sdk',
      },
    },
    participant: {
      id: 'visitor-1',
      kind: 'user',
    },
    visitor: {
      id: 'visitor-1',
    },
    message: {
      id: 'message-3',
      senderId: 'visitor-1',
      content: 'Current question',
      parts: [{ type: 'text', text: 'Current question' }],
      createdAt: '2026-06-06T03:00:00.000Z',
    },
    metadata: {
      locale: 'ko',
      currentPostSlug: 'hello-sdk',
    },
    history: [
      {
        role: 'system',
        senderId: 'system',
        content: 'System context',
        parts: [{ type: 'text', text: 'System context' }],
        createdAt: '2026-06-06T00:00:00.000Z',
      },
      {
        role: 'user',
        senderId: 'visitor-1',
        content: 'First question',
        parts: [{ type: 'text', text: 'First question' }],
        createdAt: '2026-06-06T01:00:00.000Z',
      },
      {
        role: 'assistant',
        senderId: 'blog-assistant',
        content: 'First answer',
        parts: [{ type: 'text', text: 'First answer' }],
        createdAt: '2026-06-06T01:00:01.000Z',
      },
      {
        role: 'user',
        senderId: 'visitor-1',
        content: 'Unanswered question',
        parts: [{ type: 'text', text: 'Unanswered question' }],
        createdAt: '2026-06-06T02:00:00.000Z',
      },
    ],
  }
}

describe('lee chat request adapter', () => {
  it('LeeChatRequest의 필수 구조를 판별한다', () => {
    expect(isLeeChatRequest(createRequest())).toBe(true)
    expect(isLeeChatRequest(null)).toBe(false)
    expect(isLeeChatRequest({ appId: 'blog' })).toBe(false)
    expect(
      isLeeChatRequest({
        ...createRequest(),
        history: 'invalid',
      }),
    ).toBe(false)
  })

  it('현재 요청 텍스트와 typed metadata를 반환한다', () => {
    const request = createRequest()
    const metadata = getLeeChatRequestMetadata<{
      locale: 'ko' | 'en'
      currentPostSlug?: string
    }>(request)

    expect(getLeeChatRequestText(request)).toBe('Current question')
    expect(metadata?.locale).toBe('ko')
    expect(metadata?.currentPostSlug).toBe('hello-sdk')
  })

  it('history를 host backend가 쓰기 쉬운 text history로 변환한다', () => {
    expect(collectLeeChatTextHistory(createRequest())).toEqual([
      {
        role: 'system',
        senderId: 'system',
        content: 'System context',
        createdAt: '2026-06-06T00:00:00.000Z',
      },
      {
        role: 'user',
        senderId: 'visitor-1',
        content: 'First question',
        createdAt: '2026-06-06T01:00:00.000Z',
      },
      {
        role: 'assistant',
        senderId: 'blog-assistant',
        content: 'First answer',
        createdAt: '2026-06-06T01:00:01.000Z',
      },
      {
        role: 'user',
        senderId: 'visitor-1',
        content: 'Unanswered question',
        createdAt: '2026-06-06T02:00:00.000Z',
      },
    ])
  })

  it('user와 assistant history를 turn으로 묶고 미완료 turn도 보존한다', () => {
    expect(collectLeeChatTurnHistory(createRequest())).toEqual([
      {
        user: {
          role: 'user',
          senderId: 'visitor-1',
          content: 'First question',
          createdAt: '2026-06-06T01:00:00.000Z',
        },
        assistant: {
          role: 'assistant',
          senderId: 'blog-assistant',
          content: 'First answer',
          createdAt: '2026-06-06T01:00:01.000Z',
        },
      },
      {
        user: {
          role: 'user',
          senderId: 'visitor-1',
          content: 'Unanswered question',
          createdAt: '2026-06-06T02:00:00.000Z',
        },
      },
    ])
  })

  it('host 응답을 LeeChatResponse로 생성한다', () => {
    expect(
      createLeeChatTextResponse({
        request: createRequest(),
        content: 'Generated answer',
        metadata: {
          blogChatResponse: {
            grounded: true,
          },
        },
        idSuffix: 'answer',
        createdAt: '2026-06-06T04:00:00.000Z',
      }),
    ).toEqual({
      message: {
        id: 'message-3:answer',
        content: 'Generated answer',
        parts: [{ type: 'text', text: 'Generated answer' }],
        createdAt: '2026-06-06T04:00:00.000Z',
        metadata: {
          blogChatResponse: {
            grounded: true,
          },
        },
      },
    })
  })
})
