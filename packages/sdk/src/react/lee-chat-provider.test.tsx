import { renderHook } from '@testing-library/react'
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
})
