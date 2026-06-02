import { describe, expect, it } from 'vitest'
import {
  collectTextFromMessageParts,
  createTextMessageParts,
  getChatMessageText,
  type ChatMessage,
} from './chat-message'

interface BlogChatMetadata {
  citations: Array<{ title: string; url: string }>
  grounded: boolean
}

describe('ChatMessage', () => {
  it('도메인별 metadata를 generic으로 보존한다', () => {
    const message: ChatMessage<BlogChatMetadata> = {
      id: 'assistant-message',
      conversationId: 'conversation',
      senderId: 'participant-assistant',
      role: 'assistant',
      content: '근거가 있는 답변입니다.',
      parts: createTextMessageParts('근거가 있는 답변입니다.'),
      status: 'sent',
      createdAt: '2026-06-01T00:00:00.000Z',
      metadata: {
        citations: [{ title: '블로그 글', url: '/ko/blog/post' }],
        grounded: true,
      },
    }

    expect(message.metadata?.citations[0]?.url).toBe('/ko/blog/post')
  })

  it('텍스트 메시지 파트를 만들고 표시 텍스트로 수집한다', () => {
    const parts = createTextMessageParts('Hello')

    expect(parts).toEqual([
      {
        type: 'text',
        text: 'Hello',
      },
    ])
    expect(collectTextFromMessageParts(parts)).toBe('Hello')
  })

  it('message parts를 우선하여 표시 텍스트를 계산한다', () => {
    const message: ChatMessage = {
      id: 'message',
      conversationId: 'conversation',
      senderId: 'participant-user',
      role: 'user',
      content: 'Legacy content',
      parts: createTextMessageParts('Part content'),
      status: 'sent',
      createdAt: '2026-06-01T00:00:00.000Z',
    }

    expect(getChatMessageText(message)).toBe('Part content')
  })
})
