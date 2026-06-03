import type {
  ChatTransport,
  ChatTransportSendMessageOptions,
} from './chat-transport'

export interface HttpChatTransportParams {
  endpoint: string
  fetchImplementation?: typeof fetch
  headers?: Record<string, string>
  timeoutMs?: number
  retry?: HttpChatTransportRetryOptions
}

export interface HttpChatTransportRetryOptions {
  maxAttempts?: number
  delayMs?: number
  retryStatusCodes?: number[]
  retryStatusCodeRanges?: Array<{
    from: number
    to: number
  }>
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

const HTTP_CHAT_TRANSPORT_RETRY = {
  DEFAULT_MAX_ATTEMPTS: 1,
  DEFAULT_DELAY_MS: 0,
  SERVER_ERROR_STATUS_FROM: 500,
  SERVER_ERROR_STATUS_TO: 599,
} as const

export class HttpChatTransport<TRequest, TResponse>
  implements ChatTransport<TRequest, TResponse>
{
  private readonly endpoint: string
  private readonly fetchImplementation: typeof fetch
  private readonly headers: Record<string, string>
  private readonly timeoutMs: number
  private readonly retry: Required<HttpChatTransportRetryOptions>

  constructor({
    endpoint,
    fetchImplementation = globalThis.fetch,
    headers = {},
    timeoutMs = HTTP_CHAT_TRANSPORT_TIMEOUT.DISABLED_MS,
    retry = {},
  }: HttpChatTransportParams) {
    this.endpoint = endpoint
    this.fetchImplementation = fetchImplementation
    this.headers = headers
    this.timeoutMs = timeoutMs
    this.retry = {
      maxAttempts:
        retry.maxAttempts ?? HTTP_CHAT_TRANSPORT_RETRY.DEFAULT_MAX_ATTEMPTS,
      delayMs: retry.delayMs ?? HTTP_CHAT_TRANSPORT_RETRY.DEFAULT_DELAY_MS,
      retryStatusCodes: retry.retryStatusCodes ?? [],
      retryStatusCodeRanges:
        retry.retryStatusCodeRanges ?? [
          {
            from: HTTP_CHAT_TRANSPORT_RETRY.SERVER_ERROR_STATUS_FROM,
            to: HTTP_CHAT_TRANSPORT_RETRY.SERVER_ERROR_STATUS_TO,
          },
        ],
    }
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
      return await this.sendMessageWithRetry({
        request,
        signal: abortController.signal,
      })
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      removeExternalAbortListener()
    }
  }

  private async sendMessageWithRetry({
    request,
    signal,
  }: {
    request: TRequest
    signal: AbortSignal
  }): Promise<TResponse> {
    const maxAttempts = Math.max(
      HTTP_CHAT_TRANSPORT_RETRY.DEFAULT_MAX_ATTEMPTS,
      this.retry.maxAttempts,
    )
    let latestError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.sendMessageOnce({
          request,
          signal,
        })
      } catch (error) {
        latestError = error

        if (
          signal.aborted ||
          attempt >= maxAttempts ||
          !this.shouldRetryError(error)
        ) {
          throw error
        }

        await this.delayBeforeRetry(signal)
      }
    }

    throw latestError
  }

  private async sendMessageOnce({
    request,
    signal,
  }: {
    request: TRequest
    signal: AbortSignal
  }): Promise<TResponse> {
    const response = await this.fetchImplementation(this.endpoint, {
      method: 'POST',
      headers: {
        [HTTP_CHAT_TRANSPORT_HEADERS.CONTENT_TYPE]:
          HTTP_CHAT_TRANSPORT_HEADERS.APPLICATION_JSON,
        ...this.headers,
      },
      body: JSON.stringify(request),
      signal,
    })

    if (!response.ok) {
      throw new HttpChatTransportRequestError(response.status)
    }

    return (await response.json()) as TResponse
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

  private shouldRetryError(error: unknown): boolean {
    if (error instanceof HttpChatTransportRequestError) {
      return this.shouldRetryStatusCode(error.status)
    }

    return true
  }

  private shouldRetryStatusCode(statusCode: number): boolean {
    if (this.retry.retryStatusCodes.includes(statusCode)) {
      return true
    }

    return this.retry.retryStatusCodeRanges.some((statusCodeRange) => {
      return (
        statusCode >= statusCodeRange.from && statusCode <= statusCodeRange.to
      )
    })
  }

  private async delayBeforeRetry(signal: AbortSignal): Promise<void> {
    if (this.retry.delayMs <= HTTP_CHAT_TRANSPORT_RETRY.DEFAULT_DELAY_MS) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      const cleanup = (): void => {
        clearTimeout(timeoutId)
        signal.removeEventListener('abort', handleAbort)
      }
      const timeoutId = setTimeout(() => {
        cleanup()
        resolve()
      }, this.retry.delayMs)
      const handleAbort = (): void => {
        cleanup()
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      }

      signal.addEventListener('abort', handleAbort, { once: true })
    })
  }
}

class HttpChatTransportRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(HTTP_CHAT_TRANSPORT_ERROR.REQUEST_FAILED)
    this.status = status
  }
}
