import type { ConversationClientEvent } from '../client/conversation-client'

export type LeeChatEventStreamListener = (
  event: ConversationClientEvent,
) => void
export type LeeChatEventStreamUnsubscribe = () => void

export interface LeeChatEventStreamResponseParams {
  request?: Request
  eventName?: string
}

export interface LeeChatEventStream {
  publish(event: ConversationClientEvent): void
  subscribe(listener: LeeChatEventStreamListener): LeeChatEventStreamUnsubscribe
  createSseResponse(params?: LeeChatEventStreamResponseParams): Response
  getSubscriberCount(): number
}

export interface LeeChatEventStreamParams {
  eventName?: string
  keepAliveMs?: number
}

const LEE_CHAT_EVENT_STREAM = {
  DEFAULT_EVENT_NAME: 'message',
  DEFAULT_KEEP_ALIVE_MS: 30000,
} as const

export function createLeeChatEventStream({
  eventName = LEE_CHAT_EVENT_STREAM.DEFAULT_EVENT_NAME,
  keepAliveMs = LEE_CHAT_EVENT_STREAM.DEFAULT_KEEP_ALIVE_MS,
}: LeeChatEventStreamParams = {}): LeeChatEventStream {
  const listeners = new Set<LeeChatEventStreamListener>()

  return {
    publish(event) {
      listeners.forEach((listener) => {
        listener(event)
      })
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    createSseResponse(params = {}) {
      const responseEventName = params.eventName ?? eventName
      const encoder = new TextEncoder()
      let unsubscribe: LeeChatEventStreamUnsubscribe | undefined
      let keepAliveInterval: ReturnType<typeof setInterval> | undefined
      let isClosed = false

      const stream = new ReadableStream<Uint8Array>({
        start: (controller) => {
          const close = (): void => {
            if (isClosed) {
              return
            }

            isClosed = true
            unsubscribe?.()
            unsubscribe = undefined
            if (keepAliveInterval) {
              clearInterval(keepAliveInterval)
              keepAliveInterval = undefined
            }
            params.request?.signal.removeEventListener('abort', close)
            controller.close()
          }
          const enqueue = (chunk: string): void => {
            if (isClosed) {
              return
            }

            controller.enqueue(encoder.encode(chunk))
          }

          unsubscribe = this.subscribe((event) => {
            enqueue(formatSseEvent(responseEventName, event))
          })

          if (keepAliveMs > 0) {
            keepAliveInterval = setInterval(() => {
              enqueue(': keep-alive\n\n')
            }, keepAliveMs)
          }

          if (params.request?.signal.aborted) {
            close()
            return
          }

          params.request?.signal.addEventListener('abort', close)
        },
        cancel: () => {
          isClosed = true
          unsubscribe?.()
          unsubscribe = undefined
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval)
            keepAliveInterval = undefined
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store',
          Connection: 'keep-alive',
        },
      })
    },
    getSubscriberCount() {
      return listeners.size
    },
  }
}

function formatSseEvent(
  eventName: string,
  event: ConversationClientEvent,
): string {
  return [
    `event: ${eventName}`,
    `data: ${JSON.stringify(event)}`,
    '',
    '',
  ].join('\n')
}
