import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  buildChatEvent,
  createTextMessageParts,
  getChatMessageText,
  useChatOperatorConsole,
  type ChatConversation,
  type ChatEvent,
  type ChatMessage,
} from 'lee-chat-sdk'

interface OperatorConsoleStoryProps {
  initialSelectedConversationId: string
  initialEvents: ChatEvent[]
}

interface OperatorMessageMetadata {
  internalNote?: boolean
}

const OPERATOR_CONSOLE_STORY = {
  CURRENT_PARTICIPANT_ID: 'operator-mina',
} as const

const CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conversation-pricing',
    kind: 'support',
    status: 'open',
    participants: [
      {
        id: 'participant-yujin',
        kind: 'user',
        displayName: 'Yujin Kim',
      },
      {
        id: OPERATOR_CONSOLE_STORY.CURRENT_PARTICIPANT_ID,
        kind: 'operator',
        displayName: 'Mina',
      },
    ],
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'conversation-delivery',
    kind: 'support',
    status: 'open',
    participants: [
      {
        id: 'participant-alex',
        kind: 'user',
        displayName: 'Alex Lee',
      },
    ],
    createdAt: '2026-06-01T00:01:00.000Z',
  },
  {
    id: 'conversation-closed',
    kind: 'support',
    status: 'closed',
    participants: [
      {
        id: 'participant-rina',
        kind: 'user',
        displayName: 'Rina Park',
      },
    ],
    createdAt: '2026-06-01T00:02:00.000Z',
  },
]

const MESSAGES: Array<ChatMessage<OperatorMessageMetadata>> = [
  createOperatorMessage({
    id: 'message-pricing-user',
    conversationId: 'conversation-pricing',
    senderId: 'participant-yujin',
    role: 'user',
    content: '요금제를 알고 싶어요',
    createdAt: '2026-06-01T00:03:00.000Z',
  }),
  createOperatorMessage({
    id: 'message-pricing-note',
    conversationId: 'conversation-pricing',
    senderId: OPERATOR_CONSOLE_STORY.CURRENT_PARTICIPANT_ID,
    role: 'system',
    content: '결제 직전 이탈 가능성이 높음',
    createdAt: '2026-06-01T00:04:00.000Z',
    metadata: {
      internalNote: true,
    },
  }),
  createOperatorMessage({
    id: 'message-delivery-user',
    conversationId: 'conversation-delivery',
    senderId: 'participant-alex',
    role: 'user',
    content: '배송 상태를 확인하고 싶어요',
    createdAt: '2026-06-01T00:05:00.000Z',
  }),
  createOperatorMessage({
    id: 'message-closed-user',
    conversationId: 'conversation-closed',
    senderId: 'participant-rina',
    role: 'user',
    content: '문의 해결됐습니다. 감사합니다.',
    createdAt: '2026-06-01T00:06:00.000Z',
  }),
]

const BASE_EVENTS: ChatEvent[] = [
  buildChatEvent({
    id: 'event-pricing-customer-page',
    conversationId: 'conversation-pricing',
    type: 'customer_event.recorded',
    createdAt: '2026-06-01T00:00:00.000Z',
    payload: {
      customerEventId: 'pricing-page-opened',
    },
  }),
  buildChatEvent({
    id: 'event-delivery-customer-page',
    conversationId: 'conversation-delivery',
    type: 'customer_event.recorded',
    createdAt: '2026-06-01T00:00:00.000Z',
    payload: {
      customerEventId: 'order-detail-opened',
    },
  }),
]

function OperatorConsoleStory({
  initialSelectedConversationId,
  initialEvents,
}: OperatorConsoleStoryProps) {
  const operatorConsole = useChatOperatorConsole<OperatorMessageMetadata>({
    conversations: CONVERSATIONS,
    messages: MESSAGES,
    initialEvents,
    initialSelectedConversationId,
    currentParticipantId: OPERATOR_CONSOLE_STORY.CURRENT_PARTICIPANT_ID,
  })
  const selectedSummary =
    operatorConsole.selectedConversationSummary ??
    operatorConsole.state.conversationSummaries[0]

  if (!selectedSummary) {
    return <div className="operator-console-story">No conversations</div>
  }

  const selectedMessages = operatorConsole.state.messages.filter((message) => {
    return message.conversationId === selectedSummary.id
  })

  return (
    <div className="operator-console-story">
      <aside aria-label="Conversation queue">
        <h2>Conversations</h2>
        {operatorConsole.state.conversationSummaries.map((summary) => (
          <button
            key={summary.id}
            type="button"
            aria-pressed={summary.id === selectedSummary.id}
            onClick={() => operatorConsole.selectConversation(summary.id)}
          >
            <strong>{summary.title}</strong>
            <span>{summary.lastMessagePreview}</span>
            <small>{summary.status}</small>
            {summary.unreadCount > 0 ? <em>{summary.unreadCount}</em> : null}
          </button>
        ))}
      </aside>
      <main aria-label="Conversation thread">
        <header>
          <h1>{selectedSummary.title}</h1>
          <p>{selectedSummary.status}</p>
          <p>{selectedSummary.assignedAgentName ?? 'Unassigned'}</p>
        </header>
        <ol>
          {selectedMessages.map((message) => (
            <li key={message.id}>
              <article>
                <strong>
                  {message.metadata?.internalNote ? 'internal note' : message.role}
                </strong>
                <p>{getChatMessageText(message)}</p>
              </article>
            </li>
          ))}
        </ol>
      </main>
      <aside aria-label="Customer context">
        <h2>Context</h2>
        <p>{selectedSummary.title}</p>
        <ul>
          {selectedSummary.customerEventIds.map((customerEventId) => (
            <li key={customerEventId}>{customerEventId}</li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

const meta = {
  title: 'Lee Chat/OperatorConsole',
  component: OperatorConsoleStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Operator console states built with useChatOperatorConsole for queue, thread, and customer-context review.',
      },
    },
    layout: 'fullscreen',
  },
} satisfies Meta<typeof OperatorConsoleStory>

export default meta

type Story = StoryObj<typeof meta>

export const AssignedQueue: Story = {
  args: {
    initialSelectedConversationId: 'conversation-pricing',
    initialEvents: [
      ...BASE_EVENTS,
      buildChatEvent({
        id: 'event-pricing-assigned',
        conversationId: 'conversation-pricing',
        type: 'conversation.assigned',
        createdAt: '2026-06-01T00:07:00.000Z',
        payload: {
          agentName: 'Mina',
        },
      }),
    ],
  },
}

export const UnassignedQueue: Story = {
  args: {
    initialSelectedConversationId: 'conversation-delivery',
    initialEvents: BASE_EVENTS,
  },
}

export const ClosedConversation: Story = {
  args: {
    initialSelectedConversationId: 'conversation-closed',
    initialEvents: [
      ...BASE_EVENTS,
      buildChatEvent({
        id: 'event-closed',
        conversationId: 'conversation-closed',
        type: 'conversation.closed',
        createdAt: '2026-06-01T00:08:00.000Z',
        payload: {},
      }),
    ],
  },
}

function createOperatorMessage(
  params: Omit<ChatMessage<OperatorMessageMetadata>, 'parts' | 'status'>,
): ChatMessage<OperatorMessageMetadata> {
  return {
    ...params,
    parts: createTextMessageParts(params.content),
    status: 'sent',
  }
}
