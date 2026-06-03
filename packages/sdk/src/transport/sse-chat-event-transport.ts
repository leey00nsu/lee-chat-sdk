import type {
  ChatEventListener,
  ChatEventTransport,
  ChatEventUnsubscribe,
} from './chat-event-transport'

export interface EventSourceLike {
  addEventListener(type: string, listener: (event: Event) => void): void
  removeEventListener(type: string, listener: (event: Event) => void): void
  close(): void
}

export type CreateEventSource = (endpoint: string) => EventSourceLike

export interface SseChatEventTransportParams {
  endpoint: string
  eventName?: string
  createEventSource?: CreateEventSource
  reconnect?: SseReconnectOptions
}

export interface SseReconnectOptions {
  enabled?: boolean
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  maxAttempts?: number
}

const SSE_CHAT_EVENT_TRANSPORT = {
  ERROR_EVENT_NAME: 'error',
  DEFAULT_EVENT_NAME: 'message',
  DEFAULT_RECONNECT_INITIAL_DELAY_MS: 1000,
  DEFAULT_RECONNECT_MAX_DELAY_MS: 30000,
  DEFAULT_RECONNECT_BACKOFF_MULTIPLIER: 2,
} as const

function createDefaultEventSource(endpoint: string): EventSourceLike {
  return new EventSource(endpoint)
}

export class SseChatEventTransport implements ChatEventTransport {
  private readonly endpoint: string
  private readonly eventName: string
  private readonly createEventSource: CreateEventSource
  private readonly reconnect: Required<SseReconnectOptions>

  constructor({
    endpoint,
    eventName = SSE_CHAT_EVENT_TRANSPORT.DEFAULT_EVENT_NAME,
    createEventSource = createDefaultEventSource,
    reconnect,
  }: SseChatEventTransportParams) {
    this.endpoint = endpoint
    this.eventName = eventName
    this.createEventSource = createEventSource
    this.reconnect = {
      enabled: reconnect?.enabled ?? false,
      initialDelayMs:
        reconnect?.initialDelayMs ??
        SSE_CHAT_EVENT_TRANSPORT.DEFAULT_RECONNECT_INITIAL_DELAY_MS,
      maxDelayMs:
        reconnect?.maxDelayMs ??
        SSE_CHAT_EVENT_TRANSPORT.DEFAULT_RECONNECT_MAX_DELAY_MS,
      backoffMultiplier:
        reconnect?.backoffMultiplier ??
        SSE_CHAT_EVENT_TRANSPORT.DEFAULT_RECONNECT_BACKOFF_MULTIPLIER,
      maxAttempts: reconnect?.maxAttempts ?? Number.POSITIVE_INFINITY,
    }
  }

  subscribe(listener: ChatEventListener): ChatEventUnsubscribe {
    let activeEventSource: EventSourceLike | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempts = 0
    let isSubscribed = true

    const clearReconnectTimeout = (): void => {
      if (!reconnectTimeout) {
        return
      }

      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    const cleanupEventSource = (
      eventSource: EventSourceLike,
      handleMessage: (event: Event) => void,
      handleError: () => void,
    ): void => {
      eventSource.removeEventListener(this.eventName, handleMessage)
      eventSource.removeEventListener(
        SSE_CHAT_EVENT_TRANSPORT.ERROR_EVENT_NAME,
        handleError,
      )
    }

    const connect = (): void => {
      const eventSource = this.createEventSource(this.endpoint)
      activeEventSource = eventSource

      const handleMessage = (event: Event): void => {
        listener(JSON.parse(String((event as MessageEvent).data)))
      }

      const handleError = (): void => {
        cleanupEventSource(eventSource, handleMessage, handleError)
        eventSource.close()
        if (activeEventSource === eventSource) {
          activeEventSource = null
        }

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
          connect()
        }, delayMs)
      }

      eventSource.addEventListener(this.eventName, handleMessage)
      eventSource.addEventListener(
        SSE_CHAT_EVENT_TRANSPORT.ERROR_EVENT_NAME,
        handleError,
      )
    }

    connect()

    return () => {
      isSubscribed = false
      clearReconnectTimeout()
      activeEventSource?.close()
      activeEventSource = null
    }
  }
}
