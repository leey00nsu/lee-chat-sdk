import type { ConversationClientEvent } from '../client/conversation-client'

export interface EventSourceLike {
  addEventListener(type: string, listener: (event: MessageEvent) => void): void
  removeEventListener(type: string, listener: (event: MessageEvent) => void): void
  close(): void
}

export type CreateEventSource = (endpoint: string) => EventSourceLike
export type ChatEventUnsubscribe = () => void
export type ChatEventListener = (event: ConversationClientEvent) => void

export interface ChatEventTransport {
  subscribe(listener: ChatEventListener): ChatEventUnsubscribe
}

export interface SseChatEventTransportParams {
  endpoint: string
  eventName?: string
  createEventSource?: CreateEventSource
}

const SSE_CHAT_EVENT_TRANSPORT = {
  DEFAULT_EVENT_NAME: 'message',
} as const

function createDefaultEventSource(endpoint: string): EventSourceLike {
  return new EventSource(endpoint)
}

export class SseChatEventTransport implements ChatEventTransport {
  private readonly endpoint: string
  private readonly eventName: string
  private readonly createEventSource: CreateEventSource

  constructor({
    endpoint,
    eventName = SSE_CHAT_EVENT_TRANSPORT.DEFAULT_EVENT_NAME,
    createEventSource = createDefaultEventSource,
  }: SseChatEventTransportParams) {
    this.endpoint = endpoint
    this.eventName = eventName
    this.createEventSource = createEventSource
  }

  subscribe(listener: ChatEventListener): ChatEventUnsubscribe {
    const eventSource = this.createEventSource(this.endpoint)
    const handleMessage = (event: MessageEvent): void => {
      listener(JSON.parse(String(event.data)) as ConversationClientEvent)
    }

    eventSource.addEventListener(this.eventName, handleMessage)

    return () => {
      eventSource.removeEventListener(this.eventName, handleMessage)
      eventSource.close()
    }
  }
}
