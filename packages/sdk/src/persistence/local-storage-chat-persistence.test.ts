import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageChatPersistence } from './local-storage-chat-persistence'
import type { ChatMessage } from '../model/chat-message'

const STORAGE_KEY = 'lee-chat-sdk:test-conversation'
const STORAGE_VERSION = 1
const MESSAGE: ChatMessage = {
  id: 'message',
  conversationId: 'conversation',
  role: 'user',
  content: '저장할 메시지',
  status: 'sent',
  createdAt: '2026-06-01T00:00:00.000Z',
}

describe('LocalStorageChatPersistence', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it('version과 함께 메시지를 저장하고 복원한다', () => {
    const persistence = new LocalStorageChatPersistence<ChatMessage>({
      storageKey: STORAGE_KEY,
      storageVersion: STORAGE_VERSION,
      validateMessages: (messages) => messages as ChatMessage[],
    })

    persistence.write([MESSAGE])

    expect(persistence.read()).toEqual([MESSAGE])
  })

  it('저장된 version이 다르면 빈 배열을 반환한다', () => {
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 0, messages: [MESSAGE] }),
    )
    const persistence = new LocalStorageChatPersistence<ChatMessage>({
      storageKey: STORAGE_KEY,
      storageVersion: STORAGE_VERSION,
      validateMessages: (messages) => messages as ChatMessage[],
    })

    expect(persistence.read()).toEqual([])
  })
})
