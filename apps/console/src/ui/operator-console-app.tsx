'use client'

import { useMemo, useState, type FormEvent } from 'react'
import {
  createTextMessageParts,
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

type ConversationFilter = 'all' | 'open' | 'unassigned' | 'closed'

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
  query,
  filter,
  metrics,
  onQueryChange,
  onFilterChange,
  onSelectConversation,
}: {
  conversations: ChatConversationSummary[]
  selectedConversationId: string
  query: string
  filter: ConversationFilter
  metrics: {
    total: number
    open: number
    unassigned: number
    closed: number
  }
  onQueryChange: (query: string) => void
  onFilterChange: (filter: ConversationFilter) => void
  onSelectConversation: (conversationId: string) => void
}) {
  return (
    <nav aria-label="대화 목록">
      <h2>대화 목록</h2>
      <dl>
        <div>
          <dt>전체</dt>
          <dd>{metrics.total}</dd>
        </div>
        <div>
          <dt>진행 중</dt>
          <dd>{metrics.open}</dd>
        </div>
        <div>
          <dt>미배정</dt>
          <dd>{metrics.unassigned}</dd>
        </div>
        <div>
          <dt>종료</dt>
          <dd>{metrics.closed}</dd>
        </div>
      </dl>
      <label htmlFor="operator-conversation-search">대화 검색</label>
      <input
        id="operator-conversation-search"
        value={query}
        placeholder="고객, 상태, 최근 메시지"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <div role="toolbar" aria-label="대화 필터">
        <button
          type="button"
          aria-pressed={filter === 'all'}
          onClick={() => onFilterChange('all')}
        >
          전체
        </button>
        <button
          type="button"
          aria-pressed={filter === 'open'}
          onClick={() => onFilterChange('open')}
        >
          진행 중
        </button>
        <button
          type="button"
          aria-pressed={filter === 'unassigned'}
          onClick={() => onFilterChange('unassigned')}
        >
          미배정
        </button>
        <button
          type="button"
          aria-pressed={filter === 'closed'}
          onClick={() => onFilterChange('closed')}
        >
          종료됨
        </button>
      </div>
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
      {conversations.length === 0 ? <p>조건에 맞는 대화가 없습니다.</p> : null}
    </nav>
  )
}

function MessageThread({
  conversationSummary,
  messages,
  replyValue,
  onAssign,
  onClose,
  onReplyChange,
  onReplySubmit,
}: {
  conversationSummary: ChatConversationSummary
  messages: Array<ChatMessage<OperatorMessageMetadata>>
  replyValue: string
  onAssign: () => void
  onClose: () => void
  onReplyChange: (reply: string) => void
  onReplySubmit: () => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onReplySubmit()
  }

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
        {conversationSummary.status !== 'closed' ? (
          <button type="button" onClick={onClose}>
            상담 종료
          </button>
        ) : null}
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
      {conversationSummary.status !== 'closed' ? (
        <form onSubmit={handleSubmit}>
          <label htmlFor="operator-reply">상담 응답</label>
          <textarea
            id="operator-reply"
            value={replyValue}
            onChange={(event) => onReplyChange(event.target.value)}
          />
          <button type="submit" disabled={!replyValue.trim()}>
            응답 전송
          </button>
        </form>
      ) : null}
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
  const [messages, setMessages] =
    useState<Array<ChatMessage<OperatorMessageMetadata>>>(OPERATOR_MESSAGES)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ConversationFilter>('all')
  const [replyValue, setReplyValue] = useState('')
  const operatorConsole = useChatOperatorConsole<OperatorMessageMetadata>({
    conversations: OPERATOR_CONVERSATIONS,
    messages,
    initialEvents: OPERATOR_EVENTS,
    initialSelectedConversationId: OPERATOR_CONSOLE_SEED.selectedConversationId,
  })
  const filteredConversationSummaries = useMemo(() => {
    return operatorConsole.state.conversationSummaries.filter((summary) => {
      const normalizedQuery = query.trim().toLowerCase()
      const matchesQuery =
        !normalizedQuery ||
        [
          summary.title,
          summary.id,
          summary.lastMessagePreview,
          summary.status,
          summary.assignedAgentName ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'open' && summary.status === 'assigned') ||
        (filter === 'unassigned' && summary.status === 'unassigned') ||
        (filter === 'closed' && summary.status === 'closed')

      return matchesQuery && matchesFilter
    })
  }, [filter, operatorConsole.state.conversationSummaries, query])
  const metrics = useMemo(() => {
    return {
      total: operatorConsole.state.conversationSummaries.length,
      open: operatorConsole.state.conversationSummaries.filter((summary) => {
        return summary.status === 'assigned'
      }).length,
      unassigned: operatorConsole.state.conversationSummaries.filter((summary) => {
        return summary.status === 'unassigned'
      }).length,
      closed: operatorConsole.state.conversationSummaries.filter((summary) => {
        return summary.status === 'closed'
      }).length,
    }
  }, [operatorConsole.state.conversationSummaries])
  const selectedConversationSummary =
    operatorConsole.selectedConversationSummary ??
    filteredConversationSummaries[0] ??
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

  function handleCloseConversation(): void {
    operatorConsole.closeConversation(selectedConversationId)
  }

  function handleReplySubmit(): void {
    const content = replyValue.trim()

    if (!content) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `${selectedConversationId}:agent-reply:${currentMessages.length}`,
        conversationId: selectedConversationId,
        senderId: `participant-${OPERATOR_CONSOLE.DEFAULT_ASSIGN_AGENT_NAME.toLowerCase()}`,
        role: 'agent',
        content,
        parts: createTextMessageParts(content),
        status: 'sent',
        createdAt: new Date().toISOString(),
        metadata: {
          agentName: OPERATOR_CONSOLE.DEFAULT_ASSIGN_AGENT_NAME,
        },
      },
    ])
    setReplyValue('')
  }

  return (
    <div>
      <ConversationList
        conversations={filteredConversationSummaries}
        selectedConversationId={operatorConsole.state.selectedConversationId}
        query={query}
        filter={filter}
        metrics={metrics}
        onQueryChange={setQuery}
        onFilterChange={setFilter}
        onSelectConversation={handleSelectConversation}
      />
      <MessageThread
        conversationSummary={selectedConversationSummary}
        messages={selectedMessages}
        replyValue={replyValue}
        onAssign={handleAssignConversation}
        onClose={handleCloseConversation}
        onReplyChange={setReplyValue}
        onReplySubmit={handleReplySubmit}
      />
      <CustomerContextPanel conversationSummary={selectedConversationSummary} />
    </div>
  )
}
