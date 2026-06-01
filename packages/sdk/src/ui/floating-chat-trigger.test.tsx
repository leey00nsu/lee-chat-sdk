import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FloatingChatTrigger } from './floating-chat-trigger'

describe('FloatingChatTrigger', () => {
  it('접근 가능한 버튼으로 열기/닫기 이벤트를 전달한다', () => {
    const handleClick = vi.fn()

    render(
      <FloatingChatTrigger
        label="채팅 열기"
        isOpen={false}
        onClick={handleClick}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '채팅 열기' }))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
