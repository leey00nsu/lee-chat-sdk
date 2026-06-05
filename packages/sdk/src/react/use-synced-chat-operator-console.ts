'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ListConversationsParams,
  ListConversationsResponse,
  ListMessagesParams,
  ListMessagesResponse,
} from '../client/conversation-sync-client'
import type { ChatConversation } from '../model/chat-conversation'
import { buildChatEvent, type ChatEvent, type ChatEventType } from '../model/chat-event'
import type { ChatMessage } from '../model/chat-message'
import type { ChatEventTransport } from '../transport/chat-event-transport'
import {
  useChatOperatorConsole,
  type UseChatOperatorConsoleParams,
  type UseChatOperatorConsoleResult,
} from './use-chat-operator-console'

export interface SyncedChatOperatorConsoleClient<
  TConversationMetadata extends Record<string, unknown> = Record<string, unknown>,
  TMessageMetadata = unknown,
> {
  listConversations(
    params?: ListConversationsParams,
  ): Promise<ListConversationsResponse<TConversationMetadata>>
  listMessages(
    params: ListMessagesParams,
  ): Promise<ListMessagesResponse<TMessageMetadata>>
}

export interface UseSyncedChatOperatorConsoleParams<
  TConversationMetadata extends Record<string, unknown> = Record<string, unknown>,
  TMessageMetadata = unknown,
> extends Pick<
    UseChatOperatorConsoleParams<TMessageMetadata>,
    'currentParticipantId' | 'createEventId' | 'getCurrentDate'
  > {
  syncClient: SyncedChatOperatorConsoleClient<
    TConversationMetadata,
    TMessageMetadata
  >
  eventTransport?: ChatEventTransport
  listConversationsParams?: ListConversationsParams
  initialSelectedConversationId?: string
}

export interface UseSyncedChatOperatorConsoleResult<TMessageMetadata = unknown>
  extends UseChatOperatorConsoleResult<TMessageMetadata> {
  isLoading: boolean
  error?: Error
  refresh: () => Promise<void>
}

export function useSyncedChatOperatorConsole<
  TConversationMetadata extends Record<string, unknown> = Record<string, unknown>,
  TMessageMetadata = unknown,
