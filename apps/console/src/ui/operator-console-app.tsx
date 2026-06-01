'use client'

import { useState } from 'react'
import {
  OPERATOR_CONSOLE_SEED,
  assignOperatorConversation,
  selectOperatorConversation,
  type OperatorConsoleState,
  type OperatorConversation,
} from '../model/operator-console'

const OPERATOR_CONSOLE = {
  DEFAULT_ASSIGN_AGENT_NAME: 'Jin',
} as const

function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: {
  conversations: OperatorConversation[]
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
          <strong>{conversation.customerName}</strong>
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
  conversation,
  onAssign,
}: {
  conversation: OperatorConversation
  onAssign: () => void
}) {
  return (
    <main aria-label="메시지 스레드">
      <header>
        <h1>{conversation.customerName}</h1>
        <p>{conversation.status}</p>
        {conversation.assignedAgentName ? (
          <p>{conversation.assignedAgentName}</p>
        ) : (
          <button type="button" onClick={onAssign}>
            {OPERATOR_CONSOLE.DEFAULT_ASSIGN_AGENT_NAME}에게 배정
          </button>
        )}
      </header>
      <ol>
        {conversation.messages.map((message) => (
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
  conversation,
}: {
  conversation: OperatorConversation
}) {
  return (
    <aside aria-label="고객 컨텍스트">
      <h2>고객 컨텍스트</h2>
      <p>{conversation.customerName}</p>
      <p>{conversation.assignedAgentName ?? '미배정'}</p>
      <ul>
        {conversation.customerEvents.map((customerEvent) => (
          <li key={customerEvent}>{customerEvent}</li>
        ))}
      </ul>
    </aside>
  )
}

export function OperatorConsoleApp() {
  const [state, setState] = useState<OperatorConsoleState>(OPERATOR_CONSOLE_SEED)
  const selectedConversation = selectOperatorConversation(state)

  function handleSelectConversation(conversationId: string): void {
    setState((previousState) => ({
      ...previousState,
      selectedConversationId: conversationId,
    }))
  }

  function handleAssignConversation(): void {
    setState((previousState) =>
      assignOperatorConversation({
        state: previousState,
        conversationId: selectedConversation.id,
        agentName: OPERATOR_CONSOLE.DEFAULT_ASSIGN_AGENT_NAME,
      }),
    )
  }

  return (
    <div>
      <ConversationList
        conversations={state.conversations}
        selectedConversationId={state.selectedConversationId}
        onSelectConversation={handleSelectConversation}
      />
      <MessageThread
        conversation={selectedConversation}
        onAssign={handleAssignConversation}
      />
      <CustomerContextPanel conversation={selectedConversation} />
    </div>
  )
}
