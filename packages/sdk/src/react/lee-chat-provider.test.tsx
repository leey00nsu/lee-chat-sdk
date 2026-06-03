import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { LeeChatProvider } from './lee-chat-provider'
import { useLeeChat } from './use-lee-chat'
import type { ChatEventTransport } from '../transport/chat-event-transport'

describe('LeeChatProvider', () => {
  it('config와 기본 open 상태를 context로 제공한다', () => {
    const { result } = renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            initialOpen: true,
          }}
        >
          {children}
        </LeeChatProvider>
      ),
    })

    expect(result.current.config.appId).toBe('app')
    expect(result.current.config.position).toBe('bottom-right')
    expect(result.current.isOpen).toBe(true)
  })

  it('conversation event를 participant state로 적용한다', () => {
    const { result } = renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            initialOpen: true,
          }}
        >
          {children}
        </LeeChatProvider>
      ),
    })

    act(() => {
      result.current.applyEvent({
        type: 'participant.typing_changed',
        typingIndicator: {
          conversationId: 'app:conversation',
          participantId: 'app-assistant',
          isTyping: true,
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      })
    })

    expect(result.current.participantState.typingIndicators).toEqual([
      {
        conversationId: 'app:conversation',
        participantId: 'app-assistant',
        isTyping: true,
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    ])
  })

  it('eventTransport를 구독해 conversation event를 적용한다', () => {
    const subscribe = vi.fn()
    let listener: Parameters<ChatEventTransport['subscribe']>[0] | undefined
    const eventTransport: ChatEventTransport = {
      subscribe: (nextListener) => {
        subscribe()
        listener = nextListener

        return () => {}
      },
    }
    const { result } = renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            initialOpen: true,
          }}
          eventTransport={eventTransport}
        >
          {children}
        </LeeChatProvider>
      ),
    })

    act(() => {
      listener?.({
        type: 'participant.presence_changed',
        presence: {
          participantId: 'app-assistant',
          status: 'online',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      })
    })

    expect(result.current.participantState.presences).toEqual([
      {
        participantId: 'app-assistant',
        status: 'online',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    ])
    expect(subscribe).toHaveBeenCalledTimes(1)
  })

  it('requestTimeoutMs가 지나면 기본 HTTP 요청을 실패 메시지로 처리한다', async () => {
    const fetchImplementation = vi.fn((_endpoint, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    }) as typeof fetch
    const { result } = renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            requestTimeoutMs: 10,
          }}
          fetchImplementation={fetchImplementation}
        >
          {children}
        </LeeChatProvider>
      ),
    })
    await act(async () => {
      await result.current.submitMessage('timeout request')
    })

    await waitFor(() => {
      expect(result.current.messages[0]).toEqual(
        expect.objectContaining({
          content: 'timeout request',
          status: 'failed',
        }),
      )
    })
    expect(fetchImplementation).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('requestRetry 설정으로 기본 HTTP 요청을 재시도한다', async () => {
    const fetchMock = vi
      .fn()
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
              content: 'retried response',
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
    const fetchImplementation = fetchMock as typeof fetch
    const { result } = renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            requestRetry: {
              maxAttempts: 2,
            },
          }}
          fetchImplementation={fetchImplementation}
        >
          {children}
        </LeeChatProvider>
      ),
    })

    await act(async () => {
      await result.current.submitMessage('retry request')
    })

    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    expect(result.current.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: 'retried response',
          status: 'sent',
        }),
      ]),
    )
  })

  it('requestAuth refresh 후 새 requestHeaders로 기본 HTTP 요청을 재시도한다', async () => {
    let accessToken = 'expired-token'
    const refresh = vi.fn(async () => {
      accessToken = 'fresh-token'
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: { content: 'unauthorized' } }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: {
              content: 'authorized response',
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
    const fetchImplementation = fetchMock as typeof fetch
    const { result } = renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            requestHeaders: () => ({
              Authorization: `Bearer ${accessToken}`,
            }),
            requestAuth: {
              refresh,
            },
          }}
          fetchImplementation={fetchImplementation}
        >
          {children}
        </LeeChatProvider>
      ),
    })

    await act(async () => {
      await result.current.submitMessage('authorized request')
    })

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer expired-token',
    })
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer fresh-token',
    })
    expect(result.current.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: 'authorized response',
          status: 'sent',
        }),
      ]),
    )
  })
})
