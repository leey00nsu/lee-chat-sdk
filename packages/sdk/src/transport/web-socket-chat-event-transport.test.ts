import { describe, expect, it, vi } from 'vitest'
import {
  WebSocketChatEventTransport,
  type WebSocketLike,
} from './web-socket-chat-event-transport'

class TestWebSocket implements WebSocketLike {
  readonly close = vi.fn()
  private readonly listeners = new Map<string, Array<(event: MessageEvent) => void>>()

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
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
})
