import type { ReactNode } from 'react'
import { LeeChatProvider } from './lee-chat-provider'
import { LeeChatWidget } from './lee-chat-widget'
import { useLeeChat } from './use-lee-chat'

interface BlogChatMessageMetadata {
  blogChatResponse?: {
    grounded: boolean
    citations: string[]
  }
}

function BlogChatConsumer(): ReactNode {
  const leeChat = useLeeChat<BlogChatMessageMetadata>()
  const response = leeChat.messages[0]?.metadata?.blogChatResponse

  return response?.grounded ? response.citations.join(', ') : null
}

export function BlogChatTypeFixture(): ReactNode {
  return (
    <LeeChatProvider<BlogChatMessageMetadata>
      config={{
        appId: 'blog',
        endpoint: '/api/chat',
      }}
    >
      <LeeChatWidget<BlogChatMessageMetadata>
        renderAssistantContent={({ message, defaultContent }) => {
          const grounded = message.metadata?.blogChatResponse?.grounded

          return grounded ? defaultContent : 'Not grounded'
        }}
        renderMessageFooter={({ message }) => {
          return message.metadata?.blogChatResponse?.citations.join(', ')
        }}
        renderMessage={({ message }) => {
          return message.metadata?.blogChatResponse?.grounded
            ? message.content
            : null
        }}
      />
      <BlogChatConsumer />
    </LeeChatProvider>
  )
}
