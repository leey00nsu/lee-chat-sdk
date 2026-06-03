import type {
  ChatTransport,
  ChatTransportSendMessageOptions,
} from './chat-transport'

export interface HttpChatTransportParams {
  endpoint: string
  fetchImplementation?: typeof fetch
  headers?: HttpChatTransportHeaders
  timeoutMs?: number
  retry?: HttpChatTransportRetryOptions
  auth?: HttpChatTransportAuthOptions
}

export type HttpChatTransportHeaders =
  | Record<string, string>
  | (() => Record<string, string> | Promise<Record<string, string>>)

export interface HttpChatTransportRetryOptions {
  maxAttempts?: number
  delayMs?: number
  retryStatusCodes?: number[]
  retryStatusCodeRanges?: Array<{
    from: number
    to: number
  }>
}

export interface HttpChatTransportAuthRefreshParams {
  status: number
}

export interface HttpChatTransportAuthOptions {
  refresh?: (
    params: HttpChatTransportAuthRefreshParams,
  ) => void | Promise<void>
  refreshStatusCodes?: number[]
  maxRefreshAttempts?: number
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

const HTTP_CHAT_TRANSPORT_AUTH = {
  DEFAULT_REFRESH_STATUS_CODE: 401,
  DEFAULT_MAX_REFRESH_ATTEMPTS: 1,
} as const

export class HttpChatTransport<TRequest, TResponse>
  implements ChatTransport<TRequest, TResponse>
{
  private readonly endpoint: string
  private readonly fetchImplementation: typeof fetch
  private readonly headers: HttpChatTransportHeaders
  private readonly timeoutMs: number
  private readonly retry: Required<HttpChatTransportRetryOptions>
  private readonly auth: Required<
    Pick<HttpChatTransportAuthOptions, 'refreshStatusCodes' | 'maxRefreshAttempts'>
  > &
    Pick<HttpChatTransportAuthOptions, 'refresh'>

  constructor({
    endpoint,
    fetchImplementation = globalThis.fetch,
    headers = {},
    timeoutMs = HTTP_CHAT_TRANSPORT_TIMEOUT.DISABLED_MS,
    retry = {},
    auth = {},
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
    this.auth = {
      refresh: auth.refresh,
      refreshStatusCodes:
        auth.refreshStatusCodes ?? [
          HTTP_CHAT_TRANSPORT_AUTH.DEFAULT_REFRESH_STATUS_CODE,
        ],
      maxRefreshAttempts:
        auth.maxRefreshAttempts ??
        HTTP_CHAT_TRANSPORT_AUTH.DEFAULT_MAX_REFRESH_ATTEMPTS,
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
    const maxRefreshAttempts = Math.max(
      0,
      this.auth.maxRefreshAttempts,
    )
    let latestError: unknown
    let attempt = 0
    let refreshAttempt = 0

    while (true) {
      attempt += 1

      try {
        return await this.sendMessageOnce({
          request,
          signal,
        })
      } catch (error) {
        latestError = error

        if (
          !signal.aborted &&
          refreshAttempt < maxRefreshAttempts &&
          this.shouldRefreshAuth(error)
        ) {
          refreshAttempt += 1
          await this.refreshAuth(error)
          continue
        }

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
    const resolvedHeaders = this.resolveHeaders()
    const headers = isPromiseLike(resolvedHeaders)
      ? await resolvedHeaders
      : resolvedHeaders

    if (signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError')
    }

    const response = await this.fetchImplementation(this.endpoint, {
      method: 'POST',
      headers: {
        [HTTP_CHAT_TRANSPORT_HEADERS.CONTENT_TYPE]:
          HTTP_CHAT_TRANSPORT_HEADERS.APPLICATION_JSON,
        ...headers,
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

  private shouldRefreshAuth(error: unknown): boolean {
    return (
      error instanceof HttpChatTransportRequestError &&
      typeof this.auth.refresh === 'function' &&
      this.auth.refreshStatusCodes.includes(error.status)
    )
  }

  private async refreshAuth(error: unknown): Promise<void> {
    if (
      !(error instanceof HttpChatTransportRequestError) ||
      typeof this.auth.refresh !== 'function'
    ) {
      return
    }

    await this.auth.refresh({
      status: error.status,
    })
  }

  private resolveHeaders(): Record<string, string> | Promise<Record<string, string>> {
    if (typeof this.headers === 'function') {
      return this.headers()
    }

    return this.headers
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

function isPromiseLike<TValue>(
  value: TValue | Promise<TValue>,
): value is Promise<TValue> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  )
}

class HttpChatTransportRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(HTTP_CHAT_TRANSPORT_ERROR.REQUEST_FAILED)
    this.status = status
  }
}
