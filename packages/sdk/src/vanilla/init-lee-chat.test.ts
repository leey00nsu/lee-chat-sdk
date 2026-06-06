import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import {
  closeLeeChat,
  destroyLeeChat,
  initLeeChat,
  openLeeChat,
} from './init-lee-chat'
import type { ChatEventTransport } from '../transport/chat-event-transport'

const fetchMock = vi.fn()
const scrollIntoViewMock = vi.fn()

afterEach(() => {
  destroyLeeChat()
  localStorage.clear()
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

  it('theme CSS variables를 document root가 아니라 widget root에만 적용한다', () => {
    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      theme: {
        primaryColor: '#2563eb',
        radius: '16px',
      },
    })

    const widgetRoot = document.querySelector('[data-testid="lee-chat-root"]')

    expect(widgetRoot).toBeInstanceOf(HTMLElement)
    expect((widgetRoot as HTMLElement).style.getPropertyValue('--lee-chat-primary')).toBe(
      '#2563eb',
    )
    expect((widgetRoot as HTMLElement).style.getPropertyValue('--lee-chat-radius')).toBe(
      '16px',
    )
    expect(
      document.documentElement.style.getPropertyValue('--lee-chat-primary'),
    ).toBe('')
    expect(
      document.documentElement.style.getPropertyValue('--lee-chat-radius'),
    ).toBe('')
  })

  it('shadowDom isolation이면 widget root를 shadow root 안에 mount한다', () => {
    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      isolation: 'shadowDom',
      initialOpen: true,
    })

    const container = document.querySelector('[data-lee-chat-container="true"]')

    expect(container).toBeInstanceOf(HTMLElement)
    expect(container?.shadowRoot).toBeInstanceOf(ShadowRoot)
    expect(document.querySelector('[data-testid="lee-chat-root"]')).toBeNull()
    expect(
      container?.shadowRoot?.querySelector('[data-testid="lee-chat-root"]'),
    ).toBeTruthy()
    expect(container?.shadowRoot?.querySelector('style')?.textContent).toContain(
      '.lee-chat-root',
    )
  })

  it('initialMessage를 초기 assistant 메시지로 렌더링하고 자동 요청하지 않는다', () => {
    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialOpen: true,
      initialMessage: 'Welcome from vanilla.',
      visitor: {
        id: 'visitor-vanilla',
      },
    })

    expect(document.body.textContent).toContain('Welcome from vanilla.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('open 시 마지막 unread 메시지를 read sync하고 다시 닫아도 unread로 세지 않는다', async () => {
    const markMessageRead = vi.fn(async () => ({
      readReceipt: {
        conversationId: 'vanilla-app:conversation:visitor-vanilla',
        messageId: 'vanilla-app:conversation:visitor-vanilla:initial-message',
        participantId: 'visitor-vanilla',
        readAt: '2026-06-01T00:00:00.000Z',
      },
    }))
    let latestUnreadCount = -1

    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialMessage: 'Unread vanilla welcome',
      visitor: {
        id: 'visitor-vanilla',
      },
      syncClient: {
        markMessageRead,
      },
      renderTrigger: ({ open, unreadCount }) => {
        latestUnreadCount = unreadCount
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = `open ${unreadCount}`
        button.addEventListener('click', open)
        return button
      },
    })

    expect(latestUnreadCount).toBe(1)

    openLeeChat()

    await waitFor(() => {
      expect(markMessageRead).toHaveBeenCalledWith({
        conversationId: 'vanilla-app:conversation:visitor-vanilla',
        messageId: 'vanilla-app:conversation:visitor-vanilla:initial-message',
        participantId: 'visitor-vanilla',
      })
    })

    closeLeeChat()

    expect(latestUnreadCount).toBe(0)
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
      visitor: {
        id: 'visitor-vanilla',
      },
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
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual(
      expect.objectContaining({
        conversation: {
          id: 'vanilla-app:conversation:visitor-vanilla',
          kind: 'support',
        },
        participant: expect.objectContaining({
          id: 'visitor-vanilla',
          kind: 'user',
        }),
        visitor: {
          id: 'visitor-vanilla',
        },
        message: expect.objectContaining({
          senderId: 'visitor-vanilla',
          parts: [
            {
              type: 'text',
              text: 'Hello from vanilla',
            },
          ],
        }),
      }),
    )
  })

  it('requestHeaders를 endpoint 요청에 포함한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: 'Header response',
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
      requestHeaders: {
        Authorization: 'Bearer vanilla-token',
      },
    })

    const input = document.querySelector('textarea')

    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error('textarea not found')
    }

    fireEvent.change(input, {
      target: {
        value: 'Header vanilla question',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('Header response')
    })

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer vanilla-token',
    })
  })

  it('uploadAttachment 결과를 사용자 message part로 전송한다', async () => {
    const uploadAttachment = vi.fn(async () => ({
      kind: 'file' as const,
      url: 'https://example.com/vanilla-manual.pdf',
      name: 'vanilla-manual.pdf',
      mediaType: 'application/pdf',
    }))
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: 'Vanilla attachment received',
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
      uploadAttachment,
      visitor: {
        id: 'visitor-vanilla',
      },
    })

    const fileInput = document.querySelector('input[type="file"]')
    const textarea = document.querySelector('textarea')

    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('file input not found')
    }

    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error('textarea not found')
    }

    const file = new File(['manual'], 'vanilla-manual.pdf', {
      type: 'application/pdf',
    })

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    })

    await waitFor(() => {
      expect(uploadAttachment).toHaveBeenCalledWith(file)
      expect(document.body.textContent).toContain('vanilla-manual.pdf')
    })

    fireEvent.change(textarea, {
      target: {
        value: 'Vanilla attachment message',
      },
    })
    fireEvent.submit(textarea.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('Vanilla attachment received')
    })
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual(
      expect.objectContaining({
        message: expect.objectContaining({
          content: 'Vanilla attachment message',
          parts: [
            {
              type: 'text',
              text: 'Vanilla attachment message',
            },
            {
              type: 'file',
              url: 'https://example.com/vanilla-manual.pdf',
              name: 'vanilla-manual.pdf',
              mediaType: 'application/pdf',
            },
          ],
        }),
      }),
    )
  })

  it('features.attachments가 false이면 attachment input을 렌더링하지 않는다', () => {
    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      initialOpen: true,
      uploadAttachment: vi.fn(),
      features: {
        attachments: false,
      },
    })

    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  it('assistant 응답의 image와 file part를 기본 UI로 렌더링한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: '첨부를 확인해 주세요.',
            parts: [
              {
                type: 'text',
                text: '첨부를 확인해 주세요.',
              },
              {
                type: 'image',
                url: 'https://example.com/screenshot.png',
                alt: '상담 화면 캡처',
              },
              {
                type: 'file',
                url: 'https://example.com/report.pdf',
                name: 'report.pdf',
              },
            ],
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
      visitor: {
        id: 'visitor-vanilla',
      },
    })

    const input = document.querySelector('textarea')

    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error('textarea not found')
    }

    fireEvent.change(input, {
      target: {
        value: '첨부 보여줘',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      const image = document.querySelector('img[alt="상담 화면 캡처"]')
      const link = document.querySelector(
        'a[href="https://example.com/report.pdf"]',
      )

      expect(document.body.textContent).toContain('첨부를 확인해 주세요.')
      expect(image).toBeInstanceOf(HTMLImageElement)
      expect(link?.textContent).toBe('report.pdf')
    })
  })

  it('requestTimeoutMs가 지나면 Vanilla 요청을 실패 메시지로 처리한다', async () => {
    fetchMock.mockImplementation((_endpoint, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialOpen: true,
      requestTimeoutMs: 10,
    })

    const input = document.querySelector('textarea')

    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error('textarea not found')
    }

    fireEvent.change(input, {
      target: {
        value: 'timeout please',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('timeout please')
      expect(document.body.textContent).toContain(
        'Message failed. Please try again.',
      )
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('requestRetry 설정으로 Vanilla 요청을 재시도한다', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: { content: 'temporary' } }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: {
              content: 'Vanilla retried response',
            },
          }),
          {
            status: 200,
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
      requestRetry: {
        maxAttempts: 2,
      },
    })

    const input = document.querySelector('textarea')

    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error('textarea not found')
    }

    fireEvent.change(input, {
      target: {
        value: 'retry please',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('retry please')
      expect(document.body.textContent).toContain('Vanilla retried response')
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('renderHeader로 header를 교체하고 close 액션을 사용할 수 있다', () => {
    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialOpen: true,
      renderHeader: ({ close, title, subtitle }) => {
        const header = document.createElement('header')
        const titleElement = document.createElement('strong')
        const subtitleElement = document.createElement('span')
        const closeButton = document.createElement('button')

        titleElement.textContent = title
        subtitleElement.textContent = subtitle
        closeButton.type = 'button'
        closeButton.textContent = 'Custom close'
        closeButton.addEventListener('click', close)
        header.append(titleElement, subtitleElement, closeButton)

        return header
      },
    })

    expect(document.body.textContent).toContain('Chat')
    expect(document.body.textContent).toContain('Send us a message.')

    fireEvent.click(document.querySelector('button') as HTMLButtonElement)

    expect(document.querySelector('[aria-label="Chat"]')).toBeNull()
  })

  it('renderTrigger로 trigger를 교체하고 open 액션을 사용할 수 있다', () => {
    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      renderTrigger: ({ open, unreadCount }) => {
        const trigger = document.createElement('button')
        trigger.type = 'button'
        trigger.textContent = `Custom trigger ${unreadCount}`
        trigger.addEventListener('click', open)

        return trigger
      },
    })

    expect(document.body.textContent).toContain('Custom trigger 0')

    fireEvent.click(document.querySelector('button') as HTMLButtonElement)

    expect(document.querySelector('[aria-label="Chat"]')).toBeTruthy()
  })

  it('renderMessage로 메시지 렌더링을 교체한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: 'Custom vanilla response',
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
      renderMessage: ({ message }) => {
        const article = document.createElement('article')
        article.dataset.testid = `custom-${message.role}`
        article.textContent = `${message.role}:${message.content}`

        return article
      },
    })

    const input = document.querySelector('textarea')

    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error('textarea not found')
    }

    fireEvent.change(input, {
      target: {
        value: 'Custom vanilla question',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="custom-user"]')?.textContent,
      ).toContain('user:Custom vanilla question')
      expect(
        document.querySelector('[data-testid="custom-assistant"]')?.textContent,
      ).toContain('assistant:Custom vanilla response')
    })
  })

  it('renderComposerFooter로 composer 아래 영역을 추가한다', () => {
    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialOpen: true,
      renderComposerFooter: ({ isSubmitting }) => {
        const footer = document.createElement('small')
        footer.textContent = isSubmitting
          ? 'Sending custom footer'
          : 'Custom footer'

        return footer
      },
    })

    expect(document.body.textContent).toContain('Custom footer')
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
      visitor: {
        id: 'visitor-vanilla',
      },
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

  it('participant presence와 typing 상태를 표시한다', async () => {
    const instance = initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialOpen: true,
      visitor: {
        id: 'visitor-vanilla',
      },
    })

    instance.applyEvent({
      type: 'participant.presence_changed',
      presence: {
        participantId: 'vanilla-app-assistant',
        status: 'online',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })
    instance.applyEvent({
      type: 'participant.typing_changed',
      typingIndicator: {
        conversationId: 'vanilla-app:conversation:visitor-vanilla',
        participantId: 'vanilla-app-assistant',
        isTyping: true,
        updatedAt: '2026-06-01T00:01:00.000Z',
      },
    })

    expect(document.body.textContent).toContain('Online')
    expect(document.body.textContent).toContain('Participant is typing...')
  })

  it('localStorage persistence를 visitor별 conversation으로 분리한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: 'Persisted vanilla response',
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
      persistence: 'localStorage',
      visitor: {
        id: 'visitor-a',
      },
    })

    const input = document.querySelector('textarea')

    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error('textarea not found')
    }

    fireEvent.change(input, {
      target: {
        value: 'Visitor A vanilla question',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('Persisted vanilla response')
    })

    destroyLeeChat()

    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialOpen: true,
      persistence: 'localStorage',
      visitor: {
        id: 'visitor-b',
      },
    })

    expect(document.body.textContent).not.toContain('Visitor A vanilla question')
    expect(document.body.textContent).not.toContain('Persisted vanilla response')
  })

  it('내가 보낸 메시지의 read receipt를 표시한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: 'Receipt vanilla response',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )
    const instance = initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialOpen: true,
      visitor: {
        id: 'visitor-vanilla',
      },
    })
    const input = document.querySelector('textarea')

    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error('textarea not found')
    }

    fireEvent.change(input, {
      target: {
        value: 'Receipt vanilla question',
      },
    })
    fireEvent.submit(input.form as HTMLFormElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('Receipt vanilla response')
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    instance.applyEvent({
      type: 'message.read',
      readReceipt: {
        conversationId: requestBody.conversation.id,
        messageId: requestBody.message.id,
        participantId: 'vanilla-app-assistant',
        readAt: '2026-06-01T00:02:00.000Z',
      },
    })

    expect(document.body.textContent).toContain('Read')
  })

  it('message.created event를 메시지 목록에 반영한다', async () => {
    const instance = initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      initialOpen: true,
      visitor: {
        id: 'visitor-vanilla',
      },
    })

    instance.applyEvent({
      type: 'message.created',
      message: {
        id: 'message-realtime',
        conversationId: 'vanilla-app:conversation:visitor-vanilla',
        senderId: 'vanilla-app-assistant',
        role: 'assistant',
        content: 'Realtime vanilla response',
        parts: [{ type: 'text', text: 'Realtime vanilla response' }],
        status: 'sent',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    })

    await waitFor(() => {
      expect(document.body.textContent).toContain('Realtime vanilla response')
    })
  })

  it('eventTransport를 구독하고 destroy 시 해제한다', () => {
    const unsubscribe = vi.fn()
    let listener: Parameters<ChatEventTransport['subscribe']>[0] | undefined
    const eventTransport: ChatEventTransport = {
      subscribe: (nextListener) => {
        listener = nextListener

        return unsubscribe
      },
    }
    const instance = initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      fetchImplementation: fetchMock,
      eventTransport,
      initialOpen: true,
    })

    listener?.({
      type: 'participant.presence_changed',
      presence: {
        participantId: 'vanilla-app-assistant',
        status: 'online',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })

    expect(document.body.textContent).toContain('Online')

    instance.destroy()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('features.realtime이 false이면 eventTransport를 구독하지 않는다', () => {
    const subscribe = vi.fn(() => () => {})

    initLeeChat({
      appId: 'vanilla-app',
      endpoint: '/api/chat',
      eventTransport: {
        subscribe,
      },
      features: {
        realtime: false,
      },
    })

    expect(subscribe).not.toHaveBeenCalled()
  })
})
