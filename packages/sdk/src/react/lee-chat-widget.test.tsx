import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LeeChatProvider } from './lee-chat-provider'
import { LeeChatWidget } from './lee-chat-widget'

const fetchMock = vi.fn()

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
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
})
