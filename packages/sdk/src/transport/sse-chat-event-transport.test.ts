import { describe, expect, it, vi } from 'vitest'
import {
  SseChatEventTransport,
  type EventSourceLike,
} from './sse-chat-event-transport'

class TestEventSource implements EventSourceLike {
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

describe('SseChatEventTransport', () => {
  it('message event를 ConversationClientEvent로 전달하고 unsubscribe 시 연결을 닫는다', () => {
    const eventSource = new TestEventSource()
    const createEventSource = vi.fn(() => eventSource)
    const receivedEvents: unknown[] = []
    const transport = new SseChatEventTransport({
      endpoint: '/api/chat/events',
      createEventSource,
    })

    const unsubscribe = transport.subscribe((event) => {
      receivedEvents.push(event)
    })

    eventSource.emit('message', {
      type: 'participant.typing_changed',
      typingIndicator: {
        conversationId: 'conversation',
        participantId: 'participant-assistant',
        isTyping: true,
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })

    expect(createEventSource).toHaveBeenCalledWith('/api/chat/events')
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

    expect(eventSource.close).toHaveBeenCalledTimes(1)
  })

  it('event 이름을 지정하면 해당 SSE event type을 구독한다', () => {
    const eventSource = new TestEventSource()
    const receivedEvents: unknown[] = []
    const transport = new SseChatEventTransport({
      endpoint: '/api/chat/events',
      eventName: 'lee-chat',
      createEventSource: () => eventSource,
    })

    transport.subscribe((event) => {
      receivedEvents.push(event)
    })
    eventSource.emit('message', {
      type: 'participant.presence_changed',
      presence: {
        participantId: 'participant-assistant',
        status: 'online',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })
    eventSource.emit('lee-chat', {
      type: 'participant.presence_changed',
      presence: {
        participantId: 'participant-assistant',
        status: 'online',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })

    expect(receivedEvents).toHaveLength(1)
  })
})
