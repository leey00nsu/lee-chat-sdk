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
    expect(fetchMock).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '질문' }),
    })
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
})
