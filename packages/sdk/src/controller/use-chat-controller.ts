'use client'

import { useEffect, useRef, useState } from 'react'
import { createChatMessageId } from '../lib/create-chat-message-id'
import type { ChatMessage } from '../model/chat-message'
import type { ChatPersistence } from '../persistence/chat-persistence'
import type { ChatTransport } from '../transport/chat-transport'

interface BuildRequestParams<TMessageMetadata> {
  content: string
  conversationId: string
  messages: Array<ChatMessage<TMessageMetadata>>
}

interface BuildAssistantMessageParams<TResponse, TMessageMetadata> {
  response: TResponse
  requestContent: string
  conversationId: string
  messages: Array<ChatMessage<TMessageMetadata>>
}

interface BuiltAssistantMessage<TMessageMetadata> {
  content: string
  metadata?: TMessageMetadata
}

export interface UseChatControllerParams<
  TRequest,
  TResponse,
  TMessageMetadata = unknown,
> {
  conversationId: string
  transport: ChatTransport<TRequest, TResponse>
  buildRequest: (params: BuildRequestParams<TMessageMetadata>) => TRequest
  buildAssistantMessage: (
    params: BuildAssistantMessageParams<TResponse, TMessageMetadata>,
  ) => BuiltAssistantMessage<TMessageMetadata>
  persistence?: ChatPersistence<ChatMessage<TMessageMetadata>>
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

function replaceMessage<TMessageMetadata>(
  messages: Array<ChatMessage<TMessageMetadata>>,
  nextMessage: ChatMessage<TMessageMetadata>,
): Array<ChatMessage<TMessageMetadata>> {
  return messages.map((message) => {
    if (message.id !== nextMessage.id) {
      return message
    }

    return nextMessage
  })
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
  const [inputValue, setInputValue] = useState('')
  const inputValueReference = useRef('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    persistence?.write(messages)
  }, [messages, persistence])

  async function submitMessage(contentOverride?: string): Promise<void> {
    const trimmedContent = (contentOverride ?? inputValueReference.current).trim()

    if (!trimmedContent || isSubmitting) {
      return
    }

    const createdAt = getCurrentDate().toISOString()
    const userMessageId = createMessageId()
    const userMessage: ChatMessage<TMessageMetadata> = {
      id: userMessageId,
      conversationId,
      role: 'user',
      content: trimmedContent,
      status: 'sending',
      createdAt,
    }
    const nextMessages = [...messages, userMessage]

    if (!contentOverride) {
      updateInputValue('')
    }

    await sendUserMessage({
      userMessage,
      requestMessages: messages,
      nextMessages,
    })
  }

  async function retryMessage(messageId: string): Promise<void> {
    if (isSubmitting) {
      return
    }

    const failedMessage = messages.find((message) => message.id === messageId)

    if (!failedMessage || failedMessage.status !== 'failed') {
      return
    }

    const retryingMessage: ChatMessage<TMessageMetadata> = {
      ...failedMessage,
      status: 'sending',
    }
    const retryingMessages = replaceMessage(messages, retryingMessage)

    await sendUserMessage({
      userMessage: retryingMessage,
      requestMessages: messages.filter((message) => message.id !== messageId),
      nextMessages: retryingMessages,
    })
  }

  async function sendUserMessage({
    userMessage,
    requestMessages,
    nextMessages,
  }: {
    userMessage: ChatMessage<TMessageMetadata>
    requestMessages: Array<ChatMessage<TMessageMetadata>>
    nextMessages: Array<ChatMessage<TMessageMetadata>>
  }): Promise<void> {
    setMessages(nextMessages)
    setIsSubmitting(true)

    try {
      const response = await transport.sendMessage(
        buildRequest({
          content: userMessage.content,
          conversationId,
          messages: requestMessages,
        }),
      )
      const builtAssistantMessage = buildAssistantMessage({
        response,
        requestContent: userMessage.content,
        conversationId,
        messages: nextMessages,
      })
      const sentUserMessage: ChatMessage<TMessageMetadata> = {
        ...userMessage,
        status: 'sent',
      }
      const assistantMessage: ChatMessage<TMessageMetadata> = {
        id: createMessageId(),
        conversationId,
        role: 'assistant',
        content: builtAssistantMessage.content,
        status: 'sent',
        createdAt: getCurrentDate().toISOString(),
        metadata: builtAssistantMessage.metadata,
      }

      setMessages([...replaceMessage(nextMessages, sentUserMessage), assistantMessage])
    } catch {
      setMessages(
        replaceMessage(nextMessages, {
          ...userMessage,
          status: 'failed',
        }),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function clearMessages(): void {
    persistence?.clear()
    setMessages([])
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
