import type { ChatConversation } from './chat-conversation'
import { buildChatEvent, type ChatEvent } from './chat-event'
import type { ChatMessage } from './chat-message'
import {
  buildChatConversationSummaries,
  type ChatConversationSummary,
} from './chat-conversation-summary'

export interface ChatOperatorConsoleState {
  conversations: ChatConversation[]
  messages: ChatMessage[]
  events: ChatEvent[]
  conversationSummaries: ChatConversationSummary[]
  selectedConversationId: string
  currentParticipantId?: string
}

export interface BuildChatOperatorConsoleStateParams {
  conversations: ChatConversation[]
  messages: ChatMessage[]
  events?: ChatEvent[]
  selectedConversationId?: string
  currentParticipantId?: string
}

export interface AssignChatOperatorConversationParams {
  state: ChatOperatorConsoleState
  conversationId: string
  agentName: string
  eventId: string
  createdAt: string
}

export interface CloseChatOperatorConversationParams {
  state: ChatOperatorConsoleState
  conversationId: string
  eventId: string
  createdAt: string
}

export function buildChatOperatorConsoleState({
  conversations,
  messages,
  events = [],
  selectedConversationId = conversations[0]?.id ?? '',
  currentParticipantId,
}: BuildChatOperatorConsoleStateParams): ChatOperatorConsoleState {
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

export function assignChatOperatorConversation({
  state,
  conversationId,
  agentName,
  eventId,
  createdAt,
}: AssignChatOperatorConversationParams): ChatOperatorConsoleState {
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

export function closeChatOperatorConversation({
  state,
  conversationId,
  eventId,
  createdAt,
}: CloseChatOperatorConversationParams): ChatOperatorConsoleState {
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

function rebuildChatOperatorConsoleState({
  state,
  events,
}: {
  state: ChatOperatorConsoleState
  events: ChatEvent[]
}): ChatOperatorConsoleState {
  return buildChatOperatorConsoleState({
    conversations: state.conversations,
    messages: state.messages,
    events,
    selectedConversationId: state.selectedConversationId,
    currentParticipantId: state.currentParticipantId,
  })
}
