import { describe, expect, it } from 'vitest'
import { buildLeeChatRequest, parseLeeChatResponse } from './lee-chat-request'
import type { ChatMessage } from '../model/chat-message'

const MESSAGE: ChatMessage = {
  id: 'message',
  conversationId: 'conversation',
  role: 'user',
  content: 'Hello',
  status: 'sent',
  createdAt: '2026-06-01T00:00:00.000Z',
}

describe('lee chat request contract', () => {
  it('config, message, history를 backend request shape으로 변환한다', () => {
    const request = buildLeeChatRequest({
      appId: 'app',
      user: {
        id: 'user',
        name: 'Yoonsu',
      },
      metadata: {
        plan: 'pro',
      },
      message: MESSAGE,
      history: [MESSAGE],
    })

    expect(request).toEqual({
      appId: 'app',
      conversationId: 'conversation',
      message: {
        id: 'message',
        content: 'Hello',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      user: {
        id: 'user',
        name: 'Yoonsu',
      },
      metadata: {
        plan: 'pro',
      },
      history: [
        {
          role: 'user',
          content: 'Hello',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    })
  })

  it('response message에 누락된 id와 createdAt을 채운다', () => {
    const response = parseLeeChatResponse({
      message: {
        content: 'Received',
      },
    })

    expect(response.message.content).toBe('Received')
    expect(response.message.id).toEqual(expect.any(String))
    expect(response.message.id.length).toBeGreaterThan(0)
    expect(response.message.createdAt).toEqual(expect.any(String))
  })
})
