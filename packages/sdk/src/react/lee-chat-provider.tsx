'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { resolveLeeChatConfig, type LeeChatConfig } from '../config/lee-chat-config'
import { useChatController } from '../controller/use-chat-controller'
import { MemoryChatPersistence } from '../persistence/memory-chat-persistence'
import { LocalStorageChatPersistence } from '../persistence/local-storage-chat-persistence'
import { HttpChatTransport } from '../transport/http-chat-transport'
import { buildLeeChatRequest, parseLeeChatResponse, type LeeChatRequest, type LeeChatResponse } from '../request/lee-chat-request'
import type { ChatMessage } from '../model/chat-message'
import { LeeChatContext } from './lee-chat-context'

export interface LeeChatProviderProps {
  config: LeeChatConfig
  children?: ReactNode
  fetchImplementation?: typeof fetch
}

const LEE_CHAT_STORAGE = {
  VERSION: 1,
  KEY_PREFIX: 'lee-chat',
} as const

function validatePersistedMessages(
  messages: unknown,
): Array<ChatMessage<Record<string, unknown>>> {
  return Array.isArray(messages)
    ? (messages as Array<ChatMessage<Record<string, unknown>>>)
    : []
}

export function LeeChatProvider({
  config,
  children,
  fetchImplementation,
}: LeeChatProviderProps) {
  const resolvedConfig = useMemo(() => resolveLeeChatConfig(config), [config])
  const [isOpen, setIsOpen] = useState(resolvedConfig.initialOpen)
  const conversationId = `${resolvedConfig.appId}:default`
  const transport = useMemo(() => {
    return new HttpChatTransport<LeeChatRequest, LeeChatResponse>({
      endpoint: resolvedConfig.endpoint,
      fetchImplementation,
    })
  }, [fetchImplementation, resolvedConfig.endpoint])
  const persistence = useMemo(() => {
    if (resolvedConfig.persistence === 'localStorage') {
      return new LocalStorageChatPersistence<ChatMessage<Record<string, unknown>>>({
        storageKey: `${LEE_CHAT_STORAGE.KEY_PREFIX}:${resolvedConfig.appId}`,
        storageVersion: LEE_CHAT_STORAGE.VERSION,
        validateMessages: validatePersistedMessages,
      })
    }

    return new MemoryChatPersistence<ChatMessage<Record<string, unknown>>>()
  }, [resolvedConfig.appId, resolvedConfig.persistence])
  const chat = useChatController<
    LeeChatRequest,
    LeeChatResponse,
    Record<string, unknown>
  >({
    conversationId,
    transport,
    persistence,
    buildRequest: ({ content, conversationId: requestConversationId, messages }) => {
      const userMessage: ChatMessage = {
        id: `${requestConversationId}:request`,
        conversationId: requestConversationId,
        role: 'user',
        content,
        status: 'sent',
        createdAt: new Date().toISOString(),
      }

      return buildLeeChatRequest({
        appId: resolvedConfig.appId,
        user: resolvedConfig.user,
        metadata: resolvedConfig.metadata,
        message: userMessage,
        history: messages,
      })
    },
    buildAssistantMessage: ({ response }) => {
      const parsedResponse = parseLeeChatResponse(response)

      return {
        content: parsedResponse.message.content,
        metadata: parsedResponse.message.metadata,
      }
    },
  })
  const unreadCount = isOpen ? 0 : chat.messages.filter((message) => {
    return message.role !== 'user' && message.status === 'sent'
  }).length

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
        submitMessage: chat.submitMessage,
      }}
    >
      {children}
    </LeeChatContext.Provider>
  )
}
