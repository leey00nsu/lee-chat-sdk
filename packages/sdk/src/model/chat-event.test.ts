import { describe, expect, it } from 'vitest'
import {
  buildChatEvent,
  collectChatEventsByConversationId,
  type ChatEvent,
} from './chat-event'

describe('ChatEvent', () => {
  it('대화 배정과 내부 메모 이벤트를 도메인 payload와 함께 표현한다', () => {
    const assignedEvent = buildChatEvent({
      id: 'event-assigned',
      conversationId: 'conversation',
      type: 'conversation.assigned',
      createdAt: '2026-06-01T00:00:00.000Z',
      payload: { agentName: 'Jin' },
    })
    const noteEvent = buildChatEvent({
      id: 'event-note',
      conversationId: 'conversation',
      type: 'internal_note.created',
      createdAt: '2026-06-01T00:01:00.000Z',
      payload: { content: '결제 직전 이탈 가능성이 높음' },
    })

    expect(assignedEvent.payload.agentName).toBe('Jin')
    expect(noteEvent.payload.content).toBe('결제 직전 이탈 가능성이 높음')
  })

  it('conversationId별 이벤트를 시간 순서대로 수집한다', () => {
    const events: ChatEvent[] = [
      buildChatEvent({
        id: 'event-later',
        conversationId: 'conversation',
        type: 'message.created',
        createdAt: '2026-06-01T00:02:00.000Z',
        payload: {},
      }),
      buildChatEvent({
        id: 'event-other',
        conversationId: 'other-conversation',
        type: 'message.created',
        createdAt: '2026-06-01T00:01:00.000Z',
        payload: {},
      }),
      buildChatEvent({
        id: 'event-earlier',
        conversationId: 'conversation',
        type: 'customer_event.recorded',
        createdAt: '2026-06-01T00:00:00.000Z',
        payload: {},
      }),
    ]

    expect(
      collectChatEventsByConversationId({
        events,
        conversationId: 'conversation',
      }).map((event) => event.id),
    ).toEqual(['event-earlier', 'event-later'])
  })
})
