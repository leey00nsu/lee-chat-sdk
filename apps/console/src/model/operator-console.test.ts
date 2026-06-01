import { describe, expect, it } from 'vitest'
import {
  OPERATOR_CONSOLE_SEED,
  assignOperatorConversation,
  collectOperatorConversationEvents,
  selectOperatorConversation,
} from './operator-console'

describe('operator console model', () => {
  it('선택된 대화와 고객 이벤트를 조회한다', () => {
    const conversation = selectOperatorConversation(OPERATOR_CONSOLE_SEED)

    expect(conversation.customerName).toBe('Yujin Kim')
    expect(conversation.customerEvents).toContain('pricing-page-opened')
  })

  it('미배정 대화를 상담자에게 배정한다', () => {
    const nextState = assignOperatorConversation({
      state: OPERATOR_CONSOLE_SEED,
      conversationId: 'conversation-delivery',
      agentName: 'Jin',
    })
    const assignedConversation = nextState.conversations.find(
      (conversation) => conversation.id === 'conversation-delivery',
    )

    expect(assignedConversation?.status).toBe('assigned')
    expect(assignedConversation?.assignedAgentName).toBe('Jin')
  })

  it('메시지, 배정, 내부 메모, 고객 이벤트를 event stream으로 수집한다', () => {
    const conversation = selectOperatorConversation(OPERATOR_CONSOLE_SEED)
    const events = collectOperatorConversationEvents(conversation)

    expect(events.map((event) => event.type)).toContain('message.created')
    expect(events.map((event) => event.type)).toContain('conversation.assigned')
    expect(events.map((event) => event.type)).toContain('internal_note.created')
    expect(events.map((event) => event.type)).toContain('customer_event.recorded')
  })
})
