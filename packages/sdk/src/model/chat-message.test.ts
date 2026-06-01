import { describe, expect, it } from 'vitest'
import type { ChatMessage } from './chat-message'

interface BlogChatMetadata {
  citations: Array<{ title: string; url: string }>
  grounded: boolean
}

describe('ChatMessage', () => {
  it('도메인별 metadata를 generic으로 보존한다', () => {
    const message: ChatMessage<BlogChatMetadata> = {
      id: 'assistant-message',
      conversationId: 'conversation',
      role: 'assistant',
      content: '근거가 있는 답변입니다.',
      status: 'sent',
      createdAt: '2026-06-01T00:00:00.000Z',
      metadata: {
        citations: [{ title: '블로그 글', url: '/ko/blog/post' }],
        grounded: true,
      },
    }

    expect(message.metadata?.citations[0]?.url).toBe('/ko/blog/post')
  })
})
