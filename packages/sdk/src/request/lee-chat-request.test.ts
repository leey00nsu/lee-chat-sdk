import { describe, expect, it } from 'vitest'
import { buildLeeChatRequest, parseLeeChatResponse } from './lee-chat-request'
import { createTextMessageParts, type ChatMessage } from '../model/chat-message'

const MESSAGE: ChatMessage = {
  id: 'message',
  conversationId: 'conversation',
  senderId: 'participant-user',
  role: 'user',
  content: 'Hello',
  parts: createTextMessageParts('Hello'),
  status: 'sent',
  createdAt: '2026-06-01T00:00:00.000Z',
}

describe('lee chat request contract', () => {
  it('config, message, history를 backend request shape으로 변환한다', () => {
    const request = buildLeeChatRequest({
      appId: 'app',
      conversation: {
        id: 'conversation',
        kind: 'support',
      },
      participant: {
        id: 'participant-user',
        kind: 'user',
        displayName: 'Yoonsu',
      },
      visitor: {
        id: 'visitor-user',
        metadata: {
          source: 'pricing-page',
        },
      },
      metadata: {
        plan: 'pro',
      },
      message: MESSAGE,
      history: [MESSAGE],
    })

    expect(request).toEqual({
      appId: 'app',
      conversation: {
        id: 'conversation',
        kind: 'support',
      },
      participant: {
        id: 'participant-user',
        kind: 'user',
        displayName: 'Yoonsu',
      },
      visitor: {
        id: 'visitor-user',
        metadata: {
          source: 'pricing-page',
        },
      },
      message: {
        id: 'message',
        senderId: 'participant-user',
        content: 'Hello',
        parts: [
          {
            type: 'text',
            text: 'Hello',
          },
        ],
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      metadata: {
        plan: 'pro',
      },
      history: [
        {
          role: 'user',
          senderId: 'participant-user',
          content: 'Hello',
          parts: [
            {
              type: 'text',
              text: 'Hello',
            },
          ],
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    })
  })

  it('response message에 누락된 id와 createdAt을 채운다', () => {
    const response = parseLeeChatResponse({
      message: {
        content: 'Received',
        parts: createTextMessageParts('Received'),
      },
    })

    expect(response.message.content).toBe('Received')
    expect(response.message.parts).toEqual([
      {
        type: 'text',
        text: 'Received',
      },
    ])
    expect(response.message.id).toEqual(expect.any(String))
    expect(response.message.id.length).toBeGreaterThan(0)
    expect(response.message.createdAt).toEqual(expect.any(String))
  })
})
