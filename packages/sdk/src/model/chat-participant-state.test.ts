import { describe, expect, it } from 'vitest'
import {
  collectActiveTypingParticipantIds,
  collectOnlineParticipantIds,
  createChatReadReceipt,
  type ChatParticipantPresence,
  type ChatTypingIndicator,
} from './chat-participant-state'

describe('chat participant state model', () => {
  it('온라인 참여자 id를 수집한다', () => {
    const presences: ChatParticipantPresence[] = [
      {
        participantId: 'participant-user',
        status: 'online',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
      {
        participantId: 'participant-operator',
        status: 'offline',
        updatedAt: '2026-06-01T00:01:00.000Z',
      },
    ]

    expect(collectOnlineParticipantIds(presences)).toEqual(['participant-user'])
  })

  it('입력 중인 참여자 id를 수집한다', () => {
    const indicators: ChatTypingIndicator[] = [
      {
        conversationId: 'conversation',
        participantId: 'participant-user',
        isTyping: true,
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
      {
        conversationId: 'conversation',
        participantId: 'participant-operator',
        isTyping: false,
        updatedAt: '2026-06-01T00:01:00.000Z',
      },
    ]

    expect(collectActiveTypingParticipantIds(indicators)).toEqual([
      'participant-user',
    ])
  })

  it('메시지별 읽음 상태를 참여자 기준으로 만든다', () => {
    expect(
      createChatReadReceipt({
        conversationId: 'conversation',
        messageId: 'message',
        participantId: 'participant-user',
        readAt: '2026-06-01T00:00:00.000Z',
      }),
    ).toEqual({
      conversationId: 'conversation',
      messageId: 'message',
      participantId: 'participant-user',
      readAt: '2026-06-01T00:00:00.000Z',
    })
  })
})
