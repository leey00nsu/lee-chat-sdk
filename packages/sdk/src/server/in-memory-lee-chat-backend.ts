import type {
  ListConversationsParams,
  ListConversationsResponse,
  ListMessagesResponse,
  MarkMessageReadResponse,
} from '../client/conversation-sync-client'
import type { ChatConversation } from '../model/chat-conversation'
import type { ChatMessage } from '../model/chat-message'
import type { ChatReadReceipt } from '../model/chat-participant-state'
import {
  parseLeeChatResponse,
  type LeeChatRequest,
  type LeeChatResponse,
  type ResolvedLeeChatResponse,
} from '../request/lee-chat-request'

export interface InMemoryLeeChatBackendGetResponseParams {
  request: LeeChatRequest
  conversations: ChatConversation[]
  messages: ChatMessage[]
}

export interface InMemoryLeeChatBackendParams {
  basePath?: string
  getResponse?: (
    params: InMemoryLeeChatBackendGetResponseParams,
  ) => LeeChatResponse | Promise<LeeChatResponse>
}

export interface InMemoryLeeChatBackend {
  handleRequest(request: Request): Promise<Response>
  getConversations(): ChatConversation[]
  getMessages(): ChatMessage[]
  getReadReceipts(): ChatReadReceipt[]
}

const IN_MEMORY_LEE_CHAT_BACKEND = {
  DEFAULT_BASE_PATH: '/api/chat',
  DEFAULT_ASSISTANT_ID_SUFFIX: 'assistant',
} as const

export function createInMemoryLeeChatBackend({
  basePath = IN_MEMORY_LEE_CHAT_BACKEND.DEFAULT_BASE_PATH,
  getResponse = createDefaultResponse,
}: InMemoryLeeChatBackendParams = {}): InMemoryLeeChatBackend {
  let conversations: ChatConversation[] = []
  let messages: ChatMessage[] = []
  let readReceipts: ChatReadReceipt[] = []
  const normalizedBasePath = normalizePath(basePath)

  return {
    async handleRequest(request) {
      const url = new URL(request.url)
      const path = normalizePath(url.pathname)

      if (request.method === 'POST' && path === normalizedBasePath) {
        const chatRequest = (await request.json()) as LeeChatRequest
        const response = await getResponse({
          request: chatRequest,
          conversations,
          messages,
        })
        const resolvedResponse = parseLeeChatResponse(response)

        conversations = upsertConversation(conversations, chatRequest)
        messages = [
          ...messages,
          buildUserMessage(chatRequest),
          buildAssistantMessage(chatRequest, resolvedResponse),
        ]

        return Response.json(response)
      }

      if (
        request.method === 'GET' &&
        path === `${normalizedBasePath}/conversations`
      ) {
        return Response.json({
          conversations: filterConversations(conversations, {
            appId: getSearchParam(url, 'appId'),
            visitorId: getSearchParam(url, 'visitorId'),
            participantId: getSearchParam(url, 'participantId'),
          }),
        } satisfies ListConversationsResponse)
      }

      const conversationMessagesMatch = matchConversationRoute({
        path,
        basePath: normalizedBasePath,
        suffix: 'messages',
      })

      if (request.method === 'GET' && conversationMessagesMatch) {
        return Response.json({
          messages: messages.filter((message) => {
            return message.conversationId === conversationMessagesMatch.conversationId
          }),
        } satisfies ListMessagesResponse)
      }

      const conversationReadMatch = matchConversationRoute({
        path,
        basePath: normalizedBasePath,
        suffix: 'read',
      })

      if (request.method === 'PUT' && conversationReadMatch) {
        const body = (await request.json()) as {
          messageId: string
          participantId: string
          readAt?: string
        }
        const readReceipt: ChatReadReceipt = {
          conversationId: conversationReadMatch.conversationId,
          messageId: body.messageId,
          participantId: body.participantId,
          readAt: body.readAt ?? new Date().toISOString(),
        }

        readReceipts = upsertReadReceipt(readReceipts, readReceipt)

        return Response.json({
          readReceipt,
        } satisfies MarkMessageReadResponse)
      }

      return Response.json(
        {
          error: 'Lee Chat route not found.',
        },
        {
          status: 404,
        },
      )
    },
    getConversations: () => conversations,
    getMessages: () => messages,
    getReadReceipts: () => readReceipts,
  }
}

function createDefaultResponse({
  request,
}: InMemoryLeeChatBackendGetResponseParams): LeeChatResponse {
  return {
    message: {
      id: `${request.appId}-assistant-${request.message.id}`,
      content: `Received: ${request.message.content}`,
    },
  }
}

function normalizePath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return normalizedPath.replace(/\/$/, '')
}

function getSearchParam(url: URL, key: string): string | undefined {
  return url.searchParams.get(key) ?? undefined
}

function matchConversationRoute({
  path,
  basePath,
  suffix,
}: {
  path: string
  basePath: string
  suffix: string
}): { conversationId: string } | undefined {
  const prefix = `${basePath}/conversations/`

  if (!path.startsWith(prefix) || !path.endsWith(`/${suffix}`)) {
    return undefined
  }

  const encodedConversationId = path.slice(
    prefix.length,
    path.length - suffix.length - 1,
  )

  return {
    conversationId: decodeURIComponent(encodedConversationId),
  }
}

function upsertConversation(
  conversations: ChatConversation[],
  request: LeeChatRequest,
): ChatConversation[] {
  const otherConversations = conversations.filter((conversation) => {
    return conversation.id !== request.conversation.id
  })

  return [
    ...otherConversations,
    {
      id: request.conversation.id,
      kind: request.conversation.kind,
      status: 'open',
      participants: [request.participant],
      createdAt: request.message.createdAt,
      metadata: request.metadata,
    },
  ]
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
    senderId: `${request.appId}-${IN_MEMORY_LEE_CHAT_BACKEND.DEFAULT_ASSISTANT_ID_SUFFIX}`,
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
    if (params.appId && !conversation.id.startsWith(`${params.appId}:`)) {
      return false
    }

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

function upsertReadReceipt(
  readReceipts: ChatReadReceipt[],
  readReceipt: ChatReadReceipt,
): ChatReadReceipt[] {
  const otherReadReceipts = readReceipts.filter((receipt) => {
    return !(
      receipt.conversationId === readReceipt.conversationId &&
      receipt.messageId === readReceipt.messageId &&
      receipt.participantId === readReceipt.participantId
    )
  })

  return [...otherReadReceipts, readReceipt]
}
