import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { LeeChatProvider } from './lee-chat-provider'
import { useLeeChat } from './use-lee-chat'

describe('LeeChatProvider', () => {
  it('config와 기본 open 상태를 context로 제공한다', () => {
    const { result } = renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            initialOpen: true,
          }}
        >
          {children}
        </LeeChatProvider>
      ),
    })

    expect(result.current.config.appId).toBe('app')
    expect(result.current.config.position).toBe('bottom-right')
    expect(result.current.isOpen).toBe(true)
  })

  it('conversation event를 participant state로 적용한다', () => {
    const { result } = renderHook(() => useLeeChat(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <LeeChatProvider
          config={{
            appId: 'app',
            endpoint: '/api/chat',
            initialOpen: true,
          }}
        >
          {children}
        </LeeChatProvider>
      ),
    })

    act(() => {
      result.current.applyEvent({
        type: 'participant.typing_changed',
        typingIndicator: {
          conversationId: 'app:conversation',
          participantId: 'app-assistant',
          isTyping: true,
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      })
    })

    expect(result.current.participantState.typingIndicators).toEqual([
      {
        conversationId: 'app:conversation',
        participantId: 'app-assistant',
        isTyping: true,
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    ])
  })
})
