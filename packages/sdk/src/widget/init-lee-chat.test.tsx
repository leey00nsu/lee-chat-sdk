import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  closeLeeChat,
  destroyLeeChat,
  initLeeChat,
  openLeeChat,
} from './init-lee-chat'

const fetchMock = vi.fn()

afterEach(() => {
  destroyLeeChat()
  vi.clearAllMocks()
})

describe('initLeeChat', () => {
  it('document.body에 widget container를 mount하고 destroy로 제거한다', () => {
    const instance = initLeeChat({
      appId: 'app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
    })

    expect(document.querySelector('[data-lee-chat-container="true"]')).toBeTruthy()

    instance.destroy()

    expect(document.querySelector('[data-lee-chat-container="true"]')).toBeNull()
  })

  it('instance와 singleton helper로 widget을 열고 닫는다', () => {
    const instance = initLeeChat({
      appId: 'app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
    })

    instance.open()

    expect(document.querySelector('[aria-label="Chat"]')).toBeTruthy()

    instance.close()

    expect(document.querySelector('[aria-label="Chat"]')).toBeNull()

    openLeeChat()

    expect(document.querySelector('[aria-label="Chat"]')).toBeTruthy()

    closeLeeChat()

    expect(document.querySelector('[aria-label="Chat"]')).toBeNull()
  })
})
