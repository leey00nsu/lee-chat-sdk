'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ChatConversation } from '../model/chat-conversation'
import type { ChatEvent, ChatEventType } from '../model/chat-event'
import type { ChatMessage } from '../model/chat-message'
import {
  assignChatOperatorConversation,
  buildChatOperatorConsoleState,
  closeChatOperatorConversation,
  selectChatOperatorConversationSummary,
  selectChatOperatorConsoleConversation,
  type ChatOperatorConsoleState,
} from '../model/chat-operator-console'
import type { ChatConversationSummary } from '../model/chat-conversation-summary'

const CHAT_OPERATOR_CONSOLE_EVENT_ID = {
  RANDOM_RADIX: 36,
  RANDOM_SLICE_START: 2,
} as const

export interface UseChatOperatorConsoleParams<TMessageMetadata = unknown> {
  conversations: ChatConversation[]
  messages: Array<ChatMessage<TMessageMetadata>>
  initialEvents?: ChatEvent[]
  initialSelectedConversationId?: string
  currentParticipantId?: string
  createEventId?: (eventType: ChatEventType) => string
  getCurrentDate?: () => Date
}

export interface UseChatOperatorConsoleResult<TMessageMetadata = unknown> {
  state: ChatOperatorConsoleState<TMessageMetadata>
  selectedConversation?: ChatConversation
  selectedConversationSummary?: ChatConversationSummary
  selectConversation: (conversationId: string) => void
  assignConversation: (conversationId: string, agentName: string) => void
  closeConversation: (conversationId: string) => void
  appendEvent: (event: ChatEvent) => void
}

export function useChatOperatorConsole<TMessageMetadata = unknown>({
  conversations,
  messages,
  initialEvents = [],
  initialSelectedConversationId,
  currentParticipantId,
  createEventId = createChatOperatorConsoleEventId,
  getCurrentDate = () => new Date(),
}: UseChatOperatorConsoleParams<TMessageMetadata>): UseChatOperatorConsoleResult<TMessageMetadata> {
  const [events, setEvents] = useState<ChatEvent[]>(initialEvents)
  const [selectedConversationId, setSelectedConversationId] = useState(
    initialSelectedConversationId ?? conversations[0]?.id ?? '',
  )
  const state = useMemo(() => {
    return buildChatOperatorConsoleState({
      conversations,
      messages,
      events,
      selectedConversationId,
      currentParticipantId,
    })
  }, [
    conversations,
    currentParticipantId,
    events,
    messages,
    selectedConversationId,
  ])
  const selectedConversation = selectChatOperatorConsoleConversation(state)
  const selectedConversationSummary = selectChatOperatorConversationSummary(state)
  const buildStateWithEvents = useCallback(
    (nextEvents: ChatEvent[]): ChatOperatorConsoleState<TMessageMetadata> => {
      return buildChatOperatorConsoleState({
        conversations,
        messages,
        events: nextEvents,
        selectedConversationId,
        currentParticipantId,
      })
    },
    [conversations, currentParticipantId, messages, selectedConversationId],
  )

  const assignConversation = useCallback(
    (conversationId: string, agentName: string): void => {
      const eventType: ChatEventType = 'conversation.assigned'

      setEvents((previousEvents) => {
        return assignChatOperatorConversation({
          state: buildStateWithEvents(previousEvents),
          conversationId,
          agentName,
          eventId: createEventId(eventType),
          createdAt: getCurrentDate().toISOString(),
        }).events
      })
    },
    [buildStateWithEvents, createEventId, getCurrentDate],
  )
  const closeConversation = useCallback(
    (conversationId: string): void => {
      const eventType: ChatEventType = 'conversation.closed'

      setEvents((previousEvents) => {
        return closeChatOperatorConversation({
          state: buildStateWithEvents(previousEvents),
          conversationId,
          eventId: createEventId(eventType),
          createdAt: getCurrentDate().toISOString(),
        }).events
      })
    },
    [buildStateWithEvents, createEventId, getCurrentDate],
  )
  const appendEvent = useCallback((event: ChatEvent): void => {
    setEvents((previousEvents) => [...previousEvents, event])
  }, [])

  return {
    state,
    selectedConversation,
    selectedConversationSummary,
    selectConversation: setSelectedConversationId,
    assignConversation,
    closeConversation,
    appendEvent,
  }
}

function createChatOperatorConsoleEventId(eventType: ChatEventType): string {
  if (globalThis.crypto?.randomUUID) {
    return `${eventType}:${globalThis.crypto.randomUUID()}`
  }

  return [
    eventType,
    Date.now().toString(CHAT_OPERATOR_CONSOLE_EVENT_ID.RANDOM_RADIX),
    Math.random()
      .toString(CHAT_OPERATOR_CONSOLE_EVENT_ID.RANDOM_RADIX)
      .slice(CHAT_OPERATOR_CONSOLE_EVENT_ID.RANDOM_SLICE_START),
  ].join(':')
}
