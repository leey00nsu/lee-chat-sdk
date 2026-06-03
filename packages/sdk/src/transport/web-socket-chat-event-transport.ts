import type {
  ChatEventListener,
  ChatEventTransport,
  ChatEventUnsubscribe,
} from './chat-event-transport'

export interface WebSocketLike {
  addEventListener(type: string, listener: (event: Event) => void): void
  removeEventListener(type: string, listener: (event: Event) => void): void
  close(): void
}

export type CreateWebSocket = (
  endpoint: string,
  protocols?: string | string[],
) => WebSocketLike

export type WebSocketEndpoint =
  | string
  | (() => string)

export interface WebSocketAuthRefreshParams {
  reason: 'close'
}

export interface WebSocketAuthOptions {
  refresh?: (params: WebSocketAuthRefreshParams) => void | Promise<void>
}

export interface WebSocketChatEventTransportParams {
  endpoint: WebSocketEndpoint
  protocols?: string | string[]
  createWebSocket?: CreateWebSocket
  reconnect?: WebSocketReconnectOptions
  auth?: WebSocketAuthOptions
}

export interface WebSocketReconnectOptions {
  enabled?: boolean
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  maxAttempts?: number
}

const WEB_SOCKET_CHAT_EVENT_TRANSPORT = {
  CLOSE_EVENT_NAME: 'close',
  MESSAGE_EVENT_NAME: 'message',
  DEFAULT_RECONNECT_INITIAL_DELAY_MS: 1000,
  DEFAULT_RECONNECT_MAX_DELAY_MS: 30000,
  DEFAULT_RECONNECT_BACKOFF_MULTIPLIER: 2,
} as const

function createDefaultWebSocket(
  endpoint: string,
  protocols?: string | string[],
): WebSocketLike {
  return new WebSocket(endpoint, protocols)
}

export class WebSocketChatEventTransport implements ChatEventTransport {
  private readonly endpoint: WebSocketEndpoint
  private readonly protocols?: string | string[]
  private readonly createWebSocket: CreateWebSocket
  private readonly reconnect: Required<WebSocketReconnectOptions>
  private readonly auth?: WebSocketAuthOptions

  constructor({
    endpoint,
    protocols,
    createWebSocket = createDefaultWebSocket,
    reconnect,
    auth,
  }: WebSocketChatEventTransportParams) {
    this.endpoint = endpoint
    this.protocols = protocols
    this.createWebSocket = createWebSocket
    this.auth = auth
    this.reconnect = {
      enabled: reconnect?.enabled ?? false,
      initialDelayMs:
        reconnect?.initialDelayMs ??
        WEB_SOCKET_CHAT_EVENT_TRANSPORT.DEFAULT_RECONNECT_INITIAL_DELAY_MS,
      maxDelayMs:
        reconnect?.maxDelayMs ??
        WEB_SOCKET_CHAT_EVENT_TRANSPORT.DEFAULT_RECONNECT_MAX_DELAY_MS,
      backoffMultiplier:
        reconnect?.backoffMultiplier ??
        WEB_SOCKET_CHAT_EVENT_TRANSPORT.DEFAULT_RECONNECT_BACKOFF_MULTIPLIER,
      maxAttempts: reconnect?.maxAttempts ?? Number.POSITIVE_INFINITY,
    }
  }

  subscribe(listener: ChatEventListener): ChatEventUnsubscribe {
    let activeWebSocket: WebSocketLike | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempts = 0
    let isSubscribed = true

    const clearReconnectTimeout = (): void => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
    }

    const refreshAuthAndConnect = async (): Promise<void> => {
      await this.auth?.refresh?.({
        reason: 'close',
      })
      connect()
    }

    const connect = (): void => {
      const webSocket = this.createWebSocket(this.resolveEndpoint(), this.protocols)
      activeWebSocket = webSocket

      const handleMessage = (event: Event): void => {
        listener(JSON.parse(String((event as MessageEvent).data)))
      }

      const handleClose = (): void => {
        webSocket.removeEventListener(
          WEB_SOCKET_CHAT_EVENT_TRANSPORT.MESSAGE_EVENT_NAME,
          handleMessage,
        )
        webSocket.removeEventListener(
          WEB_SOCKET_CHAT_EVENT_TRANSPORT.CLOSE_EVENT_NAME,
          handleClose,
        )

        if (
          !isSubscribed ||
          !this.reconnect.enabled ||
          reconnectAttempts >= this.reconnect.maxAttempts
        ) {
          return
        }

        reconnectAttempts += 1
        const delayMs = Math.min(
          this.reconnect.initialDelayMs *
            this.reconnect.backoffMultiplier ** (reconnectAttempts - 1),
          this.reconnect.maxDelayMs,
        )

        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null
          if (typeof this.auth?.refresh !== 'function') {
            connect()
            return
          }

          void refreshAuthAndConnect()
        }, delayMs)
      }

      webSocket.addEventListener(
        WEB_SOCKET_CHAT_EVENT_TRANSPORT.MESSAGE_EVENT_NAME,
        handleMessage,
      )
      webSocket.addEventListener(
        WEB_SOCKET_CHAT_EVENT_TRANSPORT.CLOSE_EVENT_NAME,
        handleClose,
      )
    }

    connect()

    return () => {
      isSubscribed = false
      clearReconnectTimeout()
      activeWebSocket?.close()
      activeWebSocket = null
    }
  }

  private resolveEndpoint(): string {
    if (typeof this.endpoint === 'function') {
      return this.endpoint()
    }

    return this.endpoint
  }
}
