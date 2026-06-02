import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
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

describe('vanilla initLeeChat', () => {
  it('React 없이 document.body에 widget container를 mount하고 destroy로 제거한다', () => {
    const instance = initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
    })

    expect(document.querySelector('[data-lee-chat-container="true"]')).toBeTruthy()

    instance.destroy()

    expect(document.querySelector('[data-lee-chat-container="true"]')).toBeNull()
  })

  it('singleton helper로 widget을 열고 닫는다', () => {
    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
    })

    openLeeChat()

    expect(document.querySelector('[aria-label="Chat"]')).toBeTruthy()

    closeLeeChat()

    expect(document.querySelector('[aria-label="Chat"]')).toBeNull()
  })

  it('사용자 메시지를 endpoint로 전송하고 응답을 렌더링한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: 'Vanilla response',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialOpen: true,
    })

    const input = document.querySelector('textarea')

    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error('textarea not found')
    }

    fireEvent.change(input, {
      target: {
        value: 'Hello from vanilla',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('Hello from vanilla')
      expect(document.body.textContent).toContain('Vanilla response')
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('Enter로 전송하고 Shift+Enter는 줄바꿈 입력으로 남긴다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: 'Enter response',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialOpen: true,
    })

    const input = document.querySelector('textarea')

    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error('textarea not found')
    }

    fireEvent.change(input, {
      target: {
        value: 'Hello enter',
      },
    })
    fireEvent.keyDown(input, {
      key: 'Enter',
      shiftKey: true,
    })
    fireEvent.keyDown(input, {
      key: 'Enter',
    })

    await waitFor(() => {
      expect(document.body.textContent).toContain('Hello enter')
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
