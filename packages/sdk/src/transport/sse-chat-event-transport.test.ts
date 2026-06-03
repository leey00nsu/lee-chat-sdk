import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SseChatEventTransport,
  type EventSourceLike,
} from './sse-chat-event-transport'

class TestEventSource implements EventSourceLike {
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

  emitError(): void {
    this.listeners.get('error')?.forEach((listener) => {
      listener(new Event('error'))
    })
  }
}

describe('SseChatEventTransport', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

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

  it('error event가 발생하면 reconnect backoff 후 새 EventSource를 만든다', async () => {
    vi.useFakeTimers()
    const firstEventSource = new TestEventSource()
    const secondEventSource = new TestEventSource()
    const createEventSource = vi
      .fn()
      .mockReturnValueOnce(firstEventSource)
      .mockReturnValueOnce(secondEventSource)
    const receivedEvents: unknown[] = []
    const transport = new SseChatEventTransport({
      endpoint: '/api/chat/events',
      createEventSource,
      reconnect: {
        enabled: true,
        initialDelayMs: 1000,
        maxAttempts: 1,
      },
    })

    transport.subscribe((event) => {
      receivedEvents.push(event)
    })
    firstEventSource.emitError()

    expect(firstEventSource.close).toHaveBeenCalledTimes(1)
    expect(createEventSource).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)
    secondEventSource.emit('message', {
      type: 'participant.presence_changed',
      presence: {
        participantId: 'participant-assistant',
        status: 'online',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })

    expect(createEventSource).toHaveBeenCalledTimes(2)
    expect(receivedEvents).toHaveLength(1)
  })

  it('unsubscribe하면 예약된 SSE reconnect를 취소한다', async () => {
    vi.useFakeTimers()
    const firstEventSource = new TestEventSource()
    const createEventSource = vi.fn(() => firstEventSource)
    const transport = new SseChatEventTransport({
      endpoint: '/api/chat/events',
      createEventSource,
      reconnect: {
        enabled: true,
        initialDelayMs: 1000,
      },
    })

    const unsubscribe = transport.subscribe(() => {})
    firstEventSource.emitError()
    unsubscribe()

    await vi.advanceTimersByTimeAsync(1000)

    expect(createEventSource).toHaveBeenCalledTimes(1)
    expect(firstEventSource.close).toHaveBeenCalledTimes(1)
  })
})
