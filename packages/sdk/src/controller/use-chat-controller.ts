'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ConversationClient,
  type BuildConversationAssistantMessageParams,
  type BuildConversationRequestParams,
  type BuiltConversationAssistantMessage,
  type ConversationClientEvent,
  type ConversationParticipantState,
} from '../client/conversation-client'
import { createChatMessageId } from '../lib/create-chat-message-id'
import type { ChatMessage, ChatMessagePart } from '../model/chat-message'
import type { ChatPersistence } from '../persistence/chat-persistence'
import type { ChatTransport } from '../transport/chat-transport'

export interface UseChatControllerParams<
  TRequest,
  TResponse,
  TMessageMetadata = unknown,
> {
  conversationId: string
  transport: ChatTransport<TRequest, TResponse>
  buildRequest: (
    params: BuildConversationRequestParams<TMessageMetadata>,
  ) => TRequest
  buildAssistantMessage: (
    params: BuildConversationAssistantMessageParams<
      TResponse,
      TMessageMetadata
    >,
  ) => BuiltConversationAssistantMessage<TMessageMetadata>
  initialMessages?: Array<ChatMessage<TMessageMetadata>>
  persistence?: ChatPersistence<ChatMessage<TMessageMetadata>>
  senderId?: string
  assistantSenderId?: string
  resetKey?: string
  createMessageId?: () => string
  getCurrentDate?: () => Date
}

export interface UseChatControllerResult<TMessageMetadata = unknown> {
  messages: Array<ChatMessage<TMessageMetadata>>
  participantState: ConversationParticipantState
  inputValue: string
  isSubmitting: boolean
  setInputValue: (nextInputValue: string) => void
  submitMessage: (
    contentOverride?: string,
    partsOverride?: ChatMessagePart[],
  ) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  applyEvent: (event: ConversationClientEvent) => void
  clearMessages: () => void
}

const EMPTY_INITIAL_MESSAGES: [] = []

function getDefaultCurrentDate(): Date {
  return new Date()
}

export function useChatController<
  TRequest,
  TResponse,
  TMessageMetadata = unknown,
>({
  conversationId,
  transport,
  buildRequest,
  buildAssistantMessage,
  initialMessages = EMPTY_INITIAL_MESSAGES,
  persistence,
  senderId = 'participant-user',
  assistantSenderId = 'participant-assistant',
  resetKey,
  createMessageId = createChatMessageId,
  getCurrentDate = getDefaultCurrentDate,
}: UseChatControllerParams<
  TRequest,
  TResponse,
  TMessageMetadata
>): UseChatControllerResult<TMessageMetadata> {
  const [messages, setMessages] = useState<Array<ChatMessage<TMessageMetadata>>>(
    () => {
      const persistedMessages = persistence?.read() ?? []

      return persistedMessages.length > 0 ? persistedMessages : initialMessages
    },
  )
  const [participantState, setParticipantState] =
    useState<ConversationParticipantState>(() => ({
      presences: [],
      typingIndicators: [],
      readReceipts: [],
    }))
  const buildRequestRef = useRef(buildRequest)
  const buildAssistantMessageRef = useRef(buildAssistantMessage)
  buildRequestRef.current = buildRequest
  buildAssistantMessageRef.current = buildAssistantMessage
  const clientRef = useRef<
    ConversationClient<TRequest, TResponse, TMessageMetadata> | undefined
  >(undefined)
  const clientDependenciesRef = useRef<
    | {
        conversationId: string
        senderId: string
        assistantSenderId: string
        resetKey?: string
      }
    | undefined
  >(undefined)
  const nextClientDependencies = {
    conversationId,
    senderId,
    assistantSenderId,
    resetKey,
  }

  if (
    !clientRef.current ||
    shouldRecreateConversationClient(
      clientDependenciesRef.current,
      nextClientDependencies,
    )
  ) {
    clientRef.current = new ConversationClient<
      TRequest,
      TResponse,
      TMessageMetadata
    >({
      conversationId,
      senderId,
      assistantSenderId,
      transport,
      buildRequest: (params) => buildRequestRef.current(params),
      buildAssistantMessage: (params) =>
        buildAssistantMessageRef.current(params),
      initialMessages,
      persistence,
      onMessagesChange: setMessages,
      onParticipantStateChange: setParticipantState,
      createMessageId,
      getCurrentDate,
    })
    clientDependenciesRef.current = nextClientDependencies
  }

  const [inputValue, setInputValue] = useState('')
  const inputValueReference = useRef('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setMessages(clientRef.current?.getMessages() ?? [])
    setParticipantState(
      clientRef.current?.getParticipantState() ?? {
        presences: [],
        typingIndicators: [],
        readReceipts: [],
      },
    )
  }, [conversationId, senderId, assistantSenderId, resetKey])

  async function submitMessage(
    contentOverride?: string,
    partsOverride: ChatMessagePart[] = [],
  ): Promise<void> {
    const trimmedContent = (contentOverride ?? inputValueReference.current).trim()

    if ((!trimmedContent && partsOverride.length === 0) || isSubmitting) {
      return
    }

    if (!contentOverride) {
      updateInputValue('')
    }

    setIsSubmitting(true)

    try {
      const result = await clientRef.current?.submitMessage({
        content: trimmedContent,
        parts: partsOverride.length > 0 ? partsOverride : undefined,
      })
      setMessages(result?.messages ?? [])
    } finally {
      setIsSubmitting(false)
    }
  }

  async function retryMessage(messageId: string): Promise<void> {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await clientRef.current?.retryMessage(messageId)
      setMessages(result?.messages ?? [])
    } finally {
      setIsSubmitting(false)
    }
  }

  function clearMessages(): void {
    setMessages(clientRef.current?.clearMessages() ?? [])
  }

  const applyEvent = useCallback((event: ConversationClientEvent): void => {
    setParticipantState(
      clientRef.current?.applyEvent(event) ?? {
        presences: [],
        typingIndicators: [],
        readReceipts: [],
      },
    )
  }, [])

  return {
    messages,
    participantState,
    inputValue,
    isSubmitting,
    setInputValue: updateInputValue,
    submitMessage,
    retryMessage,
    applyEvent,
    clearMessages,
  }

  function updateInputValue(nextInputValue: string): void {
    inputValueReference.current = nextInputValue
    setInputValue(nextInputValue)
  }
}

function shouldRecreateConversationClient<TRequest, TResponse, TMessageMetadata>(
  previous:
    | {
        conversationId: string
        senderId: string
        assistantSenderId: string
        resetKey?: string
      }
    | undefined,
  next: {
    conversationId: string
    senderId: string
    assistantSenderId: string
    resetKey?: string
  },
): boolean {
  return (
    !previous ||
    previous.conversationId !== next.conversationId ||
    previous.senderId !== next.senderId ||
    previous.assistantSenderId !== next.assistantSenderId ||
    previous.resetKey !== next.resetKey
  )
}
