import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChatMessageList } from './chat-message-list'
import {
  createTextMessageParts,
  getChatMessageText,
  type ChatMessage,
} from '../model/chat-message'

const MESSAGES: ChatMessage[] = [
  {
    id: 'user-message',
    conversationId: 'conversation',
    senderId: 'participant-user',
    role: 'user',
    content: '질문',
    parts: createTextMessageParts('질문'),
    status: 'sent',
    createdAt: '2026-06-01T00:00:00.000Z',
  },
]

describe('ChatMessageList', () => {
  it('renderMessage 슬롯으로 메시지를 렌더링한다', () => {
    render(
      <ChatMessageList
        messages={MESSAGES}
        renderMessage={(message) => <p>{getChatMessageText(message)}</p>}
      />,
    )

    expect(screen.getByRole('list')).toBeTruthy()
    expect(screen.getByText('질문')).toBeTruthy()
  })
})
