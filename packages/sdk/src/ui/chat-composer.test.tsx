import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatComposer } from './chat-composer'

afterEach(() => {
  cleanup()
})

describe('ChatComposer', () => {
  it('입력값을 변경하고 submit 이벤트를 전달한다', () => {
    const handleChange = vi.fn()
    const handleSubmit = vi.fn()

    render(
      <ChatComposer
        inputId="message"
        label="메시지"
        value="안녕하세요"
        placeholder="메시지를 입력하세요"
        submitLabel="보내기"
        onChange={handleChange}
        onSubmit={handleSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText('메시지'), {
      target: { value: '질문' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보내기' }))

    expect(handleChange).toHaveBeenCalledWith('질문')
    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it('loading이거나 빈 입력이면 submit 버튼을 비활성화한다', () => {
    const { rerender } = render(
      <ChatComposer
        inputId="message"
        label="메시지"
        value=""
        placeholder="메시지를 입력하세요"
        submitLabel="보내기"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole<HTMLButtonElement>('button', { name: '보내기' }).disabled).toBe(
      true,
    )

    rerender(
      <ChatComposer
        inputId="message"
        label="메시지"
        value="질문"
        placeholder="메시지를 입력하세요"
        submitLabel="전송 중"
        isLoading
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: '전송 중' }).disabled,
    ).toBe(true)
  })
})
