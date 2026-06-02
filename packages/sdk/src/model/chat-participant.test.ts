import { describe, expect, it } from 'vitest'
import type { ChatParticipant } from './chat-participant'

describe('ChatParticipant', () => {
  it('대화 참여자를 고객상담 역할이 아닌 범용 kind로 표현한다', () => {
    const participant: ChatParticipant = {
      id: 'participant-user',
      kind: 'user',
      displayName: 'Yoonsu',
      metadata: {
        plan: 'pro',
      },
    }

    expect(participant.kind).toBe('user')
    expect(participant.displayName).toBe('Yoonsu')
  })
})
