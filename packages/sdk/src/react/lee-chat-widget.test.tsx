import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { LeeChatProvider } from './lee-chat-provider'
import { LeeChatWidget } from './lee-chat-widget'
import { getChatMessageText } from '../model/chat-message'
import { useLeeChat } from './use-lee-chat'

const fetchMock = vi.fn()
const scrollIntoViewMock = vi.fn()

function createPendingResponse() {
  let resolveResponse: (response: unknown) => void = () => {}
  const responsePromise = new Promise((resolve) => {
    resolveResponse = resolve
  })

  return {
    responsePromise,
    resolveResponse,
  }
}

function ApplyParticipantStateEvents() {
  const leeChat = useLeeChat()

  return (
    <button
      type="button"
      onClick={() => {
        leeChat.applyEvent({
          type: 'participant.presence_changed',
          presence: {
            participantId: 'app-assistant',
            status: 'online',
            updatedAt: '2026-06-01T00:00:00.000Z',
          },
        })
        leeChat.applyEvent({
          type: 'participant.typing_changed',
          typingIndicator: {
            conversationId: leeChat.config.conversation.id,
            participantId: 'app-assistant',
            isTyping: true,
            updatedAt: '2026-06-01T00:01:00.000Z',
          },
        })
      }}
    >
      Apply participant state
    </button>
  )
}

function MarkFirstMessageRead() {
  const leeChat = useLeeChat()

  return (
    <button
      type="button"
      onClick={() => {
        const firstUserMessage = leeChat.messages.find((message) => {
          return message.senderId === leeChat.config.participant.id
        })

        if (!firstUserMessage) {
          return
        }

        leeChat.applyEvent({
          type: 'message.read',
          readReceipt: {
            conversationId: leeChat.config.conversation.id,
            messageId: firstUserMessage.id,
            participantId: `${leeChat.config.appId}-assistant`,
            readAt: '2026-06-01T00:02:00.000Z',
          },
        })
      }}
    >
      Mark first message read
    </button>
  )
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoViewMock
})

