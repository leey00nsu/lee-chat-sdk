import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SupportChatDemo } from './support-chat-demo'

describe('SupportChatDemo', () => {
  it('SDK controller와 primitive로 고객상담 메시지를 주고받는다', async () => {
    render(<SupportChatDemo />)

    fireEvent.click(screen.getByRole('button', { name: '상담 열기' }))
    fireEvent.change(screen.getByLabelText('상담 메시지'), {
      target: { value: '요금제를 알고 싶어요' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보내기' }))

    await waitFor(() => {
      expect(screen.getByText('요금제를 알고 싶어요')).toBeTruthy()
      expect(screen.getByText(/상담원 Mina/)).toBeTruthy()
      expect(screen.getByText('assigned')).toBeTruthy()
    })
  })
})
