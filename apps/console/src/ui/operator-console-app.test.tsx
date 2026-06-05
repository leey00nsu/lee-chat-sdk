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
    expect(within(messageThread).getByText('결제 직전 이탈 가능성이 높음')).toBeTruthy()
  })

  it('다른 대화를 선택하고 상담자에게 배정한다', () => {
    render(<OperatorConsoleApp />)

    fireEvent.click(screen.getByRole('button', { name: /Alex Lee/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Jin에게 배정' }))

    const messageThread = screen.getByRole('main', { name: '메시지 스레드' })

    expect(within(messageThread).getByText('assigned')).toBeTruthy()
    expect(within(messageThread).getByText('Jin')).toBeTruthy()
  })

  it('검색과 상태 필터로 상담 목록을 좁힌다', () => {
    render(<OperatorConsoleApp />)

    fireEvent.change(screen.getByLabelText('대화 검색'), {
      target: {
        value: 'delivery',
      },
    })

    expect(screen.getByRole('button', { name: /Alex Lee/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Yujin Kim/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '진행 중' }))

    expect(screen.queryByRole('button', { name: /Alex Lee/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '미배정' }))

    expect(screen.getByRole('button', { name: /Alex Lee/ })).toBeTruthy()
  })

  it('상담 응답을 thread에 추가하고 종료할 수 있다', () => {
    render(<OperatorConsoleApp />)

    fireEvent.click(screen.getByRole('button', { name: /Alex Lee/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Jin에게 배정' }))
    fireEvent.change(screen.getByLabelText('상담 응답'), {
      target: {
        value: '배송 조회 링크를 보내드렸습니다.',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: '응답 전송' }))

    const messageThread = screen.getByRole('main', { name: '메시지 스레드' })

    expect(
      within(messageThread).getByText('배송 조회 링크를 보내드렸습니다.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '상담 종료' }))

    expect(within(messageThread).getByText('closed')).toBeTruthy()
    expect(screen.getByText('종료됨')).toBeTruthy()
  })
})
