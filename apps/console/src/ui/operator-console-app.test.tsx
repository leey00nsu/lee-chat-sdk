import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OperatorConsoleApp } from './operator-console-app'

afterEach(() => {
  cleanup()
})

describe('OperatorConsoleApp', () => {
  it('대화 목록, 메시지 스레드, 고객 컨텍스트를 3개 영역으로 렌더링한다', () => {
    render(<OperatorConsoleApp />)

    expect(screen.getByRole('navigation', { name: '대화 목록' })).toBeTruthy()
    expect(screen.getByRole('main', { name: '메시지 스레드' })).toBeTruthy()
    expect(
      screen.getByRole('complementary', { name: '고객 컨텍스트' }),
    ).toBeTruthy()
    const messageThread = screen.getByRole('main', { name: '메시지 스레드' })

    expect(within(messageThread).getByText('요금제를 알고 싶어요')).toBeTruthy()
    expect(screen.getByText('pricing-page-opened')).toBeTruthy()
    expect(screen.getByText('결제 직전 이탈 가능성이 높음')).toBeTruthy()
  })

  it('다른 대화를 선택하고 상담자에게 배정한다', () => {
    render(<OperatorConsoleApp />)

    fireEvent.click(screen.getByRole('button', { name: /Alex Lee/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Jin에게 배정' }))

    const messageThread = screen.getByRole('main', { name: '메시지 스레드' })

    expect(within(messageThread).getByText('assigned')).toBeTruthy()
    expect(within(messageThread).getByText('Jin')).toBeTruthy()
  })
})
