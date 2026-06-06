import { act, render, renderHook, waitFor } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LeeChatConfig } from '../config/lee-chat-config'
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

  it('features.realtime이 false이면 eventTransport를 구독하지 않는다', () => {
    const subscribe = vi.fn(() => () => {})

    renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            features: {
              realtime: false,
            },
          }}
          eventTransport={{
            subscribe,
          }}
        >
          {children}
        </LeeChatProvider>
      ),
    })

    expect(subscribe).not.toHaveBeenCalled()
  })

  it('initialMessage를 초기 assistant 메시지로 제공하고 자동 요청하지 않는다', () => {
    const fetchImplementation = vi.fn() as unknown as typeof fetch
    const { result } = renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            visitor: {
              id: 'visitor-initial',
            },
            initialMessage: 'Welcome. How can I help?',
          }}
          fetchImplementation={fetchImplementation}
        >
          {children}
        </LeeChatProvider>
      ),
    })

    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'app:conversation:visitor-initial:initial-message',
        conversationId: 'app:conversation:visitor-initial',
        senderId: 'app-assistant',
        role: 'assistant',
        content: 'Welcome. How can I help?',
        status: 'sent',
      }),
    ])
    expect(fetchImplementation).not.toHaveBeenCalled()
  })

  it('open 시 마지막 unread 메시지를 read sync하고 다시 닫아도 unread로 세지 않는다', async () => {
    const markMessageRead = vi.fn(async () => ({
      readReceipt: {
        conversationId: 'app:conversation:visitor-read',
        messageId: 'app:conversation:visitor-read:initial-message',
        participantId: 'visitor-read',
        readAt: '2026-06-01T00:00:00.000Z',
      },
    }))
    const { result } = renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            visitor: {
              id: 'visitor-read',
            },
            initialMessage: 'Unread welcome message',
          }}
          syncClient={{
            markMessageRead,
          }}
        >
          {children}
        </LeeChatProvider>
      ),
    })

    expect(result.current.unreadCount).toBe(1)

    await act(async () => {
      result.current.open()
    })

    await waitFor(() => {
      expect(markMessageRead).toHaveBeenCalledWith({
        conversationId: 'app:conversation:visitor-read',
        messageId: 'app:conversation:visitor-read:initial-message',
        participantId: 'visitor-read',
      })
    })

    act(() => {
      result.current.close()
    })

    expect(result.current.unreadCount).toBe(0)
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

  it('config가 바뀌면 새 endpoint와 conversation으로 요청한다', async () => {
    const fetchMock = vi.fn(
      async (_endpoint: RequestInfo | URL, init?: RequestInit) =>
        new Response(
          JSON.stringify({
            message: {
              content: `response for ${JSON.parse(String(init?.body)).appId}`,
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
    let latestLeeChat: ReturnType<typeof useLeeChat> | undefined

    function LeeChatProbe({
      onValue,
    }: {
      onValue: (value: ReturnType<typeof useLeeChat>) => void
    }) {
      const leeChat = useLeeChat()

      useEffect(() => {
        onValue(leeChat)
      }, [leeChat, onValue])

      return null
    }

    function TestProvider({ config }: { config: LeeChatConfig }) {
      return (
        <LeeChatProvider
          config={config}
          fetchImplementation={fetchMock as unknown as typeof fetch}
        >
          <LeeChatProbe
            onValue={(value) => {
              latestLeeChat = value
            }}
          />
        </LeeChatProvider>
      )
    }

    const { rerender } = render(
      <TestProvider
        config={{
          appId: 'app-one',
          endpoint: '/api/chat-one',
          visitor: {
            id: 'visitor-one',
          },
        }}
      />,
    )

    await act(async () => {
      await latestLeeChat?.submitMessage('first request')
    })

    rerender(
      <TestProvider
        config={{
          appId: 'app-two',
          endpoint: '/api/chat-two',
          visitor: {
            id: 'visitor-two',
          },
        }}
      />,
    )

    await act(async () => {
      await latestLeeChat?.submitMessage('second request')
    })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/chat-one')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/chat-two')
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual(
      expect.objectContaining({
        appId: 'app-two',
        conversation: expect.objectContaining({
          id: 'app-two:conversation:visitor-two',
        }),
        participant: expect.objectContaining({
          id: 'visitor-two',
        }),
        visitor: {
          id: 'visitor-two',
        },
      }),
    )
  })

  it('metadata 변경은 메시지를 유지하고 다음 요청부터 반영한다', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            message: {
              content: 'response',
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
    let latestLeeChat: ReturnType<typeof useLeeChat> | undefined

    function Probe() {
      latestLeeChat = useLeeChat()

      return null
    }

    function TestProvider({ locale }: { locale: string }) {
      return (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            visitor: {
              id: 'visitor-metadata',
            },
            metadata: {
              locale,
            },
            conversation: {
              metadata: {
                currentPostSlug: `post-${locale}`,
              },
            },
          }}
          fetchImplementation={fetchMock as unknown as typeof fetch}
        >
          <Probe />
        </LeeChatProvider>
      )
    }

    const { rerender } = render(<TestProvider locale="ko" />)

    await act(async () => {
      await latestLeeChat?.submitMessage('first')
    })

    rerender(<TestProvider locale="en" />)

    expect(latestLeeChat?.messages).toHaveLength(2)

    await act(async () => {
      await latestLeeChat?.submitMessage('second')
    })

    const secondRequest = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body),
    )

    expect(secondRequest.metadata).toEqual({
      locale: 'en',
    })
    expect(secondRequest.conversation.metadata).toEqual({
      currentPostSlug: 'post-en',
    })
    expect(latestLeeChat?.messages).toHaveLength(4)
  })

  it('resetKey 변경은 같은 conversation의 메시지를 초기화한다', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: { content: 'response' } }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
    )
    let latestLeeChat: ReturnType<typeof useLeeChat> | undefined

    function Probe() {
      latestLeeChat = useLeeChat()

      return null
    }

    function TestProvider({ resetKey }: { resetKey: string }) {
      return (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            visitor: {
              id: 'visitor-reset',
            },
            resetKey,
          }}
          fetchImplementation={fetchMock as unknown as typeof fetch}
        >
          <Probe />
        </LeeChatProvider>
      )
    }

    const { rerender } = render(<TestProvider resetKey="first" />)

    await act(async () => {
      await latestLeeChat?.submitMessage('before reset')
    })

    expect(latestLeeChat?.messages).toHaveLength(2)

    rerender(<TestProvider resetKey="second" />)

    await waitFor(() => {
      expect(latestLeeChat?.messages).toHaveLength(0)
    })
  })
})
