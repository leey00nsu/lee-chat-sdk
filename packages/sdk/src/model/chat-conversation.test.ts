import { describe, expect, it } from 'vitest'
import {
  collectChatConversationParticipantIds,
  isDirectChatConversation,
  type ChatConversation,
} from './chat-conversation'

describe('ChatConversation', () => {
  it('1:1 대화를 참여자 2명의 conversation으로 판단한다', () => {
    const conversation: ChatConversation = {
      id: 'conversation',
      kind: 'direct',
      status: 'open',
      participants: [
        {
          id: 'participant-user',
          kind: 'user',
        },
        {
          id: 'participant-operator',
          kind: 'operator',
        },
      ],
      createdAt: '2026-06-01T00:00:00.000Z',
    }

    expect(isDirectChatConversation(conversation)).toBe(true)
    expect(collectChatConversationParticipantIds(conversation)).toEqual([
      'participant-user',
      'participant-operator',
    ])
  })

  it('그룹 대화를 같은 conversation 모델로 표현한다', () => {
    const conversation: ChatConversation = {
      id: 'conversation',
      kind: 'group',
      status: 'open',
      participants: [
        {
          id: 'participant-user',
          kind: 'user',
        },
        {
          id: 'participant-operator',
          kind: 'operator',
        },
        {
          id: 'participant-bot',
          kind: 'bot',
        },
      ],
      createdAt: '2026-06-01T00:00:00.000Z',
    }

    expect(isDirectChatConversation(conversation)).toBe(false)
    expect(collectChatConversationParticipantIds(conversation)).toEqual([
      'participant-user',
      'participant-operator',
      'participant-bot',
    ])
  })
})
