import type { ChatConversation } from './chat-conversation'
import { buildChatEvent, type ChatEvent } from './chat-event'
import type { ChatMessage } from './chat-message'
import {
  buildChatConversationSummaries,
  type ChatConversationSummary,
} from './chat-conversation-summary'

export interface ChatOperatorConsoleState<TMessageMetadata = unknown> {
  conversations: ChatConversation[]
  messages: Array<ChatMessage<TMessageMetadata>>
  events: ChatEvent[]
  conversationSummaries: ChatConversationSummary[]
  selectedConversationId: string
  currentParticipantId?: string
}

export interface BuildChatOperatorConsoleStateParams<
  TMessageMetadata = unknown,
> {
  conversations: ChatConversation[]
  messages: Array<ChatMessage<TMessageMetadata>>
  events?: ChatEvent[]
  selectedConversationId?: string
  currentParticipantId?: string
}

export interface AssignChatOperatorConversationParams<
  TMessageMetadata = unknown,
> {
  state: ChatOperatorConsoleState<TMessageMetadata>
  conversationId: string
  agentName: string
  eventId: string
  createdAt: string
}

export interface CloseChatOperatorConversationParams<
  TMessageMetadata = unknown,
> {
  state: ChatOperatorConsoleState<TMessageMetadata>
  conversationId: string
  eventId: string
  createdAt: string
}

export function buildChatOperatorConsoleState<TMessageMetadata = unknown>({
  conversations,
  messages,
  events = [],
  selectedConversationId = conversations[0]?.id ?? '',
  currentParticipantId,
}: BuildChatOperatorConsoleStateParams<TMessageMetadata>): ChatOperatorConsoleState<TMessageMetadata> {
  return {
    conversations,
    messages,
    events,
    selectedConversationId,
    currentParticipantId,
    conversationSummaries: buildChatConversationSummaries({
      conversations,
      messages,
      events,
      currentParticipantId,
    }),
  }
}

export function selectChatOperatorConsoleConversation(
  state: ChatOperatorConsoleState,
): ChatConversation | undefined {
  return state.conversations.find((conversation) => {
    return conversation.id === state.selectedConversationId
  })
}

export function selectChatOperatorConversationSummary(
  state: ChatOperatorConsoleState,
): ChatConversationSummary | undefined {
  return state.conversationSummaries.find((summary) => {
    return summary.id === state.selectedConversationId
  })
}

export function assignChatOperatorConversation<TMessageMetadata = unknown>({
  state,
  conversationId,
  agentName,
  eventId,
  createdAt,
}: AssignChatOperatorConversationParams<TMessageMetadata>): ChatOperatorConsoleState<TMessageMetadata> {
  return rebuildChatOperatorConsoleState({
    state,
    events: [
      ...state.events,
      buildChatEvent({
        id: eventId,
        conversationId,
        type: 'conversation.assigned',
        createdAt,
        payload: {
          agentName,
        },
      }),
    ],
  })
}

export function closeChatOperatorConversation<TMessageMetadata = unknown>({
  state,
  conversationId,
  eventId,
  createdAt,
}: CloseChatOperatorConversationParams<TMessageMetadata>): ChatOperatorConsoleState<TMessageMetadata> {
  return rebuildChatOperatorConsoleState({
    state,
    events: [
      ...state.events,
      buildChatEvent({
        id: eventId,
        conversationId,
        type: 'conversation.closed',
        createdAt,
        payload: {},
      }),
    ],
  })
}

function rebuildChatOperatorConsoleState<TMessageMetadata = unknown>({
  state,
  events,
}: {
  state: ChatOperatorConsoleState<TMessageMetadata>
  events: ChatEvent[]
}): ChatOperatorConsoleState<TMessageMetadata> {
  return buildChatOperatorConsoleState({
    conversations: state.conversations,
    messages: state.messages,
    events,
    selectedConversationId: state.selectedConversationId,
    currentParticipantId: state.currentParticipantId,
  })
}
