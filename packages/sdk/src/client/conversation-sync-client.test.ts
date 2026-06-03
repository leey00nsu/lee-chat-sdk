import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConversationSyncClient } from './conversation-sync-client'

const fetchMock = vi.fn()

describe('ConversationSyncClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('conversation 목록을 visitor와 participant 기준으로 조회한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          conversations: [
            {
              id: 'conversation-1',
              kind: 'support',
              status: 'open',
              participants: [],
              createdAt: '2026-06-01T00:00:00.000Z',
            },
          ],
          nextCursor: 'cursor-next',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )
    const client = new ConversationSyncClient({
      endpoint: '/api/chat',
      headers: {
        Authorization: 'Bearer token',
      },
    })

    const response = await client.listConversations({
      appId: 'app',
      visitorId: 'visitor-1',
      participantId: 'participant-1',
      cursor: 'cursor-current',
      limit: 20,
    })

    expect(response.nextCursor).toBe('cursor-next')
    expect(response.conversations[0]?.id).toBe('conversation-1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat/conversations?appId=app&visitorId=visitor-1&participantId=participant-1&cursor=cursor-current&limit=20',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer token',
        },
      }),
    )
  })

  it('conversation 메시지를 cursor 기반으로 조회한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          messages: [
            {
              id: 'message-1',
              conversationId: 'conversation-1',
              senderId: 'participant-1',
              role: 'user',
              content: 'Hello',
              parts: [
                {
                  type: 'text',
                  text: 'Hello',
                },
              ],
              status: 'sent',
              createdAt: '2026-06-01T00:01:00.000Z',
            },
          ],
          nextCursor: 'message-cursor-next',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )
    const client = new ConversationSyncClient({
      endpoint: '/api/chat',
    })

    const response = await client.listMessages({
      conversationId: 'conversation-1',
      cursor: 'message-cursor',
      limit: 30,
    })

    expect(response.messages[0]?.content).toBe('Hello')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat/conversations/conversation-1/messages?cursor=message-cursor&limit=30',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('read receipt를 서버에 동기화한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          readReceipt: {
            conversationId: 'conversation-1',
            messageId: 'message-1',
            participantId: 'participant-1',
            readAt: '2026-06-01T00:02:00.000Z',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )
    const client = new ConversationSyncClient({
      endpoint: '/api/chat',
    })

    const response = await client.markMessageRead({
      conversationId: 'conversation-1',
      messageId: 'message-1',
      participantId: 'participant-1',
      readAt: '2026-06-01T00:02:00.000Z',
    })

    expect(response.readReceipt.messageId).toBe('message-1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat/conversations/conversation-1/read',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: 'message-1',
          participantId: 'participant-1',
          readAt: '2026-06-01T00:02:00.000Z',
        }),
      }),
    )
  })

  it('인증 만료 응답이면 auth refresh 후 새 headers로 다시 요청한다', async () => {
    let accessToken = 'expired-token'
    const refresh = vi.fn(async () => {
      accessToken = 'fresh-token'
    })
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'unauthorized' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            conversations: [],
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )
    const client = new ConversationSyncClient({
      endpoint: '/api/chat',
      headers: () => ({
        Authorization: `Bearer ${accessToken}`,
      }),
      auth: {
        refresh,
      },
    })

    const response = await client.listConversations({
      appId: 'app',
    })

    expect(response.conversations).toEqual([])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer expired-token',
    })
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer fresh-token',
    })
  })
})
