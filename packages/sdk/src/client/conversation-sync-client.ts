import type { ChatConversation } from '../model/chat-conversation'
import type { ChatMessage } from '../model/chat-message'
import type { ChatReadReceipt } from '../model/chat-participant-state'
import type {
  HttpChatTransportAuthOptions,
  HttpChatTransportHeaders,
} from '../transport/http-chat-transport'

export interface ConversationSyncClientParams {
  endpoint: string
  fetchImplementation?: typeof fetch
  headers?: HttpChatTransportHeaders
  auth?: HttpChatTransportAuthOptions
}

export interface ListConversationsParams {
  appId?: string
  visitorId?: string
  participantId?: string
  cursor?: string
  limit?: number
}

export interface ListConversationsResponse<TMetadata = Record<string, unknown>> {
  conversations: Array<ChatConversation<TMetadata>>
  nextCursor?: string
}

export interface ListMessagesParams {
  conversationId: string
  cursor?: string
  limit?: number
}

export interface ListMessagesResponse<TMetadata = unknown> {
  messages: Array<ChatMessage<TMetadata>>
  nextCursor?: string
}

export interface MarkMessageReadParams {
  conversationId: string
  messageId: string
  participantId: string
  readAt?: string
}

export interface MarkMessageReadResponse {
  readReceipt: ChatReadReceipt
}

const CONVERSATION_SYNC_CLIENT_HEADERS = {
  ACCEPT: 'Accept',
  CONTENT_TYPE: 'Content-Type',
  APPLICATION_JSON: 'application/json',
} as const

const CONVERSATION_SYNC_CLIENT_ERROR = {
  REQUEST_FAILED: 'Conversation sync request failed',
} as const

const CONVERSATION_SYNC_CLIENT_AUTH = {
  DEFAULT_REFRESH_STATUS_CODE: 401,
  DEFAULT_MAX_REFRESH_ATTEMPTS: 1,
} as const

function getDefaultFetchImplementation(): typeof fetch {
  return globalThis.fetch.bind(globalThis)
}

export class ConversationSyncClient {
  private readonly endpoint: string
  private readonly fetchImplementation: typeof fetch
  private readonly headers: HttpChatTransportHeaders
  private readonly auth: Required<
    Pick<HttpChatTransportAuthOptions, 'refreshStatusCodes' | 'maxRefreshAttempts'>
  > &
    Pick<HttpChatTransportAuthOptions, 'refresh'>

  constructor({
    endpoint,
    fetchImplementation = getDefaultFetchImplementation(),
    headers = {},
    auth = {},
  }: ConversationSyncClientParams) {
    this.endpoint = endpoint.replace(/\/$/, '')
    this.fetchImplementation = fetchImplementation
    this.headers = headers
    this.auth = {
      refresh: auth.refresh,
      refreshStatusCodes:
        auth.refreshStatusCodes ?? [
          CONVERSATION_SYNC_CLIENT_AUTH.DEFAULT_REFRESH_STATUS_CODE,
        ],
      maxRefreshAttempts:
        auth.maxRefreshAttempts ??
        CONVERSATION_SYNC_CLIENT_AUTH.DEFAULT_MAX_REFRESH_ATTEMPTS,
    }
  }

  async listConversations(
    params: ListConversationsParams = {},
  ): Promise<ListConversationsResponse> {
    return this.request<ListConversationsResponse>({
      path: '/conversations',
      method: 'GET',
      query: {
        appId: params.appId,
        visitorId: params.visitorId,
        participantId: params.participantId,
        cursor: params.cursor,
        limit: params.limit,
      },
    })
  }

  async listMessages(
    params: ListMessagesParams,
  ): Promise<ListMessagesResponse> {
    return this.request<ListMessagesResponse>({
      path: `/conversations/${encodeURIComponent(params.conversationId)}/messages`,
      method: 'GET',
      query: {
        cursor: params.cursor,
        limit: params.limit,
      },
    })
  }

  async markMessageRead(
    params: MarkMessageReadParams,
  ): Promise<MarkMessageReadResponse> {
    return this.request<MarkMessageReadResponse>({
      path: `/conversations/${encodeURIComponent(params.conversationId)}/read`,
      method: 'PUT',
      body: {
        messageId: params.messageId,
        participantId: params.participantId,
        readAt: params.readAt,
      },
    })
  }

  private async request<TResponse>({
    path,
    method,
    query,
    body,
  }: {
    path: string
    method: 'GET' | 'PUT'
    query?: Record<string, string | number | undefined>
    body?: Record<string, unknown>
  }): Promise<TResponse> {
    const maxRefreshAttempts = Math.max(
      0,
      this.auth.maxRefreshAttempts,
    )
    let refreshAttempts = 0

    while (true) {
      const response = await this.fetchImplementation(this.createUrl(path, query), {
        method,
        headers: await this.createHeaders(Boolean(body)),
        body: body ? JSON.stringify(removeUndefinedValues(body)) : undefined,
      })

      if (response.ok) {
        return (await response.json()) as TResponse
      }

      if (
        refreshAttempts < maxRefreshAttempts &&
        this.shouldRefreshAuth(response.status)
      ) {
        refreshAttempts += 1
        await this.auth.refresh?.({
          status: response.status,
        })
        continue
      }

      throw new Error(CONVERSATION_SYNC_CLIENT_ERROR.REQUEST_FAILED)
    }
  }

  private createUrl(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): string {
    const searchParams = new URLSearchParams()

    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value === undefined) {
        return
      }

      searchParams.set(key, String(value))
    })

    const queryString = searchParams.toString()

    return `${this.endpoint}${path}${queryString ? `?${queryString}` : ''}`
  }

  private async createHeaders(
    includeContentType: boolean,
  ): Promise<Record<string, string>> {
    return {
      [CONVERSATION_SYNC_CLIENT_HEADERS.ACCEPT]:
        CONVERSATION_SYNC_CLIENT_HEADERS.APPLICATION_JSON,
      ...(includeContentType
        ? {
            [CONVERSATION_SYNC_CLIENT_HEADERS.CONTENT_TYPE]:
              CONVERSATION_SYNC_CLIENT_HEADERS.APPLICATION_JSON,
          }
        : {}),
      ...(await this.resolveHeaders()),
    }
  }

  private shouldRefreshAuth(status: number): boolean {
    return (
      typeof this.auth.refresh === 'function' &&
      this.auth.refreshStatusCodes.includes(status)
    )
  }

  private async resolveHeaders(): Promise<Record<string, string>> {
    if (typeof this.headers === 'function') {
      return this.headers()
    }

    return this.headers
  }
}

function removeUndefinedValues(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => {
      return entryValue !== undefined
    }),
  )
}
