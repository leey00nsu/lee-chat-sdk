import type { ChatTransport } from './chat-transport'

interface HttpChatTransportParams {
  endpoint: string
  fetchImplementation?: typeof fetch
  headers?: Record<string, string>
}

const HTTP_CHAT_TRANSPORT_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  APPLICATION_JSON: 'application/json',
} as const

const HTTP_CHAT_TRANSPORT_ERROR = {
  REQUEST_FAILED: 'HTTP chat transport request failed',
} as const

export class HttpChatTransport<TRequest, TResponse>
  implements ChatTransport<TRequest, TResponse>
{
  private readonly endpoint: string
  private readonly fetchImplementation: typeof fetch
  private readonly headers: Record<string, string>

  constructor({
    endpoint,
    fetchImplementation = globalThis.fetch,
    headers = {},
  }: HttpChatTransportParams) {
    this.endpoint = endpoint
    this.fetchImplementation = fetchImplementation
    this.headers = headers
  }

  async sendMessage(request: TRequest): Promise<TResponse> {
    const response = await this.fetchImplementation(this.endpoint, {
      method: 'POST',
      headers: {
        [HTTP_CHAT_TRANSPORT_HEADERS.CONTENT_TYPE]:
          HTTP_CHAT_TRANSPORT_HEADERS.APPLICATION_JSON,
        ...this.headers,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(HTTP_CHAT_TRANSPORT_ERROR.REQUEST_FAILED)
    }

    return (await response.json()) as TResponse
  }
}
