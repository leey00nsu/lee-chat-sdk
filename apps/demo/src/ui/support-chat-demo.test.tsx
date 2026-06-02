import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SupportChatDemo } from './support-chat-demo'

describe('SupportChatDemo', () => {
  it('drop-in LeeChatWidget으로 고객상담 메시지를 주고받는다', async () => {
    render(<SupportChatDemo />)

    fireEvent.click(screen.getByRole('button', { name: 'Open support chat' }))
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: '요금제를 알고 싶어요' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('요금제를 알고 싶어요')).toBeTruthy()
      expect(screen.getByText(/Support received/)).toBeTruthy()
    })
  })
})
