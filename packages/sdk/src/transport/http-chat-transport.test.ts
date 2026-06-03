import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpChatTransport } from './http-chat-transport'

const fetchMock = vi.fn()

interface RequestBody {
  question: string
}

interface ResponseBody {
  answer: string
}

describe('HttpChatTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    vi.useRealTimers()
  })

  it('JSON 요청을 보내고 JSON 응답을 반환한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ answer: '응답' }),
    })
    const transport = new HttpChatTransport<RequestBody, ResponseBody>({
      endpoint: '/api/chat',
    })

    const response = await transport.sendMessage({ question: '질문' })

    expect(response).toEqual({ answer: '응답' })
    expect(fetchMock).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '질문' }),
    }))
  })

  it('HTTP 응답이 실패하면 예외를 던진다', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'failed' }),
    })
    const transport = new HttpChatTransport<RequestBody, ResponseBody>({
      endpoint: '/api/chat',
    })

    await expect(transport.sendMessage({ question: '질문' })).rejects.toThrow(
      'HTTP chat transport request failed',
    )
  })

  it('timeoutMs가 지나면 요청을 abort한다', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation((_endpoint, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })
    const transport = new HttpChatTransport<RequestBody, ResponseBody>({
      endpoint: '/api/chat',
      timeoutMs: 1000,
    })
    const requestPromise = transport.sendMessage({ question: '질문' })
    const requestExpectation = expect(requestPromise).rejects.toThrow(
      'The operation was aborted.',
    )

    await vi.advanceTimersByTimeAsync(1000)

    await requestExpectation
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    expect((fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal).aborted).toBe(
      true,
    )
  })

  it('호출자가 전달한 signal로 요청을 abort한다', async () => {
    fetchMock.mockImplementation((_endpoint, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })
    const transport = new HttpChatTransport<RequestBody, ResponseBody>({
      endpoint: '/api/chat',
    })
    const abortController = new AbortController()
    const requestPromise = transport.sendMessage(
      { question: '질문' },
      { signal: abortController.signal },
    )
    const requestExpectation = expect(requestPromise).rejects.toThrow(
      'The operation was aborted.',
    )

    abortController.abort()

    await requestExpectation
    expect((fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal).aborted).toBe(
      true,
    )
  })
})
