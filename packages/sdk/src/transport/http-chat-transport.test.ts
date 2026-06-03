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

  it('retry.maxAttempts 안에서 5xx 응답을 재시도하고 성공 응답을 반환한다', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ message: 'temporary failure' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ answer: '재시도 성공' }),
      })
    const transport = new HttpChatTransport<RequestBody, ResponseBody>({
      endpoint: '/api/chat',
      retry: {
        maxAttempts: 2,
      },
    })

    const response = await transport.sendMessage({ question: '질문' })

    expect(response).toEqual({ answer: '재시도 성공' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('network 오류를 retry하고 성공 응답을 반환한다', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('network failed'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ answer: '네트워크 재시도 성공' }),
      })
    const transport = new HttpChatTransport<RequestBody, ResponseBody>({
      endpoint: '/api/chat',
      retry: {
        maxAttempts: 2,
      },
    })

    const response = await transport.sendMessage({ question: '질문' })

    expect(response).toEqual({ answer: '네트워크 재시도 성공' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('4xx 응답은 기본 retry 대상에서 제외한다', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'bad request' }),
    })
    const transport = new HttpChatTransport<RequestBody, ResponseBody>({
      endpoint: '/api/chat',
      retry: {
        maxAttempts: 3,
      },
    })

    await expect(transport.sendMessage({ question: '질문' })).rejects.toThrow(
      'HTTP chat transport request failed',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retry.delayMs만큼 기다린 뒤 다음 시도를 실행한다', async () => {
    vi.useFakeTimers()
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ message: 'temporary failure' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ answer: '지연 후 성공' }),
      })
    const transport = new HttpChatTransport<RequestBody, ResponseBody>({
      endpoint: '/api/chat',
      retry: {
        maxAttempts: 2,
        delayMs: 500,
      },
    })
    const requestPromise = transport.sendMessage({ question: '질문' })

    await vi.advanceTimersByTimeAsync(499)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    const response = await requestPromise

    expect(response).toEqual({ answer: '지연 후 성공' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
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

  it('요청마다 동적 headers를 평가한다', async () => {
    let accessToken = 'token-a'
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ answer: '첫 응답' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ answer: '두 번째 응답' }),
      })
    const transport = new HttpChatTransport<RequestBody, ResponseBody>({
      endpoint: '/api/chat',
      headers: () => ({
        Authorization: `Bearer ${accessToken}`,
      }),
    })

    await transport.sendMessage({ question: '첫 질문' })
    accessToken = 'token-b'
    await transport.sendMessage({ question: '두 번째 질문' })

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-a',
    })
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-b',
    })
  })

  it('auth refresh 대상 응답이면 refresh 후 새 headers로 재요청한다', async () => {
    let accessToken = 'expired-token'
    const refresh = vi.fn(async () => {
      accessToken = 'fresh-token'
    })
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'unauthorized' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ answer: '갱신 후 응답' }),
      })
    const transport = new HttpChatTransport<RequestBody, ResponseBody>({
      endpoint: '/api/chat',
      headers: () => ({
        Authorization: `Bearer ${accessToken}`,
      }),
      auth: {
        refresh,
      },
    })

    const response = await transport.sendMessage({ question: '질문' })

    expect(response).toEqual({ answer: '갱신 후 응답' })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer expired-token',
    })
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer fresh-token',
    })
  })
})
