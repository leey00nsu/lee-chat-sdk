import type {
  ChatTransport,
  ChatTransportSendMessageOptions,
} from './chat-transport'

export interface HttpChatTransportParams {
  endpoint: string
  fetchImplementation?: typeof fetch
  headers?: Record<string, string>
  timeoutMs?: number
}

const HTTP_CHAT_TRANSPORT_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  APPLICATION_JSON: 'application/json',
} as const

const HTTP_CHAT_TRANSPORT_ERROR = {
  REQUEST_FAILED: 'HTTP chat transport request failed',
} as const

const HTTP_CHAT_TRANSPORT_TIMEOUT = {
  DISABLED_MS: 0,
} as const

export class HttpChatTransport<TRequest, TResponse>
  implements ChatTransport<TRequest, TResponse>
{
  private readonly endpoint: string
  private readonly fetchImplementation: typeof fetch
  private readonly headers: Record<string, string>
  private readonly timeoutMs: number

  constructor({
    endpoint,
    fetchImplementation = globalThis.fetch,
    headers = {},
    timeoutMs = HTTP_CHAT_TRANSPORT_TIMEOUT.DISABLED_MS,
  }: HttpChatTransportParams) {
    this.endpoint = endpoint
    this.fetchImplementation = fetchImplementation
    this.headers = headers
    this.timeoutMs = timeoutMs
  }

  async sendMessage(
    request: TRequest,
    options: ChatTransportSendMessageOptions = {},
  ): Promise<TResponse> {
    const abortController = new AbortController()
    const timeoutId = this.createTimeout(abortController)
    const removeExternalAbortListener = this.forwardAbortSignal({
      sourceSignal: options.signal,
      abortController,
    })

    try {
      const response = await this.fetchImplementation(this.endpoint, {
        method: 'POST',
        headers: {
          [HTTP_CHAT_TRANSPORT_HEADERS.CONTENT_TYPE]:
            HTTP_CHAT_TRANSPORT_HEADERS.APPLICATION_JSON,
          ...this.headers,
        },
        body: JSON.stringify(request),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(HTTP_CHAT_TRANSPORT_ERROR.REQUEST_FAILED)
      }

      return (await response.json()) as TResponse
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      removeExternalAbortListener()
    }
  }

  private createTimeout(
    abortController: AbortController,
  ): ReturnType<typeof setTimeout> | undefined {
    if (this.timeoutMs <= HTTP_CHAT_TRANSPORT_TIMEOUT.DISABLED_MS) {
      return undefined
    }

    return setTimeout(() => {
      abortController.abort()
    }, this.timeoutMs)
  }

  private forwardAbortSignal({
    sourceSignal,
    abortController,
  }: {
    sourceSignal?: AbortSignal
    abortController: AbortController
  }): () => void {
    if (!sourceSignal) {
      return () => {}
    }

    if (sourceSignal.aborted) {
      abortController.abort()
      return () => {}
    }

    const handleAbort = (): void => {
      abortController.abort()
    }

    sourceSignal.addEventListener('abort', handleAbort, { once: true })

    return () => {
      sourceSignal.removeEventListener('abort', handleAbort)
    }
  }
}
