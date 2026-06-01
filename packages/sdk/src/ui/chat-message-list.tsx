import type { ReactNode } from 'react'
import type { ChatMessage } from '../model/chat-message'

export interface ChatMessageListProps<TMessageMetadata = unknown> {
  messages: Array<ChatMessage<TMessageMetadata>>
  renderMessage: (message: ChatMessage<TMessageMetadata>) => ReactNode
}

export function ChatMessageList<TMessageMetadata = unknown>({
  messages,
  renderMessage,
}: ChatMessageListProps<TMessageMetadata>) {
  return (
    <ol>
      {messages.map((message) => (
        <li key={message.id}>{renderMessage(message)}</li>
      ))}
    </ol>
  )
}
