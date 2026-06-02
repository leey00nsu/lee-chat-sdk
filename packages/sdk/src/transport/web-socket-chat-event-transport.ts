import type {
  ChatEventListener,
  ChatEventTransport,
  ChatEventUnsubscribe,
} from './chat-event-transport'

export interface WebSocketLike {
  addEventListener(type: string, listener: (event: MessageEvent) => void): void
  removeEventListener(type: string, listener: (event: MessageEvent) => void): void
  close(): void
}

export type CreateWebSocket = (
  endpoint: string,
  protocols?: string | string[],
) => WebSocketLike

export interface WebSocketChatEventTransportParams {
  endpoint: string
  protocols?: string | string[]
  createWebSocket?: CreateWebSocket
}

const WEB_SOCKET_CHAT_EVENT_TRANSPORT = {
  MESSAGE_EVENT_NAME: 'message',
} as const

function createDefaultWebSocket(
  endpoint: string,
  protocols?: string | string[],
): WebSocketLike {
  return new WebSocket(endpoint, protocols)
}

export class WebSocketChatEventTransport implements ChatEventTransport {
  private readonly endpoint: string
  private readonly protocols?: string | string[]
  private readonly createWebSocket: CreateWebSocket

  constructor({
    endpoint,
    protocols,
    createWebSocket = createDefaultWebSocket,
  }: WebSocketChatEventTransportParams) {
    this.endpoint = endpoint
    this.protocols = protocols
    this.createWebSocket = createWebSocket
  }

  subscribe(listener: ChatEventListener): ChatEventUnsubscribe {
    const webSocket = this.createWebSocket(this.endpoint, this.protocols)
    const handleMessage = (event: MessageEvent): void => {
      listener(JSON.parse(String(event.data)))
    }

    webSocket.addEventListener(
      WEB_SOCKET_CHAT_EVENT_TRANSPORT.MESSAGE_EVENT_NAME,
      handleMessage,
    )

    return () => {
      webSocket.removeEventListener(
        WEB_SOCKET_CHAT_EVENT_TRANSPORT.MESSAGE_EVENT_NAME,
        handleMessage,
      )
      webSocket.close()
    }
  }
}
