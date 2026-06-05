import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveLeeChatConfig } from './lee-chat-config'

describe('resolveLeeChatConfig', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    )
  })

  it('required config에 기본 widget 설정을 병합한다', () => {
    const config = resolveLeeChatConfig({
      appId: 'app',
      endpoint: '/api/chat',
    })

    expect(config).toEqual(
      expect.objectContaining({
        appId: 'app',
        endpoint: '/api/chat',
        conversation: expect.objectContaining({
          id: 'app:conversation:00000000-0000-4000-8000-000000000001',
          kind: 'support',
        }),
        participant: expect.objectContaining({
          id: '00000000-0000-4000-8000-000000000001',
          kind: 'user',
        }),
        position: 'bottom-right',
        initialOpen: false,
        persistence: 'memory',
        texts: expect.objectContaining({
          title: 'Chat',
          subtitle: 'Send us a message.',
          triggerLabel: 'Open chat',
          placeholder: 'Type your message',
          send: 'Send',
          sending: 'Sending',
          messageSending: 'Sending...',
          assistantLoading: 'Assistant is typing...',
          participantOnline: 'Online',
          participantTyping: 'Participant is typing...',
          messageRead: 'Read',
          error: 'Message failed. Please try again.',
          retry: 'Retry',
        }),
        theme: expect.objectContaining({
          colorScheme: 'light',
          primaryColor: '#111827',
          radius: '12px',
        }),
      }),
    )
  })

  it('사용자 texts, theme, className 설정을 보존한다', () => {
    const config = resolveLeeChatConfig({
      appId: 'app',
      endpoint: '/api/chat',
      conversation: {
        kind: 'assistant',
      },
      participant: {
        id: 'participant-custom',
        kind: 'bot',
        displayName: 'Assistant',
        email: 'assistant@example.com',
      },
      texts: {
        title: 'Support',
      },
      theme: {
        primaryColor: '#2563eb',
      },
      className: {
        trigger: 'custom-trigger',
      },
    })

    expect(config.conversation.kind).toBe('assistant')
    expect(config.participant.id).toBe('participant-custom')
    expect(config.participant.kind).toBe('bot')
    expect(config.participant.displayName).toBe('Assistant')
    expect(config.participant.email).toBe('assistant@example.com')
    expect(config.texts.title).toBe('Support')
    expect(config.texts.send).toBe('Send')
    expect(config.texts.retry).toBe('Retry')
    expect(config.texts.participantOnline).toBe('Online')
    expect(config.texts.participantTyping).toBe('Participant is typing...')
    expect(config.texts.messageRead).toBe('Read')
    expect(config.theme.primaryColor).toBe('#2563eb')
    expect(config.theme.radius).toBe('12px')
    expect(config.className?.trigger).toBe('custom-trigger')
  })

  it('requestTimeoutMs 설정을 보존한다', () => {
    const config = resolveLeeChatConfig({
      appId: 'app',
      endpoint: '/api/chat',
      requestTimeoutMs: 3000,
    })

    expect(config.requestTimeoutMs).toBe(3000)
  })

  it('requestRetry 설정을 보존한다', () => {
    const config = resolveLeeChatConfig({
      appId: 'app',
      endpoint: '/api/chat',
      requestRetry: {
        maxAttempts: 2,
        delayMs: 100,
      },
    })

    expect(config.requestRetry).toEqual({
      maxAttempts: 2,
      delayMs: 100,
    })
  })

  it('visitor id를 localStorage에 저장하고 같은 appId에서 재사용한다', () => {
    const firstConfig = resolveLeeChatConfig({
      appId: 'app',
      endpoint: '/api/chat',
    })

    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000002',
    )

    const secondConfig = resolveLeeChatConfig({
      appId: 'app',
      endpoint: '/api/chat',
    })

    expect(firstConfig.visitor.id).toBe('00000000-0000-4000-8000-000000000001')
    expect(secondConfig.visitor.id).toBe('00000000-0000-4000-8000-000000000001')
    expect(secondConfig.participant.id).toBe('00000000-0000-4000-8000-000000000001')
    expect(secondConfig.conversation.id).toBe(
      'app:conversation:00000000-0000-4000-8000-000000000001',
    )
  })

  it('명시적 visitor id는 저장된 anonymous visitor id보다 우선한다', () => {
    localStorage.setItem('lee-chat:app:visitor', 'visitor-persisted')

    const config = resolveLeeChatConfig({
      appId: 'app',
      endpoint: '/api/chat',
      visitor: {
        id: 'visitor-explicit',
        metadata: {
          plan: 'enterprise',
        },
      },
    })

    expect(config.visitor).toEqual({
      id: 'visitor-explicit',
      metadata: {
        plan: 'enterprise',
      },
    })
    expect(config.participant.id).toBe('visitor-explicit')
    expect(config.conversation.id).toBe('app:conversation:visitor-explicit')
  })

  it('명시적 participant id는 visitor id보다 우선한다', () => {
    const config = resolveLeeChatConfig({
      appId: 'app',
      endpoint: '/api/chat',
      visitor: {
        id: 'visitor-explicit',
      },
      participant: {
        id: 'participant-explicit',
      },
    })

    expect(config.visitor.id).toBe('visitor-explicit')
    expect(config.participant.id).toBe('participant-explicit')
    expect(config.conversation.id).toBe('app:conversation:participant-explicit')
  })
})
