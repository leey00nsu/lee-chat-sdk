'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { resolveLeeChatConfig, type LeeChatConfig } from '../config/lee-chat-config'
import { useChatController } from '../controller/use-chat-controller'
import { MemoryChatPersistence } from '../persistence/memory-chat-persistence'
import { LocalStorageChatPersistence } from '../persistence/local-storage-chat-persistence'
import { HttpChatTransport } from '../transport/http-chat-transport'
import { buildLeeChatRequest, parseLeeChatResponse, type LeeChatRequest, type LeeChatResponse } from '../request/lee-chat-request'
import { createTextMessageParts, type ChatMessage } from '../model/chat-message'
import type { ChatEventTransport } from '../transport/chat-event-transport'
import type { ChatReadReceipt } from '../model/chat-participant-state'
import type { MarkMessageReadParams, MarkMessageReadResponse } from '../client/conversation-sync-client'
import type {
  BuildConversationAssistantMessageParams,
  BuildConversationRequestParams,
} from '../client/conversation-client'
import { LeeChatContext } from './lee-chat-context'

export interface LeeChatProviderProps<
  TMessageMetadata = Record<string, unknown>,
> {
  config: LeeChatConfig
  children?: ReactNode
  fetchImplementation?: typeof fetch
  eventTransport?: ChatEventTransport
  syncClient?: {
    markMessageRead(
      params: MarkMessageReadParams,
    ): Promise<MarkMessageReadResponse>
  }
}

const LEE_CHAT_STORAGE = {
  VERSION: 1,
  KEY_PREFIX: 'lee-chat',
} as const

function validatePersistedMessages<TMessageMetadata>(
  messages: unknown,
): Array<ChatMessage<TMessageMetadata>> {
  return Array.isArray(messages)
    ? (messages as Array<ChatMessage<TMessageMetadata>>)
    : []
}

export function LeeChatProvider<
  TMessageMetadata = Record<string, unknown>,
