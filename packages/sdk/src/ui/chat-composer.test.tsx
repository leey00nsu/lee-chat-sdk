import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
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

  it('Enter로 전송하고 Shift+Enter는 줄바꿈 입력으로 남긴다', () => {
    const handleSubmit = vi.fn()

    render(
      <ChatComposer
        inputId="message"
        label="메시지"
        value="질문"
        placeholder="메시지를 입력하세요"
        submitLabel="보내기"
        onChange={vi.fn()}
        onSubmit={handleSubmit}
      />,
    )

    const textarea = screen.getByLabelText('메시지')

    fireEvent.keyDown(textarea, {
      key: 'Enter',
      shiftKey: true,
    })
    fireEvent.keyDown(textarea, {
      key: 'Enter',
    })

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

  it('submit content를 ReactNode로 렌더링하면서 버튼 동작을 유지한다', () => {
    const handleSubmit = vi.fn()

    render(
      <ChatComposer
        inputId="message"
        label="메시지"
        value="질문"
        placeholder="메시지를 입력하세요"
        submitLabel="질문 보내기"
        renderSubmitContent={({
          isSubmitting,
          isUploading,
          defaultContent,
        }) => (
          <>
            <span data-testid="send-icon" aria-hidden="true">
              icon
            </span>
            <span>
              {isSubmitting || isUploading ? '처리 중' : defaultContent}
            </span>
          </>
        )}
        onChange={vi.fn()}
        onSubmit={handleSubmit}
      />,
    )

    const button = screen.getByRole('button', { name: '질문 보내기' })

    expect(screen.getByTestId('send-icon')).toBeTruthy()
    expect(button.textContent).toContain('질문 보내기')

    fireEvent.click(button)

    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it('submit content에 submitting 상태와 기본 콘텐츠를 전달한다', () => {
    render(
      <ChatComposer
        inputId="message"
        label="메시지"
        value="질문"
        placeholder="메시지를 입력하세요"
        submitLabel="전송 중"
        isLoading
        renderSubmitContent={({ isSubmitting, defaultContent }) => (
          <span>
            {isSubmitting ? 'spinner' : null}
            {defaultContent}
          </span>
        )}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const button = screen.getByRole<HTMLButtonElement>('button', {
      name: '전송 중',
    })

    expect(button.textContent).toBe('spinner전송 중')
    expect(button.disabled).toBe(true)
  })

  it('첨부파일 업로드 중 상태를 submit content에 전달한다', async () => {
    let resolveUpload: () => void = () => {}
    const uploadAttachment = vi.fn(
      () =>
        new Promise<{
          kind: 'file'
          url: string
          name: string
        }>((resolve) => {
          resolveUpload = () => {
            resolve({
              kind: 'file',
              url: 'https://example.com/file.pdf',
              name: 'file.pdf',
            })
          }
        }),
    )

    render(
      <ChatComposer
        inputId="message"
        label="메시지"
        value=""
        placeholder="메시지를 입력하세요"
        submitLabel="보내기"
        uploadAttachment={uploadAttachment}
        renderSubmitContent={({ isUploading, defaultContent }) => (
          <span>{isUploading ? '업로드 중' : defaultContent}</span>
        )}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const file = new File(['file'], 'file.pdf', {
      type: 'application/pdf',
    })

    fireEvent.change(screen.getByLabelText('Attach file'), {
      target: {
        files: [file],
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '보내기' }).textContent).toBe(
        '업로드 중',
      )
    })

    resolveUpload()

    await waitFor(() => {
      expect(screen.getByText('file.pdf')).toBeTruthy()
    })
  })
})
