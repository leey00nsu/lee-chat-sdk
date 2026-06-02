import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import {
  closeLeeChat,
  destroyLeeChat,
  initLeeChat,
  openLeeChat,
} from './init-lee-chat'

const fetchMock = vi.fn()
const scrollIntoViewMock = vi.fn()

afterEach(() => {
  destroyLeeChat()
  vi.clearAllMocks()
})

beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoViewMock
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

  it('사용자 메시지를 전송하면 최신 메시지로 스크롤한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: 'Latest vanilla response',
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

    scrollIntoViewMock.mockClear()
    fireEvent.change(input, {
      target: {
        value: 'Latest vanilla question',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('Latest vanilla response')
    })
    expect(scrollIntoViewMock).toHaveBeenCalled()
  })

  it('widget을 다시 열면 최신 메시지로 스크롤한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: 'Reopen vanilla response',
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
        value: 'Reopen vanilla question',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('Reopen vanilla response')
    })

    scrollIntoViewMock.mockClear()
    closeLeeChat()
    openLeeChat()

    expect(scrollIntoViewMock).toHaveBeenCalled()
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

  it('전송 중 상태와 assistant loading을 표시한다', async () => {
    let resolveResponse: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve
      }),
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
        value: 'Pending vanilla',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('Pending vanilla')
      expect(document.body.textContent).toContain('Sending...')
      expect(document.body.textContent).toContain('Assistant is typing...')
    })

    resolveResponse(
      new Response(
        JSON.stringify({
          message: {
            content: 'Pending vanilla response',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )
  })

  it('실패 메시지에 retry 버튼을 표시하고 다시 전송한다', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: {
              content: 'Retry vanilla response',
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
        value: 'Retry vanilla',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain(
        'Message failed. Please try again.',
      )
    })

    const retryButton = document.querySelector('button.lee-chat-retry')
    retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitFor(() => {
      expect(document.body.textContent).toContain('Retry vanilla response')
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
