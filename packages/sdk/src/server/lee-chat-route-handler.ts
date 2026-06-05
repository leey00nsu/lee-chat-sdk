import type {
  ListConversationsParams,
  ListConversationsResponse,
  ListMessagesParams,
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

export interface LeeChatRouteHandlerGetResponseParams<TStorageContext = unknown> {
  request: LeeChatRequest
  storageContext: TStorageContext
}

export interface LeeChatRouteHandlerStorage<TStorageContext = unknown> {
  createContext?: (request: Request) => TStorageContext | Promise<TStorageContext>
  upsertConversation(
    conversation: ChatConversation,
    context: TStorageContext,
  ): Promise<void> | void
  appendMessages(
    messages: ChatMessage[],
    context: TStorageContext,
  ): Promise<void> | void
  listConversations(
    params: ListConversationsParams,
    context: TStorageContext,
  ): Promise<ListConversationsResponse> | ListConversationsResponse
  listMessages(
    params: ListMessagesParams,
    context: TStorageContext,
  ): Promise<ListMessagesResponse> | ListMessagesResponse
  upsertReadReceipt(
    readReceipt: ChatReadReceipt,
    context: TStorageContext,
  ): Promise<void> | void
}

export interface LeeChatRouteHandlerParams<TStorageContext = unknown> {
  basePath?: string
  assistantSenderId?: string | ((request: LeeChatRequest) => string)
  getResponse: (
    params: LeeChatRouteHandlerGetResponseParams<TStorageContext>,
  ) => LeeChatResponse | Promise<LeeChatResponse>
  storage: LeeChatRouteHandlerStorage<TStorageContext>
}

export interface LeeChatRouteHandler {
  handleRequest(request: Request): Promise<Response>
}

const LEE_CHAT_ROUTE_HANDLER = {
  DEFAULT_BASE_PATH: '/api/chat',
  DEFAULT_ASSISTANT_ID_SUFFIX: 'assistant',
} as const

export function createLeeChatRouteHandler<TStorageContext = unknown>({
  basePath = LEE_CHAT_ROUTE_HANDLER.DEFAULT_BASE_PATH,
  assistantSenderId,
  getResponse,
  storage,
}: LeeChatRouteHandlerParams<TStorageContext>): LeeChatRouteHandler {
  const normalizedBasePath = normalizePath(basePath)

  return {
    async handleRequest(request) {
      const url = new URL(request.url)
      const path = normalizePath(url.pathname)
      const storageContext = await storage.createContext?.(request) as
        | TStorageContext
        | undefined
      const resolvedStorageContext = storageContext as TStorageContext

      if (request.method === 'POST' && path === normalizedBasePath) {
        const chatRequest = (await request.json()) as LeeChatRequest
        const response = await getResponse({
          request: chatRequest,
          storageContext: resolvedStorageContext,
        })
        const resolvedResponse = parseLeeChatResponse(response)

        await storage.upsertConversation(
          buildConversation(chatRequest),
          resolvedStorageContext,
        )
        await storage.appendMessages(
          [
            buildUserMessage(chatRequest),
            buildAssistantMessage({
              request: chatRequest,
              response: resolvedResponse,
              assistantSenderId,
            }),
          ],
          resolvedStorageContext,
        )

        return Response.json(response)
      }

      if (
        request.method === 'GET' &&
        path === `${normalizedBasePath}/conversations`
      ) {
        const response = await storage.listConversations(
          {
            appId: getSearchParam(url, 'appId'),
            visitorId: getSearchParam(url, 'visitorId'),
            participantId: getSearchParam(url, 'participantId'),
            cursor: getSearchParam(url, 'cursor'),
            limit: getNumberSearchParam(url, 'limit'),
          },
          resolvedStorageContext,
        )

        return Response.json(response)
      }

      const conversationMessagesMatch = matchConversationRoute({
        path,
        basePath: normalizedBasePath,
        suffix: 'messages',
      })

      if (request.method === 'GET' && conversationMessagesMatch) {
        const response = await storage.listMessages(
          {
            conversationId: conversationMessagesMatch.conversationId,
            cursor: getSearchParam(url, 'cursor'),
            limit: getNumberSearchParam(url, 'limit'),
          },
          resolvedStorageContext,
        )

        return Response.json(response)
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

        await storage.upsertReadReceipt(readReceipt, resolvedStorageContext)

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
  }
}

function normalizePath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return normalizedPath.replace(/\/$/, '')
}

function getSearchParam(url: URL, key: string): string | undefined {
  return url.searchParams.get(key) ?? undefined
}

function getNumberSearchParam(url: URL, key: string): number | undefined {
  const value = url.searchParams.get(key)

  if (!value) {
    return undefined
  }

  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : undefined
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

function buildConversation(request: LeeChatRequest): ChatConversation {
  return {
    id: request.conversation.id,
    kind: request.conversation.kind,
    status: 'open',
    participants: [request.participant],
    createdAt: request.message.createdAt,
    metadata: request.metadata,
  }
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

function buildAssistantMessage({
  request,
  response,
  assistantSenderId,
}: {
  request: LeeChatRequest
  response: ResolvedLeeChatResponse
  assistantSenderId?: string | ((request: LeeChatRequest) => string)
}): ChatMessage {
  return {
    id: response.message.id,
    conversationId: request.conversation.id,
    senderId: resolveAssistantSenderId(request, assistantSenderId),
    role: 'assistant',
    content: response.message.content,
    parts: response.message.parts,
    status: 'sent',
    createdAt: response.message.createdAt,
    metadata: response.message.metadata,
  }
}

function resolveAssistantSenderId(
  request: LeeChatRequest,
  assistantSenderId?: string | ((request: LeeChatRequest) => string),
): string {
  if (typeof assistantSenderId === 'function') {
    return assistantSenderId(request)
  }

  return (
    assistantSenderId ??
    `${request.appId}-${LEE_CHAT_ROUTE_HANDLER.DEFAULT_ASSISTANT_ID_SUFFIX}`
  )
}
