import { describe, expect, it } from 'vitest'
import { resolveLeeChatConfig } from './lee-chat-config'

describe('resolveLeeChatConfig', () => {
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
          kind: 'support',
        }),
        participant: expect.objectContaining({
          id: 'app-participant',
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
})
