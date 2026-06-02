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

afterEach(() => {
  cleanup()
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
              {message.role}: {message.content}
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
})
