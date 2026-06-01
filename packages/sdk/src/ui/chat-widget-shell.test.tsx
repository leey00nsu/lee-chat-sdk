import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChatWidgetShell } from './chat-widget-shell'

describe('ChatWidgetShell', () => {
  it('제목, 설명, 본문, footer를 영역별로 렌더링한다', () => {
    render(
      <ChatWidgetShell
        title="블로그 Q&A"
        description="근거 기반 답변"
        footer={<button type="button">보내기</button>}
      >
        <p>대화 영역</p>
      </ChatWidgetShell>,
    )

    expect(
      screen.getByRole('region', { name: '블로그 Q&A' }),
    ).toBeTruthy()
    expect(screen.getByText('근거 기반 답변')).toBeTruthy()
    expect(screen.getByText('대화 영역')).toBeTruthy()
    expect(screen.getByRole('button', { name: '보내기' })).toBeTruthy()
  })
})