describe('LeeChatWidget', () => {
  it('bottom-right floating trigger를 렌더링하고 panel을 열고 닫는다', () => {
    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
        }}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    expect(screen.getByRole('button', { name: 'Open chat' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Chat' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }))

    expect(screen.getByRole('region', { name: 'Chat' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }))

    expect(screen.queryByRole('region', { name: 'Chat' })).toBeNull()
  })

  it('theme CSS variables를 document root가 아니라 widget root에만 적용한다', () => {
    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          theme: {
            primaryColor: '#2563eb',
            radius: '16px',
          },
        }}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    const widgetRoot = screen
      .getByRole('button', { name: 'Open chat' })
      .closest('[data-testid="lee-chat-root"]')

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

  it('메시지를 endpoint로 보내고 assistant 응답을 렌더링한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'Hello from support',
        },
      }),
    })

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
          visitor: {
            id: 'visitor-test',
          },
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeTruthy()
      expect(screen.getByText('Hello from support')).toBeTruthy()
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
          id: 'app:conversation:visitor-test',
          kind: 'support',
        },
        participant: expect.objectContaining({
          id: 'visitor-test',
          kind: 'user',
        }),
        visitor: {
          id: 'visitor-test',
          metadata: undefined,
        },
        message: expect.objectContaining({
          senderId: 'visitor-test',
          parts: [
            {
              type: 'text',
              text: 'Hello',
            },
          ],
        }),
      }),
    )
  })

  it('assistant 응답의 image와 file part를 기본 UI로 렌더링한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
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
    })

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: '첨부 보여줘' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      const image = screen.getByAltText('상담 화면 캡처')
      const link = screen.getByRole('link', { name: 'report.pdf' })

      expect(screen.getByText('첨부를 확인해 주세요.')).toBeTruthy()
      expect(image.getAttribute('src')).toBe(
        'https://example.com/screenshot.png',
      )
      expect(link.getAttribute('href')).toBe('https://example.com/report.pdf')
    })
  })

  it('uploadAttachment 결과를 사용자 message part로 전송한다', async () => {
    const uploadAttachment = vi.fn(async () => ({
      kind: 'file' as const,
      url: 'https://example.com/manual.pdf',
      name: 'manual.pdf',
      mediaType: 'application/pdf',
    }))
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: '첨부를 받았습니다.',
        },
      }),
    })

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget uploadAttachment={uploadAttachment} />
      </LeeChatProvider>,
    )

    const file = new File(['manual'], 'manual.pdf', {
      type: 'application/pdf',
    })

    fireEvent.change(screen.getByLabelText('Attach file'), {
      target: {
        files: [file],
      },
    })

    await waitFor(() => {
      expect(uploadAttachment).toHaveBeenCalledWith(file)
      expect(screen.getByText('manual.pdf')).toBeTruthy()
    })

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: '첨부 확인 부탁드립니다.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('첨부를 받았습니다.')).toBeTruthy()
    })
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual(
      expect.objectContaining({
        message: expect.objectContaining({
          content: '첨부 확인 부탁드립니다.',
          parts: [
            {
              type: 'text',
              text: '첨부 확인 부탁드립니다.',
            },
            {
              type: 'file',
              url: 'https://example.com/manual.pdf',
              name: 'manual.pdf',
              mediaType: 'application/pdf',
            },
          ],
        }),
      }),
    )
  })

  it('메시지를 보내면 최신 메시지로 스크롤한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'Latest response',
        },
      }),
    })

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    scrollIntoViewMock.mockClear()

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Latest question' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('Latest response')).toBeTruthy()
    })
    expect(scrollIntoViewMock).toHaveBeenCalled()
  })

  it('panel을 다시 열면 최신 메시지로 스크롤한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'Reopen response',
        },
      }),
    })

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Reopen question' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('Reopen response')).toBeTruthy()
    })

    scrollIntoViewMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }))

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled()
    })
  })

  it('CSS class hook을 root, trigger, panel에 적용한다', () => {
    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          className: {
            root: 'custom-root',
            trigger: 'custom-trigger',
            panel: 'custom-panel',
          },
        }}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    expect(screen.getByTestId('lee-chat-root').className).toContain('custom-root')
    expect(screen.getByRole('button', { name: 'Open chat' }).className).toContain(
      'custom-trigger',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }))

    expect(screen.getByRole('region', { name: 'Chat' }).className).toContain(
      'custom-panel',
    )
  })

  it('전송 중 사용자 메시지 상태와 assistant loading을 표시한다', async () => {
    const pendingResponse = createPendingResponse()
    fetchMock.mockReturnValue(pendingResponse.responsePromise)

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Pending question' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('Pending question')).toBeTruthy()
      expect(screen.getByText('Sending...')).toBeTruthy()
      expect(screen.getByText('Assistant is typing...')).toBeTruthy()
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Sending' })
          .disabled,
      ).toBe(true)
    })

    pendingResponse.resolveResponse({
      ok: true,
      json: async () => ({
        message: {
          content: 'Pending response',
        },
      }),
    })
  })

  it('실패 메시지에 retry 버튼을 표시하고 다시 전송한다', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: 'Retry response',
          },
        }),
      })

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Retry question' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('Message failed. Please try again.')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(screen.getByText('Retry response')).toBeTruthy()
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('renderMessage로 메시지 렌더링을 커스텀한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'Custom response',
        },
      }),
    })

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget
          renderMessage={({ message }) => (
            <article data-testid={`custom-${message.role}`}>
              {message.role}: {getChatMessageText(message)}
            </article>
          )}
        />
      </LeeChatProvider>,
    )

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Custom question' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByTestId('custom-user').textContent).toContain(
        'Custom question',
      )
      expect(screen.getByTestId('custom-assistant').textContent).toContain(
        'Custom response',
      )
    })
  })

  it('renderHeader slot으로 header를 교체하고 close 액션을 사용할 수 있다', () => {
    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
      >
        <LeeChatWidget
          renderHeader={({ close, title, subtitle }) => (
            <header>
              <strong>{title}</strong>
              <span>{subtitle}</span>
              <button type="button" onClick={close}>
                Custom close
              </button>
            </header>
          )}
        />
      </LeeChatProvider>,
    )

    expect(screen.getByText('Chat')).toBeTruthy()
    expect(screen.getByText('Send us a message.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Custom close' }))

    expect(screen.queryByRole('region', { name: 'Chat' })).toBeNull()
  })

  it('renderTrigger slot으로 trigger를 교체하고 open 액션과 unread count를 사용할 수 있다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'Unread response',
        },
      }),
    })

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget
          renderTrigger={({ open, unreadCount }) => (
            <button type="button" onClick={open}>
              Custom trigger {unreadCount}
            </button>
          )}
        />
      </LeeChatProvider>,
    )

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Unread question' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('Unread response')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }))

    expect(screen.getByRole('button', { name: 'Custom trigger 1' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Custom trigger 1' }))

    expect(screen.getByRole('region', { name: 'Chat' })).toBeTruthy()
  })

  it('renderComposerFooter slot으로 composer 아래 영역을 추가한다', () => {
    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
      >
        <LeeChatWidget
          renderComposerFooter={({ isSubmitting }) => (
            <p>{isSubmitting ? 'Sending custom footer' : 'Custom footer'}</p>
          )}
        />
      </LeeChatProvider>,
    )

    expect(screen.getByText('Custom footer')).toBeTruthy()
  })

  it('localStorage persistence를 visitor별 conversation으로 분리한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'Persisted response',
        },
      }),
    })
    const { unmount } = render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
          persistence: 'localStorage',
          visitor: {
            id: 'visitor-a',
          },
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Visitor A question' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('Persisted response')).toBeTruthy()
    })

    unmount()

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
          persistence: 'localStorage',
          visitor: {
            id: 'visitor-b',
          },
        }}
        fetchImplementation={fetchMock}
      >
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    expect(screen.queryByText('Visitor A question')).toBeNull()
    expect(screen.queryByText('Persisted response')).toBeNull()
  })

  it('participant presence와 typing 상태를 표시한다', async () => {
    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
        fetchImplementation={fetchMock}
      >
        <ApplyParticipantStateEvents />
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Apply participant state' }))

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeTruthy()
      expect(screen.getByText('Participant is typing...')).toBeTruthy()
    })
  })

  it('내가 보낸 메시지의 read receipt를 표시한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'Read receipt response',
        },
      }),
    })

    render(
      <LeeChatProvider
        config={{
          appId: 'app',
          endpoint: '/api/chat',
          initialOpen: true,
        }}
        fetchImplementation={fetchMock}
      >
        <MarkFirstMessageRead />
        <LeeChatWidget />
      </LeeChatProvider>,
    )

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Read receipt question' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('Read receipt response')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Mark first message read' }))

    expect(screen.getByText('Read')).toBeTruthy()
  })
})
