'use client'

import { useRef, useState } from 'react'
import {
  ConversationClient,
  type BuildConversationAssistantMessageParams,
  type BuildConversationRequestParams,
  type BuiltConversationAssistantMessage,
} from '../client/conversation-client'
import { createChatMessageId } from '../lib/create-chat-message-id'
import type { ChatMessage } from '../model/chat-message'
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
  persistence?: ChatPersistence<ChatMessage<TMessageMetadata>>
  senderId?: string
  assistantSenderId?: string
  createMessageId?: () => string
  getCurrentDate?: () => Date
}

export interface UseChatControllerResult<TMessageMetadata = unknown> {
  messages: Array<ChatMessage<TMessageMetadata>>
  inputValue: string
  isSubmitting: boolean
  setInputValue: (nextInputValue: string) => void
  submitMessage: (contentOverride?: string) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  clearMessages: () => void
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
  persistence,
  senderId = 'participant-user',
  assistantSenderId = 'participant-assistant',
  createMessageId = createChatMessageId,
  getCurrentDate = () => new Date(),
}: UseChatControllerParams<
  TRequest,
  TResponse,
  TMessageMetadata
>): UseChatControllerResult<TMessageMetadata> {
  const [messages, setMessages] = useState<Array<ChatMessage<TMessageMetadata>>>(
    () => persistence?.read() ?? [],
  )
  const clientRef = useRef<
    ConversationClient<TRequest, TResponse, TMessageMetadata> | undefined
  >(undefined)

  if (!clientRef.current) {
    clientRef.current = new ConversationClient<
      TRequest,
      TResponse,
      TMessageMetadata
    >({
      conversationId,
      senderId,
      assistantSenderId,
      transport,
      buildRequest,
      buildAssistantMessage,
      persistence,
      onMessagesChange: setMessages,
      createMessageId,
      getCurrentDate,
    })
  }

  const [inputValue, setInputValue] = useState('')
  const inputValueReference = useRef('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submitMessage(contentOverride?: string): Promise<void> {
    const trimmedContent = (contentOverride ?? inputValueReference.current).trim()

    if (!trimmedContent || isSubmitting) {
      return
    }

    if (!contentOverride) {
      updateInputValue('')
    }

    setIsSubmitting(true)

    try {
      const result = await clientRef.current?.submitMessage(trimmedContent)
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

  return {
    messages,
    inputValue,
    isSubmitting,
    setInputValue: updateInputValue,
    submitMessage,
    retryMessage,
    clearMessages,
  }

  function updateInputValue(nextInputValue: string): void {
    inputValueReference.current = nextInputValue
    setInputValue(nextInputValue)
  }
}
