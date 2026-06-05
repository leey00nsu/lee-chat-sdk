import type {
  ListConversationsParams,
  ListConversationsResponse,
  ListMessagesParams,
  ListMessagesResponse,
  MarkMessageReadParams,
  MarkMessageReadResponse,
} from '../client/conversation-sync-client'
import type { ChatConversation } from '../model/chat-conversation'
import type { ChatMessage } from '../model/chat-message'
import type { ChatReadReceipt } from '../model/chat-participant-state'
import type {
  LeeChatRequest,
  LeeChatResponse,
  ResolvedLeeChatResponse,
} from '../request/lee-chat-request'
import { parseLeeChatResponse } from '../request/lee-chat-request'
import type {
  ChatEventListener,
  ChatEventTransport,
  ChatEventUnsubscribe,
} from '../transport/chat-event-transport'
import type { ConversationClientEvent } from '../client/conversation-client'

export interface MockLeeChatServerGetResponseParams {
  request: LeeChatRequest
  conversations: ChatConversation[]
  messages: ChatMessage[]
}

export interface MockLeeChatServerParams {
  getResponse?: (
    params: MockLeeChatServerGetResponseParams,
  ) => LeeChatResponse | Promise<LeeChatResponse>
}

export interface MockLeeChatServer {
  fetch: typeof fetch
  syncClient: {
    listConversations(
      params?: ListConversationsParams,
    ): Promise<ListConversationsResponse>
    listMessages(params: ListMessagesParams): Promise<ListMessagesResponse>
    markMessageRead(
      params: MarkMessageReadParams,
    ): Promise<MarkMessageReadResponse>
  }
  eventTransport: ChatEventTransport
  emitEvent(event: ConversationClientEvent): void
  getConversations(): ChatConversation[]
  getMessages(): ChatMessage[]
  getReadReceipts(): ChatReadReceipt[]
}

const MOCK_LEE_CHAT_SERVER = {
  DEFAULT_ASSISTANT_ID_SUFFIX: 'assistant',
  DEFAULT_RESPONSE_PREFIX: 'Mock response:',
} as const

export function createMockLeeChatServer({
  getResponse = createDefaultMockResponse,
}: MockLeeChatServerParams = {}): MockLeeChatServer {
  let conversations: ChatConversation[] = []
  let messages: ChatMessage[] = []
  let readReceipts: ChatReadReceipt[] = []
  const listeners = new Set<ChatEventListener>()

  const server: MockLeeChatServer = {
    fetch: async (_input, init) => {
      const request = JSON.parse(String(init?.body ?? '{}')) as LeeChatRequest
      const response = await getResponse({
        request,
        conversations,
        messages,
      })
      const resolvedResponse = parseLeeChatResponse(response)

      conversations = upsertConversation(conversations, request)
      messages = [
        ...messages,
        buildUserMessage(request),
        buildAssistantMessage(request, resolvedResponse),
      ]

      return Response.json(response)
    },
    syncClient: {
      listConversations: async (params = {}) => ({
        conversations: filterConversations(conversations, params),
      }),
      listMessages: async (params) => ({
        messages: messages.filter((message) => {
          return message.conversationId === params.conversationId
        }),
      }),
      markMessageRead: async (params) => {
        const readReceipt: ChatReadReceipt = {
          conversationId: params.conversationId,
          messageId: params.messageId,
          participantId: params.participantId,
          readAt: params.readAt ?? new Date().toISOString(),
        }

        readReceipts = [
          ...readReceipts.filter((receipt) => {
            return !(
              receipt.conversationId === readReceipt.conversationId &&
              receipt.messageId === readReceipt.messageId &&
              receipt.participantId === readReceipt.participantId
            )
          }),
          readReceipt,
        ]

        return {
          readReceipt,
        }
      },
    },
    eventTransport: {
      subscribe(listener): ChatEventUnsubscribe {
        listeners.add(listener)

        return () => {
          listeners.delete(listener)
        }
      },
    },
    emitEvent(event) {
      listeners.forEach((listener) => {
        listener(event)
      })
    },
    getConversations: () => conversations,
    getMessages: () => messages,
    getReadReceipts: () => readReceipts,
  }

  return server
}

function createDefaultMockResponse({
  request,
}: MockLeeChatServerGetResponseParams): LeeChatResponse {
  return {
    message: {
      content: `${MOCK_LEE_CHAT_SERVER.DEFAULT_RESPONSE_PREFIX} ${request.message.content}`,
    },
  }
}

function upsertConversation(
  conversations: ChatConversation[],
  request: LeeChatRequest,
): ChatConversation[] {
  const nextConversation: ChatConversation = {
    id: request.conversation.id,
    kind: request.conversation.kind,
    status: 'open',
    participants: [request.participant],
    createdAt: request.message.createdAt,
    metadata: request.metadata,
  }
  const otherConversations = conversations.filter((conversation) => {
    return conversation.id !== request.conversation.id
  })

  return [...otherConversations, nextConversation]
}

function buildUserMessage(request: LeeChatRequest): ChatMessage {
  return {
    id: request.message.id,
    conversationId: request.conversation.id,
    senderId: request.message.senderId,
    role: 'user',
    content: request.message.content,
    parts: request.message.parts,
    status: 'sent',
    createdAt: request.message.createdAt,
  }
}

function buildAssistantMessage(
  request: LeeChatRequest,
  response: ResolvedLeeChatResponse,
): ChatMessage {
  return {
    id: response.message.id,
    conversationId: request.conversation.id,
    senderId: `${request.appId}-${MOCK_LEE_CHAT_SERVER.DEFAULT_ASSISTANT_ID_SUFFIX}`,
    role: 'assistant',
    content: response.message.content,
    parts: response.message.parts,
    status: 'sent',
    createdAt: response.message.createdAt,
    metadata: response.message.metadata,
  }
}

function filterConversations(
  conversations: ChatConversation[],
  params: ListConversationsParams,
): ChatConversation[] {
  return conversations.filter((conversation) => {
    if (
      params.participantId &&
      !conversation.participants.some((participant) => {
        return participant.id === params.participantId
      })
    ) {
      return false
    }

    if (
      params.visitorId &&
      !conversation.participants.some((participant) => {
        return participant.id === params.visitorId
      })
    ) {
      return false
    }

    return true
  })
}
