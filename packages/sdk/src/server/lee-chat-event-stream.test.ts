import { describe, expect, it, vi } from 'vitest'
import { createLeeChatEventStream } from './lee-chat-event-stream'
import type { ConversationClientEvent } from '../client/conversation-client'

const PRESENCE_EVENT: ConversationClientEvent = {
  type: 'participant.presence_changed',
  presence: {
    participantId: 'operator-1',
    status: 'online',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
}

describe('createLeeChatEventStream', () => {
  it('구독자에게 realtime event를 publish하고 unsubscribe한다', () => {
    const eventStream = createLeeChatEventStream()
    const listener = vi.fn()
    const unsubscribe = eventStream.subscribe(listener)

    eventStream.publish(PRESENCE_EVENT)
    unsubscribe()
    eventStream.publish({
      type: 'participant.typing_changed',
      typingIndicator: {
        conversationId: 'conversation-1',
        participantId: 'operator-1',
        isTyping: true,
        updatedAt: '2026-06-01T00:01:00.000Z',
      },
    })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(PRESENCE_EVENT)
    expect(eventStream.getSubscriberCount()).toBe(0)
  })

  it('SSE response로 event-stream payload를 전송한다', async () => {
    const eventStream = createLeeChatEventStream({
      eventName: 'lee-chat',
      keepAliveMs: 0,
    })
    const response = eventStream.createSseResponse()
    const reader = response.body?.getReader()

    eventStream.publish(PRESENCE_EVENT)
    const chunk = await reader?.read()
    const payload = new TextDecoder().decode(chunk?.value)

    expect(response.headers.get('Content-Type')).toBe(
      'text/event-stream; charset=utf-8',
    )
    expect(payload).toBe(
      [
        'event: lee-chat',
        `data: ${JSON.stringify(PRESENCE_EVENT)}`,
        '',
        '',
      ].join('\n'),
    )

    await reader?.cancel()
    expect(eventStream.getSubscriberCount()).toBe(0)
  })

  it('request abort 시 SSE 구독을 정리한다', async () => {
    const eventStream = createLeeChatEventStream({
      keepAliveMs: 0,
    })
    const abortController = new AbortController()
    const request = new Request('https://example.com/api/chat/events', {
      signal: abortController.signal,
    })
    const response = eventStream.createSseResponse({ request })
    const reader = response.body?.getReader()

    expect(eventStream.getSubscriberCount()).toBe(1)
    abortController.abort()
    await expect(reader?.read()).resolves.toEqual({
      done: true,
      value: undefined,
    })
    expect(eventStream.getSubscriberCount()).toBe(0)
  })
})
