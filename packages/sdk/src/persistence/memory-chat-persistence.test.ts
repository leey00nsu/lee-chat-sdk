import { describe, expect, it } from 'vitest'
import { MemoryChatPersistence } from './memory-chat-persistence'
import { createTextMessageParts, type ChatMessage } from '../model/chat-message'

const MESSAGE: ChatMessage = {
  id: 'message',
  conversationId: 'conversation',
  senderId: 'participant-user',
  role: 'user',
  content: '안녕하세요',
  parts: createTextMessageParts('안녕하세요'),
  status: 'sent',
  createdAt: '2026-06-01T00:00:00.000Z',
}

describe('MemoryChatPersistence', () => {
  it('대화 메시지를 쓰고 읽고 지운다', () => {
    const persistence = new MemoryChatPersistence<ChatMessage>()

    persistence.write([MESSAGE])

    expect(persistence.read()).toEqual([MESSAGE])

    persistence.clear()

    expect(persistence.read()).toEqual([])
  })
})
