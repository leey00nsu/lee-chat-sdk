'use client'

import {
  useChatOperatorConsole,
  type ChatConversation,
  type ChatConversationSummary,
  type ChatMessage,
} from 'lee-chat-sdk'
import {
  OPERATOR_CONSOLE_SEED,
  collectOperatorConversationEvents,
  type OperatorMessageMetadata,
} from '../model/operator-console'

const OPERATOR_CONSOLE = {
  DEFAULT_ASSIGN_AGENT_NAME: 'Jin',
  DEFAULT_CREATED_AT: '2026-06-01T00:00:00.000Z',
} as const

const OPERATOR_CONVERSATIONS: ChatConversation[] =
  OPERATOR_CONSOLE_SEED.conversations.map((conversation) => ({
    id: conversation.id,
    kind: 'support',
    status: conversation.status === 'closed' ? 'closed' : 'open',
    participants: [
      {
        id: `participant-${conversation.id}`,
        kind: 'user',
        displayName: conversation.customerName,
      },
    ],
    createdAt:
      conversation.messages[0]?.createdAt ?? OPERATOR_CONSOLE.DEFAULT_CREATED_AT,
  }))
const OPERATOR_MESSAGES: Array<ChatMessage<OperatorMessageMetadata>> =
  OPERATOR_CONSOLE_SEED.conversations.flatMap((conversation) => {
    return conversation.messages
  })
const OPERATOR_EVENTS = OPERATOR_CONSOLE_SEED.conversations.flatMap(
  (conversation) => {
    return collectOperatorConversationEvents(conversation)
  },
)

function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: {
  conversations: ChatConversationSummary[]
  selectedConversationId: string
  onSelectConversation: (conversationId: string) => void
}) {
  return (
    <nav aria-label="대화 목록">
      <h2>대화 목록</h2>
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          type="button"
          aria-pressed={conversation.id === selectedConversationId}
          onClick={() => onSelectConversation(conversation.id)}
        >
          <strong>{conversation.title}</strong>
          <span>{conversation.lastMessagePreview}</span>
          <span>{conversation.status}</span>
          {conversation.unreadCount > 0 ? (
            <span>{conversation.unreadCount}</span>
          ) : null}
        </button>
      ))}
    </nav>
  )
}

function MessageThread({
  conversationSummary,
  messages,
  onAssign,
}: {
  conversationSummary: ChatConversationSummary
  messages: Array<ChatMessage<OperatorMessageMetadata>>
  onAssign: () => void
}) {
  return (
    <main aria-label="메시지 스레드">
      <header>
        <h1>{conversationSummary.title}</h1>
        <p>{conversationSummary.status}</p>
        {conversationSummary.assignedAgentName ? (
          <p>{conversationSummary.assignedAgentName}</p>
        ) : (
          <button type="button" onClick={onAssign}>
            {OPERATOR_CONSOLE.DEFAULT_ASSIGN_AGENT_NAME}에게 배정
          </button>
        )}
      </header>
      <ol>
        {messages.map((message) => (
          <li key={message.id}>
            <article>
              <strong>{message.metadata?.internalNote ? 'internal note' : message.role}</strong>
              <p>{message.content}</p>
              {message.metadata?.agentName ? <small>{message.metadata.agentName}</small> : null}
            </article>
          </li>
        ))}
      </ol>
    </main>
  )
}

function CustomerContextPanel({
  conversationSummary,
}: {
  conversationSummary: ChatConversationSummary
}) {
  return (
    <aside aria-label="고객 컨텍스트">
      <h2>고객 컨텍스트</h2>
      <p>{conversationSummary.title}</p>
      <p>{conversationSummary.assignedAgentName ?? '미배정'}</p>
      <ul>
        {conversationSummary.customerEventIds.map((customerEventId) => (
          <li key={customerEventId}>{customerEventId}</li>
        ))}
      </ul>
    </aside>
  )
}

export function OperatorConsoleApp() {
  const operatorConsole = useChatOperatorConsole<OperatorMessageMetadata>({
    conversations: OPERATOR_CONVERSATIONS,
    messages: OPERATOR_MESSAGES,
    initialEvents: OPERATOR_EVENTS,
    initialSelectedConversationId: OPERATOR_CONSOLE_SEED.selectedConversationId,
  })
  const selectedConversationSummary =
    operatorConsole.selectedConversationSummary ??
    operatorConsole.state.conversationSummaries[0]
  const selectedMessages = operatorConsole.state.messages.filter((message) => {
    return message.conversationId === selectedConversationSummary?.id
  })

  if (!selectedConversationSummary) {
    return <div>대화가 없습니다.</div>
  }

  const selectedConversationId = selectedConversationSummary.id

  function handleSelectConversation(conversationId: string): void {
    operatorConsole.selectConversation(conversationId)
  }

  function handleAssignConversation(): void {
    operatorConsole.assignConversation(
      selectedConversationId,
      OPERATOR_CONSOLE.DEFAULT_ASSIGN_AGENT_NAME,
    )
  }

  return (
    <div>
      <ConversationList
        conversations={operatorConsole.state.conversationSummaries}
        selectedConversationId={operatorConsole.state.selectedConversationId}
        onSelectConversation={handleSelectConversation}
      />
      <MessageThread
        conversationSummary={selectedConversationSummary}
        messages={selectedMessages}
        onAssign={handleAssignConversation}
      />
      <CustomerContextPanel conversationSummary={selectedConversationSummary} />
    </div>
  )
}