>({
  config,
  children,
  fetchImplementation,
  eventTransport,
  syncClient,
}: LeeChatProviderProps<TMessageMetadata>) {
  const resolvedConfig = useMemo(() => resolveLeeChatConfig(config), [config])
  const [isOpen, setIsOpen] = useState(resolvedConfig.initialOpen)
  const syncedReadMessageIdsRef = useRef<Set<string>>(new Set())
  const conversationId = resolvedConfig.conversation.id
  const transport = useMemo(() => {
    return new HttpChatTransport<
      LeeChatRequest,
      LeeChatResponse<TMessageMetadata>
    >({
      endpoint: resolvedConfig.endpoint,
      fetchImplementation,
      headers: resolvedConfig.requestHeaders,
      auth: resolvedConfig.requestAuth,
      timeoutMs: resolvedConfig.requestTimeoutMs,
      retry: resolvedConfig.requestRetry,
    })
  }, [
    fetchImplementation,
    resolvedConfig.endpoint,
    resolvedConfig.requestAuth,
    resolvedConfig.requestHeaders,
    resolvedConfig.requestRetry,
    resolvedConfig.requestTimeoutMs,
  ])
  const persistence = useMemo(() => {
    if (resolvedConfig.persistence === 'localStorage') {
      return new LocalStorageChatPersistence<ChatMessage<TMessageMetadata>>({
        storageKey: `${LEE_CHAT_STORAGE.KEY_PREFIX}:${resolvedConfig.appId}:${resolvedConfig.conversation.id}`,
        storageVersion: LEE_CHAT_STORAGE.VERSION,
        validateMessages: validatePersistedMessages<TMessageMetadata>,
      })
    }

    return new MemoryChatPersistence<ChatMessage<TMessageMetadata>>()
  }, [
    resolvedConfig.appId,
    resolvedConfig.conversation.id,
    resolvedConfig.persistence,
  ])
  const initialMessages = useMemo(() => {
    if (!resolvedConfig.initialMessage) {
      return []
    }

    return [
      {
        id: `${resolvedConfig.conversation.id}:initial-message`,
        conversationId: resolvedConfig.conversation.id,
        senderId: `${resolvedConfig.appId}-assistant`,
        role: 'assistant' as const,
        content: resolvedConfig.initialMessage,
        parts: createTextMessageParts(resolvedConfig.initialMessage),
        status: 'sent' as const,
        createdAt: new Date().toISOString(),
      },
    ] satisfies Array<ChatMessage<TMessageMetadata>>
  }, [
    resolvedConfig.appId,
    resolvedConfig.conversation.id,
    resolvedConfig.initialMessage,
  ])
  const buildRequest = useCallback(
    ({
      content,
      parts,
      conversationId: requestConversationId,
      messages,
    }: BuildConversationRequestParams<TMessageMetadata>) => {
      const userMessage: ChatMessage = {
        id: `${requestConversationId}:request`,
        conversationId: requestConversationId,
        senderId: resolvedConfig.participant.id,
        role: 'user',
        content,
        parts,
        status: 'sent',
        createdAt: new Date().toISOString(),
      }

      return buildLeeChatRequest({
        appId: resolvedConfig.appId,
        conversation: resolvedConfig.conversation,
        participant: resolvedConfig.participant,
        visitor: resolvedConfig.visitor,
        metadata: resolvedConfig.metadata,
        message: userMessage,
        history: messages,
      })
    },
    [
      resolvedConfig.appId,
      resolvedConfig.conversation,
      resolvedConfig.metadata,
      resolvedConfig.participant,
      resolvedConfig.visitor,
    ],
  )
  const buildAssistantMessage = useCallback(
    ({
      response,
    }: BuildConversationAssistantMessageParams<
      LeeChatResponse<TMessageMetadata>,
      TMessageMetadata
    >) => {
      const parsedResponse = parseLeeChatResponse(response)

      return {
        content: parsedResponse.message.content,
        parts: parsedResponse.message.parts,
        metadata: parsedResponse.message.metadata,
      }
    },
    [],
  )
  const controllerResetKey = useMemo(() => {
    return [
      resolvedConfig.appId,
      resolvedConfig.endpoint,
      resolvedConfig.conversation.id,
      resolvedConfig.participant.id,
      resolvedConfig.visitor.id,
      resolvedConfig.persistence,
      resolvedConfig.initialMessage ?? '',
    ].join('|')
  }, [
    resolvedConfig.appId,
    resolvedConfig.endpoint,
    resolvedConfig.conversation.id,
    resolvedConfig.initialMessage,
    resolvedConfig.participant.id,
    resolvedConfig.persistence,
    resolvedConfig.visitor.id,
  ])
  const chat = useChatController<
    LeeChatRequest,
    LeeChatResponse<TMessageMetadata>,
    TMessageMetadata
  >({
    conversationId,
    transport,
    persistence,
    initialMessages,
    buildRequest,
    buildAssistantMessage,
    senderId: resolvedConfig.participant.id,
    assistantSenderId: `${resolvedConfig.appId}-assistant`,
    resetKey: controllerResetKey,
  })
  const unreadMessages = chat.messages.filter((message) => {
    return isUnreadMessage({
      message,
      participantId: resolvedConfig.participant.id,
      readReceipts: chat.participantState.readReceipts,
    })
  })
  const unreadCount = isOpen ? 0 : unreadMessages.length

  useEffect(() => {
    if (!eventTransport) {
      return undefined
    }

    return eventTransport.subscribe(chat.applyEvent)
  }, [chat.applyEvent, eventTransport])

  useEffect(() => {
    if (!isOpen || !syncClient) {
      return
    }

    const latestUnreadMessage = unreadMessages.at(-1)

    if (!latestUnreadMessage) {
      return
    }

    if (syncedReadMessageIdsRef.current.has(latestUnreadMessage.id)) {
      return
    }

    syncedReadMessageIdsRef.current.add(latestUnreadMessage.id)

    void syncClient
      .markMessageRead({
        conversationId: latestUnreadMessage.conversationId,
        messageId: latestUnreadMessage.id,
        participantId: resolvedConfig.participant.id,
      })
      .then(({ readReceipt }) => {
        chat.applyEvent({
          type: 'message.read',
          readReceipt,
        })
      })
  }, [chat, isOpen, resolvedConfig.participant.id, syncClient, unreadMessages])

  return (
    <LeeChatContext.Provider
      value={{
        config: resolvedConfig,
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((previousIsOpen) => !previousIsOpen),
        unreadCount,
        chat,
        messages: chat.messages,
        participantState: chat.participantState,
        submitMessage: chat.submitMessage,
        applyEvent: chat.applyEvent,
      }}
    >
      {children}
    </LeeChatContext.Provider>
  )
}

function isUnreadMessage({
  message,
  participantId,
  readReceipts,
}: {
  message: ChatMessage<unknown>
  participantId: string
  readReceipts: ChatReadReceipt[]
}): boolean {
  if (message.senderId === participantId || message.status !== 'sent') {
    return false
  }

  return !readReceipts.some((readReceipt) => {
    return (
      readReceipt.conversationId === message.conversationId &&
      readReceipt.messageId === message.id &&
      readReceipt.participantId === participantId
    )
  })
}