>({
  syncClient,
  eventTransport,
  listConversationsParams,
  initialSelectedConversationId,
  currentParticipantId,
  createEventId,
  getCurrentDate,
}: UseSyncedChatOperatorConsoleParams<
  TConversationMetadata,
  TMessageMetadata
>): UseSyncedChatOperatorConsoleResult<TMessageMetadata> {
  const [conversations, setConversations] = useState<
    Array<ChatConversation<TConversationMetadata>>
  >([])
  const [messages, setMessages] = useState<Array<ChatMessage<TMessageMetadata>>>(
    [],
  )
  const [events, setEvents] = useState<ChatEvent[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState(
    initialSelectedConversationId ?? '',
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | undefined>(undefined)
  const stableListConversationsParams = useMemo(
    () => listConversationsParams ?? {},
    [listConversationsParams],
  )
  const operatorConsole = useChatOperatorConsole<TMessageMetadata>({
    conversations,
    messages,
    initialEvents: events,
    initialSelectedConversationId: selectedConversationId,
    currentParticipantId,
    createEventId,
    getCurrentDate,
  })
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(undefined)

    try {
      const conversationPage = await syncClient.listConversations(
        stableListConversationsParams,
      )
      const nextSelectedConversationId =
        selectedConversationId ||
        initialSelectedConversationId ||
        conversationPage.conversations[0]?.id ||
        ''
      const selectedConversation =
        conversationPage.conversations.find((conversation) => {
          return conversation.id === nextSelectedConversationId
        }) ?? conversationPage.conversations[0]
      const messagePage = selectedConversation
        ? await syncClient.listMessages({
            conversationId: selectedConversation.id,
          })
        : {
            messages: [],
          }

      setConversations(conversationPage.conversations)
      setSelectedConversationId(selectedConversation?.id ?? '')
      setMessages(messagePage.messages)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError
          : new Error('Failed to sync operator console.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    initialSelectedConversationId,
    selectedConversationId,
    stableListConversationsParams,
    syncClient,
  ])
  const selectConversation = useCallback(
    (conversationId: string): void => {
      setSelectedConversationId(conversationId)
      operatorConsole.selectConversation(conversationId)

      void syncClient
        .listMessages({
          conversationId,
        })
        .then((messagePage) => {
          setMessages(messagePage.messages)
        })
        .catch((caughtError) => {
          setError(
            caughtError instanceof Error
              ? caughtError
              : new Error('Failed to load conversation messages.'),
          )
        })
    },
    [operatorConsole, syncClient],
  )
  const appendEvent = useCallback((event: ChatEvent): void => {
    setEvents((previousEvents) => [...previousEvents, event])
    operatorConsole.appendEvent(event)
  }, [operatorConsole])
  const assignConversation = useCallback(
    (conversationId: string, agentName: string): void => {
      const eventType: ChatEventType = 'conversation.assigned'
      const event = buildChatEvent({
        id: createEventId?.(eventType) ?? `${eventType}:${conversationId}`,
        conversationId,
        type: eventType,
        createdAt: (getCurrentDate?.() ?? new Date()).toISOString(),
        payload: {
          agentName,
        },
      })

      appendEvent(event)
    },
    [appendEvent, createEventId, getCurrentDate],
  )
  const closeConversation = useCallback(
    (conversationId: string): void => {
      const eventType: ChatEventType = 'conversation.closed'
      const event = buildChatEvent({
        id: createEventId?.(eventType) ?? `${eventType}:${conversationId}`,
        conversationId,
        type: eventType,
        createdAt: (getCurrentDate?.() ?? new Date()).toISOString(),
        payload: {},
      })

      appendEvent(event)
    },
    [appendEvent, createEventId, getCurrentDate],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!eventTransport) {
      return undefined
    }

    return eventTransport.subscribe((event) => {
      const conversationId =
        'presence' in event
          ? conversations[0]?.id
          : 'typingIndicator' in event
            ? event.typingIndicator.conversationId
            : event.readReceipt.conversationId

      if (!conversationId) {
        return
      }

      appendEvent(
        buildChatEvent({
          id: createOperatorEventIdFromRealtimeEvent(event),
          conversationId,
          type: 'customer_event.recorded',
          createdAt: resolveOperatorEventCreatedAt(event),
          payload: event,
        }),
      )
    })
  }, [appendEvent, conversations, eventTransport])

  return {
    ...operatorConsole,
    state: {
      ...operatorConsole.state,
      events,
    },
    selectedConversation:
      conversations.find((conversation) => {
        return conversation.id === selectedConversationId
      }) ?? operatorConsole.selectedConversation,
    selectedConversationSummary:
      operatorConsole.state.conversationSummaries.find((summary) => {
        return summary.id === selectedConversationId
      }) ?? operatorConsole.selectedConversationSummary,
    selectConversation,
    assignConversation,
    closeConversation,
    appendEvent,
    isLoading,
    error,
    refresh,
  }
}

type RealtimeOperatorEvent = Parameters<ChatEventTransport['subscribe']>[0] extends (
  event: infer TEvent,
) => void
  ? TEvent
  : never

function createOperatorEventIdFromRealtimeEvent(
  event: RealtimeOperatorEvent,
): string {
  if ('presence' in event) {
    return `${event.type}:${event.presence.participantId}`
  }

  if ('typingIndicator' in event) {
    return `${event.type}:${event.typingIndicator.participantId}`
  }

  return `${event.type}:${event.readReceipt.messageId}:${event.readReceipt.participantId}`
}

function resolveOperatorEventCreatedAt(event: RealtimeOperatorEvent): string {
  if ('presence' in event) {
    return event.presence.updatedAt
  }

  if ('typingIndicator' in event) {
    return event.typingIndicator.updatedAt
  }

  return event.readReceipt.readAt
}
