import { describe, expect, it, vi } from 'vitest'
import {
  WebSocketChatEventTransport,
  type WebSocketLike,
} from './web-socket-chat-event-transport'

class TestWebSocket implements WebSocketLike {
  readonly close = vi.fn()
  private readonly listeners = new Map<string, Array<(event: Event) => void>>()

  addEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((currentListener) => {
        return currentListener !== listener
      }),
    )
  }

  emit(type: string, data: unknown): void {
    this.listeners.get(type)?.forEach((listener) => {
      listener({ data: JSON.stringify(data) } as MessageEvent)
    })
  }

  emitClose(): void {
    this.listeners.get('close')?.forEach((listener) => {
      listener(new Event('close'))
    })
  }
}

describe('WebSocketChatEventTransport', () => {
  it('message event를 ConversationClientEvent로 전달하고 unsubscribe 시 연결을 닫는다', () => {
    const webSocket = new TestWebSocket()
    const createWebSocket = vi.fn(() => webSocket)
    const receivedEvents: unknown[] = []
    const transport = new WebSocketChatEventTransport({
      endpoint: 'wss://example.com/chat/events',
      createWebSocket,
    })

    const unsubscribe = transport.subscribe((event) => {
      receivedEvents.push(event)
    })

    webSocket.emit('message', {
      type: 'participant.typing_changed',
      typingIndicator: {
        conversationId: 'conversation',
        participantId: 'participant-assistant',
        isTyping: true,
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })

    expect(createWebSocket).toHaveBeenCalledWith(
      'wss://example.com/chat/events',
      undefined,
    )
    expect(receivedEvents).toEqual([
      {
        type: 'participant.typing_changed',
        typingIndicator: {
          conversationId: 'conversation',
          participantId: 'participant-assistant',
          isTyping: true,
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      },
    ])

    unsubscribe()

    expect(webSocket.close).toHaveBeenCalledTimes(1)
  })

  it('protocols를 지정하면 WebSocket 생성 시 전달한다', () => {
    const webSocket = new TestWebSocket()
    const createWebSocket = vi.fn(() => webSocket)
    const transport = new WebSocketChatEventTransport({
      endpoint: 'wss://example.com/chat/events',
      protocols: ['lee-chat'],
      createWebSocket,
    })

    transport.subscribe(() => {})

    expect(createWebSocket).toHaveBeenCalledWith(
      'wss://example.com/chat/events',
      ['lee-chat'],
    )
  })

  it('reconnect가 켜져 있으면 close event 후 backoff delay로 다시 연결한다', () => {
    vi.useFakeTimers()

    try {
      const webSockets = [new TestWebSocket(), new TestWebSocket()]
      const createWebSocket = vi.fn(() => {
        return webSockets[
          createWebSocket.mock.calls.length - 1
        ] as TestWebSocket
      })
      const transport = new WebSocketChatEventTransport({
        endpoint: 'wss://example.com/chat/events',
        createWebSocket,
        reconnect: {
          enabled: true,
          initialDelayMs: 100,
        },
      })

      transport.subscribe(() => {})

      webSockets[0]?.emitClose()
      vi.advanceTimersByTime(99)
      expect(createWebSocket).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1)
      expect(createWebSocket).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('unsubscribe하면 예약된 reconnect를 취소하고 현재 연결을 닫는다', () => {
    vi.useFakeTimers()

    try {
      const webSockets = [new TestWebSocket(), new TestWebSocket()]
      const createWebSocket = vi.fn(() => {
        return webSockets[
          createWebSocket.mock.calls.length - 1
        ] as TestWebSocket
      })
      const transport = new WebSocketChatEventTransport({
        endpoint: 'wss://example.com/chat/events',
        createWebSocket,
        reconnect: {
          enabled: true,
          initialDelayMs: 100,
        },
      })

      const unsubscribe = transport.subscribe(() => {})

      webSockets[0]?.emitClose()
      unsubscribe()
      vi.advanceTimersByTime(100)

      expect(createWebSocket).toHaveBeenCalledTimes(1)
      expect(webSockets[0]?.close).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('auth refresh 후 동적 endpoint를 다시 평가해 reconnect한다', async () => {
    vi.useFakeTimers()

    try {
      let accessToken = 'expired-token'
      const refresh = vi.fn(async () => {
        accessToken = 'fresh-token'
      })
      const webSockets = [new TestWebSocket(), new TestWebSocket()]
      const createWebSocket = vi.fn(() => {
        return webSockets[
          createWebSocket.mock.calls.length - 1
        ] as TestWebSocket
      })
      const transport = new WebSocketChatEventTransport({
        endpoint: () => `wss://example.com/chat/events?token=${accessToken}`,
        createWebSocket,
        auth: {
          refresh,
        },
        reconnect: {
          enabled: true,
          initialDelayMs: 100,
          maxAttempts: 1,
        },
      })

      transport.subscribe(() => {})
      webSockets[0]?.emitClose()

      await vi.advanceTimersByTimeAsync(100)

      expect(refresh).toHaveBeenCalledTimes(1)
      expect(createWebSocket).toHaveBeenNthCalledWith(
        1,
        'wss://example.com/chat/events?token=expired-token',
        undefined,
      )
      expect(createWebSocket).toHaveBeenNthCalledWith(
        2,
        'wss://example.com/chat/events?token=fresh-token',
        undefined,
      )
    } finally {
      vi.useRealTimers()
    }
  })
})
